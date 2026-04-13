"use client";

import { SpanishDatePicker } from "@/components/SpanishDatePicker";
import { DEFAULT_ISO_DATE, type StepsRecord } from "@/lib/appTypes";
import type { UseStepsFormReturn } from "@/hooks/useStepsForm";

interface StepsStats {
  week: number;
  month: number;
  year: number;
}

interface StepsCardProps {
  steps: UseStepsFormReturn;
  stepsStats: StepsStats;
  sortedStepsLog: StepsRecord[];
  hasHydrated: boolean;
  sessionStatus: string;
  onSave: () => void;
  onRemove: (id: string) => void;
}

export function StepsCard({
  steps,
  stepsStats,
  sortedStepsLog,
  hasHydrated,
  sessionStatus,
  onSave,
  onRemove,
}: StepsCardProps) {
  return (
    <article className="card">
      <h2 className="section-title">Pasos diarios</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="field">
          <span>Fecha</span>
          <SpanishDatePicker value={steps.stepDateInput} onChange={steps.setStepDateInput} />
        </label>
        <label className="field">
          <span>Pasos</span>
          <input
            type="text"
            inputMode="numeric"
            value={steps.stepCountInput}
            onChange={(e) => steps.setStepCountInput(e.target.value)}
            placeholder="ej. 8450"
          />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className="primary-button"
          type="button"
          onClick={onSave}
          disabled={!steps.canSaveSteps}
        >
          {steps.editingStepId ? "Guardar pasos" : "Añadir pasos"}
        </button>
        {steps.editingStepId ? (
          <button
            className="action-button action-end"
            type="button"
            onClick={steps.cancelEditSteps}
          >
            Cancelar
          </button>
        ) : null}
      </div>
      {hasHydrated && !steps.canSaveSteps ? (
        <p className="mt-2 text-xs text-red-500">
          {steps.stepDateInput === DEFAULT_ISO_DATE
            ? "Selecciona una fecha válida."
            : steps.stepCountInput.trim() === ""
              ? "Introduce el número de pasos."
              : "El número de pasos debe estar entre 0 y 100.000."}
        </p>
      ) : null}
      {sessionStatus === "authenticated" ? (
        <p
          className={`mt-2 text-xs ${
            steps.fitStepsStatus.startsWith("Pasos cargados")
              ? "text-green-600"
              : steps.fitStepsStatus
                ? "text-red-500"
                : "muted"
          }`}
        >
          {steps.fitStepsStatus ||
            "Los pasos se autocompletan desde Google Fit para la fecha elegida."}
        </p>
      ) : null}
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <article className="metric-card">
          <p className="metric-label">Pasos esta semana</p>
          <p className="metric-value-small">
            {hasHydrated ? stepsStats.week.toLocaleString("es-ES") : "—"}
          </p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Pasos este mes</p>
          <p className="metric-value-small">
            {hasHydrated ? stepsStats.month.toLocaleString("es-ES") : "—"}
          </p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Pasos este año</p>
          <p className="metric-value-small">
            {hasHydrated ? stepsStats.year.toLocaleString("es-ES") : "—"}
          </p>
        </article>
      </div>
      <div className="stack mt-4">
        {sortedStepsLog.length === 0 ? (
          <p className="muted text-sm">Todavía no has registrado pasos.</p>
        ) : (
          sortedStepsLog.slice(0, 10).map((entry) => (
            <div key={entry.id} className="log-card">
              <div>
                <p className="log-title">{entry.date}</p>
                <p className="muted text-sm">{entry.steps.toLocaleString("es-ES")} pasos</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="action-button action-end"
                  onClick={() => steps.startEditSteps(entry)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => onRemove(entry.id)}
                >
                  Borrar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      {sortedStepsLog.length > 10 ? (
        <p className="muted mt-2 text-xs">Mostrando las 10 fechas más recientes.</p>
      ) : null}
    </article>
  );
}
