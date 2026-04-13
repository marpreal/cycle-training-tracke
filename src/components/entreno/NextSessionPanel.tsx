"use client";

import { trainingTemplates } from "@/data/trainingPlan";

interface ProgressionRow {
  exerciseName: string;
  currentKg: number;
  targetKg: number;
  weeklyGain: number;
}

interface NextSessionPanelProps {
  nextSessionTargets: Record<string, { name: string; range: string }[]>;
  dynamicProgressionRows: ProgressionRow[];
  progressionHorizonWeeks: number;
  onHorizonChange: (weeks: number) => void;
  selectedTemplateName: string;
  hasTrainingData: boolean;
}

export function NextSessionPanel({
  nextSessionTargets,
  dynamicProgressionRows,
  progressionHorizonWeeks,
  onHorizonChange,
  selectedTemplateName,
  hasTrainingData,
}: NextSessionPanelProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {hasTrainingData ? (
        <article className="card">
          <h2 className="section-title">Próxima sesión sugerida</h2>
          <p className="muted mb-3 text-sm">Según el bloque actual, hoy podrías hacer:</p>
          <ul className="space-y-2">
            {trainingTemplates.map((t) => {
              const rows = nextSessionTargets[t.id];
              if (!rows?.length) return null;
              return (
                <li key={t.id} className="text-sm">
                  <span className="font-semibold">{t.name}:</span>{" "}
                  <span className="muted">{rows.map((r) => `${r.name} ${r.range}`).join(" · ")}</span>
                </li>
              );
            })}
          </ul>
        </article>
      ) : null}

      <article className={`card ${!hasTrainingData ? "lg:col-span-2" : ""}`}>
        <h2 className="section-title">Progresión dinámica</h2>
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <label className="field max-w-40">
            <span>Horizonte (semanas)</span>
            <input
              type="number"
              min={2}
              max={16}
              value={progressionHorizonWeeks}
              onChange={(e) => onHorizonChange(Number(e.target.value))}
            />
          </label>
          <p className="muted pb-2 text-xs">Plantilla activa: {selectedTemplateName || "—"}</p>
        </div>
        {dynamicProgressionRows.length === 0 ? (
          <p className="muted text-sm">
            Registra pesos en tus sesiones para ver objetivos automáticos.
          </p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Ejercicio</th>
                  <th>Ahora</th>
                  <th>Objetivo en {progressionHorizonWeeks} sem</th>
                  <th>Ritmo</th>
                </tr>
              </thead>
              <tbody>
                {dynamicProgressionRows.map((row) => (
                  <tr key={row.exerciseName}>
                    <td>{row.exerciseName}</td>
                    <td>{row.currentKg} kg</td>
                    <td>{row.targetKg} kg</td>
                    <td>+{row.weeklyGain} kg/sem</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted mt-2 text-xs">
          Regla: subida cada 2 semanas. Si una semana no sale, repite carga y consolida técnica.
        </p>
      </article>
    </div>
  );
}
