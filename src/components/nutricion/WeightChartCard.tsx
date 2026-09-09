"use client";

import { useMemo, useState } from "react";
import { WeightChart, type WeightPoint } from "@/components/charts/WeightChart";
import { toIsoDate, type BodyMeasurementRecord } from "@/lib/appTypes";
import { formatKg, formatSignedKg } from "@/lib/dietFormat";

const RANGES = [
  { id: "30", label: "30 días", days: 30 },
  { id: "90", label: "3 meses", days: 90 },
  { id: "365", label: "1 año", days: 365 },
  { id: "all", label: "Todo", days: null },
] as const;

type RangeId = (typeof RANGES)[number]["id"];

type WeightChartCardProps = {
  measurements: BodyMeasurementRecord[];
  targetWeightKg: number | null;
  hasHydrated: boolean;
};

export function WeightChartCard({
  measurements,
  targetWeightKg,
  hasHydrated,
}: WeightChartCardProps) {
  const [rangeId, setRangeId] = useState<RangeId>("90");

  const allPoints = useMemo<WeightPoint[]>(
    () =>
      measurements
        .filter((m) => m.weightKg != null && Number.isFinite(m.weightKg) && m.date)
        .map((m) => ({ date: m.date, weightKg: m.weightKg as number }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [measurements],
  );

  const points = useMemo(() => {
    const range = RANGES.find((r) => r.id === rangeId);
    if (!range?.days) return allPoints;
    const from = new Date();
    from.setDate(from.getDate() - (range.days - 1));
    const fromIso = toIsoDate(from);
    return allPoints.filter((p) => p.date >= fromIso);
  }, [allPoints, rangeId]);

  const change =
    points.length >= 2 ? points[points.length - 1].weightKg - points[0].weightKg : null;

  if (!hasHydrated) {
    return (
      <article className="card">
        <h2 className="section-title">Evolución del peso</h2>
        <p className="muted text-sm">Cargando tus datos…</p>
      </article>
    );
  }

  return (
    <article className="card">
      <h2 className="section-title">Evolución del peso</h2>

      {/* Una sola fila de filtro, encima de lo que acota. */}
      <div className="chart-filters" role="group" aria-label="Periodo">
        {RANGES.map((range) => (
          <button
            key={range.id}
            type="button"
            className={`chart-filter ${rangeId === range.id ? "is-active" : ""}`}
            aria-pressed={rangeId === range.id}
            onClick={() => setRangeId(range.id)}
          >
            {range.label}
          </button>
        ))}
      </div>

      <WeightChart points={points} targetWeightKg={targetWeightKg} />

      {change != null ? (
        <p className="phase-description mt-3 text-sm">
          En este periodo:{" "}
          <strong
            style={{
              color: change < 0 ? "#16a34a" : change > 0 ? "#dc2626" : "var(--muted)",
            }}
          >
            {formatSignedKg(change)} kg
          </strong>{" "}
          ({formatKg(points[0].weightKg)} kg → {formatKg(points[points.length - 1].weightKg)} kg).
          El peso diario fluctúa: mira la forma de la curva, no dos pesajes sueltos.
        </p>
      ) : points.length === 1 ? (
        <p className="muted mt-3 text-sm">
          Solo hay un pesaje en este periodo. Con dos o más se dibuja la curva.
        </p>
      ) : null}
    </article>
  );
}
