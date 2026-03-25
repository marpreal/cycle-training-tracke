/** Referencias del plan y paso sugerido cada ~2 semanas (si técnica y recuperación van bien). */

export type ProgressionExercise = {
  name: string;
  refMinKg: number;
  refMaxKg: number;
  stepKgPerFortnight: number;
};

export const progressionByTemplate: Record<string, ProgressionExercise[]> = {
  "full-body-a": [
    { name: "Hip thrust", refMinKg: 20, refMaxKg: 30, stepKgPerFortnight: 2.5 },
    { name: "Sentadilla goblet", refMinKg: 12, refMaxKg: 18, stepKgPerFortnight: 2 },
    { name: "Peso muerto rumano (barra)", refMinKg: 21, refMaxKg: 25, stepKgPerFortnight: 2.5 },
    { name: "Elevaciones laterales", refMinKg: 4, refMaxKg: 6, stepKgPerFortnight: 1 },
  ],
  lower: [
    { name: "Sentadilla bulgara", refMinKg: 8, refMaxKg: 10, stepKgPerFortnight: 1.5 },
    { name: "Step-up", refMinKg: 8, refMaxKg: 10, stepKgPerFortnight: 1.5 },
    { name: "Puente de gluteo con pausa", refMinKg: 20, refMaxKg: 30, stepKgPerFortnight: 2.5 },
    { name: "Elevaciones de talon", refMinKg: 15, refMaxKg: 25, stepKgPerFortnight: 2.5 },
  ],
  upper: [
    { name: "Remo con barra", refMinKg: 20, refMaxKg: 23, stepKgPerFortnight: 2.5 },
    { name: "Press hombro mancuernas", refMinKg: 6, refMaxKg: 8, stepKgPerFortnight: 1 },
    { name: "Press pecho mancuernas", refMinKg: 8, refMaxKg: 10, stepKgPerFortnight: 1.5 },
    { name: "Curl biceps", refMinKg: 5, refMaxKg: 7, stepKgPerFortnight: 1 },
  ],
  "full-body-b": [
    { name: "Sentadilla goblet", refMinKg: 10, refMaxKg: 14, stepKgPerFortnight: 1.5 },
    { name: "Hip thrust unilateral", refMinKg: 10, refMaxKg: 16, stepKgPerFortnight: 1.5 },
  ],
};

function toDateOnly(value: string): Date {
  return new Date(`${value}T12:00:00`);
}

export function weeksBetween(startIso: string, endIso: string): number {
  const a = toDateOnly(startIso).getTime();
  const b = toDateOnly(endIso).getTime();
  if (b < a) return 0;
  return Math.floor((b - a) / (1000 * 60 * 60 * 24 * 7));
}

/** Cada 2 semanas completas suma un paso de carga (aprox.). */
export function progressionSteps(blockStart: string, onDate: string): number {
  return Math.floor(weeksBetween(blockStart, onDate) / 2);
}

export function formatKgRange(min: number, max: number): string {
  const round = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
  if (min === max) return `${round(min)} kg`;
  return `${round(min)}–${round(max)} kg`;
}

export function targetsForTemplate(
  templateId: string,
  blockStart: string,
  onDate: string,
): { name: string; range: string }[] {
  const list = progressionByTemplate[templateId];
  if (!list) return [];
  const steps = progressionSteps(blockStart, onDate);
  return list.map((ex) => {
    const min = ex.refMinKg + steps * ex.stepKgPerFortnight;
    const max = ex.refMaxKg + steps * ex.stepKgPerFortnight;
    return { name: ex.name, range: formatKgRange(min, max) };
  });
}

export function daysBetweenDates(aIso: string, bIso: string): number {
  const a = toDateOnly(aIso).getTime();
  const b = toDateOnly(bIso).getTime();
  return Math.round(Math.abs(b - a) / (1000 * 60 * 60 * 24));
}
