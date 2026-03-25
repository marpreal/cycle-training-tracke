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
  todayIsoClient,
  TRAINING_LOG_KEY,
  type TrainingRecord,
  USER_PROFILE_KEY,
  type UserProfile,
} from "@/lib/appTypes";

export function loadSettings(): PeriodSettings {
  if (typeof window === "undefined") return defaultSettings;
  const savedSettings = localStorage.getItem(PERIOD_SETTINGS_KEY);
  if (!savedSettings) {
    return { ...defaultSettings, lastPeriodStart: todayIsoClient() };
  }

  const parsed = JSON.parse(savedSettings) as Partial<PeriodSettings>;
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
  const parsed = JSON.parse(savedLog) as TrainingRecord[];
  return parsed.map((log) => {
    const migrated = migrateExerciseLoads(log.exerciseLoads as unknown);
    return migrated !== undefined ? { ...log, exerciseLoads: migrated } : log;
  });
}

export function loadPeriodLog(): PeriodRecord[] {
  if (typeof window === "undefined") return [];
  const savedLog = localStorage.getItem(PERIOD_LOG_KEY);
  return savedLog ? (JSON.parse(savedLog) as PeriodRecord[]) : [];
}

export function loadUserProfile(): UserProfile {
  if (typeof window === "undefined") return defaultProfile;
  const raw = localStorage.getItem(USER_PROFILE_KEY);
  if (!raw) {
    return { ...defaultProfile, trainingBlockStart: todayIsoClient() };
  }
  const parsed = JSON.parse(raw) as Partial<UserProfile>;
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
  return raw ? (JSON.parse(raw) as BodyMeasurementRecord[]) : [];
}
