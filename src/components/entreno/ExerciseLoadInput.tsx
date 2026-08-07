"use client";

import { MAX_LOAD_SETS } from "@/lib/trainingLoads";

interface ExerciseLoadInputProps {
  exerciseName: string;
  sets: { w: string; r: string }[];
  isDetail: boolean;
  isDragging: boolean;
  /** Only true while its drag handle is pressed, so inputs stay selectable otherwise. */
  draggable: boolean;
  dragIndicator: "top" | "bottom" | null;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  lastSessionKg: number | undefined;
  maxKg: number | undefined;
  onRemove: () => void;
  onToggleDetail: (wantDetail: boolean) => void;
  onUpdateSet: (setIndex: number, field: "w" | "r", value: string) => void;
  onUpdateUniform: (field: "w" | "r", value: string) => void;
  onAddSet: () => void;
  onRemoveSet: () => void;
}

export function ExerciseLoadInput({
  exerciseName,
  sets,
  isDetail,
  isDragging,
  draggable,
  dragIndicator,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  lastSessionKg,
  maxKg,
  onRemove,
  onToggleDetail,
  onUpdateSet,
  onUpdateUniform,
  onAddSet,
  onRemoveSet,
}: ExerciseLoadInputProps) {
  const cls = [
    "load-exercise-card",
    isDragging && "is-dragging",
    dragIndicator === "top" && "drop-above",
    dragIndicator === "bottom" && "drop-below",
  ].filter(Boolean).join(" ");

  return (
    <div className={cls} data-exercise={exerciseName} draggable={draggable}>
      <div className="load-exercise-card-head">
        <div className="flex items-center gap-1.5">
          <span className="drag-handle" data-drag-handle aria-label="Arrastrar para reordenar">⠿</span>
          <span className="reorder-buttons">
            <button
              type="button"
              className="reorder-btn"
              disabled={!canMoveUp}
              onClick={onMoveUp}
              aria-label={`Subir ${exerciseName}`}
              title="Subir"
            >
              ↑
            </button>
            <button
              type="button"
              className="reorder-btn"
              disabled={!canMoveDown}
              onClick={onMoveDown}
              aria-label={`Bajar ${exerciseName}`}
              title="Bajar"
            >
              ↓
            </button>
          </span>
          <span className="load-exercise-name">{exerciseName}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="text-xs text-amber-700 underline dark:text-amber-400"
            onClick={onRemove}
          >
            Quitar
          </button>
          <label className="load-detail-toggle">
            <input
              type="checkbox"
              checked={isDetail}
              onChange={(e) => onToggleDetail(e.target.checked)}
            />
            <span>Detalle por serie</span>
          </label>
        </div>
      </div>

      {(lastSessionKg != null && lastSessionKg > 0) || (maxKg != null && maxKg > 0) ? (
        <p className="load-last-hint">
          {maxKg != null && maxKg > 0 ? <span>Máx: <strong>{maxKg} kg</strong></span> : null}
          {maxKg != null && maxKg > 0 && lastSessionKg != null && lastSessionKg > 0 ? <span className="mx-1">·</span> : null}
          {lastSessionKg != null && lastSessionKg > 0 ? <span>Última sesión: {lastSessionKg} kg</span> : null}
        </p>
      ) : null}

      {isDetail ? (
        /* Detail mode: one row per set, vertically stacked */
        <div className="load-detail-rows">
          {sets.map((set, i) => (
            <div key={i} className="load-set-row">
              <span className="load-set-label">S{i + 1}</span>
              <input
                type="text"
                inputMode="decimal"
                className="load-input"
                value={set.w}
                onChange={(e) => onUpdateSet(i, "w", e.target.value)}
                placeholder="kg"
                aria-label={`Serie ${i + 1} kg`}
              />
              <span className="load-set-sep">×</span>
              <input
                type="number"
                min={0}
                className="load-input"
                value={set.r}
                onChange={(e) => onUpdateSet(i, "r", e.target.value)}
                placeholder="reps"
                aria-label={`Serie ${i + 1} reps`}
              />
            </div>
          ))}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="action-button action-end text-xs"
              disabled={sets.length >= MAX_LOAD_SETS}
              onClick={onAddSet}
            >
              + Serie
            </button>
            <button
              type="button"
              className="action-button action-end text-xs"
              disabled={sets.length <= 1}
              onClick={onRemoveSet}
            >
              − Quitar última
            </button>
          </div>
        </div>
      ) : (
        /* Uniform mode: single kg × reps row + set count stepper */
        <div className="load-uniform-row">
          <label className="field load-uniform-field">
            <span>kg</span>
            <input
              type="text"
              inputMode="decimal"
              className="load-input"
              value={sets[0]?.w ?? ""}
              onChange={(e) => onUpdateUniform("w", e.target.value)}
              placeholder="ej. 22,5"
            />
          </label>
          <label className="field load-uniform-field">
            <span>reps</span>
            <input
              type="number"
              min={0}
              className="load-input"
              value={sets[0]?.r ?? ""}
              onChange={(e) => onUpdateUniform("r", e.target.value)}
              placeholder="ej. 12"
            />
          </label>
          <div className="load-set-stepper">
            <span className="load-stepper-label">Series</span>
            <button
              type="button"
              className="load-stepper-btn"
              disabled={sets.length <= 1}
              onClick={onRemoveSet}
              aria-label="Quitar serie"
            >
              −
            </button>
            <span className="load-stepper-count">{sets.length}</span>
            <button
              type="button"
              className="load-stepper-btn"
              disabled={sets.length >= MAX_LOAD_SETS}
              onClick={onAddSet}
              aria-label="Añadir serie"
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
