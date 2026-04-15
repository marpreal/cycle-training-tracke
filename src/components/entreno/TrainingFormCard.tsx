"use client";

import { useEffect, useRef, useState } from "react";
import { SpanishDatePicker } from "@/components/SpanishDatePicker";
import { ExerciseLoadInput } from "./ExerciseLoadInput";
import { trainingTemplates } from "@/data/trainingPlan";
import { MAX_LOAD_SETS } from "@/lib/trainingLoads";
import { DEFAULT_ISO_DATE, type TrainingRecord } from "@/lib/appTypes";
import type { UseTrainingFormReturn } from "@/hooks/useTrainingForm";

/** Devuelve el día de la semana (0=dom, 1=lun…6=sab) para una fecha ISO, o null si no es válida. */
function dayOfWeekFor(isoDate: string): number | null {
  if (!isoDate || isoDate === DEFAULT_ISO_DATE) return null;
  const d = new Date(`${isoDate}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d.getDay();
}

const DAY_SUGGESTIONS: Record<number, string> = {
  1: "Sugerencia: Full body (lunes)",
  3: "Sugerencia: Lower body (miércoles)",
  5: "Sugerencia: Upper body (viernes)",
};

interface TrainingFormCardProps {
  form: UseTrainingFormReturn;
  loadExercisesForForm: { name: string }[];
  latestLoadsForTemplate: Map<string, number>;
  customExercisesForTemplate: string[];
  onSave: () => void;
  onCancel: () => void;
  onAddCustomExercise: () => void;
  onRemoveCustomExercise: (name: string) => void;
}

export function TrainingFormCard({
  form,
  loadExercisesForForm,
  latestLoadsForTemplate,
  customExercisesForTemplate,
  onSave,
  onCancel,
  onAddCustomExercise,
  onRemoveCustomExercise,
}: TrainingFormCardProps) {
  const {
    newLogDate,
    setNewLogDate,
    newLogTemplate,
    newLogEffort,
    setNewLogEffort,
    newLogNotes,
    setNewLogNotes,
    newCustomExerciseName,
    setNewCustomExerciseName,
    editingLogId,
    getFormSetsForExercise,
    isLoadDetail,
    updateSetLoad,
    updateUniformLoad,
    setLoadDetailMode,
    addSetForExercise,
    removeLastSetForExercise,
    changeTemplate,
  } = form;

  // ── Exercise ordering ───────────────────────────────────────────────────
  const [orderedNames, setOrderedNames] = useState<string[]>([]);
  const prevNamesKey = useRef("");

  useEffect(() => {
    const incoming = loadExercisesForForm.map((e) => e.name);
    const key = incoming.join("\0");
    if (key === prevNamesKey.current) return;
    prevNamesKey.current = key;
    setOrderedNames((prev) => {
      const incomingSet = new Set(incoming);
      const kept = prev.filter((n) => incomingSet.has(n));
      const keptSet = new Set(kept);
      const added = incoming.filter((n) => !keptSet.has(n));
      return [...kept, ...added];
    });
  }, [loadExercisesForForm]);

  const orderedExercises = orderedNames.map((n) => ({ name: n }));

  function moveExercise(name: string, dir: -1 | 1) {
    setOrderedNames((prev) => {
      const idx = prev.indexOf(name);
      if (idx < 0) return prev;
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  const daySuggestion = DAY_SUGGESTIONS[dayOfWeekFor(newLogDate) ?? -1] ?? null;

  return (
    <article className="card">
      <h2 className="section-title">
        {editingLogId ? "Editar sesión" : "Añadir registro de entreno"}
      </h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="field">
          <span>Fecha</span>
          <SpanishDatePicker value={newLogDate} onChange={setNewLogDate} />
        </label>
        <div className="field">
          <span>Sesión</span>
          <select
            value={newLogTemplate}
            onChange={(e) => changeTemplate(e.target.value)}
          >
            {trainingTemplates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          {daySuggestion ? (
            <span className="mt-1 block text-xs text-[var(--muted)]">{daySuggestion}</span>
          ) : null}
        </div>
        <label className="field">
          <span>Esfuerzo (1-5)</span>
          <select
            value={newLogEffort}
            onChange={(e) => setNewLogEffort(Number(e.target.value) as TrainingRecord["effort"])}
          >
            {[1, 2, 3, 4, 5].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="field sm:col-span-2">
          <span>Notas</span>
          <textarea
            rows={3}
            value={newLogNotes}
            onChange={(e) => setNewLogNotes(e.target.value)}
            placeholder="¿Cómo te sentiste? ¿Subiste peso? ¿Cómo fue la recuperación?"
          />
        </label>
      </div>

      {loadExercisesForForm.length > 0 ? (
        <div className="mt-4">
          <p className="block-title">Cargas por ejercicio</p>
          <p className="muted mb-3 text-xs">
            Por defecto: una fila de kg y reps (se copia a todas las series). Activa &quot;Detalle
            por serie&quot; para pesos distintos. Puedes añadir o quitar series (hasta {MAX_LOAD_SETS}).
          </p>
          <div className="mb-3 flex flex-wrap items-end gap-2">
            <label className="field min-w-[12rem] flex-1">
              <span>Añadir ejercicio a esta categoría</span>
              <input
                type="text"
                value={newCustomExerciseName}
                onChange={(e) => setNewCustomExerciseName(e.target.value)}
                placeholder="Nombre del ejercicio"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onAddCustomExercise();
                  }
                }}
              />
            </label>
            <button
              type="button"
              className="action-button action-end"
              onClick={onAddCustomExercise}
            >
              Añadir ejercicio
            </button>
          </div>
          <div className="load-exercise-stack">
            {orderedExercises.map((exercise, idx) => (
              <ExerciseLoadInput
                key={exercise.name}
                exerciseName={exercise.name}
                sets={getFormSetsForExercise(exercise.name)}
                isDetail={isLoadDetail(exercise.name)}
                isCustom={customExercisesForTemplate.includes(exercise.name)}
                isFirst={idx === 0}
                isLast={idx === orderedExercises.length - 1}
                lastKnownKg={latestLoadsForTemplate.get(exercise.name)}
                onRemoveCustom={() => onRemoveCustomExercise(exercise.name)}
                onToggleDetail={(want) => setLoadDetailMode(exercise.name, want)}
                onUpdateSet={(i, field, value) => updateSetLoad(exercise.name, i, field, value)}
                onUpdateUniform={(field, value) => updateUniformLoad(exercise.name, field, value)}
                onAddSet={() => addSetForExercise(exercise.name)}
                onRemoveSet={() => removeLastSetForExercise(exercise.name)}
                onMoveUp={() => moveExercise(exercise.name, -1)}
                onMoveDown={() => moveExercise(exercise.name, 1)}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <button className="primary-button" type="button" onClick={onSave}>
          {editingLogId ? "Guardar cambios" : "Guardar sesión"}
        </button>
        {editingLogId ? (
          <button className="action-button action-end" type="button" onClick={onCancel}>
            Cancelar edición
          </button>
        ) : null}
      </div>
    </article>
  );
}
