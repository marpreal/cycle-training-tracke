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
import { buildWeekOptions } from "@/lib/sessionFilters";
import type {
  ActiveView,
  BodyMeasurementRecord,
  PeriodRecord,
  PeriodSettings,
  TrainingRecord,
  UserProfile,
} from "@/lib/appTypes";
import {
  BODY_MEASUREMENTS_KEY,
  defaultProfile,
  defaultSettings,
  DEFAULT_ISO_DATE,
  PERIOD_LOG_KEY,
  PERIOD_SETTINGS_KEY,
  PROGRESSION_HORIZON_KEY,
  todayIsoClient,
  TRAINING_LOG_KEY,
  USER_PROFILE_KEY,
} from "@/lib/appTypes";
import {
  loadBodyMeasurements,
  loadPeriodLog,
  loadProgressionHorizonWeeks,
  loadSettings,
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

function getTemplateById(id: string): TrainingDayTemplate | undefined {
  return trainingTemplates.find((template) => template.id === id);
}

export default function Home() {
  const { data: session, status: sessionStatus } = useSession();
  const [hasHydrated, setHasHydrated] = useState(false);
  const [settings, setSettings] = useState<PeriodSettings>(defaultSettings);
  const [trainingLog, setTrainingLog] = useState<TrainingRecord[]>([]);
  const [periodLog, setPeriodLog] = useState<PeriodRecord[]>([]);
  const [periodStartInput, setPeriodStartInput] = useState(DEFAULT_ISO_DATE);
  const [periodEndInput, setPeriodEndInput] = useState(DEFAULT_ISO_DATE);
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
  const [measurementDate, setMeasurementDate] = useState(DEFAULT_ISO_DATE);
  const [measurementWeight, setMeasurementWeight] = useState(String(defaultProfile.weightKg));
  const [measurementWaist, setMeasurementWaist] = useState("");
  const [measurementHip, setMeasurementHip] = useState("");
  const [measurementThigh, setMeasurementThigh] = useState("");
  const [measurementNotes, setMeasurementNotes] = useState("");
  const [activeView, setActiveView] = useState<ActiveView>("regla");
  const [sessionFilterType, setSessionFilterType] = useState<"all" | "day" | "range" | "week">("all");
  const [sessionFilterDay, setSessionFilterDay] = useState(DEFAULT_ISO_DATE);
  const [sessionRangeFrom, setSessionRangeFrom] = useState(DEFAULT_ISO_DATE);
  const [sessionRangeTo, setSessionRangeTo] = useState(DEFAULT_ISO_DATE);
  const [sessionWeekChoiceId, setSessionWeekChoiceId] = useState(
    () => buildWeekOptions(new Date(), 16)[0]?.id ?? "",
  );
  const [sessionPage, setSessionPage] = useState(0);
  const [remoteSyncOk, setRemoteSyncOk] = useState(false);
  const [remoteSyncMessage, setRemoteSyncMessage] = useState("");
  /** Solo true mientras dura el GET /api/app-state (evita "Sincronizando..." eterno si hay error). */
  const [syncPullInFlight, setSyncPullInFlight] = useState(false);
  const [sessionLoadingTimedOut, setSessionLoadingTimedOut] = useState(false);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteApplyRef = useRef(false);
  const syncedDataSerializedRef = useRef<string | null>(null);

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
      setPeriodEndInput(today);
      setNewLogDate(today);
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
    localStorage.setItem(PROGRESSION_HORIZON_KEY, String(progressionHorizonWeeks));
  }, [progressionHorizonWeeks, hasHydrated]);

  useEffect(() => {
    if (sessionStatus !== "loading") {
      queueMicrotask(() => setSessionLoadingTimedOut(false));
      return;
    }
    const t = setTimeout(() => setSessionLoadingTimedOut(true), 10000);
    return () => clearTimeout(t);
  }, [sessionStatus]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!REMOTE_SYNC_UI) {
      queueMicrotask(() => setRemoteSyncOk(true));
      return;
    }
    if (sessionStatus === "loading" && !sessionLoadingTimedOut) return;
    if (sessionStatus === "unauthenticated" || !session?.user?.id) {
      queueMicrotask(() => {
        setRemoteSyncOk(true);
        setRemoteSyncMessage("");
        setSyncPullInFlight(false);
      });
      return;
    }
    let cancelled = false;
    queueMicrotask(() => {
      setRemoteSyncOk(false);
      setRemoteSyncMessage("");
      setSyncPullInFlight(true);
    });
    void (async () => {
      const { snapshot, error, needsAuth } = await fetchRemoteSnapshot();
      if (cancelled) {
        queueMicrotask(() => setSyncPullInFlight(false));
        return;
      }
      if (error) {
        queueMicrotask(() => {
          setSyncPullInFlight(false);
          if (needsAuth) {
            setRemoteSyncMessage("Sesion no valida: vuelve a entrar con Google.");
            setRemoteSyncOk(true);
          } else {
            setRemoteSyncMessage(error);
            // La app sigue usable en local aunque falle Turso / red
            setRemoteSyncOk(true);
          }
        });
        return;
      }
      queueMicrotask(() => {
        setSyncPullInFlight(false);
        setRemoteSyncOk(true);
        setRemoteSyncMessage("");
        if (!snapshot) return;
        const localTs = getLocalDataTimestamp();
        if (snapshot.updatedAt <= localTs) {
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
        if (snapshot.preferences?.progressionHorizonWeeks) {
          setProgressionHorizonWeeks(snapshot.preferences.progressionHorizonWeeks);
        }
        setLocalDataTimestamp(snapshot.updatedAt);
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [hasHydrated, session?.user?.id, sessionStatus, sessionLoadingTimedOut]);

  useEffect(() => {
    if (!hasHydrated) return;
    const pack = {
      settings,
      trainingLog,
      periodLog,
      profile,
      measurementLog,
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
    bumpLocalDataTimestamp();
  }, [hasHydrated, settings, trainingLog, periodLog, profile, measurementLog, progressionHorizonWeeks]);

  useEffect(() => {
    if (!hasHydrated || !REMOTE_SYNC_UI || !remoteSyncOk) return;
    if (sessionStatus !== "authenticated" || !session?.user?.id) return;
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => {
      pushTimerRef.current = null;
      const snap = buildSnapshot({
        settings,
        trainingLog,
        periodLog,
        profile,
        measurementLog,
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
    session?.user?.id,
    sessionStatus,
    settings,
    trainingLog,
    periodLog,
    profile,
    measurementLog,
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

  const sortedLogs = useMemo(
    () => [...trainingLog].sort((a, b) => b.date.localeCompare(a.date)),
    [trainingLog],
  );

  const weekOptions = useMemo(() => buildWeekOptions(new Date(), 16), []);

  const filteredTrainingLogs = useMemo(() => {
    const list = [...trainingLog].sort((a, b) => b.date.localeCompare(a.date));
    if (sessionFilterType === "day") {
      return list.filter((l) => l.date === sessionFilterDay);
    }
    if (sessionFilterType === "range") {
      if (sessionRangeFrom > sessionRangeTo) return [];
      return list.filter((l) => l.date >= sessionRangeFrom && l.date <= sessionRangeTo);
    }
    if (sessionFilterType === "week") {
      const wk = sessionWeekChoiceId
        ? weekOptions.find((o) => o.id === sessionWeekChoiceId)
        : weekOptions[0];
      if (!wk) return list;
      return list.filter((l) => l.date >= wk.start && l.date <= wk.end);
    }
    return list;
  }, [
    trainingLog,
    sessionFilterType,
    sessionFilterDay,
    sessionRangeFrom,
    sessionRangeTo,
    sessionWeekChoiceId,
    weekOptions,
  ]);

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
    const clean = value.trim();
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
  }

  function registerPeriodStart(date: string) {
    const newRecord: PeriodRecord = {
      id: crypto.randomUUID(),
      startDate: date,
      endDate: null,
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

  function updatePeriodOngoing(value: boolean) {
    if (value) {
      const hasOpenRecord = periodLog.some((item) => item.endDate === null);
      if (!hasOpenRecord) {
        registerPeriodStart(new Date().toISOString().split("T")[0]);
      } else {
        setSettings((current) => ({ ...current, isPeriodOngoing: true }));
      }
      return;
    }
    endCurrentPeriod(periodEndInput);
  }

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

      {REMOTE_SYNC_UI ? (
        <section className="card">
          <h2 className="section-title">Cuenta y copia en la nube</h2>
          <p className="muted text-sm">
            Los datos siguen en este navegador (localStorage). Para guardarlos en el servidor (Turso) vinculados
            a tu usuario, entra con Google: la sesion usa una cookie de la app (tambien en incognito mientras no
            cierres todas las ventanas privadas).
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {sessionStatus === "loading" && !sessionLoadingTimedOut ? (
              <p className="muted text-sm">Comprobando sesion...</p>
            ) : sessionStatus === "unauthenticated" || (sessionStatus === "loading" && sessionLoadingTimedOut) ? (
              <>
                {sessionLoadingTimedOut ? (
                  <p className="muted max-w-md text-sm">
                    La sesion no responde (revisa en Vercel AUTH_SECRET y AUTH_URL = la URL exacta de esta web).
                    Puedes intentar entrar igual:
                  </p>
                ) : null}
                <button
                  type="button"
                  className="action-button action-end"
                  onClick={() => void signIn("google")}
                >
                  Entrar con Google
                </button>
              </>
            ) : (
              <>
                <p className="text-sm">
                  <span className="font-medium text-foreground">{session?.user?.name ?? "Sesion"}</span>
                  {session?.user?.email ? (
                    <span className="muted"> · {session.user.email}</span>
                  ) : null}
                </p>
                <button
                  type="button"
                  className="action-button action-end"
                  onClick={() => void signOut({ callbackUrl: "/" })}
                >
                  Salir
                </button>
              </>
            )}
          </div>
          {remoteSyncMessage ? (
            <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">{remoteSyncMessage}</p>
          ) : null}
          {REMOTE_SYNC_UI && sessionStatus === "authenticated" && syncPullInFlight ? (
            <p className="muted mt-2 text-sm">Sincronizando con el servidor...</p>
          ) : null}
        </section>
      ) : null}

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
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="field">
              <span>Fecha de inicio</span>
              <SpanishDatePicker value={periodStartInput} onChange={setPeriodStartInput} />
            </label>
            <div className="field sm:col-span-2">
              <span>Acciones</span>
              <div className="mt-2 flex flex-wrap gap-2">
                <button className="action-button action-start" type="button" onClick={() => registerPeriodStart(periodStartInput)}>
                  Registrar llegada
                </button>
                <button
                  className="action-button action-end"
                  type="button"
                  onClick={() => endCurrentPeriod(periodEndInput)}
                  disabled={!settings.isPeriodOngoing}
                >
                  Guardar fin de regla
                </button>
              </div>
            </div>
          </div>
          <label className="field mt-3">
            <span>Fecha de fin</span>
            <SpanishDatePicker value={periodEndInput} onChange={setPeriodEndInput} />
          </label>
          <label className="field mt-3">
            <span>Estado actual</span>
            <select
              value={settings.isPeriodOngoing ? "si" : "no"}
              onChange={(event) => updatePeriodOngoing(event.target.value === "si")}
            >
              <option value="si">Sigo con la regla</option>
              <option value="no">Ya no estoy con la regla</option>
            </select>
          </label>
          <p className="phase-description">
            {settings.isPeriodOngoing
              ? `Regla en curso desde ${settings.lastPeriodStart} (${periodDaysInCourse} dias).`
              : "Regla no activa ahora mismo."}
          </p>
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

      <section className={`grid gap-6 lg:grid-cols-2 lg:items-start ${activeView === "entreno" ? "" : "hidden"}`}>
        <article className="card">
          <h2 className="section-title">Añadir registro de entreno</h2>
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
                                        type="number"
                                        step={0.5}
                                        min={0}
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
                              type="number"
                              step={0.5}
                              min={0}
                              className="load-input"
                              value={sets[0]?.w ?? ""}
                              onChange={(event) => updateUniformLoad(exercise.name, "w", event.target.value)}
                              placeholder="ej. 22.5"
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
          <button className="primary-button" type="button" onClick={addTrainingLog}>
            Guardar sesion
          </button>
        </article>

        <article className="card flex flex-col lg:max-h-[min(90vh,56rem)]">
          <h2 className="section-title">Historico de sesiones</h2>
          <div className="mb-3 flex flex-wrap items-end gap-2">
            <label className="field min-w-[10rem]">
              <span>Filtro</span>
              <select
                value={sessionFilterType}
                onChange={(event) => {
                  setSessionPage(0);
                  setSessionFilterType(event.target.value as typeof sessionFilterType);
                }}
              >
                <option value="all">Todas</option>
                <option value="day">Un dia</option>
                <option value="range">Entre fechas</option>
                <option value="week">Semana (lun–dom)</option>
              </select>
            </label>
            {sessionFilterType === "day" ? (
              <label className="field min-w-[11rem]">
                <span>Fecha</span>
                <SpanishDatePicker
                  value={sessionFilterDay}
                  onChange={(v) => {
                    setSessionPage(0);
                    setSessionFilterDay(v);
                  }}
                />
              </label>
            ) : null}
            {sessionFilterType === "range" ? (
              <>
                <label className="field min-w-[11rem]">
                  <span>Desde</span>
                  <SpanishDatePicker
                    value={sessionRangeFrom}
                    onChange={(v) => {
                      setSessionPage(0);
                      setSessionRangeFrom(v);
                    }}
                  />
                </label>
                <label className="field min-w-[11rem]">
                  <span>Hasta</span>
                  <SpanishDatePicker
                    value={sessionRangeTo}
                    onChange={(v) => {
                      setSessionPage(0);
                      setSessionRangeTo(v);
                    }}
                  />
                </label>
              </>
            ) : null}
            {sessionFilterType === "week" ? (
              <label className="field min-w-[14rem]">
                <span>Semana</span>
                <select
                  value={sessionWeekChoiceId || weekOptions[0]?.id || ""}
                  onChange={(event) => {
                    setSessionPage(0);
                    setSessionWeekChoiceId(event.target.value);
                  }}
                >
                  {weekOptions.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
          <p className="muted mb-2 text-xs">
            Mostrando {filteredTrainingLogs.length} sesion{filteredTrainingLogs.length === 1 ? "" : "es"}
            {sessionTotalPages > 1 ? ` (pagina ${sessionPageClamped + 1} de ${sessionTotalPages})` : ""}
            .
          </p>
          <div className="stack min-h-0 flex-1 overflow-y-auto pr-1">
            {filteredTrainingLogs.length === 0 ? (
              <p className="muted">
                {trainingLog.length === 0
                  ? "Aun no hay sesiones. Usa el formulario de la izquierda para registrar la primera."
                  : "No hay sesiones con este filtro."}
              </p>
            ) : (
              paginatedTrainingLogs.map((log) => {
                const template = getTemplateById(log.templateId);
                const extra = logProgressionById.get(log.id);
                const targets = extra?.targets ?? [];
                return (
                  <div key={log.id} className="log-card">
                    <div className="min-w-0 flex-1">
                      <p className="log-title">{template?.name || "Sesion"}</p>
                      <p className="muted">
                        {log.date} · Esfuerzo {log.effort}/5
                        {extra?.daysSincePrevSame != null
                          ? ` · ${extra.daysSincePrevSame} dias desde la misma sesion`
                          : ""}
                        {extra != null ? ` · Semana ${extra.weeksInBlock} desde inicio de bloque` : null}
                      </p>
                      {targets.length > 0 ? (
                        <div className="log-notes mt-2">
                          <p className="text-sm font-semibold">Objetivo de cargas (esa fecha, aprox.)</p>
                          <ul className="muted mt-1 list-inside list-disc text-sm">
                            {targets.map((t) => (
                              <li key={t.name}>
                                {t.name}: {t.range}
                              </li>
                            ))}
                          </ul>
                          <p className="muted mt-1 text-xs">
                            Regla simple: cada ~2 semanas con buena tecnica, suma el paso indicado en el plan; si el
                            esfuerzo fue 1–2, manten o baja volumen antes de subir peso.
                          </p>
                        </div>
                      ) : null}
                      {log.notes ? <p className="log-notes">{log.notes}</p> : null}
                      {log.exerciseLoads && log.exerciseLoads.length > 0 ? (
                        <div className="log-notes muted text-sm space-y-1">
                          <p className="font-semibold text-foreground">Series registradas</p>
                          {log.exerciseLoads.map((entry) => (
                            <p key={entry.exerciseName}>{formatLoadsForHistory(entry)}</p>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <button type="button" className="danger-button" onClick={() => removeTrainingLog(log.id)}>
                      Borrar
                    </button>
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
                Pagina {sessionPageClamped + 1} / {sessionTotalPages}
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
          {sortedLogs.length > 0 ? (
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
