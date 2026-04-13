import type { TrainingDayTemplate } from "@/data/trainingPlan";

/** Ejercicios sin registro de carga (movilidad, peso corporal, banda). */
export const EXCLUDED_FROM_LOADS = new Set([
  "Flexiones",
  "90-90 cadera",
  "Rotaciones toracicas",
  "Glute bridge",
  "Abducciones con banda",
]);

/** Series por ejercicio en el formulario (min 1, max este valor). */
export const DEFAULT_LOAD_SETS = 3;
export const MAX_LOAD_SETS = 8;

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

/** Ejercicios del plan + nombres extra definidos por la usuaria (misma sesion). */
export function getLoadTrackedExercisesWithCustom(template: TrainingDayTemplate, customNames: string[]) {
  const base = getLoadTrackedExercises(template);
  const seen = new Set(base.map((e) => e.name));
  const extras: { name: string }[] = [];
  for (const raw of customNames) {
    const name = raw.trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    extras.push({ name });
  }
  return [...base, ...extras];
}

export function maxWeightInEntry(entry: ExerciseLoadEntry): number {
  return Math.max(0, ...entry.sets.map((s) => s.weightKg));
}

/** Suma de kg × reps de todas las series de un ejercicio (volumen de carga). */
export function volumeKgRepsForExercise(entry: ExerciseLoadEntry): number {
  let total = 0;
  for (const s of entry.sets) {
    const w = Number.isFinite(s.weightKg) && s.weightKg > 0 ? s.weightKg : 0;
    const r = Number.isFinite(s.reps) && s.reps > 0 ? Math.round(s.reps) : 0;
    total += w * r;
  }
  return total;
}

/** Volumen total de la sesion (todos los ejercicios con cargas registradas). */
export function volumeKgRepsForSession(log: { exerciseLoads?: ExerciseLoadEntry[] }): number {
  if (!log.exerciseLoads?.length) return 0;
  return log.exerciseLoads.reduce((acc, e) => acc + volumeKgRepsForExercise(e), 0);
}

function setsAreAllUniform(sets: OneSetLoad[]): boolean {
  if (sets.length < 2 || !sets[0]) return false;
  return sets.every((s) => s.weightKg === sets[0].weightKg && s.reps === sets[0].reps);
}

/** Texto compacto para el historial (N× si todas las series son iguales). */
export function formatLoadsForHistory(entry: ExerciseLoadEntry): string {
  const { sets } = entry;
  if (setsAreAllUniform(sets)) {
    const w = sets[0].weightKg;
    const r = sets[0].reps;
    const wStr = w > 0 ? `${w} kg` : "— kg";
    const rStr = r > 0 ? `${r} reps` : "— reps";
    return `${entry.exerciseName}: ${sets.length}× ${wStr} × ${rStr}`;
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
