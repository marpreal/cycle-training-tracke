"use client";

interface Stats {
  week: number;
  month: number;
  year: number;
  volumeWeek: number;
  volumeMonth: number;
  volumeYear: number;
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
}: {
  hasHydrated: boolean;
  stats: Stats;
}) {
  return (
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
      <MetricCard
        label="Este año"
        sessions={stats.year}
        volume={stats.volumeYear}
        hasHydrated={hasHydrated}
      />
    </div>
  );
}
