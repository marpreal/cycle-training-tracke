"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { formatDate, getCurrentCycleDay, getNextPeriodDate, getPhaseInfo } from "@/lib/cycle";
import {
  ACTIVITY_FACTORS,
  bmrFemaleKg,
  dailyTotalOnTrainingDay,
  getWeightGoal,
  goalCalorieAdjustment,
  proteinDailyGrams,
  sessionNutritionByTemplate,
  tdeeMaintenance,
  type ActivityLevel,
} from "@/lib/nutrition";
import {
  daysBetweenDates,
  progressionByTemplate,
  targetsForTemplate,
  weeksBetween,
} from "@/lib/trainingProgression";
import { AppLogo } from "@/components/AppLogo";
import { SpanishDatePicker } from "@/components/SpanishDatePicker";
import { trainingTemplates } from "@/data/trainingPlan";
import {
  getLoadTrackedExercisesWithCustom,
  maxWeightInEntry,
  volumeKgRepsForSession,
} from "@/lib/trainingLoads";
import type {
  ActiveView,
  BodyMeasurementRecord,
  FlowLevel,
  PeriodRecord,
  PeriodSettings,
  StepsRecord,
  TrainingRecord,
  UserProfile,
} from "@/lib/appTypes";
import { FLOW_LABELS } from "@/lib/appTypes";
import {
  BODY_MEASUREMENTS_KEY,
  defaultProfile,
  defaultSettings,
  DEFAULT_ISO_DATE,
  PERIOD_LOG_KEY,
  PERIOD_SETTINGS_KEY,
  PROGRESSION_HORIZON_KEY,
  CUSTOM_EXERCISES_KEY,
  STEPS_LOG_KEY,
  todayIsoClient,
  TRAINING_LOG_KEY,
  USER_PROFILE_KEY,
  type TrainingPlan,
} from "@/lib/appTypes";
import {
  loadBodyMeasurements,
  loadPeriodLog,
  loadCustomExercisesByTemplate,
  loadProgressionHorizonWeeks,
  loadSettings,
  loadStepsLog,
  loadTrainingLog,
  loadUserProfile,
} from "@/lib/localAppStorage";
import {
  loadPlansFromIDB,
  migratePlansFromLocalStorage,
  savePlansToIDB,
} from "@/lib/planStorage";
import { DEFAULT_PLAN_A_CONTENT } from "@/data/defaultPlan";
import {
  bumpLocalDataTimestamp,
  getLocalDataTimestamp,
  initLocalDataTimestampIfMissing,
  setLocalDataTimestamp,
} from "@/lib/localDataTimestamp";
import { buildSnapshot } from "@/lib/appSnapshot";
import { fetchRemoteSnapshot, pushRemoteSnapshot } from "@/lib/remoteAppState";
// Hooks
import { useTrainingForm } from "@/hooks/useTrainingForm";
import { useSessionHistory } from "@/hooks/useSessionHistory";
import { useStepsForm } from "@/hooks/useStepsForm";
// Components
import { TrainingMetricsBar, type PersonalRecord } from "@/components/entreno/TrainingMetricsBar";
import { TrainingFormCard } from "@/components/entreno/TrainingFormCard";
import { TrainingHistoryPanel } from "@/components/entreno/TrainingHistoryPanel";
import { NextSessionPanel } from "@/components/entreno/NextSessionPanel";
import { ExportCard } from "@/components/entreno/ExportCard";
import { StepsCard } from "@/components/entreno/StepsCard";
import { TemplatesCard } from "@/components/entreno/TemplatesCard";
import { PlanCard } from "@/components/entreno/PlanCard";

const REMOTE_SYNC_UI =
  typeof process.env.NEXT_PUBLIC_REMOTE_SYNC !== "undefined" &&
  process.env.NEXT_PUBLIC_REMOTE_SYNC === "true";

const REMOTE_SYNC_NETWORK =
  REMOTE_SYNC_UI &&
  (process.env.NODE_ENV !== "development" ||
    process.env.NEXT_PUBLIC_REMOTE_SYNC_DEV === "true");

