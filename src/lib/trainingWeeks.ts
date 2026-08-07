/** Constancia semanal: semanas con al menos un entreno vs. semanas en blanco. */

import type { TrainingRecord } from "@/lib/appTypes";

export type WeeklyConsistency = {
  /** Semanas transcurridas desde el primer registro hasta la semana actual (ambas incluidas). */
  totalWeeks: number;
  /** Semanas con al menos una sesión registrada. */
  weeksTrained: number;
  /** Semanas sin ninguna sesión. La semana en curso no cuenta como fallada hasta que termina. */
  weeksMissed: number;
  /** Porcentaje de semanas entrenadas sobre el total contabilizado, redondeado. */
  percentTrained: number;
  /** Racha actual de semanas consecutivas entrenadas (incluye la semana en curso si ya has entrenado). */
  currentStreak: number;
  /** Mejor racha de semanas consecutivas entrenadas. */
  bestStreak: number;
  /** Lunes (ISO) de la primera semana con registro. */
  firstWeekStart: string | null;
  /** Lunes (ISO) de las semanas falladas, de la más reciente a la más antigua. */
  missedWeekStarts: string[];
  /** True cuando aún no hay ningún entreno registrado. */
  isEmpty: boolean;
};

function toIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

/** Lunes de la semana a la que pertenece una fecha ISO (semana de lunes a domingo). */
export function weekStartIso(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + mondayOffset);
  return toIso(d);
}

/** Formatea el lunes de una semana como "6 jul 2026". */
export function formatWeekStart(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Cuenta, desde la primera sesión registrada hasta hoy, cuántas semanas has
 * entrenado y cuántas se quedaron en blanco. La semana en curso nunca se cuenta
 * como fallada: todavía estás a tiempo.
 */
export function computeWeeklyConsistency(
  trainingLog: TrainingRecord[],
  today = new Date(),
): WeeklyConsistency {
  const empty: WeeklyConsistency = {
    totalWeeks: 0,
    weeksTrained: 0,
    weeksMissed: 0,
    percentTrained: 0,
    currentStreak: 0,
    bestStreak: 0,
    firstWeekStart: null,
    missedWeekStarts: [],
    isEmpty: true,
  };
  if (trainingLog.length === 0) return empty;

  const trainedWeeks = new Set<string>();
  let earliest: string | null = null;
  for (const entry of trainingLog) {
    if (!entry.date) continue;
    const week = weekStartIso(entry.date);
    trainedWeeks.add(week);
    if (earliest === null || week < earliest) earliest = week;
  }
  if (earliest === null) return empty;

  const currentWeek = weekStartIso(toIso(today));
  // Un registro con fecha futura no debe recortar el recorrido: usa la más lejana.
  const lastWeek = [...trainedWeeks].reduce((max, w) => (w > max ? w : max), currentWeek);

  const cursor = new Date(`${earliest}T00:00:00`);

  let totalWeeks = 0;
  let weeksTrained = 0;
  let currentStreak = 0;
  let bestStreak = 0;
  const missedWeekStarts: string[] = [];

  // Avanza semana a semana con setDate (a prueba de cambios de hora) hasta la última semana.
  for (let week = toIso(cursor); week <= lastWeek; week = toIso(cursor)) {
    totalWeeks += 1;
    if (trainedWeeks.has(week)) {
      weeksTrained += 1;
      currentStreak += 1;
      if (currentStreak > bestStreak) bestStreak = currentStreak;
    } else if (week === currentWeek) {
      // Semana en curso sin entrenos todavía: ni cuenta como fallada ni rompe la racha.
      totalWeeks -= 1;
    } else {
      missedWeekStarts.push(week);
      currentStreak = 0;
    }
    cursor.setDate(cursor.getDate() + 7);
  }

  return {
    totalWeeks,
    weeksTrained,
    weeksMissed: missedWeekStarts.length,
    percentTrained: totalWeeks > 0 ? Math.round((weeksTrained / totalWeeks) * 100) : 0,
    currentStreak,
    bestStreak,
    firstWeekStart: earliest,
    missedWeekStarts: missedWeekStarts.reverse(),
    isEmpty: false,
  };
}
