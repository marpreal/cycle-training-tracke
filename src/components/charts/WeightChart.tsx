"use client";

import { useMemo, useRef, useState } from "react";
import { useElementWidth } from "@/hooks/useElementWidth";
import {
  isoToTime,
  makeScaleX,
  makeScaleY,
  nearestIndexAt,
  niceTicks,
  paddedRange,
} from "@/lib/chartGeometry";
import { formatKg } from "@/lib/dietFormat";

export type WeightPoint = { date: string; weightKg: number };

type WeightChartProps = {
  points: WeightPoint[];
  targetWeightKg: number | null;
};

const HEIGHT = 220;
const PAD = { top: 14, right: 18, bottom: 28, left: 46 };

function formatShortDate(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function formatLongDate(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
}

export function WeightChart({ points, targetWeightKg }: WeightChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(wrapRef);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const geometry = useMemo(() => {
    if (points.length === 0) return null;
    const plotLeft = PAD.left;
    const plotRight = Math.max(PAD.left + 40, width - PAD.right);
    const plotTop = PAD.top;
    const plotBottom = HEIGHT - PAD.bottom;

    const times = points.map((p) => isoToTime(p.date));
    // El objetivo entra en el dominio para que su línea siempre quede dentro del área.
    const values = points.map((p) => p.weightKg);
    const yRange = paddedRange(
      targetWeightKg != null ? [...values, targetWeightKg] : values,
      0.12,
      0.5,
    );

    const scaleX = makeScaleX({ min: Math.min(...times), max: Math.max(...times) }, plotLeft, plotRight);
    const scaleY = makeScaleY(yRange, plotTop, plotBottom);

    const xs = times.map(scaleX);
    const ys = values.map(scaleY);
    const line = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(" ");
    const area =
      xs.length > 1
        ? `${line} L${xs[xs.length - 1].toFixed(1)} ${plotBottom} L${xs[0].toFixed(1)} ${plotBottom} Z`
        : "";

    return {
      plotLeft,
      plotRight,
      plotTop,
      plotBottom,
      xs,
      ys,
      line,
      area,
      scaleY,
      ticks: niceTicks(yRange.min, yRange.max, 4),
    };
  }, [points, targetWeightKg, width]);

  if (points.length === 0 || !geometry) {
    return (
      <p className="muted text-sm">
        Aún no hay pesos registrados. Apunta al menos dos pesajes para ver la curva.
      </p>
    );
  }

  const { plotLeft, plotRight, plotTop, plotBottom, xs, ys, line, area, scaleY, ticks } = geometry;
  const lastIndex = points.length - 1;
  const active = activeIndex != null ? points[activeIndex] : null;
  const targetY = targetWeightKg != null ? scaleY(targetWeightKg) : null;

  function handlePointer(event: React.PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    setActiveIndex(nearestIndexAt(event.clientX - rect.left, xs));
  }

  // El tooltip se ancla al punto pero se mantiene dentro del área dibujable.
  const tooltipLeft =
    activeIndex != null ? Math.min(Math.max(xs[activeIndex], plotLeft + 4), plotRight - 4) : 0;

  return (
    <div className="chart-wrap" ref={wrapRef}>
      <svg
        className="chart-svg"
        width={width}
        height={HEIGHT}
        role="img"
        aria-label={`Evolución del peso: ${points.length} pesajes, del ${points[0].date} al ${points[lastIndex].date}.`}
        onPointerMove={handlePointer}
        onPointerLeave={() => setActiveIndex(null)}
      >
        {ticks.map((tick) => {
          const y = scaleY(tick);
          return (
            <g key={tick}>
              <line className="chart-grid" x1={plotLeft} x2={plotRight} y1={y} y2={y} />
              <text className="chart-axis-text" x={plotLeft - 8} y={y} textAnchor="end" dominantBaseline="middle">
                {formatKg(tick)}
              </text>
            </g>
          );
        })}

        {area ? <path className="chart-area" d={area} /> : null}

        {/* El umbral se dibuja sobre el relleno para que no lo deslave. */}
        {targetY != null ? (
          <>
            <line
              className="chart-threshold"
              x1={plotLeft}
              x2={plotRight}
              y1={targetY}
              y2={targetY}
            />
            <text className="chart-threshold-text" x={plotRight} y={targetY - 6} textAnchor="end">
              Objetivo {formatKg(targetWeightKg!)} kg
            </text>
          </>
        ) : null}

        <path className="chart-line" d={line} />

        {activeIndex != null ? (
          <>
            <line
              className="chart-crosshair"
              x1={xs[activeIndex]}
              x2={xs[activeIndex]}
              y1={plotTop}
              y2={plotBottom}
            />
            <circle className="chart-dot is-active" cx={xs[activeIndex]} cy={ys[activeIndex]} r={5} />
          </>
        ) : (
          <circle className="chart-dot" cx={xs[lastIndex]} cy={ys[lastIndex]} r={4.5} />
        )}

        {/* Etiqueta directa solo en el último punto: el resto lo cubren el eje y el tooltip. */}
        {activeIndex == null ? (
          <text
            className="chart-point-label"
            x={Math.min(xs[lastIndex], plotRight - 2)}
            y={Math.max(ys[lastIndex] - 12, plotTop + 10)}
            textAnchor={xs[lastIndex] > plotRight - 40 ? "end" : "middle"}
          >
            {formatKg(points[lastIndex].weightKg)} kg
          </text>
        ) : null}

        <text className="chart-axis-text" x={plotLeft} y={HEIGHT - 8}>
          {formatShortDate(points[0].date)}
        </text>
        {points.length > 1 ? (
          <text className="chart-axis-text" x={plotRight} y={HEIGHT - 8} textAnchor="end">
            {formatShortDate(points[lastIndex].date)}
          </text>
        ) : null}
      </svg>

      {active ? (
        <div className="chart-tooltip" style={{ left: tooltipLeft }} role="status">
          <p className="chart-tooltip-value">{formatKg(active.weightKg)} kg</p>
          <p className="chart-tooltip-label">{formatLongDate(active.date)}</p>
        </div>
      ) : null}
    </div>
  );
}