export default function Home() {
  const { data: session, status: sessionStatus } = useSession();
  const sessionUserId =
    typeof session?.user?.id === "string" && session.user.id.length > 0
      ? session.user.id
      : null;

  // ── Core persisted state (all synced/stored) ─────────────────────────────
  const [hasHydrated, setHasHydrated] = useState(false);
  const [settings, setSettings] = useState<PeriodSettings>(defaultSettings);
  const [trainingLog, setTrainingLog] = useState<TrainingRecord[]>([]);
  const [periodLog, setPeriodLog] = useState<PeriodRecord[]>([]);
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [measurementLog, setMeasurementLog] = useState<BodyMeasurementRecord[]>([]);
  const [stepsLog, setStepsLog] = useState<StepsRecord[]>([]);
  const [progressionHorizonWeeks, setProgressionHorizonWeeks] = useState(6);
  const [customExercisesByTemplate, setCustomExercisesByTemplate] = useState<
    Record<string, string[]>
  >({});
  const [trainingPlans, setTrainingPlans] = useState<TrainingPlan[]>([]);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [activeView, setActiveViewRaw] = useState<ActiveView>("regla");
  const [exportMonth, setExportMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [authGoogleConfigured, setAuthGoogleConfigured] = useState<boolean | null>(null);
  const [sessionLoadingTimedOut, setSessionLoadingTimedOut] = useState(false);

  // ── Period/flow form state ────────────────────────────────────────────────
  const [periodStartInput, setPeriodStartInput] = useState(DEFAULT_ISO_DATE);
  const [periodEndInput, setPeriodEndInput] = useState(DEFAULT_ISO_DATE);
  const [flowDateInput, setFlowDateInput] = useState(DEFAULT_ISO_DATE);

  // ── Measurement form state ────────────────────────────────────────────────
  const [measurementDate, setMeasurementDate] = useState(DEFAULT_ISO_DATE);
  const [measurementWeight, setMeasurementWeight] = useState(String(defaultProfile.weightKg));
  const [profileWeightDraft, setProfileWeightDraft] = useState(String(defaultProfile.weightKg));
  const [measurementWaist, setMeasurementWaist] = useState("");
  const [measurementHip, setMeasurementHip] = useState("");
  const [measurementThigh, setMeasurementThigh] = useState("");
  const [measurementNotes, setMeasurementNotes] = useState("");
  const [editingMeasurementId, setEditingMeasurementId] = useState<string | null>(null);

  // ── Sync refs ─────────────────────────────────────────────────────────────
  const [remoteSyncOk, setRemoteSyncOk] = useState(false);
  const [remoteSyncMessage, setRemoteSyncMessage] = useState("");
  const [syncPullInFlight, setSyncPullInFlight] = useState(false);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteApplyRef = useRef(false);
  const syncedDataSerializedRef = useRef<string | null>(null);
  const remotePullGenRef = useRef(0);
  const remotePullDoneForUserRef = useRef<string | null>(null);

  // ── Extracted hooks ───────────────────────────────────────────────────────
  const form = useTrainingForm();
  const sessionHistory = useSessionHistory(trainingLog);
  const steps = useStepsForm({ hasHydrated, sessionStatus });

  // ── Active view persistence ───────────────────────────────────────────────
  const setActiveView = (v: ActiveView) => {
    setActiveViewRaw(v);
    localStorage.setItem("active-view-v1", v);
  };

  // ── Initialisation ────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("active-view-v1");
    if (saved === "regla" || saved === "entreno" || saved === "planes" || saved === "nutricion") {
      setActiveViewRaw(saved);
    }
  }, []);

  useEffect(() => {
    const s = loadSettings();
    const prof = loadUserProfile();
    const today = todayIsoClient();
    queueMicrotask(() => {
      initLocalDataTimestampIfMissing();
      setProgressionHorizonWeeks(loadProgressionHorizonWeeks());
      setCustomExercisesByTemplate(loadCustomExercisesByTemplate());
      setSettings(s);
      setPeriodStartInput(s.lastPeriodStart);
      setTrainingLog(loadTrainingLog());
      setPeriodLog(loadPeriodLog());
      setProfile(prof);
      setMeasurementWeight(String(prof.weightKg));
      setProfileWeightDraft(String(prof.weightKg));
      setMeasurementLog(loadBodyMeasurements());
      setStepsLog(loadStepsLog());
      setPeriodEndInput(today);
      setFlowDateInput(today);
      form.initDate(today);
      steps.initDate(today);
      setMeasurementDate(today);
      // Plans live in IndexedDB; migrate from localStorage on first load
      void (async () => {
        const migrated = await migratePlansFromLocalStorage();
        let plans: TrainingPlan[];
        if (migrated.length > 0) {
          plans = migrated;
        } else {
          plans = await loadPlansFromIDB();
        }
        if (plans.length === 0) {
          plans = [{
            id: "plan-a-default",
            name: "Plan A",
            content: DEFAULT_PLAN_A_CONTENT,
            contentType: "text",
          }];
          await savePlansToIDB(plans);
        }
        setTrainingPlans(plans);
        setHasHydrated(true);
      })();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── localStorage persistence ──────────────────────────────────────────────
  useEffect(() => {
    if (!hasHydrated) return;
    try { localStorage.setItem(PERIOD_SETTINGS_KEY, JSON.stringify(settings)); } catch { /* quota */ }
  }, [settings, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    try { localStorage.setItem(TRAINING_LOG_KEY, JSON.stringify(trainingLog)); } catch { /* quota */ }
  }, [trainingLog, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    try { localStorage.setItem(PERIOD_LOG_KEY, JSON.stringify(periodLog)); } catch { /* quota */ }
  }, [periodLog, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    try { localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile)); } catch { /* quota */ }
  }, [profile, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    try { localStorage.setItem(BODY_MEASUREMENTS_KEY, JSON.stringify(measurementLog)); } catch { /* quota */ }
  }, [measurementLog, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    try { localStorage.setItem(STEPS_LOG_KEY, JSON.stringify(stepsLog)); } catch { /* quota */ }
  }, [stepsLog, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    try { localStorage.setItem(PROGRESSION_HORIZON_KEY, String(progressionHorizonWeeks)); } catch { /* quota */ }
  }, [progressionHorizonWeeks, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    try { localStorage.setItem(CUSTOM_EXERCISES_KEY, JSON.stringify(customExercisesByTemplate)); } catch { /* quota */ }
  }, [customExercisesByTemplate, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    void savePlansToIDB(trainingPlans);
  }, [trainingPlans, hasHydrated]);

  useEffect(() => {
    if (sessionStatus !== "loading") {
      setSessionLoadingTimedOut(false);
      return;
    }
    const t = setTimeout(() => setSessionLoadingTimedOut(true), 10000);
    return () => clearTimeout(t);
  }, [sessionStatus]);

  // ── Google OAuth config check ─────────────────────────────────────────────
  useEffect(() => {
    void fetch("/api/sync-status")
      .then((r) => r.json())
      .then((d: { googleOAuthConfigured?: boolean }) => {
        setAuthGoogleConfigured(Boolean(d.googleOAuthConfigured));
      })
      .catch(() => setAuthGoogleConfigured(false));
  }, []);

  // ── Remote sync: pull ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasHydrated) return;
    if (!REMOTE_SYNC_NETWORK) {
      setRemoteSyncOk(true);
      return;
    }
    if (sessionStatus === "loading" && !sessionLoadingTimedOut) return;
    if (sessionStatus === "unauthenticated" || !sessionUserId) {
      remotePullDoneForUserRef.current = null;
      setRemoteSyncOk(true);
      setRemoteSyncMessage("");
      setSyncPullInFlight(false);
      return;
    }
    if (remotePullDoneForUserRef.current === sessionUserId) return;
    const gen = (remotePullGenRef.current += 1);
    setRemoteSyncOk(false);
    setRemoteSyncMessage("");
    setSyncPullInFlight(true);
    void (async () => {
      const { snapshot, error, needsAuth } = await fetchRemoteSnapshot();
      if (gen !== remotePullGenRef.current) return;
      if (error) {
        setSyncPullInFlight(false);
        setRemoteSyncMessage(
          needsAuth ? "Sesión no válida: vuelve a entrar con Google." : error,
        );
        setRemoteSyncOk(true);
        remotePullDoneForUserRef.current = sessionUserId;
        return;
      }
      setSyncPullInFlight(false);
      setRemoteSyncOk(true);
      setRemoteSyncMessage("");
      if (!snapshot) {
        remotePullDoneForUserRef.current = sessionUserId;
        return;
      }
      const localTs = getLocalDataTimestamp();
      if (snapshot.updatedAt <= localTs) {
        remotePullDoneForUserRef.current = sessionUserId;
        return;
      }
      remoteApplyRef.current = true;
      setSettings(snapshot.settings);
      setPeriodStartInput(snapshot.settings.lastPeriodStart);
      setTrainingLog(snapshot.trainingLog);
      setPeriodLog(snapshot.periodLog);
      setProfile(snapshot.profile);
      setMeasurementWeight(String(snapshot.profile.weightKg));
      setProfileWeightDraft(String(snapshot.profile.weightKg));
      setMeasurementLog(snapshot.measurementLog);
      setStepsLog(snapshot.stepsLog ?? []);
      if (snapshot.preferences?.progressionHorizonWeeks) {
        setProgressionHorizonWeeks(snapshot.preferences.progressionHorizonWeeks);
      }
      if (snapshot.preferences?.customExercisesByTemplate) {
        setCustomExercisesByTemplate(snapshot.preferences.customExercisesByTemplate);
      }
      setLocalDataTimestamp(snapshot.updatedAt);
      remotePullDoneForUserRef.current = sessionUserId;
    })();
    return () => {
      remotePullGenRef.current += 1;
    };
  }, [hasHydrated, sessionUserId, sessionStatus, sessionLoadingTimedOut]);

  // ── Remote sync: dirty-tracking + push ───────────────────────────────────
  useEffect(() => {
    if (!hasHydrated) return;
    const pack = {
      settings, trainingLog, periodLog, profile,
      measurementLog, stepsLog, progressionHorizonWeeks, customExercisesByTemplate,
    };
    const next = JSON.stringify(pack);
    if (remoteApplyRef.current) {
      syncedDataSerializedRef.current = next;
      queueMicrotask(() => { remoteApplyRef.current = false; });
      return;
    }
    if (syncedDataSerializedRef.current === null) {
      syncedDataSerializedRef.current = next;
      return;
    }
    if (syncedDataSerializedRef.current === next) return;
    syncedDataSerializedRef.current = next;
    const t = window.setTimeout(() => { bumpLocalDataTimestamp(); }, 0);
    return () => window.clearTimeout(t);
  }, [hasHydrated, settings, trainingLog, periodLog, profile, measurementLog, stepsLog, progressionHorizonWeeks, customExercisesByTemplate]);

  useEffect(() => {
    if (!hasHydrated || !REMOTE_SYNC_NETWORK || !remoteSyncOk) return;
    if (sessionStatus !== "authenticated" || !sessionUserId) return;
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => {
      pushTimerRef.current = null;
      const snap = buildSnapshot({
        settings, trainingLog, periodLog, profile, measurementLog, stepsLog,
        preferences: { progressionHorizonWeeks, customExercisesByTemplate },
      });
      void (async () => {
        const { ok, error, updatedAt } = await pushRemoteSnapshot(snap);
        if (!ok) {
          queueMicrotask(() => setRemoteSyncMessage(error ?? "Error al guardar en el servidor"));
        } else {
          queueMicrotask(() => setRemoteSyncMessage(""));
          if (typeof updatedAt === "number") setLocalDataTimestamp(updatedAt);
        }
      })();
    }, 1200);
    return () => { if (pushTimerRef.current) clearTimeout(pushTimerRef.current); };
  }, [hasHydrated, remoteSyncOk, sessionUserId, sessionStatus, settings, trainingLog, periodLog, profile, measurementLog, stepsLog, progressionHorizonWeeks, customExercisesByTemplate]);

  // ── Computed values ───────────────────────────────────────────────────────
  const latestClosedCurrentCycleLength = useMemo(() => {
    const record = periodLog.find(
      (item) => item.startDate === settings.lastPeriodStart && item.endDate !== null,
    );
    if (!record?.endDate) return null;
    const start = new Date(`${record.startDate}T00:00:00`).getTime();
    const end = new Date(`${record.endDate}T00:00:00`).getTime();
    const days = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
    return days > 0 ? days : null;
  }, [periodLog, settings.lastPeriodStart]);

  const effectivePeriodLength = latestClosedCurrentCycleLength ?? settings.periodLength;
  const cycleDay = useMemo(() => getCurrentCycleDay(settings.lastPeriodStart), [settings.lastPeriodStart]);
  const basePhase = useMemo(
    () => getPhaseInfo(cycleDay, settings.cycleLength, effectivePeriodLength),
    [cycleDay, settings.cycleLength, effectivePeriodLength],
  );
  const phase = settings.isPeriodOngoing
    ? {
        name: "Menstrual (en curso)",
        description:
          "Has marcado que la regla sigue activa. Prioriza recuperación y adapta la carga según sensaciones.",
        hormones:
          "El estrógeno y la progesterona están bajos; el útero descama el endometrio. Puede haber calambres o más cansancio.",
      }
    : basePhase;
  const nextPeriod = useMemo(
    () => getNextPeriodDate(settings.lastPeriodStart, settings.cycleLength),
    [settings.lastPeriodStart, settings.cycleLength],
  );
  const daysToNext = useMemo(
    () => Math.max(0, Math.ceil((nextPeriod.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))),
    [nextPeriod],
  );

  const selectedTemplate = useMemo(
    () => trainingTemplates.find((t) => t.id === form.newLogTemplate),
    [form.newLogTemplate],
  );

  const loadExercisesForForm = useMemo(() => {
    if (!selectedTemplate) return [];
    return getLoadTrackedExercisesWithCustom(
      selectedTemplate,
      customExercisesByTemplate[form.newLogTemplate] ?? [],
    );
  }, [selectedTemplate, form.newLogTemplate, customExercisesByTemplate]);

  const bmr = useMemo(
    () => bmrFemaleKg(profile.weightKg, profile.heightCm, profile.age),
    [profile.weightKg, profile.heightCm, profile.age],
  );
  const maintenanceTdee = useMemo(() => tdeeMaintenance(bmr, profile.activity), [bmr, profile.activity]);
  const weightGoal = useMemo(
    () => getWeightGoal(profile.weightKg, profile.targetWeightKg),
    [profile.weightKg, profile.targetWeightKg],
  );
  const calorieAdjustment = useMemo(
    () => goalCalorieAdjustment(profile.weightKg, profile.targetWeightKg, profile.weightGoalWeeks),
    [profile.weightKg, profile.targetWeightKg, profile.weightGoalWeeks],
  );
  const targetCalories = useMemo(
    () => maintenanceTdee + calorieAdjustment,
    [maintenanceTdee, calorieAdjustment],
  );
  const proteinDay = useMemo(() => {
    const base = proteinDailyGrams(profile.weightKg);
    // During deficit, push protein to the top of the range to preserve lean mass
    return weightGoal === "loss" ? { ...base, target: base.max } : base;
  }, [profile.weightKg, weightGoal]);

  const weightGoalHint = useMemo(() => {
    const cur = profile.weightKg;
    const target = profile.targetWeightKg;
    const weeks = profile.weightGoalWeeks;
    if (target == null || weeks == null || weeks <= 0 || !Number.isFinite(target)) return null;
    const diff = cur - target;
    if (Math.abs(diff) < 0.15) return "Casi en el peso objetivo (orientativo).";
    const weeklyKg = diff / weeks;
    const kcalPerDay = Math.round((Math.abs(weeklyKg) * 7700) / 7);
    return diff > 0
      ? `Orientativo: ~${Math.abs(weeklyKg).toFixed(2)} kg/semana de pérdida ≈ déficit ${kcalPerDay} kcal/día.`
      : `Orientativo: ~${Math.abs(weeklyKg).toFixed(2)} kg/semana de ganancia ≈ superávit ${kcalPerDay} kcal/día.`;
  }, [profile.weightKg, profile.targetWeightKg, profile.weightGoalWeeks]);

  const logProgressionById = useMemo(() => {
    const asc = [...trainingLog].sort((a, b) => a.date.localeCompare(b.date));
    const lastByTemplate = new Map<string, string>();
    const map = new Map<
      string,
      { daysSincePrevSame: number | null; targets: { name: string; range: string }[]; weeksInBlock: number }
    >();
    for (const log of asc) {
      const prev = lastByTemplate.get(log.templateId);
      const daysSincePrevSame = prev ? daysBetweenDates(prev, log.date) : null;
      lastByTemplate.set(log.templateId, log.date);
      map.set(log.id, {
        daysSincePrevSame,
        targets: targetsForTemplate(log.templateId, profile.trainingBlockStart, log.date),
        weeksInBlock: weeksBetween(profile.trainingBlockStart, log.date),
      });
    }
    return map;
  }, [trainingLog, profile.trainingBlockStart]);

  const nextSessionTargets = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return Object.fromEntries(
      trainingTemplates.map((t) => [t.id, targetsForTemplate(t.id, profile.trainingBlockStart, today)]),
    ) as Record<string, { name: string; range: string }[]>;
  }, [profile.trainingBlockStart]);

  const latestLoadsForTemplate = useMemo(() => {
    const map = new Map<string, number>();
    const asc = [...trainingLog].sort((a, b) => a.date.localeCompare(b.date));
    for (const log of asc) {
      if (log.templateId !== form.newLogTemplate) continue;
      for (const entry of log.exerciseLoads ?? []) {
        map.set(entry.exerciseName, maxWeightInEntry(entry));
      }
    }
    return map;
  }, [trainingLog, form.newLogTemplate]);

  const dynamicProgressionRows = useMemo(() => {
    const steps = Math.max(1, Math.floor(progressionHorizonWeeks / 2));
    const reference = progressionByTemplate[form.newLogTemplate] ?? [];
    const stepByExercise = new Map(reference.map((item) => [item.name, item.stepKgPerFortnight]));
    const rows: { exerciseName: string; currentKg: number; targetKg: number; weeklyGain: number }[] = [];
    latestLoadsForTemplate.forEach((currentKg, exerciseName) => {
      const step = stepByExercise.get(exerciseName) ?? 1;
      rows.push({
        exerciseName,
        currentKg,
        targetKg: Number((currentKg + step * steps).toFixed(1)),
        weeklyGain: Number((step / 2).toFixed(2)),
      });
    });
    return rows.sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));
  }, [latestLoadsForTemplate, form.newLogTemplate, progressionHorizonWeeks]);

  const sortedPeriodLog = useMemo(
    () => [...periodLog].sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [periodLog],
  );
  const sortedMeasurementLog = useMemo(
    () => [...measurementLog].sort((a, b) => b.date.localeCompare(a.date)),
    [measurementLog],
  );
  const weightHistoryEntries = useMemo(
    () => sortedMeasurementLog.filter((x) => x.weightKg != null),
    [sortedMeasurementLog],
  );
  const measuresHistoryEntries = useMemo(
    () =>
      sortedMeasurementLog.filter(
        (x) =>
          (x.waistCm != null && x.waistCm > 0) ||
          (x.hipCm != null && x.hipCm > 0) ||
          (x.thighCm != null && x.thighCm > 0) ||
          (x.notes != null && x.notes.trim().length > 0),
      ),
    [sortedMeasurementLog],
  );
  const periodDaysInCourse = useMemo(() => {
    if (!settings.isPeriodOngoing) return 0;
    const start = new Date(`${settings.lastPeriodStart}T00:00:00`);
    const today = new Date();
    return Math.max(1, Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  }, [settings.isPeriodOngoing, settings.lastPeriodStart]);

  const trainingStats = useMemo(() => {
    if (!hasHydrated) return { week: 0, month: 0, year: 0, volumeWeek: 0, volumeMonth: 0, volumeYear: 0 };
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(y, m, now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    const mondayIso = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
    const yearPrefix = `${y}-`;
    const monthPrefix = `${y}-${String(m + 1).padStart(2, "0")}-`;
    let week = 0, month = 0, year = 0, volumeWeek = 0, volumeMonth = 0, volumeYear = 0;
    for (const entry of trainingLog) {
      const vol = volumeKgRepsForSession(entry);
      if (entry.date >= mondayIso) { week++; volumeWeek += vol; }
      if (entry.date.startsWith(monthPrefix)) { month++; volumeMonth += vol; }
      if (entry.date.startsWith(yearPrefix)) { year++; volumeYear += vol; }
    }
    return { week, month, year, volumeWeek, volumeMonth, volumeYear };
  }, [trainingLog, hasHydrated]);

  const stepsStats = useMemo(() => {
    if (!hasHydrated) return { week: 0, month: 0, year: 0 };
    const now = new Date();
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    const mondayIso = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
    const yearPrefix = `${now.getFullYear()}-`;
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-`;
    let week = 0, month = 0, year = 0;
    for (const entry of stepsLog) {
      if (entry.date >= mondayIso) week += entry.steps;
      if (entry.date.startsWith(monthPrefix)) month += entry.steps;
      if (entry.date.startsWith(yearPrefix)) year += entry.steps;
    }
    return { week, month, year };
  }, [stepsLog, hasHydrated]);

  const sortedStepsLog = useMemo(
    () => [...stepsLog].sort((a, b) => (a.date === b.date ? b.id.localeCompare(a.id) : b.date.localeCompare(a.date))),
    [stepsLog],
  );

  const personalRecords = useMemo<PersonalRecord[]>(() => {
    if (!hasHydrated) return [];
    const map = new Map<string, { weightKg: number; date: string }>();
    for (const entry of trainingLog) {
      for (const load of entry.exerciseLoads ?? []) {
        const max = maxWeightInEntry(load);
        if (max <= 0) continue;
        const prev = map.get(load.exerciseName);
        if (!prev || max > prev.weightKg) {
          map.set(load.exerciseName, { weightKg: max, date: entry.date });
        }
      }
    }
    const yearPrefix = `${new Date().getFullYear()}-`;
    return Array.from(map.entries())
      .map(([name, { weightKg, date }]) => ({
        name,
        weightKg,
        date,
        isThisYear: date.startsWith(yearPrefix),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [trainingLog, hasHydrated]);

  const openPeriod = useMemo(
    () => periodLog.find((item) => item.endDate === null) ?? null,
    [periodLog],
  );

  // ── Validation flags ──────────────────────────────────────────────────────
  function parseOptionalNumber(value: string): number | null {
    const clean = value.trim().replace(",", ".");
    if (!clean) return null;
    const parsed = Number(clean);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const canSaveWeight =
    measurementDate !== DEFAULT_ISO_DATE && parseOptionalNumber(measurementWeight) != null;

  const canSaveMeasures =
    measurementDate !== DEFAULT_ISO_DATE &&
    (parseOptionalNumber(measurementWaist) != null ||
      parseOptionalNumber(measurementHip) != null ||
      parseOptionalNumber(measurementThigh) != null ||
      measurementNotes.trim().length > 0);

  const profileWeightOutOfRange =
    profileWeightDraft.trim() !== "" &&
    (() => {
      const n = parseOptionalNumber(profileWeightDraft);
      return n == null || n < 30 || n > 250;
    })();

  // ── Handlers: training log ────────────────────────────────────────────────
  function addTrainingLog() {
    const record: TrainingRecord = {
      id: crypto.randomUUID(),
      date: form.newLogDate,
      templateId: form.newLogTemplate,
      effort: form.newLogEffort,
      notes: form.newLogNotes.trim(),
      exerciseLoads: form.buildParsedLoads(loadExercisesForForm),
    };
    setTrainingLog((cur) => [record, ...cur]);
    form.resetForm();
  }

  function saveEditLog() {
    if (!form.editingLogId) return;
    setTrainingLog((cur) =>
      cur.map((item) =>
        item.id === form.editingLogId
          ? {
              ...item,
              date: form.newLogDate,
              templateId: form.newLogTemplate,
              effort: form.newLogEffort,
              notes: form.newLogNotes.trim(),
              exerciseLoads: form.buildParsedLoads(loadExercisesForForm),
            }
          : item,
      ),
    );
    form.resetForm();
  }

  function removeTrainingLog(id: string) {
    setTrainingLog((cur) => cur.filter((item) => item.id !== id));
    if (form.editingLogId === id) form.resetForm();
  }

  // ── Handlers: custom exercises ────────────────────────────────────────────
  function addCustomExerciseToTemplate() {
    const name = form.newCustomExerciseName.trim();
    if (!name || !selectedTemplate) return;
    setCustomExercisesByTemplate((prev) => {
      const list = prev[form.newLogTemplate] ?? [];
      if (list.includes(name)) return prev;
      return { ...prev, [form.newLogTemplate]: [...list, name] };
    });
    form.setNewCustomExerciseName("");
  }

  function removeCustomExercise(name: string) {
    setCustomExercisesByTemplate((prev) => {
      const list = prev[form.newLogTemplate] ?? [];
      const nextList = list.filter((x) => x !== name);
      const next = { ...prev };
      if (nextList.length === 0) {
        delete next[form.newLogTemplate];
      } else {
        next[form.newLogTemplate] = nextList;
      }
      return next;
    });
  }

  // ── Handlers: period / flow ───────────────────────────────────────────────
  function registerPeriodStart(date: string) {
    const newRecord: PeriodRecord = { id: crypto.randomUUID(), startDate: date, endDate: null, flow: [] };
    setPeriodLog((cur) => [newRecord, ...cur.map((item) => (item.endDate ? item : { ...item, endDate: date }))]);
    setSettings((cur) => ({ ...cur, lastPeriodStart: date, isPeriodOngoing: true }));
  }

  function endCurrentPeriod(endDate: string) {
    setPeriodLog((cur) => {
      const openIndex = cur.findIndex((item) => item.endDate === null);
      if (openIndex === -1) return cur;
      if (endDate < cur[openIndex].startDate) return cur;
      return cur.map((item, i) => (i === openIndex ? { ...item, endDate } : item));
    });
    setSettings((cur) => ({ ...cur, isPeriodOngoing: false }));
  }

  function addFlowEntry(date: string, level: FlowLevel) {
    setPeriodLog((cur) => {
      const openIndex = cur.findIndex((item) => item.endDate === null);
      if (openIndex === -1) return cur;
      const record = cur[openIndex];
      const flow = (record.flow ?? []).filter((f) => f.date !== date);
      flow.push({ date, level });
      flow.sort((a, b) => a.date.localeCompare(b.date));
      return cur.map((item, idx) => (idx === openIndex ? { ...item, flow } : item));
    });
  }

  function removeFlowEntry(date: string) {
    setPeriodLog((cur) => {
      const openIndex = cur.findIndex((item) => item.endDate === null);
      if (openIndex === -1) return cur;
      const record = cur[openIndex];
      const flow = (record.flow ?? []).filter((f) => f.date !== date);
      return cur.map((item, idx) => (idx === openIndex ? { ...item, flow } : item));
    });
  }

  function removePeriodRecord(id: string) {
    setPeriodLog((cur) => cur.filter((item) => item.id !== id));
  }

  // ── Handlers: measurements ────────────────────────────────────────────────
  function startEditMeasurement(item: BodyMeasurementRecord) {
    setEditingMeasurementId(item.id);
    setMeasurementDate(item.date);
    setMeasurementWeight(item.weightKg != null ? String(item.weightKg) : "");
    setMeasurementWaist(item.waistCm != null ? String(item.waistCm) : "");
    setMeasurementHip(item.hipCm != null ? String(item.hipCm) : "");
    setMeasurementThigh(item.thighCm != null ? String(item.thighCm) : "");
    setMeasurementNotes(item.notes ?? "");
  }

  function cancelMeasurementEdit() {
    setEditingMeasurementId(null);
    setMeasurementDate(todayIsoClient());
    setMeasurementWeight("");
    setMeasurementWaist("");
    setMeasurementHip("");
    setMeasurementThigh("");
    setMeasurementNotes("");
  }

  function saveWeightEntry() {
    if (measurementDate === DEFAULT_ISO_DATE) return;
    const w = parseOptionalNumber(measurementWeight);
    if (w == null) return;
    if (editingMeasurementId) {
      setMeasurementLog((cur) =>
        cur.map((item) =>
          item.id === editingMeasurementId ? { ...item, date: measurementDate, weightKg: w } : item,
        ),
      );
    } else {
      setMeasurementLog((cur) => [
        {
          id: crypto.randomUUID(),
          date: measurementDate,
          weightKg: w,
          waistCm: null,
          hipCm: null,
          thighCm: null,
          notes: "",
        },
        ...cur,
      ]);
    }
    setProfile((cur) => ({ ...cur, weightKg: w }));
    setProfileWeightDraft(String(w));
    cancelMeasurementEdit();
  }

  function saveMeasuresEntry() {
    if (measurementDate === DEFAULT_ISO_DATE) return;
    const waist = parseOptionalNumber(measurementWaist);
    const hip = parseOptionalNumber(measurementHip);
    const thigh = parseOptionalNumber(measurementThigh);
    const notes = measurementNotes.trim();
    if (!waist && !hip && !thigh && !notes) return;
    if (editingMeasurementId) {
      setMeasurementLog((cur) =>
        cur.map((item) =>
          item.id === editingMeasurementId
            ? { ...item, date: measurementDate, waistCm: waist, hipCm: hip, thighCm: thigh, notes }
            : item,
        ),
      );
    } else {
      setMeasurementLog((cur) => [
        {
          id: crypto.randomUUID(),
          date: measurementDate,
          weightKg: null,
          waistCm: waist,
          hipCm: hip,
          thighCm: thigh,
          notes,
        },
        ...cur,
      ]);
    }
    cancelMeasurementEdit();
  }

  function removeBodyMeasurement(id: string) {
    setMeasurementLog((cur) => cur.filter((item) => item.id !== id));
    if (editingMeasurementId === id) cancelMeasurementEdit();
  }

  // ── Handlers: training plans ─────────────────────────────────────────────
  function addTrainingPlan(plan: TrainingPlan) {
    setTrainingPlans((cur) => [...cur, plan]);
  }

  function deleteTrainingPlan(id: string) {
    setTrainingPlans((cur) => cur.filter((p) => p.id !== id));
  }

  function renameTrainingPlan(id: string, name: string) {
    setTrainingPlans((cur) => cur.map((p) => (p.id === id ? { ...p, name } : p)));
  }

  // ── Handlers: steps ───────────────────────────────────────────────────────
  function saveStepsEntry() {
    if (steps.stepDateInput === DEFAULT_ISO_DATE) return;
    const parsed = steps.parseStepsInput(steps.stepCountInput);
    if (parsed == null) return;
    if (steps.editingStepId) {
      setStepsLog((cur) =>
        cur.map((item) =>
          item.id === steps.editingStepId
            ? { ...item, date: steps.stepDateInput, steps: parsed }
            : item,
        ),
      );
    } else {
      setStepsLog((cur) => [
        { id: crypto.randomUUID(), date: steps.stepDateInput, steps: parsed },
        ...cur,
      ]);
    }
    steps.setEditingStepId(null);
    steps.setStepCountInput("");
  }

  function removeStepsEntry(id: string) {
    setStepsLog((cur) => cur.filter((item) => item.id !== id));
    if (steps.editingStepId === id) steps.cancelEditSteps();
  }

  function commitProfileWeightFromDraft() {
    setProfile((p) => {
      const n = parseOptionalNumber(profileWeightDraft);
      if (n != null && n >= 30 && n <= 250) {
        queueMicrotask(() => setProfileWeightDraft(String(n)));
        return { ...p, weightKg: n };
      }
      queueMicrotask(() => setProfileWeightDraft(String(p.weightKg)));
      return p;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // JSX
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-8">
      {/* Header */}
      <header className="card app-header">
        <div className="app-header-brand">
          <AppLogo className="shrink-0" />
          <div className="min-w-0">
            <p className="eyebrow">Control de ciclo + entrenamiento</p>
            <h1 className="title">Tu panel semanal</h1>
            <p className="muted">
              Registra tu regla, mira en qué fase estás y guarda tus sesiones de entreno en un solo sitio.
            </p>
          </div>
        </div>
      </header>

      {/* Tab navigation */}
      <section className="view-tabs">
        {(["regla", "entreno", "planes", "nutricion"] as const).map((view) => (
          <button
            key={view}
            type="button"
            className={`view-tab ${activeView === view ? "is-active" : ""}`}
            onClick={() => setActiveView(view)}
          >
            {view === "regla"
              ? "Regla"
              : view === "entreno"
                ? "Ejercicio"
                : view === "planes"
                  ? "Planes"
                  : "Peso y nutrición"}
          </button>
        ))}
      </section>

      {/* Account bar */}
      <section className="account-bar">
        {sessionStatus === "loading" && !sessionLoadingTimedOut ? (
          <span className="muted text-xs">Comprobando sesión...</span>
        ) : sessionStatus === "unauthenticated" ||
          (sessionStatus === "loading" && sessionLoadingTimedOut) ? (
          <button
            type="button"
            className="account-bar-btn"
            disabled={authGoogleConfigured === false || authGoogleConfigured === null}
            onClick={() => { if (authGoogleConfigured === true) void signIn("google"); }}
          >
            Entrar con Google
          </button>
        ) : (
          <>
            <span className="text-xs">
              <span className="font-medium">{session?.user?.name ?? "Sesión"}</span>
              {session?.user?.email ? (
                <span className="muted"> · {session.user.email}</span>
              ) : null}
            </span>
            <button
              type="button"
              className="account-bar-btn"
              onClick={() => void signOut({ callbackUrl: "/" })}
            >
              Salir
            </button>
          </>
        )}
        {remoteSyncMessage ? (
          <span className="text-xs text-amber-700 dark:text-amber-400">{remoteSyncMessage}</span>
        ) : null}
        {REMOTE_SYNC_UI && sessionStatus === "authenticated" && syncPullInFlight ? (
          <span className="muted text-xs">Sincronizando...</span>
        ) : null}
      </section>

      {/* ── REGLA view ──────────────────────────────────────────────────────── */}
      <section className={`grid gap-4 md:grid-cols-4 ${activeView === "regla" ? "" : "hidden"}`}>
        <article className="metric-card">
          <p className="metric-label">Día de ciclo</p>
          <p className="metric-value">{hasHydrated ? cycleDay : "—"}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Fase actual</p>
          <p className="metric-value-small">{hasHydrated ? phase.name : "—"}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Próxima regla</p>
          <p className="metric-value-small">{hasHydrated ? formatDate(nextPeriod) : "—"}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Días restantes</p>
          <p className="metric-value">{hasHydrated ? daysToNext : "—"}</p>
        </article>
      </section>

      <section className={`grid gap-6 lg:grid-cols-2 ${activeView === "regla" ? "" : "hidden"}`}>
        <article className="card">
          <h2 className="section-title">Registro de regla</h2>
          {!settings.isPeriodOngoing ? (
            <>
              <p className="muted text-sm mb-3">No tienes la regla marcada como activa.</p>
              <label className="field mb-3">
                <span>Fecha de llegada</span>
                <SpanishDatePicker value={periodStartInput} onChange={setPeriodStartInput} />
              </label>
              <button
                className="action-button action-start mt-8 inline-flex items-center gap-2"
                type="button"
                onClick={() => registerPeriodStart(periodStartInput)}
              >
                Me ha venido la regla
              </button>
            </>
          ) : (
            <>
              <p className="phase-description mb-3">
                Regla en curso desde {settings.lastPeriodStart} ({periodDaysInCourse} días).
              </p>
              <div className="mb-4">
                <p className="block-title mb-2">Registrar sangrado</p>
                <label className="field mb-2">
                  <span>Día</span>
                  <SpanishDatePicker value={flowDateInput} onChange={setFlowDateInput} />
                </label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(FLOW_LABELS) as FlowLevel[]).map((level) => {
                    const currentFlow = openPeriod?.flow?.find((f) => f.date === flowDateInput);
                    const isActive = currentFlow?.level === level;
                    return (
                      <button
                        key={level}
                        type="button"
                        className={`flow-button ${isActive ? "is-active" : ""}`}
                        onClick={() =>
                          isActive ? removeFlowEntry(flowDateInput) : addFlowEntry(flowDateInput, level)
                        }
                      >
                        {FLOW_LABELS[level]}
                      </button>
                    );
                  })}
                </div>
              </div>
              {openPeriod?.flow && openPeriod.flow.length > 0 ? (
                <div className="mb-4">
                  <p className="block-title mb-2">Sangrado registrado</p>
                  <div className="flex flex-wrap gap-1">
                    {openPeriod.flow.map((f) => (
                      <span
                        key={f.date}
                        className="flow-tag cursor-pointer"
                        title="Pulsa para borrar"
                        onClick={() => removeFlowEntry(f.date)}
                      >
                        {f.date.slice(5)} · {FLOW_LABELS[f.level]} ✕
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              <label className="field mb-3">
                <span>Fin de regla</span>
                <SpanishDatePicker value={periodEndInput} onChange={setPeriodEndInput} />
              </label>
              <button
                className="action-button action-end"
                type="button"
                onClick={() => endCurrentPeriod(periodEndInput)}
              >
                Marcar fin de regla
              </button>
            </>
          )}
        </article>

        <article className="card">
          <h2 className="section-title">Configuración del ciclo</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="field">
              <span>Duración del ciclo (días)</span>
              <input
                type="number"
                min={21}
                max={45}
                value={settings.cycleLength}
                onChange={(e) =>
                  setSettings((cur) => ({ ...cur, cycleLength: Number(e.target.value) }))
                }
              />
            </label>
            <label className="field">
              <span>Duración de la regla (días)</span>
              <input
                type="number"
                min={2}
                max={10}
                value={settings.periodLength}
                onChange={(e) =>
                  setSettings((cur) => ({ ...cur, periodLength: Number(e.target.value) }))
                }
              />
            </label>
          </div>
          <p className="phase-description">
            {phase.description}
            {"hormones" in phase ? (
              <span className="block mt-2 text-[var(--muted)]">{phase.hormones}</span>
            ) : null}
            {latestClosedCurrentCycleLength ? (
              <span className="block mt-2">
                Duración real del último ciclo cerrado: {latestClosedCurrentCycleLength} días.
              </span>
            ) : null}
          </p>
        </article>
      </section>

      <section className={`${activeView === "regla" ? "" : "hidden"}`}>
        <article className="card max-w-4xl">
          <h2 className="section-title">Histórico de reglas</h2>
          <div className="stack">
            {sortedPeriodLog.length === 0 ? (
              <p className="muted">Aún no hay registros de regla.</p>
            ) : (
              sortedPeriodLog.map((record) => (
                <div key={record.id} className="log-card">
                  <div>
                    <p className="log-title">
                      Inicio: {record.startDate}{" "}
                      {record.endDate ? `- Fin: ${record.endDate}` : "- En curso"}
                    </p>
                    {record.flow && record.flow.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {record.flow.map((f) => (
                          <span key={f.date} className="flow-tag">
                            {f.date.slice(5)} · {FLOW_LABELS[f.level]}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => removePeriodRecord(record.id)}
                  >
                    Borrar
                  </button>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      {/* ── PLANES view ─────────────────────────────────────────────────────── */}
      <section className={`mx-auto w-full max-w-4xl ${activeView === "planes" ? "" : "hidden"}`}>
        <PlanCard
          plans={trainingPlans}
          onAddPlan={addTrainingPlan}
          onDeletePlan={deleteTrainingPlan}
          onRenamePlan={renameTrainingPlan}
        />
      </section>

      {/* ── NUTRICION view ───────────────────────────────────────────────────── */}
      <section className={`grid gap-6 lg:grid-cols-2 ${activeView === "nutricion" ? "" : "hidden"}`}>
        <article className="card">
          <h2 className="section-title">Registrar peso corporal</h2>
          <p className="muted mb-3 text-sm">
            Solo peso en kg. Actualiza también el peso del perfil para cálculos nutricionales.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="field">
              <span>Fecha</span>
              <SpanishDatePicker value={measurementDate} onChange={setMeasurementDate} />
            </label>
            <label className="field">
              <span>Peso (kg)</span>
              <input
                type="text"
                inputMode="decimal"
                value={measurementWeight}
                onChange={(e) => setMeasurementWeight(e.target.value.replace(",", "."))}
                placeholder="ej. 56,5"
              />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="primary-button"
              type="button"
              onClick={saveWeightEntry}
              disabled={!canSaveWeight}
            >
              {editingMeasurementId ? "Guardar peso" : "Añadir peso"}
            </button>
            {editingMeasurementId ? (
              <button
                type="button"
                className="action-button action-end"
                onClick={cancelMeasurementEdit}
              >
                Cancelar
              </button>
            ) : null}
          </div>
          {hasHydrated && !canSaveWeight ? (
            <p className="mt-2 text-xs text-red-500">
              {measurementDate === DEFAULT_ISO_DATE
                ? "Selecciona una fecha válida."
                : "Introduce un peso válido en kg."}
            </p>
          ) : null}
        </article>

        <article className="card">
          <h2 className="section-title">Registrar medidas corporales</h2>
          <p className="muted mb-3 text-sm">
            Cintura, cadera y muslo en cm. Opcional: notas (hinchazón, hora, etc.).
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="field">
              <span>Fecha</span>
              <SpanishDatePicker value={measurementDate} onChange={setMeasurementDate} />
            </label>
            <label className="field">
              <span>Cintura (cm)</span>
              <input
                type="text"
                inputMode="decimal"
                value={measurementWaist}
                onChange={(e) => setMeasurementWaist(e.target.value.replace(",", "."))}
              />
            </label>
            <label className="field">
              <span>Cadera (cm)</span>
              <input
                type="text"
                inputMode="decimal"
                value={measurementHip}
                onChange={(e) => setMeasurementHip(e.target.value.replace(",", "."))}
              />
            </label>
            <label className="field">
              <span>Muslo (cm)</span>
              <input
                type="text"
                inputMode="decimal"
                value={measurementThigh}
                onChange={(e) => setMeasurementThigh(e.target.value.replace(",", "."))}
              />
            </label>
            <label className="field sm:col-span-2">
              <span>Notas</span>
              <textarea
                rows={2}
                value={measurementNotes}
                onChange={(e) => setMeasurementNotes(e.target.value)}
                placeholder="Retención, sensaciones, hora de la medición…"
              />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="primary-button"
              type="button"
              onClick={saveMeasuresEntry}
              disabled={!canSaveMeasures}
            >
              {editingMeasurementId ? "Guardar medidas" : "Añadir medidas"}
            </button>
            {editingMeasurementId ? (
              <button
                type="button"
                className="action-button action-end"
                onClick={cancelMeasurementEdit}
              >
                Cancelar
              </button>
            ) : null}
          </div>
          {hasHydrated && !canSaveMeasures ? (
            <p className="mt-2 text-xs text-red-500">
              {measurementDate === DEFAULT_ISO_DATE
                ? "Selecciona una fecha válida."
                : "Introduce al menos una medida o nota."}
            </p>
          ) : null}
        </article>

        <article className="card">
          <h2 className="section-title">Histórico de peso</h2>
          {weightGoalHint ? <p className="muted mb-3 text-sm">{weightGoalHint}</p> : null}
          <div className="stack">
            {weightHistoryEntries.length === 0 ? (
              <p className="muted">Aún no hay pesos registrados.</p>
            ) : (
              weightHistoryEntries.slice(0, 10).map((item) => (
                <div key={item.id} className="log-card">
                  <div>
                    <p className="log-title">
                      {item.date} · {item.weightKg} kg
                    </p>
                  </div>
                  <div className="log-card-actions">
                    <button
                      type="button"
                      className="edit-button"
                      onClick={() => startEditMeasurement(item)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => removeBodyMeasurement(item.id)}
                    >
                      Borrar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          {weightHistoryEntries.length > 10 ? (
            <p className="muted mt-2 text-xs">Mostrando los 10 registros más recientes.</p>
          ) : null}
        </article>

        <article className="card">
          <h2 className="section-title">Histórico de medidas</h2>
          <div className="stack">
            {measuresHistoryEntries.length === 0 ? (
              <p className="muted">Aún no hay medidas registradas.</p>
            ) : (
              measuresHistoryEntries.slice(0, 10).map((item) => (
                <div key={item.id} className="log-card">
                  <div>
                    <p className="log-title">
                      {item.date} · Cintura {item.waistCm ?? "—"} cm · Cadera {item.hipCm ?? "—"}{" "}
                      cm · Muslo {item.thighCm ?? "—"} cm
                    </p>
                    {item.notes ? <p className="log-notes">{item.notes}</p> : null}
                  </div>
                  <div className="log-card-actions">
                    <button
                      type="button"
                      className="edit-button"
                      onClick={() => startEditMeasurement(item)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => removeBodyMeasurement(item.id)}
                    >
                      Borrar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          {measuresHistoryEntries.length > 10 ? (
            <p className="muted mt-2 text-xs">Mostrando las 10 medidas más recientes.</p>
          ) : null}
        </article>
      </section>

      {/* ── ENTRENO view ─────────────────────────────────────────────────────── */}

      {/* Combined stats: sessions + volume in one bar */}
      <section className={activeView === "entreno" ? "" : "hidden"}>
        <TrainingMetricsBar hasHydrated={hasHydrated} stats={trainingStats} personalRecords={personalRecords} />
      </section>

      {/* Training form + history */}
      <section
        className={`grid gap-6 lg:grid-cols-2 lg:items-start ${activeView === "entreno" ? "" : "hidden"}`}
      >
        <TrainingFormCard
          form={form}
          loadExercisesForForm={loadExercisesForForm}
          latestLoadsForTemplate={latestLoadsForTemplate}
          customExercisesForTemplate={customExercisesByTemplate[form.newLogTemplate] ?? []}
          onSave={form.editingLogId ? saveEditLog : addTrainingLog}
          onCancel={form.resetForm}
          onAddCustomExercise={addCustomExerciseToTemplate}
          onRemoveCustomExercise={removeCustomExercise}
        />
        <TrainingHistoryPanel
          paginatedTrainingLogs={sessionHistory.paginatedTrainingLogs}
          filteredCount={sessionHistory.filteredTrainingLogs.length}
          trainingLogEmpty={trainingLog.length === 0}
          logProgressionById={logProgressionById}
          editingLogId={form.editingLogId}
          onEditLog={(log) => form.populateFormFromRecord(log)}
          onDeleteLog={removeTrainingLog}
          templates={trainingTemplates}
          sessionFilterMonth={sessionHistory.sessionFilterMonth}
          onFilterMonthChange={sessionHistory.setSessionFilterMonth}
          sessionFilterAll={sessionHistory.sessionFilterAll}
          onFilterAllChange={sessionHistory.setSessionFilterAll}
          availableMonths={sessionHistory.availableMonths}
          sessionPageClamped={sessionHistory.sessionPageClamped}
          sessionTotalPages={sessionHistory.sessionTotalPages}
          onPageChange={sessionHistory.setSessionPage}
        />
      </section>

      {/* Steps — below exercises */}
      <section className={`grid gap-6 ${activeView === "entreno" ? "" : "hidden"}`}>
        <StepsCard
          steps={steps}
          stepsStats={stepsStats}
          sortedStepsLog={sortedStepsLog}
          hasHydrated={hasHydrated}
          sessionStatus={sessionStatus}
          onSave={saveStepsEntry}
          onRemove={removeStepsEntry}
        />
      </section>

      {/* Progression + next session — full width below the 2-col grid */}
      <section className={activeView === "entreno" ? "" : "hidden"}>
        <NextSessionPanel
          nextSessionTargets={nextSessionTargets}
          dynamicProgressionRows={dynamicProgressionRows}
          progressionHorizonWeeks={progressionHorizonWeeks}
          onHorizonChange={setProgressionHorizonWeeks}
          selectedTemplateName={selectedTemplate?.name ?? "—"}
          hasTrainingData={trainingLog.length > 0}
        />
      </section>

      {/* Export + templates */}
      <section className={activeView === "entreno" ? "" : "hidden"}>
        <ExportCard
          trainingLog={trainingLog}
          exportMonth={exportMonth}
          onExportMonthChange={setExportMonth}
        />
        <TemplatesCard />
      </section>

      {/* ── Nutrition profile ─────────────────────────────────────────────────── */}
      <section className={`card ${activeView === "nutricion" ? "" : "hidden"}`}>
        <h2 className="section-title">Perfil y nutrición (orientativo)</h2>
        <p className="muted mb-3 text-sm">
          Datos por defecto: mujer, 28 años, 160 cm, 56 kg. Ajusta si cambian. Las cifras son
          aproximadas; no sustituyen orientación médica o de dietista.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="field">
            <span>Edad</span>
            <input
              type="number"
              min={16}
              max={90}
              value={profile.age}
              onChange={(e) => setProfile((p) => ({ ...p, age: Number(e.target.value) }))}
            />
          </label>
          <label className="field">
            <span>Altura (cm)</span>
            <input
              type="number"
              min={130}
              max={210}
              value={profile.heightCm}
              onChange={(e) => setProfile((p) => ({ ...p, heightCm: Number(e.target.value) }))}
            />
          </label>
          <label className="field">
            <span>Peso actual (kg)</span>
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={profileWeightDraft}
              onChange={(e) => {
                const raw = e.target.value.replace(",", ".");
                setProfileWeightDraft(raw);
                const n = parseOptionalNumber(raw);
                if (n != null && n >= 30 && n <= 250) setProfile((p) => ({ ...p, weightKg: n }));
              }}
              onBlur={commitProfileWeightFromDraft}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              placeholder="ej. 58,5"
            />
            {profileWeightOutOfRange ? (
              <span className="mt-1 block text-xs text-red-500">
                Introduce un peso entre 30 y 250 kg.
              </span>
            ) : null}
          </label>
          <div className="field">
            <span>Peso objetivo (kg)</span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <button
                type="button"
                className="load-stepper-btn"
                onClick={() =>
                  setProfile((p) => ({
                    ...p,
                    targetWeightKg: Math.round(((p.targetWeightKg ?? p.weightKg) - 0.5) * 10) / 10,
                  }))
                }
              >
                −
              </button>
              <input
                type="number"
                min={35}
                max={250}
                step={0.1}
                value={profile.targetWeightKg ?? ""}
                placeholder="opcional"
                style={{ width: "5.5rem" }}
                onChange={(e) => {
                  const v = e.target.value;
                  setProfile((p) => ({ ...p, targetWeightKg: v === "" ? null : Number(v) }));
                }}
              />
              <button
                type="button"
                className="load-stepper-btn"
                onClick={() =>
                  setProfile((p) => ({
                    ...p,
                    targetWeightKg: Math.round(((p.targetWeightKg ?? p.weightKg) + 0.5) * 10) / 10,
                  }))
                }
              >
                +
              </button>
            </div>
            {profile.targetWeightKg != null && (
              <span style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "0.25rem", display: "block" }}>
                {profile.weightKg} kg →{" "}
                <strong style={{ color: "var(--foreground)" }}>{profile.targetWeightKg} kg</strong>
                {"  "}
                <span style={{ color: profile.targetWeightKg < profile.weightKg ? "#16a34a" : profile.targetWeightKg > profile.weightKg ? "#dc2626" : "var(--muted)" }}>
                  ({profile.targetWeightKg > profile.weightKg ? "+" : ""}
                  {Math.round((profile.targetWeightKg - profile.weightKg) * 10) / 10} kg)
                </span>
              </span>
            )}
          </div>
          <label className="field">
            <span>Plazo al objetivo (semanas)</span>
            <input
              type="number"
              min={1}
              max={104}
              value={profile.weightGoalWeeks ?? ""}
              placeholder="opcional"
              onChange={(e) => {
                const v = e.target.value;
                setProfile((p) => ({ ...p, weightGoalWeeks: v === "" ? null : Number(v) }));
              }}
            />
          </label>
          <label className="field">
            <span>Actividad diaria</span>
            <select
              value={profile.activity}
              onChange={(e) =>
                setProfile((p) => ({ ...p, activity: e.target.value as ActivityLevel }))
              }
            >
              {(Object.keys(ACTIVITY_FACTORS) as ActivityLevel[]).map((key) => (
                <option key={key} value={key}>
                  {ACTIVITY_FACTORS[key].label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Inicio bloque progresión</span>
            <SpanishDatePicker
              value={profile.trainingBlockStart}
              onChange={(iso) => setProfile((p) => ({ ...p, trainingBlockStart: iso }))}
            />
          </label>
        </div>
        {weightGoalHint ? (
          <p className="phase-description mt-3 text-sm">{weightGoalHint}</p>
        ) : null}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <article className="metric-card">
            <p className="metric-label">TMB (aprox.)</p>
            <p className="metric-value-small">{bmr} kcal/día</p>
          </article>
          <article className="metric-card">
            <p className="metric-label">
              {weightGoal === "loss"
                ? "Objetivo calórico (déficit)"
                : weightGoal === "gain"
                  ? "Objetivo calórico (superávit)"
                  : "Gasto mantenimiento"}
            </p>
            <p className="metric-value-small">
              {targetCalories} kcal/día
              {weightGoal !== "maintenance" && (
                <span style={{ fontSize: "0.75rem", color: "var(--muted)", marginLeft: "0.4rem" }}>
                  (mant. {maintenanceTdee}{calorieAdjustment > 0 ? " +" : " "}{calorieAdjustment})
                </span>
              )}
            </p>
          </article>
          <article className="metric-card">
            <p className="metric-label">Proteína diaria</p>
            <p className="metric-value-small">
              {proteinDay.min}–{proteinDay.max} g (obj. ~{proteinDay.target} g)
            </p>
          </article>
        </div>
        <p className="phase-description mt-3 text-sm">
          En días con entreno, suma aprox. el gasto de la sesión a tu objetivo calórico. La proteína
          diaria suele mantenerse; en tren inferior o sesiones largas puedes acercarte al tramo alto del rango.
        </p>
        <div className="table-wrapper mt-4">
          <table>
            <thead>
              <tr>
                <th>Sesión (plantilla)</th>
                <th>kcal sesión (aprox.)</th>
                <th>kcal día total (aprox.)</th>
                <th>Proteína extra ese día (aprox.)</th>
              </tr>
            </thead>
            <tbody>
              {sessionNutritionByTemplate.map((row) => {
                const totals = dailyTotalOnTrainingDay(targetCalories, row);
                return (
                  <tr key={row.templateId}>
                    <td>{row.name}</td>
                    <td>
                      {row.sessionKcalMin}–{row.sessionKcalMax} kcal
                    </td>
                    <td>
                      {totals.kcalMin}–{totals.kcalMax} kcal
                    </td>
                    <td>
                      +{row.proteinExtraGramsMin}–{row.proteinExtraGramsMax} g sobre tu base diaria
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
