import {
  MEAL_LABELS,
  MEAL_TYPES,
  toIsoDate,
  type BodyMeasurementRecord,
  type MealRecord,
  type MealType,
} from "@/lib/appTypes";
import { weekStartIso } from "@/lib/trainingWeeks";

const MEAL_ORDER = new Map(MEAL_TYPES.map((meal, index) => [meal, index]));

export type DietDay = {
  date: string;
  kcal: number;
  proteinG: number;
  entries: MealRecord[];
};

export type MealGroup = {
  meal: MealType;
  label: string;
  kcal: number;
  proteinG: number;
  entries: MealRecord[];
};

export type TargetProgress = {
  consumed: number;
  target: number;
  /** Negativo cuando se pasa del objetivo. */
  remaining: number;
  /** Porcentaje real, puede pasar de 100. */
  percent: number;
  /** Porcentaje recortado a 0–100 para el ancho de la barra. */
  barPercent: number;
  over: boolean;
};

export type RollingAverage = {
  windowDays: number;
  daysLogged: number;
  avgKcal: number;
  avgProteinG: number;
};

export type WeightTrend = {
  currentWeekAvg: number | null;
  previousWeekAvg: number | null;
  /** Diferencia entre medias semanales; negativo = bajada. Null si falta alguna semana. */
  deltaKg: number | null;
  currentWeekCount: number;
  previousWeekCount: number;
  latestWeightKg: number | null;
  latestDate: string | null;
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

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
      const order = (MEAL_ORDER.get(a.meal) ?? MEAL_TYPES.length) - (MEAL_ORDER.get(b.meal) ?? MEAL_TYPES.length);
      return order !== 0 ? order : a.id.localeCompare(b.id);
    });
    day.kcal = Math.round(day.kcal);
    day.proteinG = round1(day.proteinG);
  }
  return days.sort((a, b) => b.date.localeCompare(a.date));
}

/** Agrupa las comidas de un día por tipo, omitiendo los tipos sin entradas. */
export function groupDayByMealType(day: DietDay | undefined): MealGroup[] {
  if (!day) return [];
  const groups: MealGroup[] = [];
  for (const meal of MEAL_TYPES) {
    const entries = day.entries.filter((entry) => entry.meal === meal);
    if (entries.length === 0) continue;
    groups.push({
      meal,
      label: MEAL_LABELS[meal],
      kcal: Math.round(entries.reduce((sum, entry) => sum + entry.kcal, 0)),
      proteinG: round1(entries.reduce((sum, entry) => sum + (entry.proteinG ?? 0), 0)),
      entries,
    });
  }
  return groups;
}

export function findDay(days: DietDay[], date: string): DietDay | undefined {
  return days.find((day) => day.date === date);
}

/** Un día natural del mes; `logged` distingue "0 kcal apuntadas" de "sin registrar". */
export type MonthDay = {
  date: string;
  kcal: number;
  proteinG: number;
  logged: boolean;
};

export type MonthSummary = {
  daysInMonth: number;
  daysLogged: number;
  /** Media sobre los días registrados, no sobre el mes entero. */
  avgKcal: number;
  daysOverTarget: number;
};

/** Todos los días del mes, incluidos los que no tienen nada apuntado. */
export function monthDietDays(days: DietDay[], year: number, monthIndex: number): MonthDay[] {
  const byDate = new Map(days.map((day) => [day.date, day]));
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const out: MonthDay[] = [];
  for (let day = 1; day <= lastDay; day += 1) {
    const date = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const entry = byDate.get(date);
    out.push({
      date,
      kcal: entry?.kcal ?? 0,
      proteinG: entry?.proteinG ?? 0,
      logged: entry != null,
    });
  }
  return out;
}

