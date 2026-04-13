/** Estimaciones orientativas (no sustituyen valoración profesional). */

export type ActivityLevel = "sedentary" | "light" | "moderate" | "active";

export const ACTIVITY_FACTORS: Record<ActivityLevel, { factor: number; label: string }> = {
  sedentary: { factor: 1.2, label: "Poco movimiento" },
  light: { factor: 1.375, label: "Ligera (1–3 d/sem)" },
  moderate: { factor: 1.55, label: "Moderada (3–5 d/sem)" },
  active: { factor: 1.725, label: "Muy activa" },
};

/** Mifflin-St Jeor, mujer. */
export function bmrFemaleKg(weightKg: number, heightCm: number, age: number): number {
  return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age - 161);
}

export function tdeeMaintenance(bmr: number, activity: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_FACTORS[activity].factor);
}

/** Gramos de proteína al día recomendados para fuerza/hipertrofia (rango habitual). */
export function proteinDailyGrams(weightKg: number): { min: number; max: number; target: number } {
  return {
    min: Math.round(weightKg * 1.6),
    max: Math.round(weightKg * 2),
    target: Math.round(weightKg * 1.8),
  };
}

export type WeightGoal = "loss" | "gain" | "maintenance";

export function getWeightGoal(
  weightKg: number,
  targetWeightKg: number | null | undefined,
): WeightGoal {
  if (targetWeightKg == null || !Number.isFinite(targetWeightKg)) return "maintenance";
  const diff = weightKg - targetWeightKg;
  if (Math.abs(diff) < 0.15) return "maintenance";
  return diff > 0 ? "loss" : "gain";
}

/**
 * Daily calorie adjustment relative to maintenance TDEE.
 * Negative = deficit (loss), positive = surplus (gain), 0 = maintenance.
 * Derived from weightGoalWeeks when available; falls back to safe defaults.
 * Clamped to: loss [-500, -300], gain [+200, +400].
 */
export function goalCalorieAdjustment(
  weightKg: number,
  targetWeightKg: number | null | undefined,
  weightGoalWeeks: number | null | undefined,
): number {
  const goal = getWeightGoal(weightKg, targetWeightKg);
  if (goal === "maintenance") return 0;

  const diff = weightKg - (targetWeightKg as number); // positive=loss, negative=gain

  let raw: number;
  if (weightGoalWeeks != null && weightGoalWeeks > 0) {
    // rate-based: diff kg over N weeks → kcal/day adjustment
    raw = -Math.round(((diff / weightGoalWeeks) * 7700) / 7);
  } else {
    raw = goal === "loss" ? -400 : 300;
  }

  if (goal === "loss") {
    // Clamp to [-500, -300]
    return -Math.min(500, Math.max(300, -raw));
  } else {
    // Clamp to [+200, +400]
    return Math.min(400, Math.max(200, raw));
  }
}

export type SessionNutrition = {
  templateId: string;
  name: string;
  sessionKcalMin: number;
  sessionKcalMax: number;
  /** Proteína extra orientativa ese día (g) si solo entrenas fuerte ese día. */
  proteinExtraGramsMin: number;
  proteinExtraGramsMax: number;
};

/** Gasto aproximado de la sesión (no el día entero). */
export const sessionNutritionByTemplate: SessionNutrition[] = [
  {
    templateId: "full-body-a",
    name: "FULL BODY A",
    sessionKcalMin: 240,
    sessionKcalMax: 360,
    proteinExtraGramsMin: 5,
    proteinExtraGramsMax: 15,
  },
  {
    templateId: "lower",
    name: "LOWER",
    sessionKcalMin: 260,
    sessionKcalMax: 400,
    proteinExtraGramsMin: 8,
    proteinExtraGramsMax: 18,
  },
  {
    templateId: "upper",
    name: "UPPER",
    sessionKcalMin: 160,
    sessionKcalMax: 260,
    proteinExtraGramsMin: 5,
    proteinExtraGramsMax: 12,
  },
  {
    templateId: "full-body-b",
    name: "FULL BODY B",
    sessionKcalMin: 130,
    sessionKcalMax: 220,
    proteinExtraGramsMin: 3,
    proteinExtraGramsMax: 10,
  },
];

export function dailyTotalOnTrainingDay(
  maintenanceTdee: number,
  session: SessionNutrition,
): { kcalMin: number; kcalMax: number } {
  return {
    kcalMin: maintenanceTdee + session.sessionKcalMin,
    kcalMax: maintenanceTdee + session.sessionKcalMax,
  };
}
