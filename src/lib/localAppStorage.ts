import { ACTIVITY_FACTORS } from "@/lib/nutrition";
import { migrateExerciseLoads } from "@/lib/trainingLoads";
import {
  BODY_MEASUREMENTS_KEY,
  defaultProfile,
  defaultSettings,
  DEFAULT_ISO_DATE,
  type BodyMeasurementRecord,
  type PeriodRecord,
  type PeriodSettings,
  PERIOD_LOG_KEY,
  PERIOD_SETTINGS_KEY,
  PROGRESSION_HORIZON_KEY,
  STEPS_LOG_KEY,
  todayIsoClient,
  TRAINING_LOG_KEY,
  type StepsRecord,
  type TrainingRecord,
  USER_PROFILE_KEY,
  type UserProfile,
} from "@/lib/appTypes";

/** Por encima de esto, JSON.parse/stringify puede bloquear el hilo principal mucho tiempo. */
const MAX_LOCALSTORAGE_JSON_CHARS = 4_000_000;
const MAX_TRAINING_LOG_ENTRIES = 5_000;

function rawTooLarge(raw: string, key: string): boolean {
  if (raw.length <= MAX_LOCALSTORAGE_JSON_CHARS) return false;
  console.warn(
    `[cycle-training-tracker] ${key} en localStorage es demasiado grande (${raw.length} caracteres); se ignora para evitar cuelgues.`,
  );
  return true;
}

export function loadSettings(): PeriodSettings {
  if (typeof window === "undefined") return defaultSettings;
  const savedSettings = localStorage.getItem(PERIOD_SETTINGS_KEY);
  if (!savedSettings) {
    return { ...defaultSettings, lastPeriodStart: todayIsoClient() };
  }
  if (rawTooLarge(savedSettings, PERIOD_SETTINGS_KEY)) {
    return { ...defaultSettings, lastPeriodStart: todayIsoClient() };
  }

  let parsed: Partial<PeriodSettings>;
  try {
    parsed = JSON.parse(savedSettings) as Partial<PeriodSettings>;
  } catch {
    return { ...defaultSettings, lastPeriodStart: todayIsoClient() };
  }
  let lastPeriodStart = parsed.lastPeriodStart ?? defaultSettings.lastPeriodStart;
  if (!lastPeriodStart || lastPeriodStart === DEFAULT_ISO_DATE) {
    lastPeriodStart = todayIsoClient();
  }
  return {
    ...defaultSettings,
    ...parsed,
    lastPeriodStart,
    isPeriodOngoing: Boolean(parsed.isPeriodOngoing),
  };
}

export function loadTrainingLog(): TrainingRecord[] {
  if (typeof window === "undefined") return [];
  const savedLog = localStorage.getItem(TRAINING_LOG_KEY);
  if (!savedLog) return [];
  if (rawTooLarge(savedLog, TRAINING_LOG_KEY)) return [];
  let parsed: TrainingRecord[];
  try {
    parsed = JSON.parse(savedLog) as TrainingRecord[];
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const slice = parsed.length > MAX_TRAINING_LOG_ENTRIES ? parsed.slice(0, MAX_TRAINING_LOG_ENTRIES) : parsed;
  if (slice !== parsed) {
    console.warn(
      `[cycle-training-tracker] historial de entreno recortado a ${MAX_TRAINING_LOG_ENTRIES} entradas para mantener la app fluida.`,
    );
  }
  return slice.map((log) => {
    const migrated = migrateExerciseLoads(log.exerciseLoads as unknown);
    return migrated !== undefined ? { ...log, exerciseLoads: migrated } : log;
  });
}

export function loadPeriodLog(): PeriodRecord[] {
  if (typeof window === "undefined") return [];
  const savedLog = localStorage.getItem(PERIOD_LOG_KEY);
  if (!savedLog) return [];
  if (rawTooLarge(savedLog, PERIOD_LOG_KEY)) return [];
  try {
    const parsed = JSON.parse(savedLog) as PeriodRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadUserProfile(): UserProfile {
  if (typeof window === "undefined") return defaultProfile;
  const raw = localStorage.getItem(USER_PROFILE_KEY);
  if (!raw) {
    return { ...defaultProfile, trainingBlockStart: todayIsoClient() };
  }
  if (rawTooLarge(raw, USER_PROFILE_KEY)) {
    return { ...defaultProfile, trainingBlockStart: todayIsoClient() };
  }
  let parsed: Partial<UserProfile>;
  try {
    parsed = JSON.parse(raw) as Partial<UserProfile>;
  } catch {
    return { ...defaultProfile, trainingBlockStart: todayIsoClient() };
  }
  const activity =
    parsed.activity && parsed.activity in ACTIVITY_FACTORS ? parsed.activity : defaultProfile.activity;
  let trainingBlockStart = parsed.trainingBlockStart || defaultProfile.trainingBlockStart;
  if (!trainingBlockStart || trainingBlockStart === DEFAULT_ISO_DATE) {
    trainingBlockStart = todayIsoClient();
  }
  return {
    ...defaultProfile,
    ...parsed,
    age: Number(parsed.age) || defaultProfile.age,
    heightCm: Number(parsed.heightCm) || defaultProfile.heightCm,
    weightKg: Number(parsed.weightKg) || defaultProfile.weightKg,
    activity,
    trainingBlockStart,
  };
}

export function loadBodyMeasurements(): BodyMeasurementRecord[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(BODY_MEASUREMENTS_KEY);
  if (!raw) return [];
  if (rawTooLarge(raw, BODY_MEASUREMENTS_KEY)) return [];
  try {
    const parsed = JSON.parse(raw) as BodyMeasurementRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadStepsLog(): StepsRecord[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STEPS_LOG_KEY);
  if (!raw) return [];
  if (rawTooLarge(raw, STEPS_LOG_KEY)) return [];
  try {
    const parsed = JSON.parse(raw) as StepsRecord[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) =>
        Boolean(item) &&
        typeof item.id === "string" &&
        typeof item.date === "string" &&
        typeof item.steps === "number" &&
        Number.isFinite(item.steps) &&
        item.steps >= 0,
    );
  } catch {
    return [];
  }
}

export function loadProgressionHorizonWeeks(): number {
  if (typeof window === "undefined") return 6;
  const raw = localStorage.getItem(PROGRESSION_HORIZON_KEY);
  if (!raw) return 6;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 6;
}