export function summarizeMonth(monthDays: MonthDay[], kcalTarget: number): MonthSummary {
  const logged = monthDays.filter((day) => day.logged);
  const total = logged.reduce((sum, day) => sum + day.kcal, 0);
  return {
    daysInMonth: monthDays.length,
    daysLogged: logged.length,
    avgKcal: logged.length > 0 ? Math.round(total / logged.length) : 0,
    daysOverTarget:
      kcalTarget > 0 ? logged.filter((day) => day.kcal > kcalTarget).length : 0,
  };
}

export function targetProgress(consumed: number, target: number): TargetProgress {
  const safeTarget = target > 0 ? target : 0;
  const percent = safeTarget > 0 ? (consumed / safeTarget) * 100 : 0;
  return {
    consumed,
    target: safeTarget,
    remaining: round1(safeTarget - consumed),
    percent: Math.round(percent),
    barPercent: Math.max(0, Math.min(100, percent)),
    over: safeTarget > 0 && consumed > safeTarget,
  };
}

/**
 * Media de los últimos `windowDays` días naturales terminando hoy.
 * Se divide entre los días con registro, no entre la ventana completa, para que
 * saltarse un día no hunda la media.
 */
export function rollingAverages(
  days: DietDay[],
  windowDays = 7,
  today = new Date(),
): RollingAverage {
  const start = new Date(today);
  start.setDate(start.getDate() - (windowDays - 1));
  const startIso = toIsoDate(start);
  const endIso = toIsoDate(today);

  let kcal = 0;
  let proteinG = 0;
  let daysLogged = 0;
  for (const day of days) {
    if (day.date < startIso || day.date > endIso) continue;
    kcal += day.kcal;
    proteinG += day.proteinG;
    daysLogged += 1;
  }

  return {
    windowDays,
    daysLogged,
    avgKcal: daysLogged > 0 ? Math.round(kcal / daysLogged) : 0,
    avgProteinG: daysLogged > 0 ? round1(proteinG / daysLogged) : 0,
  };
}

function shiftIsoWeeks(weekStart: string, weeks: number): string {
  const d = new Date(`${weekStart}T00:00:00`);
  d.setDate(d.getDate() + weeks * 7);
  return toIsoDate(d);
}

function averageWeightInWeek(
  byWeek: Map<string, number[]>,
  weekStart: string,
): { avg: number | null; count: number } {
  const values = byWeek.get(weekStart);
  if (!values || values.length === 0) return { avg: null, count: 0 };
  const sum = values.reduce((a, b) => a + b, 0);
  return { avg: round1(sum / values.length), count: values.length };
}

/**
 * Tendencia por media semanal de peso (lunes a domingo), no por el último pesaje:
 * el peso diario fluctúa demasiado para comparar dos pesajes sueltos.
 */
export function computeWeightTrend(
  measurements: BodyMeasurementRecord[],
  today = new Date(),
): WeightTrend {
  const byWeek = new Map<string, number[]>();
  let latestWeightKg: number | null = null;
  let latestDate: string | null = null;

  for (const item of measurements) {
    if (item.weightKg == null || !Number.isFinite(item.weightKg) || !item.date) continue;
    const week = weekStartIso(item.date);
    const values = byWeek.get(week) ?? [];
    values.push(item.weightKg);
    byWeek.set(week, values);
    if (latestDate === null || item.date > latestDate) {
      latestDate = item.date;
      latestWeightKg = item.weightKg;
    }
  }

  const currentWeekStart = weekStartIso(toIsoDate(today));
  const current = averageWeightInWeek(byWeek, currentWeekStart);
  const previous = averageWeightInWeek(byWeek, shiftIsoWeeks(currentWeekStart, -1));

  return {
    currentWeekAvg: current.avg,
    previousWeekAvg: previous.avg,
    deltaKg:
      current.avg != null && previous.avg != null ? round1(current.avg - previous.avg) : null,
    currentWeekCount: current.count,
    previousWeekCount: previous.count,
    latestWeightKg,
    latestDate,
  };
}
