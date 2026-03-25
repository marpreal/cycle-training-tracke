import type { TrainingDayTemplate } from "@/data/trainingPlan";

/** Ejercicios sin registro de carga (movilidad, peso corporal, banda). */
export const EXCLUDED_FROM_LOADS = new Set([
  "Flexiones",
  "90-90 cadera",
  "Rotaciones toracicas",
  "Glute bridge",
  "Abducciones con banda",
]);

export const LOAD_SET_COUNT = 3;

export type OneSetLoad = { weightKg: number; reps: number };

export type ExerciseLoadEntry = {
  exerciseName: string;
  sets: OneSetLoad[];
};

export function isLoadTrackedExercise(exerciseName: string): boolean {
  return !EXCLUDED_FROM_LOADS.has(exerciseName);
}

export function getLoadTrackedExercises(template: TrainingDayTemplate) {
  return template.blocks.flatMap((b) => b.exercises).filter((e) => isLoadTrackedExercise(e.name));
}

export function maxWeightInEntry(entry: ExerciseLoadEntry): number {
  return Math.max(0, ...entry.sets.map((s) => s.weightKg));
}

function setsAreTripleUniform(sets: OneSetLoad[]): boolean {
  if (sets.length !== 3 || !sets[0]) return false;
  return sets.every((s) => s.weightKg === sets[0].weightKg && s.reps === sets[0].reps);
}

/** Texto compacto para el historial (3× si las tres series son iguales). */
export function formatLoadsForHistory(entry: ExerciseLoadEntry): string {
  const { sets } = entry;
  if (setsAreTripleUniform(sets)) {
    const w = sets[0].weightKg;
    const r = sets[0].reps;
    const wStr = w > 0 ? `${w} kg` : "— kg";
    const rStr = r > 0 ? `${r} reps` : "— reps";
    return `${entry.exerciseName}: 3× ${wStr} × ${rStr}`;
  }
  const parts = sets.map((s, i) => {
    const w = s.weightKg > 0 ? `${s.weightKg} kg` : "— kg";
    const r = s.reps > 0 ? `${s.reps} reps` : "— reps";
    return `S${i + 1} ${w} × ${r}`;
  });
  return `${entry.exerciseName}: ${parts.join(" · ")}`;
}

/** Migra registros v1 `{ exerciseName, weightKg }` al formato con series. */
export function migrateExerciseLoads(
  raw: unknown,
): ExerciseLoadEntry[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const first = raw[0] as Record<string, unknown>;
  if (first && typeof first.exerciseName === "string" && "sets" in first && Array.isArray(first.sets)) {
    return raw as ExerciseLoadEntry[];
  }
  return (raw as { exerciseName: string; weightKg: number }[]).map((row) => ({
    exerciseName: row.exerciseName,
    sets: [{ weightKg: row.weightKg, reps: 0 }],
  }));
}
