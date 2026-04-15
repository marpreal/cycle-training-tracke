"use client";

import { useState } from "react";

interface Stats {
  week: number;
  month: number;
  year: number;
  volumeWeek: number;
  volumeMonth: number;
  volumeYear: number;
}

export interface PersonalRecord {
  name: string;
  weightKg: number;
  date: string;
  isThisYear: boolean;
}

function MetricCard({
  label,
  sessions,
  volume,
  hasHydrated,
}: {
  label: string;
  sessions: number;
  volume: number;
  hasHydrated: boolean;
}) {
  return (
    <article className="metric-card">
      <p className="metric-label">{label}</p>
      <p className="metric-value">{hasHydrated ? sessions : "—"}</p>
      <p className="metric-sublabel">
        {hasHydrated ? `${Math.round(volume).toLocaleString("es-ES")} kg×reps` : "—"}
      </p>
    </article>
  );
}

export function TrainingMetricsBar({
  hasHydrated,
  stats,
  personalRecords,
}: {
  hasHydrated: boolean;
  stats: Stats;
  personalRecords: PersonalRecord[];
}) {
  const [showPRs, setShowPRs] = useState(false);
  const prsThisYear = personalRecords.filter((pr) => pr.isThisYear);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Esta semana"
          sessions={stats.week}
          volume={stats.volumeWeek}
          hasHydrated={hasHydrated}
        />
        <MetricCard
          label="Este mes"
          sessions={stats.month}
          volume={stats.volumeMonth}
          hasHydrated={hasHydrated}
        />
        <article className="metric-card">
          <p className="metric-label">Este año</p>
          <p className="metric-value">{hasHydrated ? stats.year : "—"}</p>
          <p className="metric-sublabel">
            {hasHydrated ? `${Math.round(stats.volumeYear).toLocaleString("es-ES")} kg×reps` : "—"}
          </p>
          {hasHydrated && prsThisYear.length > 0 ? (
            <p className="mt-1 text-xs text-[var(--muted)]">
              {prsThisYear.length} PR{prsThisYear.length === 1 ? "" : "s"} este año
            </p>
          ) : null}
        </article>
      </div>

      {hasHydrated && personalRecords.length > 0 ? (
        <div>
          <button
            type="button"
            className="muted text-xs underline underline-offset-2"
            onClick={() => setShowPRs((v) => !v)}
          >
            {showPRs ? "Ocultar récords personales" : `Ver récords personales (${personalRecords.length} ejercicios)`}
          </button>
          {showPRs ? (
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {personalRecords.map((pr) => (
                <div
                  key={pr.name}
                  className={`log-card ${pr.isThisYear ? "border-l-2 border-l-[var(--accent,#6366f1)]" : ""}`}
                >
                  <div className="min-w-0">
                    <p className="log-title truncate">{pr.name}</p>
                    <p className="muted text-xs">{pr.weightKg} kg · {pr.date}</p>
                  </div>
                  {pr.isThisYear ? (
                    <span className="shrink-0 text-xs font-semibold text-[var(--accent,#6366f1)]">PR ✓</span>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
