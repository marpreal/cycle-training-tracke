"use client";

import { MAX_LOAD_SETS } from "@/lib/trainingLoads";

interface ExerciseLoadInputProps {
  exerciseName: string;
  sets: { w: string; r: string }[];
  isDetail: boolean;
  isCustom: boolean;
  lastKnownKg: number | undefined;
  onRemoveCustom: () => void;
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
  isCustom,
  lastKnownKg,
  onRemoveCustom,
  onToggleDetail,
  onUpdateSet,
  onUpdateUniform,
  onAddSet,
  onRemoveSet,
}: ExerciseLoadInputProps) {
  return (
    <div className="load-exercise-card">
      <div className="load-exercise-card-head">
        <span className="load-exercise-name">{exerciseName}</span>
        <div className="flex flex-wrap items-center gap-2">
          {isCustom ? (
            <button
              type="button"
              className="text-xs text-amber-700 underline dark:text-amber-400"
              onClick={onRemoveCustom}
            >
              Quitar ejercicio
            </button>
          ) : null}
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

      {lastKnownKg != null && lastKnownKg > 0 ? (
        <p className="load-last-hint">Última sesión: {lastKnownKg} kg</p>
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
