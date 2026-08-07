"use client";

import { useState } from "react";
import { formatDate, toDateOnly, type PeriodDelayReport } from "@/lib/cycle";

const MAX_COLLAPSED_ROWS = 6;

/** "3 días de retraso" / "2 días de adelanto" / "puntual". */
function describeDelay(delayDays: number): string {
  if (delayDays === 0) return "puntual";
  const abs = Math.abs(delayDays);
  const unit = abs === 1 ? "día" : "días";
  return delayDays > 0 ? `${abs} ${unit} de retraso` : `${abs} ${unit} de adelanto`;
}

function delayClass(delayDays: number): string {
  if (delayDays > 0) return "text-amber-700 dark:text-amber-400";
  if (delayDays < 0) return "text-sky-700 dark:text-sky-400";
  return "text-emerald-700 dark:text-emerald-400";
}

export function PeriodDelaysCard({
  report,
  cycleLength,
}: {
  report: PeriodDelayReport;
  cycleLength: number;
}) {
  const [showAll, setShowAll] = useState(false);
  const { cycles, currentDelayDays, currentExpectedDate } = report;
  const visibleCycles = showAll ? cycles : cycles.slice(0, MAX_COLLAPSED_ROWS);

  return (
    <article className="card max-w-4xl">
      <h2 className="section-title">Retrasos de la regla</h2>
      <p className="muted mb-3 text-sm">
        Cada ciclo se compara con los {cycleLength} días que tienes configurados: los días de más
        son retraso y los de menos, adelanto.
      </p>

      {currentDelayDays !== null ? (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
          <strong>Retraso en curso: {currentDelayDays} {currentDelayDays === 1 ? "día" : "días"}.</strong>{" "}
          La esperabas el {formatDate(toDateOnly(currentExpectedDate!))} y todavía no la has
          registrado.
        </div>
      ) : (
        <p className="muted mb-4 text-sm">Ahora mismo no llevas retraso.</p>
      )}

      {cycles.length === 0 ? (
        <p className="muted text-sm">
          Registra al menos 2 reglas para poder calcular retrasos entre ciclos.
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
            <div className="metric-card">
              <p className="metric-label">Ciclos comparados</p>
              <p className="metric-value">{cycles.length}</p>
            </div>
            <div className="metric-card">
              <p className="metric-label">Ciclos con retraso</p>
              <p className="metric-value">{report.lateCount}</p>
            </div>
            <div className="metric-card">
              <p className="metric-label">Retraso medio</p>
              <p className="metric-value-small">
                {report.avgDelayDays !== null ? `${report.avgDelayDays} días` : "—"}
              </p>
            </div>
            <div className="metric-card">
              <p className="metric-label">Retraso máximo</p>
              <p className="metric-value-small">
                {report.maxDelayDays > 0 ? `${report.maxDelayDays} días` : "—"}
              </p>
            </div>
          </div>

          <div className="stack">
            {visibleCycles.map((cycle) => (
              <div key={`${cycle.previousStartDate}-${cycle.startDate}`} className="log-card">
                <div className="min-w-0">
                  <p className="log-title">
                    {cycle.previousStartDate} → {cycle.startDate}
                  </p>
                  <p className="muted text-xs">
                    {cycle.actualCycleLength} días de ciclo (esperados {cycle.expectedCycleLength})
                  </p>
                </div>
                <span className={`shrink-0 text-sm font-semibold ${delayClass(cycle.delayDays)}`}>
                  {cycle.delayDays > 0 ? "+" : ""}
                  {cycle.delayDays} · {describeDelay(cycle.delayDays)}
                </span>
              </div>
            ))}
          </div>

          {cycles.length > MAX_COLLAPSED_ROWS ? (
            <button
              type="button"
              className="muted mt-2 text-xs underline underline-offset-2"
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll
                ? "Ver solo los últimos ciclos"
                : `Ver todos los ciclos (${cycles.length})`}
            </button>
          ) : null}

          {report.earlyCount > 0 ? (
            <p className="muted mt-3 text-xs">
              {report.earlyCount} {report.earlyCount === 1 ? "ciclo se adelantó" : "ciclos se adelantaron"} respecto a lo previsto.
            </p>
          ) : null}
        </>
      )}
    </article>
  );
}
