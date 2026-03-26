"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { formatDate, getCurrentCycleDay, getNextPeriodDate, getPhaseInfo } from "@/lib/cycle";
import {
  ACTIVITY_FACTORS,
  bmrFemaleKg,
  dailyTotalOnTrainingDay,
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
import { SpanishDatePicker } from "@/components/SpanishDatePicker";
import { trainingTemplates, type TrainingDayTemplate } from "@/data/trainingPlan";
import {
  formatLoadsForHistory,
  getLoadTrackedExercises,
  LOAD_SET_COUNT,
  maxWeightInEntry,
  type ExerciseLoadEntry,
} from "@/lib/trainingLoads";
// sessionFilters no longer needed — month picker replaced week options
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
  STEPS_LOG_KEY,
  todayIsoClient,
  TRAINING_LOG_KEY,
  USER_PROFILE_KEY,
} from "@/lib/appTypes";
import {
  loadBodyMeasurements,
  loadPeriodLog,
  loadProgressionHorizonWeeks,
  loadSettings,
  loadStepsLog,
  loadTrainingLog,
  loadUserProfile,
} from "@/lib/localAppStorage";
import {
  bumpLocalDataTimestamp,
  getLocalDataTimestamp,
  initLocalDataTimestampIfMissing,
  setLocalDataTimestamp,
} from "@/lib/localDataTimestamp";
import { buildSnapshot } from "@/lib/appSnapshot";
import { fetchRemoteSnapshot, pushRemoteSnapshot } from "@/lib/remoteAppState";

const SESSION_PAGE_SIZE = 5;

const REMOTE_SYNC_UI =
  typeof process.env.NEXT_PUBLIC_REMOTE_SYNC !== "undefined" &&
  process.env.NEXT_PUBLIC_REMOTE_SYNC === "true";

/** GET/PUT a Turso en el cliente: en desarrollo va desactivado salvo NEXT_PUBLIC_REMOTE_SYNC_DEV=true (evita cuelgues al abrir localhost). */
const REMOTE_SYNC_NETWORK =
  REMOTE_SYNC_UI &&
  (process.env.NODE_ENV !== "development" ||
    process.env.NEXT_PUBLIC_REMOTE_SYNC_DEV === "true");

function getTemplateById(id: string): TrainingDayTemplate | undefined {
  return trainingTemplates.find((template) => template.id === id);
}

