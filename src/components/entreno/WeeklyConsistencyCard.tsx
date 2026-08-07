"use client";

import { useState } from "react";
import { formatWeekStart, type WeeklyConsistency } from "@/lib/trainingWeeks";

const MAX_COLLAPSED_WEEKS = 8;

export function WeeklyConsistencyCard({
  consistency,
  hasHydrated,
}: {
  consistency: WeeklyConsistency;
  hasHydrated: boolean;
}) {
  const [showMissed, setShowMissed] = useState(false);

  if (!hasHydrated) return null;

  if (consistency.isEmpty) {
    return (
      <article className="card">
        <h2 className="section-title">Constancia semanal</h2>
        <p className="muted text-sm">
          Guarda tu primera sesión y aquí verás cuántas semanas has entrenado y cuántas se te han
          escapado.
        </p>
      </article>
    );
  }

  const visibleMissed = showMissed
    ? consistency.missedWeekStarts
    : consistency.missedWeekStarts.slice(0, MAX_COLLAPSED_WEEKS);

  return (
    <article className="card">
      <h2 className="section-title">Constancia semanal</h2>
      <p className="muted mb-3 text-sm">
        Desde tu primer registro ({formatWeekStart(consistency.firstWeekStart!)}). Una semana cuenta
        como entrenada si guardaste al menos una sesión; la semana en curso no cuenta como fallada.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        <div className="metric-card">
          <p className="metric-label">Semanas entrenadas</p>
          <p className="metric-value">{consistency.weeksTrained}</p>
          <p className="metric-sublabel">de {consistency.totalWeeks} semanas</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Semanas falladas</p>
          <p className="metric-value">{consistency.weeksMissed}</p>
          <p className="metric-sublabel">sin ninguna sesión</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Constancia</p>
          <p className="metric-value">{consistency.percentTrained}%</p>
          <p className="metric-sublabel">de las semanas</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Racha actual</p>
          <p className="metric-value">{consistency.currentStreak}</p>
          <p className="metric-sublabel">mejor racha: {consistency.bestStreak}</p>
        </div>
      </div>

      {consistency.weeksMissed === 0 ? (
        <p className="phase-description text-sm">
          No has fallado ni una semana desde que empezaste a registrar. 💪
        </p>
      ) : (
        <div>
          <p className="block-title mb-2">
            Semanas sin entrenar ({consistency.weeksMissed})
          </p>
          <div className="flex flex-wrap gap-1">
            {visibleMissed.map((week) => (
              <span
                key={week}
                className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                title={`Semana del ${formatWeekStart(week)}`}
              >
                {formatWeekStart(week)}
              </span>
            ))}
          </div>
          {consistency.missedWeekStarts.length > MAX_COLLAPSED_WEEKS ? (
            <button
              type="button"
              className="muted mt-2 text-xs underline underline-offset-2"
              onClick={() => setShowMissed((v) => !v)}
            >
              {showMissed
                ? "Ver solo las últimas"
                : `Ver todas (${consistency.missedWeekStarts.length})`}
            </button>
          ) : null}
        </div>
      )}
    </article>
  );
}
