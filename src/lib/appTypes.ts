import {
  DEFAULT_DAILY_KCAL_TARGET,
  DEFAULT_DAILY_PROTEIN_TARGET_G,
  DEFAULT_TARGET_WEIGHT_KG,
  type ActivityLevel,
} from "@/lib/nutrition";
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

export type FlowLevel = "spotting" | "light" | "medium" | "heavy";

export const FLOW_LABELS: Record<FlowLevel, string> = {
  spotting: "Manchado",
  light: "Ligero",
  medium: "Medio",
  heavy: "Abundante",
};

export type FlowDayEntry = {
  date: string;
  level: FlowLevel;
};

export type PeriodRecord = {
  id: string;
  startDate: string;
  endDate: string | null;
  flow?: FlowDayEntry[];
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

export type StepsRecord = {
  id: string;
  date: string;
  steps: number;
};

export type MealType = "desayuno" | "media-manana" | "comida" | "merienda" | "cena" | "otro";

/** Orden en que se muestran las comidas dentro de un día. */
export const MEAL_TYPES: MealType[] = [
  "desayuno",
  "media-manana",
  "comida",
  "merienda",
  "cena",
  "otro",
];

export const MEAL_LABELS: Record<MealType, string> = {
  desayuno: "Desayuno",
  "media-manana": "Media mañana",
  comida: "Comida",
  merienda: "Merienda",
  cena: "Cena",
  otro: "Otro / snack",
};

/** Una comida del diario: qué comiste ese día y sus kcal (orientativas). */
export type MealRecord = {
  id: string;
  date: string;
  meal: MealType;
  /** Qué comiste, en texto libre. Puede quedar vacío si solo apuntas kcal. */
  name: string;
  kcal: number;
  /** Proteína aproximada (g); opcional. */
  proteinG?: number | null;
};

/** Comida guardada para añadirla luego con un clic. */
export type FrequentMeal = {
  id: string;
  name: string;
  kcal: number;
  proteinG: number | null;
  /** Tipo de comida sugerido al añadirla; null = usar el seleccionado en el formulario. */
  meal: MealType | null;
};

export type UserProfile = {
  age: number;
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;
  /** Desde esta fecha se cuentan bloques de ~2 semanas para subir carga. */
  trainingBlockStart: string;
  /** Peso objetivo (kg); opcional, para orientacion de deficit/superavit aproximado. */
  targetWeightKg?: number | null;
  /** Semanas para intentar acercarte al objetivo de peso (orientativo). */
  weightGoalWeeks?: number | null;
  /** Objetivo calórico diario fijado a mano; si es null se usa el cálculo por TDEE. */
  dailyKcalTarget?: number | null;
  /** Objetivo de proteína diaria fijado a mano; si es null se usa el cálculo por peso. */
  dailyProteinTargetG?: number | null;
  /** Versión de los objetivos aplicados, para migrar valores antiguos una sola vez. */
  targetsVersion?: number;
};

export type ActiveView = "regla" | "entreno" | "planes" | "nutricion" | "dieta" | "espalda";

export const ACTIVE_VIEWS: ActiveView[] = [
  "regla",
  "entreno",
  "planes",
  "nutricion",
  "dieta",
  "espalda",
];

export const ACTIVE_VIEW_LABELS: Record<ActiveView, string> = {
  regla: "Regla",
  entreno: "Ejercicio",
  planes: "Planes",
  nutricion: "Peso y nutrición",
  dieta: "Dieta",
  espalda: "Espalda",
};

export function isActiveView(value: unknown): value is ActiveView {
  return typeof value === "string" && (ACTIVE_VIEWS as string[]).includes(value);
}

export type TrainingPlan = {
  id: string;
  name: string;
  /** Plain text or HTML string, depending on contentType. */
  content: string;
  /** "html" when the content was produced from an ODT (may include <img> with data: URLs). */
  contentType?: "text" | "html";
};

export const PERIOD_SETTINGS_KEY = "period-settings-v1";
export const TRAINING_LOG_KEY = "training-log-v1";
export const PERIOD_LOG_KEY = "period-log-v1";
export const USER_PROFILE_KEY = "user-profile-v1";
export const BODY_MEASUREMENTS_KEY = "body-measurements-v1";
export const STEPS_LOG_KEY = "steps-log-v1";
/** Diario de comidas (JSON). */
export const MEALS_LOG_KEY = "meals-log-v1";
/** Comidas frecuentes para añadir con un clic (JSON). */
export const FREQUENT_MEALS_KEY = "frequent-meals-v1";
export const PROGRESSION_HORIZON_KEY = "progression-horizon-weeks-v1";
/** Nombres de ejercicio extra por id de plantilla (JSON). */
export const CUSTOM_EXERCISES_KEY = "custom-exercises-by-template-v1";
/** Planes de entrenamiento personalizados (JSON). */
export const TRAINING_PLANS_KEY = "training-plans-v1";
/** Orden de ejercicios por id de plantilla (JSON). */
export const EXERCISE_ORDER_KEY = "exercise-order-by-template-v1";
/** Ejercicios del plan ocultos por id de plantilla (JSON). */
export const EXCLUDED_PLAN_EXERCISES_KEY = "excluded-plan-exercises-by-template-v1";
/** Timestamp de la última sincronización remota de planes (número). */
export const PLANS_REMOTE_UPDATED_AT_KEY = "plans-remote-updated-at-v1";

/** Sube al cambiar los objetivos por defecto para que se apliquen una vez a los perfiles ya guardados. */
export const NUTRITION_TARGETS_VERSION = 2;

/** Fecha placeholder estable (servidor y cliente igual) hasta hidratar desde localStorage. */
export const DEFAULT_ISO_DATE = "2000-01-01";

export function todayIsoClient(): string {
  return toIsoDate(new Date());
}

/** Fecha local en ISO. `toISOString()` daría el día anterior de madrugada. */
export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

export const defaultProfile: UserProfile = {
  age: 28,
  heightCm: 160,
  weightKg: 56,
  activity: "moderate",
  trainingBlockStart: DEFAULT_ISO_DATE,
  targetWeightKg: DEFAULT_TARGET_WEIGHT_KG,
  dailyKcalTarget: DEFAULT_DAILY_KCAL_TARGET,
  dailyProteinTargetG: DEFAULT_DAILY_PROTEIN_TARGET_G,
  targetsVersion: NUTRITION_TARGETS_VERSION,
};

/**
 * Aplica los objetivos actuales a un perfil guardado antes de que existieran.
 * Una vez migrado, los cambios que haga la usuaria se respetan.
 */
export function withCurrentNutritionTargets(profile: UserProfile): UserProfile {
  if (profile.targetsVersion === NUTRITION_TARGETS_VERSION) return profile;
  return {
    ...profile,
    targetWeightKg: DEFAULT_TARGET_WEIGHT_KG,
    dailyKcalTarget: DEFAULT_DAILY_KCAL_TARGET,
    dailyProteinTargetG: DEFAULT_DAILY_PROTEIN_TARGET_G,
    targetsVersion: NUTRITION_TARGETS_VERSION,
  };
}

export const defaultSettings: PeriodSettings = {
  lastPeriodStart: DEFAULT_ISO_DATE,
  cycleLength: 28,
  periodLength: 5,
  isPeriodOngoing: false,
};