export default function Home() {
  const { data: session, status: sessionStatus } = useSession();
  /** Evita "" u oscilaciones que re-disparen efectos de sync con cada render. */
  const sessionUserId =
    typeof session?.user?.id === "string" && session.user.id.length > 0 ? session.user.id : null;
  const [hasHydrated, setHasHydrated] = useState(false);
  const [settings, setSettings] = useState<PeriodSettings>(defaultSettings);
  const [trainingLog, setTrainingLog] = useState<TrainingRecord[]>([]);
  const [periodLog, setPeriodLog] = useState<PeriodRecord[]>([]);
  const [periodStartInput, setPeriodStartInput] = useState(DEFAULT_ISO_DATE);
  const [periodEndInput, setPeriodEndInput] = useState(DEFAULT_ISO_DATE);
  const [flowDateInput, setFlowDateInput] = useState(DEFAULT_ISO_DATE);
  const [newLogDate, setNewLogDate] = useState(DEFAULT_ISO_DATE);
  const [newLogTemplate, setNewLogTemplate] = useState(trainingTemplates[0].id);
  const [newLogEffort, setNewLogEffort] = useState<TrainingRecord["effort"]>(3);
  const [newLogNotes, setNewLogNotes] = useState("");
  const [newLogLoads, setNewLogLoads] = useState<Record<string, { w: string; r: string }[]>>({});
  /** true = editar cada serie por separado; false o ausente = misma carga en las 3 */
  const [loadDetailByExercise, setLoadDetailByExercise] = useState<Record<string, boolean>>({});
  const [progressionHorizonWeeks, setProgressionHorizonWeeks] = useState(6);
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [measurementLog, setMeasurementLog] = useState<BodyMeasurementRecord[]>([]);
  const [stepsLog, setStepsLog] = useState<StepsRecord[]>([]);
  const [measurementDate, setMeasurementDate] = useState(DEFAULT_ISO_DATE);
  const [stepDateInput, setStepDateInput] = useState(DEFAULT_ISO_DATE);
  const [stepCountInput, setStepCountInput] = useState("");
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [fitStepsStatus, setFitStepsStatus] = useState("");
  const [measurementWeight, setMeasurementWeight] = useState(String(defaultProfile.weightKg));
  const [measurementWaist, setMeasurementWaist] = useState("");
  const [measurementHip, setMeasurementHip] = useState("");
  const [measurementThigh, setMeasurementThigh] = useState("");
  const [measurementNotes, setMeasurementNotes] = useState("");
  const [activeView, setActiveViewRaw] = useState<ActiveView>("regla");
  useEffect(() => {
    const saved = localStorage.getItem("active-view-v1");
    if (saved === "regla" || saved === "entreno" || saved === "nutricion") {
      setActiveViewRaw(saved);
    }
  }, []);
  const setActiveView = (v: ActiveView) => {
    setActiveViewRaw(v);
    localStorage.setItem("active-view-v1", v);
  };
  const [sessionFilterMonth, setSessionFilterMonth] = useState("2000-01");
  useEffect(() => {
    const d = new Date();
    setSessionFilterMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }, []);
  const [sessionFilterAll, setSessionFilterAll] = useState(false);
  const [sessionPage, setSessionPage] = useState(0);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [remoteSyncOk, setRemoteSyncOk] = useState(false);
  const [remoteSyncMessage, setRemoteSyncMessage] = useState("");
  /** Solo true mientras dura el GET /api/app-state (evita "Sincronizando..." eterno si hay error). */
  const [syncPullInFlight, setSyncPullInFlight] = useState(false);
  const [sessionLoadingTimedOut, setSessionLoadingTimedOut] = useState(false);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteApplyRef = useRef(false);
  const syncedDataSerializedRef = useRef<string | null>(null);
  const remotePullGenRef = useRef(0);
  /** Tras un pull terminado (ok o error), no volver a disparar hasta logout o cambio de cuenta. */
  const remotePullDoneForUserRef = useRef<string | null>(null);
  /** null = aun no sabemos; false = faltan AUTH_GOOGLE_* en el servidor. */
  const [authGoogleConfigured, setAuthGoogleConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    void fetch("/api/sync-status")
      .then((r) => r.json())
      .then((d: { googleOAuthConfigured?: boolean }) => {
        setAuthGoogleConfigured(Boolean(d.googleOAuthConfigured));
      })
      .catch(() => setAuthGoogleConfigured(false));
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    if (sessionStatus !== "authenticated") return;
    if (!stepDateInput || stepDateInput === DEFAULT_ISO_DATE) return;
    if (editingStepId) return;

    let cancelled = false;
    void fetch(`/api/google-fit/steps?date=${encodeURIComponent(stepDateInput)}`, {
      credentials: "include",
    })
      .then(async (res) => {
        const payload = (await res.json().catch(() => ({}))) as { steps?: number; error?: string };
        if (!res.ok) {
          throw new Error(payload.error ?? "No se pudieron cargar pasos desde Google Fit.");
        }
        if (typeof payload.steps !== "number" || !Number.isFinite(payload.steps) || payload.steps < 0) {
          throw new Error("Google Fit devolvio un valor de pasos invalido.");
        }
        if (cancelled) return;
        setStepCountInput(String(Math.round(payload.steps)));
        setFitStepsStatus("Pasos cargados desde Google Fit.");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "No se pudieron cargar pasos desde Google Fit.";
        setFitStepsStatus(message);
      });

    return () => {
      cancelled = true;
    };
  }, [editingStepId, hasHydrated, sessionStatus, stepDateInput]);

  useEffect(() => {
    const s = loadSettings();
    const prof = loadUserProfile();
    const today = todayIsoClient();
    queueMicrotask(() => {
      initLocalDataTimestampIfMissing();
      setProgressionHorizonWeeks(loadProgressionHorizonWeeks());
      setSettings(s);
      setPeriodStartInput(s.lastPeriodStart);
      setTrainingLog(loadTrainingLog());
      setPeriodLog(loadPeriodLog());
      setProfile(prof);
      setMeasurementWeight(String(prof.weightKg));
      setMeasurementLog(loadBodyMeasurements());
      setStepsLog(loadStepsLog());
      setPeriodEndInput(today);
      setFlowDateInput(today);
      setNewLogDate(today);
      setStepDateInput(today);
      setMeasurementDate(today);
      setHasHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    localStorage.setItem(PERIOD_SETTINGS_KEY, JSON.stringify(settings));
  }, [settings, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    localStorage.setItem(TRAINING_LOG_KEY, JSON.stringify(trainingLog));
  }, [trainingLog, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    localStorage.setItem(PERIOD_LOG_KEY, JSON.stringify(periodLog));
  }, [periodLog, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
  }, [profile, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    localStorage.setItem(BODY_MEASUREMENTS_KEY, JSON.stringify(measurementLog));
  }, [measurementLog, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    localStorage.setItem(STEPS_LOG_KEY, JSON.stringify(stepsLog));
  }, [stepsLog, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    localStorage.setItem(PROGRESSION_HORIZON_KEY, String(progressionHorizonWeeks));
  }, [progressionHorizonWeeks, hasHydrated]);

  useEffect(() => {
    if (sessionStatus !== "loading") {
      setSessionLoadingTimedOut(false);
      return;
    }
    const t = setTimeout(() => setSessionLoadingTimedOut(true), 10000);
    return () => clearTimeout(t);
  }, [sessionStatus]);

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
    if (remotePullDoneForUserRef.current === sessionUserId) {
      return;
    }
    const gen = (remotePullGenRef.current += 1);
    setRemoteSyncOk(false);
    setRemoteSyncMessage("");
    setSyncPullInFlight(true);
    void (async () => {
      const { snapshot, error, needsAuth } = await fetchRemoteSnapshot();
      if (gen !== remotePullGenRef.current) return;
      if (error) {
        setSyncPullInFlight(false);
        if (needsAuth) {
          setRemoteSyncMessage("Sesion no valida: vuelve a entrar con Google.");
        } else {
          setRemoteSyncMessage(error);
        }
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
      setMeasurementLog(snapshot.measurementLog);
      setStepsLog(snapshot.stepsLog ?? []);
      if (snapshot.preferences?.progressionHorizonWeeks) {
        setProgressionHorizonWeeks(snapshot.preferences.progressionHorizonWeeks);
      }
      setLocalDataTimestamp(snapshot.updatedAt);
      remotePullDoneForUserRef.current = sessionUserId;
    })();
    return () => {
      remotePullGenRef.current += 1;
    };
  }, [hasHydrated, sessionUserId, sessionStatus, sessionLoadingTimedOut]);

  useEffect(() => {
    if (!hasHydrated) return;
    const pack = {
      settings,
      trainingLog,
      periodLog,
      profile,
      measurementLog,
      stepsLog,
      progressionHorizonWeeks,
    };
    const next = JSON.stringify(pack);
    if (remoteApplyRef.current) {
      syncedDataSerializedRef.current = next;
      queueMicrotask(() => {
        remoteApplyRef.current = false;
      });
      return;
    }
    if (syncedDataSerializedRef.current === null) {
      syncedDataSerializedRef.current = next;
      return;
    }
    if (syncedDataSerializedRef.current === next) return;
    syncedDataSerializedRef.current = next;
    // Ceder el hilo antes de tocar localStorage (marca de tiempo); reduce picos al editar datos grandes.
    const t = window.setTimeout(() => {
      bumpLocalDataTimestamp();
    }, 0);
    return () => window.clearTimeout(t);
  }, [hasHydrated, settings, trainingLog, periodLog, profile, measurementLog, stepsLog, progressionHorizonWeeks]);

  useEffect(() => {
    if (!hasHydrated || !REMOTE_SYNC_NETWORK || !remoteSyncOk) return;
    if (sessionStatus !== "authenticated" || !sessionUserId) return;
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => {
      pushTimerRef.current = null;
      const snap = buildSnapshot({
        settings,
        trainingLog,
        periodLog,
        profile,
        measurementLog,
        stepsLog,
        preferences: { progressionHorizonWeeks },
      });
      void (async () => {
        const { ok, error, updatedAt } = await pushRemoteSnapshot(snap);
        if (!ok) {
          queueMicrotask(() => setRemoteSyncMessage(error ?? "Error al guardar en el servidor"));
        } else {
          queueMicrotask(() => setRemoteSyncMessage(""));
          if (typeof updatedAt === "number") {
            setLocalDataTimestamp(updatedAt);
          }
        }
      })();
    }, 1200);
    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
  }, [
    hasHydrated,
    remoteSyncOk,
    sessionUserId,
    sessionStatus,
    settings,
    trainingLog,
    periodLog,
    profile,
    measurementLog,
    stepsLog,
    progressionHorizonWeeks,
  ]);

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
          "Has marcado que la regla sigue activa. Prioriza recuperacion y adapta la carga segun sensaciones.",
      }
    : basePhase;
  const nextPeriod = useMemo(
    () => getNextPeriodDate(settings.lastPeriodStart, settings.cycleLength),
    [settings.lastPeriodStart, settings.cycleLength],
  );
  const daysToNext = useMemo(
    () =>
      Math.max(
        0,
        Math.ceil((nextPeriod.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
      ),
    [nextPeriod],
  );

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    for (const log of trainingLog) set.add(log.date.slice(0, 7));
    return [...set].sort().reverse();
  }, [trainingLog]);

  const filteredTrainingLogs = useMemo(() => {
    const list = [...trainingLog].sort((a, b) => b.date.localeCompare(a.date));
    if (sessionFilterAll) return list;
    return list.filter((l) => l.date.startsWith(sessionFilterMonth));
  }, [trainingLog, sessionFilterAll, sessionFilterMonth]);

  const sessionTotalPages = Math.max(1, Math.ceil(filteredTrainingLogs.length / SESSION_PAGE_SIZE));
  const sessionPageClamped = Math.min(sessionPage, sessionTotalPages - 1);

  const paginatedTrainingLogs = useMemo(() => {
    const start = sessionPageClamped * SESSION_PAGE_SIZE;
    return filteredTrainingLogs.slice(start, start + SESSION_PAGE_SIZE);
  }, [filteredTrainingLogs, sessionPageClamped]);

  const selectedTemplate = useMemo(
    () => trainingTemplates.find((template) => template.id === newLogTemplate),
    [newLogTemplate],
  );

  const bmr = useMemo(
    () => bmrFemaleKg(profile.weightKg, profile.heightCm, profile.age),
    [profile.weightKg, profile.heightCm, profile.age],
  );
  const maintenanceTdee = useMemo(() => tdeeMaintenance(bmr, profile.activity), [bmr, profile.activity]);
  const proteinDay = useMemo(() => proteinDailyGrams(profile.weightKg), [profile.weightKg]);

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
      if (log.templateId !== newLogTemplate) continue;
      for (const entry of log.exerciseLoads ?? []) {
        map.set(entry.exerciseName, maxWeightInEntry(entry));
      }
    }
    return map;
  }, [trainingLog, newLogTemplate]);

  const dynamicProgressionRows = useMemo(() => {
    const steps = Math.max(1, Math.floor(progressionHorizonWeeks / 2));
    const reference = progressionByTemplate[newLogTemplate] ?? [];
    const stepByExercise = new Map(reference.map((item) => [item.name, item.stepKgPerFortnight]));
    const rows: { exerciseName: string; currentKg: number; targetKg: number; weeklyGain: number }[] = [];
    latestLoadsForTemplate.forEach((currentKg, exerciseName) => {
      const step = stepByExercise.get(exerciseName) ?? 1;
      const targetKg = Number((currentKg + step * steps).toFixed(1));
      rows.push({
        exerciseName,
        currentKg,
        targetKg,
        weeklyGain: Number((step / 2).toFixed(2)),
      });
    });
    return rows.sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));
  }, [latestLoadsForTemplate, newLogTemplate, progressionHorizonWeeks]);
  const sortedPeriodLog = useMemo(
    () => [...periodLog].sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [periodLog],
  );
  const sortedMeasurementLog = useMemo(
    () => [...measurementLog].sort((a, b) => b.date.localeCompare(a.date)),
    [measurementLog],
  );
  const periodDaysInCourse = useMemo(() => {
    if (!settings.isPeriodOngoing) return 0;
    const start = new Date(`${settings.lastPeriodStart}T00:00:00`);
    const today = new Date();
    return Math.max(1, Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  }, [settings.isPeriodOngoing, settings.lastPeriodStart]);

  function parseOptionalNumber(value: string): number | null {
    const clean = value.trim().replace(",", ".");
    if (!clean) return null;
    const parsed = Number(clean);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function emptySetRow(): { w: string; r: string } {
    return { w: "", r: "" };
  }

  function getFormSetsForExercise(exerciseName: string): { w: string; r: string }[] {
    const row = newLogLoads[exerciseName];
    if (!row) return Array.from({ length: LOAD_SET_COUNT }, () => emptySetRow());
    return [...row, ...Array.from({ length: LOAD_SET_COUNT }, () => emptySetRow())].slice(0, LOAD_SET_COUNT);
  }

  function addTrainingLog() {
    const tracked = selectedTemplate ? getLoadTrackedExercises(selectedTemplate) : [];
    const parsedLoads: ExerciseLoadEntry[] = [];
    for (const ex of tracked) {
      const rows = getFormSetsForExercise(ex.name);
      const sets: { weightKg: number; reps: number }[] = [];
      for (let i = 0; i < LOAD_SET_COUNT; i += 1) {
        const w = parseOptionalNumber(rows[i]?.w ?? "");
        const r = parseOptionalNumber(rows[i]?.r ?? "");
        const hasW = w != null && w > 0;
        const hasR = r != null && r > 0;
        if (hasW || hasR) {
          sets.push({
            weightKg: hasW ? w! : 0,
            reps: hasR ? Math.round(r!) : 0,
          });
        }
      }
      if (sets.length > 0) {
        parsedLoads.push({ exerciseName: ex.name, sets });
      }
    }

    const record: TrainingRecord = {
      id: crypto.randomUUID(),
      date: newLogDate,
      templateId: newLogTemplate,
      effort: newLogEffort,
      notes: newLogNotes.trim(),
      exerciseLoads: parsedLoads,
    };
    setTrainingLog((current) => [record, ...current]);
    setNewLogNotes("");
    setNewLogLoads({});
    setLoadDetailByExercise({});
  }

  function removeTrainingLog(id: string) {
    setTrainingLog((current) => current.filter((item) => item.id !== id));
    if (editingLogId === id) setEditingLogId(null);
  }

  function startEditLog(log: TrainingRecord) {
    setNewLogDate(log.date);
    setNewLogTemplate(log.templateId);
    setNewLogEffort(log.effort);
    setNewLogNotes(log.notes);
    const loads: Record<string, { w: string; r: string }[]> = {};
    const details: Record<string, boolean> = {};
    for (const entry of log.exerciseLoads ?? []) {
      const rows = entry.sets.map((s) => ({ w: s.weightKg > 0 ? String(s.weightKg) : "", r: s.reps > 0 ? String(s.reps) : "" }));
      while (rows.length < LOAD_SET_COUNT) rows.push({ w: "", r: "" });
      loads[entry.exerciseName] = rows.slice(0, LOAD_SET_COUNT);
      const allSame = rows.length >= 2 && rows.every((r) => r.w === rows[0].w && r.r === rows[0].r);
      details[entry.exerciseName] = !allSame;
    }
    setNewLogLoads(loads);
    setLoadDetailByExercise(details);
    setEditingLogId(log.id);
  }

  function saveEditLog() {
    if (!editingLogId) return;
    const tracked = selectedTemplate ? getLoadTrackedExercises(selectedTemplate) : [];
    const parsedLoads: ExerciseLoadEntry[] = [];
    for (const ex of tracked) {
      const rows = getFormSetsForExercise(ex.name);
      const sets: { weightKg: number; reps: number }[] = [];
      for (let i = 0; i < LOAD_SET_COUNT; i += 1) {
        const w = parseOptionalNumber(rows[i]?.w ?? "");
        const r = parseOptionalNumber(rows[i]?.r ?? "");
        if ((w != null && w > 0) || (r != null && r > 0)) {
          sets.push({ weightKg: w ?? 0, reps: r ? Math.round(r) : 0 });
        }
      }
      if (sets.length > 0) parsedLoads.push({ exerciseName: ex.name, sets });
    }
    setTrainingLog((current) =>
      current.map((item) =>
        item.id === editingLogId
          ? { ...item, date: newLogDate, templateId: newLogTemplate, effort: newLogEffort, notes: newLogNotes.trim(), exerciseLoads: parsedLoads }
          : item,
      ),
    );
    setEditingLogId(null);
    setNewLogNotes("");
    setNewLogLoads({});
    setLoadDetailByExercise({});
  }

  function cancelEdit() {
    setEditingLogId(null);
    setNewLogNotes("");
    setNewLogLoads({});
    setLoadDetailByExercise({});
  }

  function registerPeriodStart(date: string) {
    const newRecord: PeriodRecord = {
      id: crypto.randomUUID(),
      startDate: date,
      endDate: null,
      flow: [],
    };
    setPeriodLog((current) => [newRecord, ...current.map((item) => (item.endDate ? item : { ...item, endDate: date }))]);
    setSettings((current) => ({
      ...current,
      lastPeriodStart: date,
      isPeriodOngoing: true,
    }));
  }

  function endCurrentPeriod(endDate: string) {
    setPeriodLog((current) => {
      const openIndex = current.findIndex((item) => item.endDate === null);
      if (openIndex === -1) return current;
      const openRecord = current[openIndex];
      if (endDate < openRecord.startDate) return current;
      return current.map((item, index) => (index === openIndex ? { ...item, endDate } : item));
    });
    setSettings((current) => ({ ...current, isPeriodOngoing: false }));
  }

  function addFlowEntry(date: string, level: FlowLevel) {
    setPeriodLog((current) => {
      const openIndex = current.findIndex((item) => item.endDate === null);
      if (openIndex === -1) return current;
      const record = current[openIndex];
      const flow = (record.flow ?? []).filter((f) => f.date !== date);
      flow.push({ date, level });
      flow.sort((a, b) => a.date.localeCompare(b.date));
      return current.map((item, idx) => (idx === openIndex ? { ...item, flow } : item));
    });
  }

  function removeFlowEntry(date: string) {
    setPeriodLog((current) => {
      const openIndex = current.findIndex((item) => item.endDate === null);
      if (openIndex === -1) return current;
      const record = current[openIndex];
      const flow = (record.flow ?? []).filter((f) => f.date !== date);
      return current.map((item, idx) => (idx === openIndex ? { ...item, flow } : item));
    });
  }

  const openPeriod = useMemo(
    () => periodLog.find((item) => item.endDate === null) ?? null,
    [periodLog],
  );

  function removePeriodRecord(id: string) {
    setPeriodLog((current) => current.filter((item) => item.id !== id));
  }

  function addBodyMeasurement() {
    const record: BodyMeasurementRecord = {
      id: crypto.randomUUID(),
      date: measurementDate,
      weightKg: parseOptionalNumber(measurementWeight),
      waistCm: parseOptionalNumber(measurementWaist),
      hipCm: parseOptionalNumber(measurementHip),
      thighCm: parseOptionalNumber(measurementThigh),
      notes: measurementNotes.trim(),
    };
    setMeasurementLog((current) => [record, ...current]);
    if (record.weightKg) {
      setProfile((current) => ({ ...current, weightKg: record.weightKg ?? current.weightKg }));
    }
    setMeasurementNotes("");
  }

  function removeBodyMeasurement(id: string) {
    setMeasurementLog((current) => current.filter((item) => item.id !== id));
  }

  function parseStepsInput(value: string): number | null {
    const onlyDigits = value.replace(/[^\d]/g, "");
    if (!onlyDigits) return null;
    const n = Number(onlyDigits);
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.round(n);
  }

  function saveStepsEntry() {
    const parsed = parseStepsInput(stepCountInput);
    if (parsed == null) return;
    if (editingStepId) {
      setStepsLog((current) =>
        current.map((item) => (item.id === editingStepId ? { ...item, date: stepDateInput, steps: parsed } : item)),
      );
    } else {
      const newEntry: StepsRecord = {
        id: crypto.randomUUID(),
        date: stepDateInput,
        steps: parsed,
      };
      setStepsLog((current) => [newEntry, ...current]);
    }
    setEditingStepId(null);
    setStepCountInput("");
  }

  function startEditSteps(entry: StepsRecord) {
    setEditingStepId(entry.id);
    setStepDateInput(entry.date);
    setStepCountInput(String(entry.steps));
  }

  function cancelEditSteps() {
    setEditingStepId(null);
    setStepCountInput("");
  }

  function removeStepsEntry(id: string) {
    setStepsLog((current) => current.filter((item) => item.id !== id));
    if (editingStepId === id) {
      setEditingStepId(null);
      setStepCountInput("");
    }
  }

  function updateSetLoad(exerciseName: string, setIndex: number, field: "w" | "r", value: string) {
    setNewLogLoads((current) => {
      const prev = current[exerciseName] ?? Array.from({ length: LOAD_SET_COUNT }, () => emptySetRow());
      const next = prev.map((cell, idx) => (idx === setIndex ? { ...cell, [field]: value } : cell));
      while (next.length < LOAD_SET_COUNT) next.push(emptySetRow());
      return { ...current, [exerciseName]: next.slice(0, LOAD_SET_COUNT) };
    });
  }

  function updateUniformLoad(exerciseName: string, field: "w" | "r", value: string) {
    setNewLogLoads((current) => {
      const prev = current[exerciseName] ?? Array.from({ length: LOAD_SET_COUNT }, () => emptySetRow());
      const base = { ...prev[0], [field]: value };
      const triple = [base, base, base].map((s) => ({ ...s }));
      return { ...current, [exerciseName]: triple };
    });
  }

  function setLoadDetailMode(exerciseName: string, wantDetail: boolean) {
    if (!wantDetail) {
      setNewLogLoads((current) => {
        const prev = current[exerciseName] ?? Array.from({ length: LOAD_SET_COUNT }, () => emptySetRow());
        const first = prev[0] ?? emptySetRow();
        return { ...current, [exerciseName]: [first, first, first].map((s) => ({ ...s })) };
      });
    }
    setLoadDetailByExercise((prev) => ({ ...prev, [exerciseName]: wantDetail }));
  }

  function isLoadDetail(exerciseName: string): boolean {
    return loadDetailByExercise[exerciseName] === true;
  }

  const trainingStats = useMemo(() => {
    if (!hasHydrated) return { week: 0, month: 0, year: 0 };
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
    let week = 0, month = 0, year = 0;
    for (const entry of trainingLog) {
      if (entry.date >= mondayIso) week++;
      if (entry.date.startsWith(monthPrefix)) month++;
      if (entry.date.startsWith(yearPrefix)) year++;
    }
    return { week, month, year };
  }, [trainingLog, hasHydrated]);

  const stepsStats = useMemo(() => {
    if (!hasHydrated) return { month: 0, year: 0 };
    const now = new Date();
    const yearPrefix = `${now.getFullYear()}-`;
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-`;
    let month = 0;
    let year = 0;
    for (const entry of stepsLog) {
      if (entry.date.startsWith(monthPrefix)) month += entry.steps;
      if (entry.date.startsWith(yearPrefix)) year += entry.steps;
    }
    return { month, year };
  }, [stepsLog, hasHydrated]);

  const sortedStepsLog = useMemo(
    () => [...stepsLog].sort((a, b) => (a.date === b.date ? b.id.localeCompare(a.id) : b.date.localeCompare(a.date))),
    [stepsLog],
  );

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-8">
      <header className="card">
        <p className="eyebrow">Control de ciclo + entrenamiento</p>
        <h1 className="title">Tu panel semanal</h1>
        <p className="muted">
          Registra tu regla, mira en que fase estas y guarda tus sesiones de entreno en un solo sitio.
        </p>
      </header>

      <section className="view-tabs">
        <button
          type="button"
          className={`view-tab ${activeView === "regla" ? "is-active" : ""}`}
          onClick={() => setActiveView("regla")}
        >
          Regla
        </button>
        <button
          type="button"
          className={`view-tab ${activeView === "entreno" ? "is-active" : ""}`}
          onClick={() => setActiveView("entreno")}
        >
          Ejercicio
        </button>
        <button
          type="button"
          className={`view-tab ${activeView === "nutricion" ? "is-active" : ""}`}
          onClick={() => setActiveView("nutricion")}
        >
          Peso y nutricion
        </button>
      </section>

      <section className="account-bar">
        {sessionStatus === "loading" && !sessionLoadingTimedOut ? (
          <span className="muted text-xs">Comprobando sesion...</span>
        ) : sessionStatus === "unauthenticated" || (sessionStatus === "loading" && sessionLoadingTimedOut) ? (
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
              <span className="font-medium">{session?.user?.name ?? "Sesion"}</span>
              {session?.user?.email ? <span className="muted"> · {session.user.email}</span> : null}
            </span>
            <button type="button" className="account-bar-btn" onClick={() => void signOut({ callbackUrl: "/" })}>
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

      <section className={`grid gap-4 md:grid-cols-4 ${activeView === "regla" ? "" : "hidden"}`}>
        <article className="metric-card">
          <p className="metric-label">Dia de ciclo</p>
          <p className="metric-value">{hasHydrated ? cycleDay : "—"}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Fase actual</p>
          <p className="metric-value-small">{hasHydrated ? phase.name : "—"}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Proxima regla</p>
          <p className="metric-value-small">{hasHydrated ? formatDate(nextPeriod) : "—"}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Dias restantes</p>
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
                className="action-button action-start"
                type="button"
                onClick={() => registerPeriodStart(periodStartInput)}
              >
                Me ha venido la regla
              </button>
            </>
          ) : (
            <>
              <p className="phase-description mb-3">
                Regla en curso desde {settings.lastPeriodStart} ({periodDaysInCourse} dias).
              </p>

              <div className="mb-4">
                <p className="block-title mb-2">Registrar sangrado</p>
                <label className="field mb-2">
                  <span>Dia</span>
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
                        onClick={() => isActive ? removeFlowEntry(flowDateInput) : addFlowEntry(flowDateInput, level)}
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

              <div className="mt-4 pt-3 border-t border-[var(--border)]">
                <p className="block-title mb-2">Fin de regla</p>
                <label className="field mb-2">
                  <span>Ultimo dia con regla</span>
                  <SpanishDatePicker value={periodEndInput} onChange={setPeriodEndInput} />
                </label>
                <button
                  className="action-button action-end"
                  type="button"
                  onClick={() => endCurrentPeriod(periodEndInput)}
                >
                  Se me ha ido la regla
                </button>
              </div>
            </>
          )}
        </article>

        <article className="card">
          <h2 className="section-title">Ajustes del ciclo</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="field">
              <span>Ultimo inicio de regla</span>
              <SpanishDatePicker
                value={settings.lastPeriodStart}
                onChange={(iso) => setSettings((current) => ({ ...current, lastPeriodStart: iso }))}
              />
            </label>
            <label className="field">
              <span>Duracion del ciclo (dias)</span>
              <input
                type="number"
                min={20}
                max={40}
                value={settings.cycleLength}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    cycleLength: Number(event.target.value),
                  }))
                }
              />
            </label>
            <label className="field">
              <span>Duracion de regla (dias)</span>
              <input
                type="number"
                min={2}
                max={10}
                value={settings.periodLength}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    periodLength: Number(event.target.value),
                  }))
                }
              />
            </label>
          </div>
          <p className="phase-description">
            {phase.description}
            {latestClosedCurrentCycleLength ? (
              <span className="block mt-2">Duracion real del ultimo ciclo cerrado: {latestClosedCurrentCycleLength} dias.</span>
            ) : null}
          </p>
        </article>
      </section>

      <section className={`grid gap-6 lg:grid-cols-2 ${activeView === "nutricion" ? "" : "hidden"}`}>
        <article className="card">
          <h2 className="section-title">Registro de peso y medidas</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="field">
              <span>Fecha</span>
              <SpanishDatePicker value={measurementDate} onChange={setMeasurementDate} />
            </label>
            <label className="field">
              <span>Peso (kg)</span>
              <input
                type="number"
                step={0.1}
                value={measurementWeight}
                onChange={(event) => setMeasurementWeight(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Cintura (cm)</span>
              <input type="number" step={0.1} value={measurementWaist} onChange={(event) => setMeasurementWaist(event.target.value)} />
            </label>
            <label className="field">
              <span>Cadera (cm)</span>
              <input type="number" step={0.1} value={measurementHip} onChange={(event) => setMeasurementHip(event.target.value)} />
            </label>
            <label className="field">
              <span>Muslo (cm)</span>
              <input type="number" step={0.1} value={measurementThigh} onChange={(event) => setMeasurementThigh(event.target.value)} />
            </label>
            <label className="field sm:col-span-2 lg:col-span-3">
              <span>Notas</span>
              <textarea
                rows={2}
                value={measurementNotes}
                onChange={(event) => setMeasurementNotes(event.target.value)}
                placeholder="Retencion, sensaciones, hora de la medicion..."
              />
            </label>
          </div>
          <button className="primary-button" type="button" onClick={addBodyMeasurement}>
            Guardar medicion
          </button>
        </article>

        <article className="card">
          <h2 className="section-title">Historico de peso y medidas</h2>
          <div className="stack">
            {sortedMeasurementLog.length === 0 ? (
              <p className="muted">Aun no hay mediciones guardadas.</p>
            ) : (
              sortedMeasurementLog.map((item) => (
                <div key={item.id} className="log-card">
                  <div>
                    <p className="log-title">
                      {item.date} · Peso {item.weightKg ?? "-"} kg · Cintura {item.waistCm ?? "-"} cm · Cadera{" "}
                      {item.hipCm ?? "-"} cm · Muslo {item.thighCm ?? "-"} cm
                    </p>
                    {item.notes ? <p className="log-notes">{item.notes}</p> : null}
                  </div>
                  <button type="button" className="danger-button" onClick={() => removeBodyMeasurement(item.id)}>
                    Borrar
                  </button>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className={`${activeView === "regla" ? "" : "hidden"}`}>
        <article className="card max-w-4xl">
          <h2 className="section-title">Historico de reglas</h2>
          <div className="stack">
            {sortedPeriodLog.length === 0 ? (
              <p className="muted">Aun no hay registros de regla.</p>
            ) : (
              sortedPeriodLog.map((record) => (
                <div key={record.id} className="log-card">
                  <div>
                    <p className="log-title">
                      Inicio: {record.startDate} {record.endDate ? `- Fin: ${record.endDate}` : "- En curso"}
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
                  <button type="button" className="danger-button" onClick={() => removePeriodRecord(record.id)}>
                    Borrar
                  </button>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className={`grid gap-4 md:grid-cols-3 ${activeView === "entreno" ? "" : "hidden"}`}>
        <article className="metric-card">
          <p className="metric-label">Esta semana</p>
          <p className="metric-value">{hasHydrated ? trainingStats.week : "—"}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Este mes</p>
          <p className="metric-value">{hasHydrated ? trainingStats.month : "—"}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Este año</p>
          <p className="metric-value">{hasHydrated ? trainingStats.year : "—"}</p>
        </article>
      </section>

      <section className={`grid gap-6 ${activeView === "entreno" ? "" : "hidden"}`}>
        <article className="card">
          <h2 className="section-title">Pasos diarios</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="field">
              <span>Fecha</span>
              <SpanishDatePicker value={stepDateInput} onChange={setStepDateInput} />
            </label>
            <label className="field">
              <span>Pasos</span>
              <input
                type="text"
                inputMode="numeric"
                value={stepCountInput}
                onChange={(event) => setStepCountInput(event.target.value)}
                placeholder="ej. 8450"
              />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="primary-button" type="button" onClick={saveStepsEntry}>
              {editingStepId ? "Guardar pasos" : "Añadir pasos"}
            </button>
            {editingStepId ? (
              <button className="action-button action-end" type="button" onClick={cancelEditSteps}>
                Cancelar
              </button>
            ) : null}
          </div>
          {sessionStatus === "authenticated" ? (
            <p className="muted mt-2 text-xs">
              {fitStepsStatus || "Los pasos se autocompletan desde Google Fit para la fecha elegida."}
            </p>
          ) : null}
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <article className="metric-card">
              <p className="metric-label">Pasos este mes</p>
              <p className="metric-value-small">{hasHydrated ? stepsStats.month.toLocaleString("es-ES") : "—"}</p>
            </article>
            <article className="metric-card">
              <p className="metric-label">Pasos este año</p>
              <p className="metric-value-small">{hasHydrated ? stepsStats.year.toLocaleString("es-ES") : "—"}</p>
            </article>
          </div>
          <div className="stack mt-4">
            {sortedStepsLog.length === 0 ? (
              <p className="muted text-sm">Todavia no has registrado pasos.</p>
            ) : (
              sortedStepsLog.slice(0, 10).map((entry) => (
                <div key={entry.id} className="log-card">
                  <div>
                    <p className="log-title">{entry.date}</p>
                    <p className="muted text-sm">{entry.steps.toLocaleString("es-ES")} pasos</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="action-button action-end" onClick={() => startEditSteps(entry)}>
                      Editar
                    </button>
                    <button type="button" className="danger-button" onClick={() => removeStepsEntry(entry.id)}>
                      Borrar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          {sortedStepsLog.length > 10 ? (
            <p className="muted mt-2 text-xs">Mostrando las 10 fechas mas recientes.</p>
          ) : null}
        </article>
      </section>

      <section className={`grid gap-6 lg:grid-cols-2 lg:items-start ${activeView === "entreno" ? "" : "hidden"}`}>
        <article className="card">
          <h2 className="section-title">{editingLogId ? "Editar sesion" : "Añadir registro de entreno"}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="field">
              <span>Fecha</span>
              <SpanishDatePicker value={newLogDate} onChange={setNewLogDate} />
            </label>
            <label className="field">
              <span>Sesion</span>
              <select
                value={newLogTemplate}
                onChange={(event) => {
                  setNewLogTemplate(event.target.value);
                  setNewLogLoads({});
                  setLoadDetailByExercise({});
                }}
              >
                {trainingTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Esfuerzo (1-5)</span>
              <select
                value={newLogEffort}
                onChange={(event) => setNewLogEffort(Number(event.target.value) as TrainingRecord["effort"])}
              >
                {[1, 2, 3, 4, 5].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className="field sm:col-span-2">
              <span>Notas</span>
              <textarea
                rows={3}
                value={newLogNotes}
                onChange={(event) => setNewLogNotes(event.target.value)}
                placeholder="Como te sentiste? Subiste peso? Como fue la recuperacion?"
              />
            </label>
          </div>
          {selectedTemplate ? (
            <div className="mt-4">
              <p className="block-title">Cargas por ejercicio</p>
              <p className="muted mb-3 text-xs">
                Por defecto: una sola fila de kg y reps (se copia a las 3 series). Activa &quot;Detalle por serie&quot;
                solo si cambiaste peso o repeticiones entre series.
              </p>
              <div className="load-exercise-stack">
                {getLoadTrackedExercises(selectedTemplate).map((exercise) => {
                  const sets = getFormSetsForExercise(exercise.name);
                  const detail = isLoadDetail(exercise.name);
                  return (
                    <div key={exercise.name} className="load-exercise-card">
                      <div className="load-exercise-card-head">
                        <span className="load-exercise-name">{exercise.name}</span>
                        <label className="load-detail-toggle">
                          <input
                            type="checkbox"
                            checked={detail}
                            onChange={(event) => setLoadDetailMode(exercise.name, event.target.checked)}
                          />
                          <span>Detalle por serie</span>
                        </label>
                      </div>
                      {detail ? (
                        <div className="table-wrapper">
                          <table className="load-entry-table">
                            <thead>
                              <tr>
                                <th>S1 kg</th>
                                <th>S1 reps</th>
                                <th>S2 kg</th>
                                <th>S2 reps</th>
                                <th>S3 kg</th>
                                <th>S3 reps</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                {[0, 1, 2].map((i) => (
                                  <Fragment key={`${exercise.name}-s${i}`}>
                                    <td>
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        className="load-input"
                                        value={sets[i]?.w ?? ""}
                                        onChange={(event) => updateSetLoad(exercise.name, i, "w", event.target.value)}
                                        placeholder="kg"
                                      />
                                    </td>
                                    <td>
                                      <input
                                        type="number"
                                        min={0}
                                        className="load-input"
                                        value={sets[i]?.r ?? ""}
                                        onChange={(event) => updateSetLoad(exercise.name, i, "r", event.target.value)}
                                        placeholder="reps"
                                      />
                                    </td>
                                  </Fragment>
                                ))}
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="load-uniform-row">
                          <label className="field load-uniform-field">
                            <span>kg</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              className="load-input"
                              value={sets[0]?.w ?? ""}
                              onChange={(event) => updateUniformLoad(exercise.name, "w", event.target.value)}
                              placeholder="ej. 22,5"
                            />
                          </label>
                          <label className="field load-uniform-field">
                            <span>reps</span>
                            <input
                              type="number"
                              min={0}
                              className="load-input"
                              value={sets[0]?.r ?? ""}
                              onChange={(event) => updateUniformLoad(exercise.name, "r", event.target.value)}
                              placeholder="ej. 12"
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="primary-button" type="button" onClick={editingLogId ? saveEditLog : addTrainingLog}>
              {editingLogId ? "Guardar cambios" : "Guardar sesion"}
            </button>
            {editingLogId ? (
              <button className="action-button action-end" type="button" onClick={cancelEdit}>
                Cancelar edicion
              </button>
            ) : null}
          </div>
        </article>

        <article className="card flex flex-col">
          <h2 className="section-title">Historico de sesiones</h2>
          <div className="mb-3 flex flex-wrap items-end gap-2">
            {!sessionFilterAll ? (
              <label className="field min-w-[12rem]">
                <span>Mes</span>
                <input
                  type="month"
                  value={sessionFilterMonth}
                  onChange={(e) => { setSessionPage(0); setSessionFilterMonth(e.target.value); }}
                />
              </label>
            ) : null}
            {availableMonths.length > 0 ? (
              <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none mt-auto pb-2">
                <input
                  type="checkbox"
                  checked={sessionFilterAll}
                  onChange={(e) => { setSessionPage(0); setSessionFilterAll(e.target.checked); }}
                />
                Todas
              </label>
            ) : null}
          </div>
          <p className="muted mb-2 text-xs">
            {filteredTrainingLogs.length} sesion{filteredTrainingLogs.length === 1 ? "" : "es"}
            {sessionTotalPages > 1 ? ` · pag. ${sessionPageClamped + 1}/${sessionTotalPages}` : ""}
          </p>
          <div className="stack">
            {filteredTrainingLogs.length === 0 ? (
              <p className="muted">
                {trainingLog.length === 0
                  ? "Aun no hay sesiones. Usa el formulario de la izquierda para registrar la primera."
                  : "No hay sesiones en este mes."}
              </p>
            ) : (
              paginatedTrainingLogs.map((log) => {
                const template = getTemplateById(log.templateId);
                const extra = logProgressionById.get(log.id);
                return (
                  <div key={log.id} className={`session-card ${editingLogId === log.id ? "is-editing" : ""}`}>
                    <div className="session-card-header">
                      <span className="session-card-title">{template?.name || "Sesion"}</span>
                      <span className="session-card-date">{log.date}</span>
                      <span className="session-card-effort">Esfuerzo {log.effort}/5</span>
                    </div>
                    {extra?.daysSincePrevSame != null ? (
                      <p className="muted text-xs">{extra.daysSincePrevSame} dias desde la misma sesion · Semana {extra.weeksInBlock}</p>
                    ) : null}
                    {log.notes ? <p className="session-card-notes">{log.notes}</p> : null}
                    {log.exerciseLoads && log.exerciseLoads.length > 0 ? (
                      <div className="session-card-loads">
                        {log.exerciseLoads.map((entry) => (
                          <p key={entry.exerciseName}>{formatLoadsForHistory(entry)}</p>
                        ))}
                      </div>
                    ) : null}
                    <div className="session-card-actions">
                      <button type="button" className="action-button action-end" onClick={() => startEditLog(log)}>
                        Editar
                      </button>
                      <button type="button" className="danger-button" onClick={() => removeTrainingLog(log.id)}>
                        Borrar
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {sessionTotalPages > 1 ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
              <button
                type="button"
                className="action-button action-end"
                disabled={sessionPageClamped <= 0}
                onClick={() => setSessionPage(Math.max(0, sessionPageClamped - 1))}
              >
                Anterior
              </button>
              <span className="muted text-sm">
                {sessionPageClamped + 1} / {sessionTotalPages}
              </span>
              <button
                type="button"
                className="action-button action-end"
                disabled={sessionPageClamped >= sessionTotalPages - 1}
                onClick={() => setSessionPage(Math.min(sessionTotalPages - 1, sessionPageClamped + 1))}
              >
                Siguiente
              </button>
            </div>
          ) : null}
          {trainingLog.length > 0 ? (
            <div className="phase-description mt-4 shrink-0 text-sm">
              <p className="font-semibold">Proxima sesion sugerida (hoy, segun bloque)</p>
              <ul className="muted mt-2 space-y-2">
                {trainingTemplates.map((t) => {
                  const rows = nextSessionTargets[t.id];
                  if (!rows?.length) return null;
                  return (
                    <li key={t.id}>
                      <span className="font-medium text-foreground">{t.name}:</span>{" "}
                      {rows.map((r) => `${r.name} ${r.range}`).join(" · ")}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
          <div className="phase-description mt-4 shrink-0 text-sm">
            <p className="font-semibold">Progresion dinamica por tus pesos reales</p>
            <div className="mt-2 flex items-end gap-2">
              <label className="field max-w-40">
                <span>Horizonte (semanas)</span>
                <input
                  type="number"
                  min={2}
                  max={16}
                  value={progressionHorizonWeeks}
                  onChange={(event) => setProgressionHorizonWeeks(Number(event.target.value))}
                />
              </label>
              <p className="muted text-xs">Plantilla activa: {selectedTemplate?.name ?? "-"}</p>
            </div>
            {dynamicProgressionRows.length === 0 ? (
              <p className="muted mt-2">Registra pesos en tus sesiones para ver objetivos automaticos.</p>
            ) : (
              <div className="table-wrapper mt-3">
                <table>
                  <thead>
                    <tr>
                      <th>Ejercicio</th>
                      <th>Ahora</th>
                      <th>Objetivo en {progressionHorizonWeeks} sem</th>
                      <th>Ritmo aprox.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dynamicProgressionRows.map((row) => (
                      <tr key={row.exerciseName}>
                        <td>{row.exerciseName}</td>
                        <td>{row.currentKg} kg</td>
                        <td>{row.targetKg} kg</td>
                        <td>+{row.weeklyGain} kg/sem</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="muted mt-2 text-xs">
              Regla usada: subida cada 2 semanas (segun ejercicio). Si una semana no sale, repite carga y consolida tecnica.
            </p>
          </div>
        </article>
      </section>

      <section className={`card ${activeView === "nutricion" ? "" : "hidden"}`}>
        <h2 className="section-title">Perfil y nutricion (orientativo)</h2>
        <p className="muted mb-3 text-sm">
          Datos por defecto: mujer, 28 anos, 160 cm, 56 kg. Ajusta si cambian. Las cifras son aproximadas; no
          sustituyen orientacion medica o de dietista.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="field">
            <span>Edad</span>
            <input
              type="number"
              min={16}
              max={90}
              value={profile.age}
              onChange={(event) => setProfile((p) => ({ ...p, age: Number(event.target.value) }))}
            />
          </label>
          <label className="field">
            <span>Altura (cm)</span>
            <input
              type="number"
              min={130}
              max={210}
              value={profile.heightCm}
              onChange={(event) => setProfile((p) => ({ ...p, heightCm: Number(event.target.value) }))}
            />
          </label>
          <label className="field">
            <span>Peso (kg)</span>
            <input
              type="number"
              min={35}
              max={120}
              step={0.1}
              value={profile.weightKg}
              onChange={(event) => setProfile((p) => ({ ...p, weightKg: Number(event.target.value) }))}
            />
          </label>
          <label className="field">
            <span>Actividad diaria</span>
            <select
              value={profile.activity}
              onChange={(event) => setProfile((p) => ({ ...p, activity: event.target.value as ActivityLevel }))}
            >
              {(Object.keys(ACTIVITY_FACTORS) as ActivityLevel[]).map((key) => (
                <option key={key} value={key}>
                  {ACTIVITY_FACTORS[key].label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Inicio bloque progresion</span>
            <SpanishDatePicker
              value={profile.trainingBlockStart}
              onChange={(iso) => setProfile((p) => ({ ...p, trainingBlockStart: iso }))}
            />
          </label>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <article className="metric-card">
            <p className="metric-label">TMB (aprox.)</p>
            <p className="metric-value-small">{bmr} kcal/dia</p>
          </article>
          <article className="metric-card">
            <p className="metric-label">Gasto mantenimiento</p>
            <p className="metric-value-small">{maintenanceTdee} kcal/dia</p>
          </article>
          <article className="metric-card">
            <p className="metric-label">Proteina diaria</p>
            <p className="metric-value-small">
              {proteinDay.min}–{proteinDay.max} g (obj. ~{proteinDay.target} g)
            </p>
          </article>
        </div>
        <p className="phase-description mt-3 text-sm">
          En dias con entreno, suma aprox. el gasto de la sesion al mantenimiento. La proteina diaria suele mantenerse;
          en tren inferior o sesiones largas puedes acercarte al tramo alto del rango.
        </p>
        <div className="table-wrapper mt-4">
          <table>
            <thead>
              <tr>
                <th>Sesion (plantilla)</th>
                <th>kcal sesion (aprox.)</th>
                <th>kcal dia total (aprox.)</th>
                <th>Proteina extra ese dia (aprox.)</th>
              </tr>
            </thead>
            <tbody>
              {sessionNutritionByTemplate.map((row) => {
                const totals = dailyTotalOnTrainingDay(maintenanceTdee, row);
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

      <section className={`${activeView === "entreno" ? "" : "hidden"}`}>
        <article className="card">
          <h2 className="section-title">Plantillas semanales</h2>
          <div className="stack">
            {trainingTemplates.map((template) => (
              <details key={template.id} className="template-card">
                <summary>
                  <strong>{template.name}</strong> - {template.focus}
                </summary>
                {template.blocks.map((block) => (
                  <div key={block.title} className="table-wrapper">
                    <p className="block-title">{block.title}</p>
                    <table>
                      <thead>
                        <tr>
                          <th>Ejercicio</th>
                          <th>Series</th>
                          <th>Reps</th>
                          <th>Notas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {block.exercises.map((exercise) => (
                          <tr key={exercise.name}>
                            <td>{exercise.name}</td>
                            <td>{exercise.sets}</td>
                            <td>{exercise.reps}</td>
                            <td>{exercise.notes || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </details>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
