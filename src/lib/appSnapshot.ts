import { migrateExerciseLoads } from "@/lib/trainingLoads";
import {
  defaultProfile,
  defaultSettings,
  DEFAULT_ISO_DATE,
  type BodyMeasurementRecord,
  type PeriodRecord,
  type PeriodSettings,
  type StepsRecord,
  todayIsoClient,
  type TrainingPlan,
  type TrainingRecord,
  type UserProfile,
} from "@/lib/appTypes";

export type AppSnapshotV1 = {
  v: 1;
  updatedAt: number;
  settings: PeriodSettings;
  trainingLog: TrainingRecord[];
  periodLog: PeriodRecord[];
  profile: UserProfile;
  measurementLog: BodyMeasurementRecord[];
  stepsLog?: StepsRecord[];
  trainingPlans?: TrainingPlan[];
  /** Preferencias UI que antes no iban a localStorage. */
  preferences?: {
    progressionHorizonWeeks: number;
    /** Ejercicios extra por id de plantilla. */
    customExercisesByTemplate?: Record<string, string[]>;
  };
};

export function buildSnapshot(parts: {
  settings: PeriodSettings;
  trainingLog: TrainingRecord[];
  periodLog: PeriodRecord[];
  profile: UserProfile;
  measurementLog: BodyMeasurementRecord[];
  stepsLog?: StepsRecord[];
  trainingPlans?: TrainingPlan[];
  preferences?: AppSnapshotV1["preferences"];
}): AppSnapshotV1 {
  return {
    v: 1,
    updatedAt: Date.now(),
    ...parts,
  };
}

function isPeriodSettings(x: unknown): x is PeriodSettings {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.lastPeriodStart === "string" &&
    typeof o.cycleLength === "number" &&
    typeof o.periodLength === "number" &&
    typeof o.isPeriodOngoing === "boolean"
  );
}

function isTrainingRecord(x: unknown): x is TrainingRecord {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  const e = o.effort;
  return (
    typeof o.id === "string" &&
    typeof o.date === "string" &&
    typeof o.templateId === "string" &&
    typeof o.notes === "string" &&
    typeof e === "number" &&
    e >= 1 &&
    e <= 5
  );
}

function isPeriodRecord(x: unknown): x is PeriodRecord {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (
    typeof o.id !== "string" ||
    typeof o.startDate !== "string" ||
    (o.endDate !== null && typeof o.endDate !== "string")
  ) return false;
  if (o.flow !== undefined && !Array.isArray(o.flow)) return false;
  return true;
}

function isBodyMeasurementRecord(x: unknown): x is BodyMeasurementRecord {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  const n = (v: unknown) => v === null || typeof v === "number";
  return (
    typeof o.id === "string" &&
    typeof o.date === "string" &&
    n(o.weightKg) &&
    n(o.waistCm) &&
    n(o.hipCm) &&
    n(o.thighCm) &&
    typeof o.notes === "string"
  );
}

function isUserProfile(x: unknown): x is UserProfile {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.age === "number" &&
    typeof o.heightCm === "number" &&
    typeof o.weightKg === "number" &&
    typeof o.activity === "string" &&
    typeof o.trainingBlockStart === "string"
  );
}

function isStepsRecord(x: unknown): x is StepsRecord {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.date === "string" &&
    typeof o.steps === "number" &&
    Number.isFinite(o.steps) &&
    o.steps >= 0
  );
}

/** Valida y normaliza un snapshot remoto; devuelve null si no es valido. */
export function parseAppSnapshot(raw: unknown): AppSnapshotV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.v !== 1) return null;
  if (typeof o.updatedAt !== "number") return null;
  if (!isPeriodSettings(o.settings)) return null;
  if (!Array.isArray(o.trainingLog) || !o.trainingLog.every(isTrainingRecord)) return null;
  if (!Array.isArray(o.periodLog) || !o.periodLog.every(isPeriodRecord)) return null;
  if (!isUserProfile(o.profile)) return null;
  if (!Array.isArray(o.measurementLog) || !o.measurementLog.every(isBodyMeasurementRecord)) return null;
  if (o.stepsLog != null && (!Array.isArray(o.stepsLog) || !o.stepsLog.every(isStepsRecord))) return null;

  let preferences: AppSnapshotV1["preferences"];
  if (o.preferences != null && typeof o.preferences === "object") {
    const p = o.preferences as Record<string, unknown>;
    const progressionHorizonWeeks =
      typeof p.progressionHorizonWeeks === "number" && p.progressionHorizonWeeks > 0
        ? Math.round(p.progressionHorizonWeeks)
        : 6;
    preferences = { progressionHorizonWeeks };
    if (p.customExercisesByTemplate != null && typeof p.customExercisesByTemplate === "object") {
      const rawCustom = p.customExercisesByTemplate as Record<string, unknown>;
      const custom: Record<string, string[]> = {};
      for (const [k, v] of Object.entries(rawCustom)) {
        if (Array.isArray(v) && v.every((x) => typeof x === "string")) {
          custom[k] = v.map((s) => s.trim()).filter(Boolean);
        }
      }
      if (Object.keys(custom).length > 0) {
        preferences = { ...preferences, customExercisesByTemplate: custom };
      }
    }
  }

  const trainingLog = o.trainingLog.map((log) => {
    const migrated = migrateExerciseLoads(log.exerciseLoads as unknown);
    return migrated !== undefined ? { ...log, exerciseLoads: migrated } : log;
  });

  let settings = { ...defaultSettings, ...o.settings };
  if (!settings.lastPeriodStart || settings.lastPeriodStart === DEFAULT_ISO_DATE) {
    settings = { ...settings, lastPeriodStart: todayIsoClient() };
  }

  let profile = { ...defaultProfile, ...o.profile };
  if (!profile.trainingBlockStart || profile.trainingBlockStart === DEFAULT_ISO_DATE) {
    profile = { ...profile, trainingBlockStart: todayIsoClient() };
  }

  const out: AppSnapshotV1 = {
    v: 1,
    updatedAt: o.updatedAt,
    settings,
    trainingLog,
    periodLog: o.periodLog,
    profile,
    measurementLog: o.measurementLog,
  };
  if (Array.isArray(o.stepsLog)) out.stepsLog = o.stepsLog;
  if (preferences) out.preferences = preferences;
  if (Array.isArray(o.trainingPlans)) {
    out.trainingPlans = (o.trainingPlans as TrainingPlan[]).filter(
      (p) =>
        p &&
        typeof p.id === "string" &&
        typeof p.name === "string" &&
        typeof p.content === "string",
    );
  }
  return out;
}
