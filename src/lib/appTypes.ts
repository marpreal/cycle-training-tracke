import type { ActivityLevel } from "@/lib/nutrition";
import type { ExerciseLoadEntry } from "@/lib/trainingLoads";

export type PeriodSettings = {
  lastPeriodStart: string;
  cycleLength: number;
  periodLength: number;
  isPeriodOngoing: boolean;
};

export type TrainingRecord = {
  id: string;
  date: string;
  templateId: string;
  effort: 1 | 2 | 3 | 4 | 5;
  notes: string;
  exerciseLoads?: ExerciseLoadEntry[];
};

export type PeriodRecord = {
  id: string;
  startDate: string;
  endDate: string | null;
};

export type BodyMeasurementRecord = {
  id: string;
  date: string;
  weightKg: number | null;
  waistCm: number | null;
  hipCm: number | null;
  thighCm: number | null;
  notes: string;
};

export type UserProfile = {
  age: number;
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;
  /** Desde esta fecha se cuentan bloques de ~2 semanas para subir carga. */
  trainingBlockStart: string;
};

export type ActiveView = "regla" | "entreno" | "nutricion";

export const PERIOD_SETTINGS_KEY = "period-settings-v1";
export const TRAINING_LOG_KEY = "training-log-v1";
export const PERIOD_LOG_KEY = "period-log-v1";
export const USER_PROFILE_KEY = "user-profile-v1";
export const BODY_MEASUREMENTS_KEY = "body-measurements-v1";
/** Clave compartida con `APP_SYNC_SECRET` del servidor (guardada en el navegador). */
export const REMOTE_SYNC_SECRET_KEY = "remote-sync-secret-v1";

export const PROGRESSION_HORIZON_KEY = "progression-horizon-weeks-v1";

/** Fecha placeholder estable (servidor y cliente igual) hasta hidratar desde localStorage. */
export const DEFAULT_ISO_DATE = "2000-01-01";

export function todayIsoClient(): string {
  return new Date().toISOString().split("T")[0];
}

export const defaultProfile: UserProfile = {
  age: 28,
  heightCm: 160,
  weightKg: 56,
  activity: "moderate",
  trainingBlockStart: DEFAULT_ISO_DATE,
};

export const defaultSettings: PeriodSettings = {
  lastPeriodStart: DEFAULT_ISO_DATE,
  cycleLength: 28,
  periodLength: 5,
  isPeriodOngoing: false,
};
