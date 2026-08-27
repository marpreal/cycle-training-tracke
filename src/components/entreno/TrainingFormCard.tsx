"use client";

import { useRef, useState } from "react";
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
  latestLoadsForTemplate: Map<string, { lastKg: number; maxKg: number }>;
  customExercisesForTemplate: string[];
  excludedPlanExercisesForTemplate: string[];
  onSave: () => void;
  onCancel: () => void;
  onAddCustomExercise: () => void;
  onRemoveCustomExercise: (name: string) => void;
  onRemoveExercise: (name: string) => void;
  onRestorePlanExercise: (name: string) => void;
  onReorder: (names: string[]) => void;
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
  onRemoveExercise,
  onRestorePlanExercise,
  excludedPlanExercisesForTemplate,
  onReorder,
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

  // ── Exercise drag-and-drop ordering (mouse + touch) ─────────────────────
  // El orden vive arriba (`exerciseOrderByTemplate`, persistido y sincronizado) y llega
  // ya aplicado en `loadExercisesForForm`; aquí no se duplica en estado local para que
  // lo que ves y lo que se guarda no puedan desincronizarse.
  const orderedNames = loadExercisesForForm.map((e) => e.name);
  // Los ejercicios propios que están quitados se listan en el backlog de abajo,
  // no como etiqueta activa, para no mostrarlos dos veces.
  const activeCustomExercises = customExercisesForTemplate.filter(
    (name) => !excludedPlanExercisesForTemplate.includes(name),
  );
  // A card is only `draggable` while its handle is pressed, so text stays selectable
  // in the load inputs the rest of the time.
  const [armedName, setArmedName] = useState<string | null>(null);
  const [draggingName, setDraggingName] = useState<string | null>(null);
  const [dragOverName, setDragOverName] = useState<string | null>(null);
  const [dragOverHalf, setDragOverHalf] = useState<"top" | "bottom">("top");
  const stackRef = useRef<HTMLDivElement>(null);
  const touchStateRef = useRef<{ name: string; startY: number; active: boolean } | null>(null);

  /**
   * Tarjeta bajo el puntero. Si el punto cae en el hueco entre tarjetas (o por encima
   * de la primera / debajo de la última) devuelve la más cercana, para poder soltar
   * también en los extremos de la lista.
   */
  function nameFromPoint(y: number): { name: string; half: "top" | "bottom" } | null {
    const stack = stackRef.current;
    if (!stack) return null;
    const cards = Array.from(stack.querySelectorAll<HTMLElement>("[data-exercise]"));
    let nearest: { name: string; half: "top" | "bottom" } | null = null;
    let nearestDistance = Infinity;
    for (const card of cards) {
      const rect = card.getBoundingClientRect();
      const name = card.dataset.exercise!;
      if (y >= rect.top && y <= rect.bottom) {
        return { name, half: y < rect.top + rect.height / 2 ? "top" : "bottom" };
      }
      const distance = y < rect.top ? rect.top - y : y - rect.bottom;
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = { name, half: y < rect.top ? "top" : "bottom" };
      }
    }
    return nearest;
  }

  function commitDrop(src: string, dst: string, half: "top" | "bottom") {
    if (src === dst) return;
    if (orderedNames.indexOf(src) < 0 || orderedNames.indexOf(dst) < 0) return;
    const next = orderedNames.filter((n) => n !== src);
    const insertAt = half === "top" ? next.indexOf(dst) : next.indexOf(dst) + 1;
    next.splice(insertAt < 0 ? next.length : insertAt, 0, src);
    onReorder(next);
  }

  /** Alternativa fiable al arrastre: mueve un ejercicio una posición arriba/abajo. */
  function moveExerciseBy(name: string, delta: -1 | 1) {
    const from = orderedNames.indexOf(name);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= orderedNames.length) return;
    const next = [...orderedNames];
    next[from] = next[to];
    next[to] = name;
    onReorder(next);
  }

  // ── Desktop drag events (delegated on stack container) ─────────────────
  // Arm `draggable` on the pressed card so the native dragstart can fire (HTML5
  // drag only starts from an element with draggable="true").
  function onStackMouseDown(e: React.MouseEvent) {
    const handle = (e.target as HTMLElement).closest("[data-drag-handle]");
    if (!handle) {
      if (armedName) setArmedName(null);
      return;
    }
    const card = (e.target as HTMLElement).closest<HTMLElement>("[data-exercise]");
    setArmedName(card?.dataset.exercise ?? null);
  }
  function onStackDragStart(e: React.DragEvent) {
    // `dragstart` se dispara en la tarjeta con draggable="true", no en el tirador, así
    // que la única señal fiable de que el arrastre nació del tirador es `armedName`.
    const card = (e.target as HTMLElement).closest<HTMLElement>("[data-exercise]");
    if (!card || card.dataset.exercise !== armedName) { e.preventDefault(); return; }
    e.dataTransfer.effectAllowed = "move";
    // Firefox no inicia el arrastre si no hay datos en el dataTransfer.
    e.dataTransfer.setData("text/plain", card.dataset.exercise!);
    setDraggingName(card.dataset.exercise!);
  }
  function onStackDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const hit = nameFromPoint(e.clientY);
    if (!hit || !draggingName || hit.name === draggingName) {
      if (dragOverName) setDragOverName(null);
      return;
    }
    setDragOverName(hit.name);
    setDragOverHalf(hit.half);
  }
  function onStackDrop(e: React.DragEvent) {
    e.preventDefault();
    if (draggingName && dragOverName) {
      commitDrop(draggingName, dragOverName, dragOverHalf);
    }
    setDraggingName(null);
    setDragOverName(null);
    setArmedName(null);
  }
  function onStackDragEnd() {
    setDraggingName(null);
    setDragOverName(null);
    setArmedName(null);
  }

  // ── Touch drag events ─────────────────────────────────────────────────
  const TOUCH_ACTIVATE_PX = 8;

  function onStackTouchStart(e: React.TouchEvent) {
    const handle = (e.target as HTMLElement).closest("[data-drag-handle]");
    if (!handle) return;
    const card = (e.target as HTMLElement).closest<HTMLElement>("[data-exercise]");
    if (!card) return;
    const t = e.touches[0];
    touchStateRef.current = { name: card.dataset.exercise!, startY: t.clientY, active: false };
  }
  function onStackTouchMove(e: React.TouchEvent) {
    const ts = touchStateRef.current;
    if (!ts) return;
    const t = e.touches[0];
    if (!ts.active) {
      if (Math.abs(t.clientY - ts.startY) < TOUCH_ACTIVATE_PX) return;
      ts.active = true;
      setDraggingName(ts.name);
    }
    e.preventDefault();
    const hit = nameFromPoint(t.clientY);
    if (!hit || hit.name === ts.name) {
      if (dragOverName) setDragOverName(null);
      return;
    }
    setDragOverName(hit.name);
    setDragOverHalf(hit.half);
  }
  function onStackTouchEnd() {
    const ts = touchStateRef.current;
    touchStateRef.current = null;
    if (!ts?.active) { setDraggingName(null); setDragOverName(null); return; }
    if (ts.name && dragOverName) {
      commitDrop(ts.name, dragOverName, dragOverHalf);
    }
    setDraggingName(null);
    setDragOverName(null);
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

      <div className="mt-4">
        <p className="block-title">Cargas por ejercicio</p>
        {loadExercisesForForm.length > 0 ? (
          <p className="muted mb-3 text-xs">
            Cada ejercicio empieza con los kg y reps de tu última sesión; cámbialos si hace falta.
            Activa &quot;Detalle por serie&quot; para pesos distintos. Puedes añadir o quitar series
            (hasta {MAX_LOAD_SETS}). Para reordenarlos, arrastra desde ⠿ o usa las flechas ↑ ↓; el
            orden se guarda para esta sesión.
          </p>
        ) : (
          <p className="muted mb-3 text-xs">
            No hay ejercicios en esta sesión. Añade uno nuevo abajo o recupera cualquiera de los
            que quitaste tocando el ➕ de su etiqueta.
          </p>
        )}
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
        {activeCustomExercises.length > 0 ? (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-[var(--muted)]">Ejercicios propios:</span>
            {activeCustomExercises.map((name) => (
              <span key={name} className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                {name}
                <button
                  type="button"
                  aria-label={`Eliminar ejercicio ${name}`}
                  className="ml-0.5 text-amber-600 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-100"
                  title="Eliminar definitivamente"
                  onClick={() => onRemoveCustomExercise(name)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : null}
        {excludedPlanExercisesForTemplate.length > 0 ? (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-[var(--muted)]">Quitados (toca ➕ para recuperar):</span>
            {excludedPlanExercisesForTemplate.map((name) => (
              <span key={name} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                <span className="line-through">{name}</span>
                <button
                  type="button"
                  aria-label={`Recuperar ejercicio ${name}`}
                  className="ml-0.5 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                  title="Recuperar ejercicio"
                  onClick={() => onRestorePlanExercise(name)}
                >
                  ➕
                </button>
                {customExercisesForTemplate.includes(name) ? (
                  <button
                    type="button"
                    aria-label={`Eliminar definitivamente ${name}`}
                    className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                    title="Eliminar definitivamente"
                    onClick={() => onRemoveCustomExercise(name)}
                  >
                    ×
                  </button>
                ) : null}
              </span>
            ))}
          </div>
        ) : null}
        {orderedNames.length > 0 ? (
          <div
            className="load-exercise-stack"
            ref={stackRef}
            onMouseDown={onStackMouseDown}
            onMouseUp={() => setArmedName(null)}
            onDragStart={onStackDragStart}
            onDragOver={onStackDragOver}
            onDrop={onStackDrop}
            onDragEnd={onStackDragEnd}
            onTouchStart={onStackTouchStart}
            onTouchMove={onStackTouchMove}
            onTouchEnd={onStackTouchEnd}
            onTouchCancel={onStackTouchEnd}
          >
            {orderedNames.map((name, index) => {
              const loads = latestLoadsForTemplate.get(name);
              return (
                <ExerciseLoadInput
                  key={name}
                  exerciseName={name}
                  sets={getFormSetsForExercise(name)}
                  isDetail={isLoadDetail(name)}
                  isDragging={draggingName === name}
                  draggable={armedName === name}
                  dragIndicator={dragOverName === name ? dragOverHalf : null}
                  canMoveUp={index > 0}
                  canMoveDown={index < orderedNames.length - 1}
                  onMoveUp={() => moveExerciseBy(name, -1)}
                  onMoveDown={() => moveExerciseBy(name, 1)}
                  lastSessionKg={loads?.lastKg}
                  maxKg={loads?.maxKg}
                  onRemove={() => onRemoveExercise(name)}
                  onToggleDetail={(want) => setLoadDetailMode(name, want)}
                  onUpdateSet={(i, field, value) => updateSetLoad(name, i, field, value)}
                  onUpdateUniform={(field, value) => updateUniformLoad(name, field, value)}
                  onAddSet={() => addSetForExercise(name)}
                  onRemoveSet={() => removeLastSetForExercise(name)}
                />
              );
            })}
          </div>
        ) : null}
      </div>

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
