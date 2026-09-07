/** Diario de comidas: totales por día, semana y mes (orientativo). */

import { MEAL_TYPES, type MealRecord } from "@/lib/appTypes";
import { weekStartIso } from "@/lib/trainingWeeks";

const MEAL_ORDER = new Map(MEAL_TYPES.map((meal, index) => [meal, index]));

export type DietDay = {
  date: string;
  kcal: number;
  proteinG: number;
  /** Comidas de ese día, en el orden habitual (desayuno → cena). */
  entries: MealRecord[];
};

export type DietWeek = {
  /** Lunes (ISO) de la semana. */
  weekStart: string;
  kcal: number;
  proteinG: number;
  /** Días de esa semana con al menos una comida registrada. */
  daysLogged: number;
  /** Media de kcal por día registrado (0 si no hay ninguno). */
  avgKcalPerLoggedDay: number;
};

export type DietPeriodTotals = {
  kcal: number;
  proteinG: number;
  daysLogged: number;
  avgKcalPerLoggedDay: number;
};

export type DietStats = {
  today: { date: string; kcal: number; proteinG: number; meals: number };
  /** Semana en curso (lunes a domingo). */
  week: DietWeek;
  /** Mes natural en curso. */
  month: DietPeriodTotals;
  /** Semanas con registros, de la más reciente a la más antigua. */
  weeks: DietWeek[];
  /** True cuando todavía no hay ninguna comida guardada. */
  isEmpty: boolean;
};

function toIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function avgPerDay(kcal: number, daysLogged: number): number {
  return daysLogged > 0 ? Math.round(kcal / daysLogged) : 0;
}

function mealSortKey(entry: MealRecord): number {
  return MEAL_ORDER.get(entry.meal) ?? MEAL_TYPES.length;
}

/** Agrupa las comidas por fecha, de la más reciente a la más antigua. */
export function groupMealsByDate(meals: MealRecord[]): DietDay[] {
  const byDate = new Map<string, DietDay>();
  for (const meal of meals) {
    if (!meal.date) continue;
    const day = byDate.get(meal.date) ?? { date: meal.date, kcal: 0, proteinG: 0, entries: [] };
    day.kcal += meal.kcal;
    day.proteinG += meal.proteinG ?? 0;
    day.entries.push(meal);
    byDate.set(meal.date, day);
  }
  const days = [...byDate.values()];
  for (const day of days) {
    day.entries.sort((a, b) => {
      const order = mealSortKey(a) - mealSortKey(b);
      return order !== 0 ? order : a.id.localeCompare(b.id);
    });
    day.kcal = Math.round(day.kcal);
    day.proteinG = Math.round(day.proteinG);
  }
  return days.sort((a, b) => b.date.localeCompare(a.date));
}

/** Totales por semana (lunes a domingo), de la más reciente a la más antigua. */
export function groupDaysByWeek(days: DietDay[]): DietWeek[] {
  const byWeek = new Map<string, DietWeek>();
  for (const day of days) {
    const weekStart = weekStartIso(day.date);
    const week =
      byWeek.get(weekStart) ?? { weekStart, kcal: 0, proteinG: 0, daysLogged: 0, avgKcalPerLoggedDay: 0 };
    week.kcal += day.kcal;
    week.proteinG += day.proteinG;
    week.daysLogged += 1;
    byWeek.set(weekStart, week);
  }
  const weeks = [...byWeek.values()];
  for (const week of weeks) {
    week.avgKcalPerLoggedDay = avgPerDay(week.kcal, week.daysLogged);
  }
  return weeks.sort((a, b) => b.weekStart.localeCompare(a.weekStart));
}

/**
 * Calcula kcal (y proteína) de hoy, de la semana en curso y del mes, más el
 * histórico semanal. Las comidas sin fecha válida se ignoran.
 */
export function computeDietStats(meals: MealRecord[], today = new Date()): DietStats {
  const todayIso = toIso(today);
  const currentWeekStart = weekStartIso(todayIso);
  const monthPrefix = todayIso.slice(0, 8); // "YYYY-MM-"

  const days = groupMealsByDate(meals);
  const weeks = groupDaysByWeek(days);

  const todayDay = days.find((day) => day.date === todayIso);
  const currentWeek =
    weeks.find((week) => week.weekStart === currentWeekStart) ?? {
      weekStart: currentWeekStart,
      kcal: 0,
      proteinG: 0,
      daysLogged: 0,
      avgKcalPerLoggedDay: 0,
    };

  let monthKcal = 0;
  let monthProteinG = 0;
  let monthDaysLogged = 0;
  for (const day of days) {
    if (!day.date.startsWith(monthPrefix)) continue;
    monthKcal += day.kcal;
    monthProteinG += day.proteinG;
    monthDaysLogged += 1;
  }

  return {
    today: {
      date: todayIso,
      kcal: todayDay?.kcal ?? 0,
      proteinG: todayDay?.proteinG ?? 0,
      meals: todayDay?.entries.length ?? 0,
    },
    week: currentWeek,
    month: {
      kcal: monthKcal,
      proteinG: monthProteinG,
      daysLogged: monthDaysLogged,
      avgKcalPerLoggedDay: avgPerDay(monthKcal, monthDaysLogged),
    },
    weeks,
    isEmpty: days.length === 0,
  };
}
