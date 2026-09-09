"use client";

import { useMemo, useRef, useState } from "react";
import { useElementWidth } from "@/hooks/useElementWidth";
import { makeScaleY, niceTicks } from "@/lib/chartGeometry";
import { formatKcal } from "@/lib/dietFormat";

export type KcalPoint = { date: string; kcal: number; logged: boolean };

type KcalChartProps = {
  points: KcalPoint[];
  kcalTarget: number;
};

const HEIGHT = 230;
const PAD = { top: 16, right: 14, bottom: 30, left: 46 };
const MAX_BAR = 24;
/** Hueco en color de fondo que separa las columnas: nunca un borde alrededor de la barra. */
const BAR_GAP = 2;

function formatLongDate(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
}

/** Columna con las esquinas de arriba redondeadas y la base recta sobre el eje. */
function barPath(x: number, top: number, width: number, baseline: number): string {
  const height = Math.max(1, baseline - top);
  const r = Math.min(4, width / 2, height);
  return [
    `M${x} ${baseline}`,
    `L${x} ${top + r}`,
    `Q${x} ${top} ${x + r} ${top}`,
    `L${x + width - r} ${top}`,
    `Q${x + width} ${top} ${x + width} ${top + r}`,
    `L${x + width} ${baseline}`,
    "Z",
  ].join(" ");
}

export function KcalChart({ points, kcalTarget }: KcalChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(wrapRef);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const loggedCount = points.filter((p) => p.logged).length;

  const geometry = useMemo(() => {
    const plotLeft = PAD.left;
    const plotRight = Math.max(PAD.left + 40, width - PAD.right);
    const plotTop = PAD.top;
    const plotBottom = HEIGHT - PAD.bottom;

    const maxValue = Math.max(kcalTarget, ...points.map((p) => p.kcal), 1);
    const scaleY = makeScaleY({ min: 0, max: maxValue * 1.12 }, plotTop, plotBottom);

    const band = points.length > 0 ? (plotRight - plotLeft) / points.length : 0;
    const barWidth = Math.max(2, Math.min(MAX_BAR, band - BAR_GAP));

    return {
      plotLeft,
      plotRight,
      plotTop,
      plotBottom,
      band,
      barWidth,
      scaleY,
      ticks: niceTicks(0, maxValue * 1.12, 4),
    };
  }, [points, kcalTarget, width]);

  const { plotLeft, plotRight, plotTop, plotBottom, band, barWidth, scaleY, ticks } = geometry;
  const targetY = scaleY(kcalTarget);
  const active = activeIndex != null ? points[activeIndex] : null;

  const bandCenter = (index: number) => plotLeft + band * (index + 0.5);
  const tooltipLeft =
    activeIndex != null ? Math.min(Math.max(bandCenter(activeIndex), plotLeft + 4), plotRight - 4) : 0;

  if (loggedCount === 0) {
    return (
      <p className="muted text-sm">
        No hay comidas apuntadas este mes. En cuanto registres algún día aparecerá aquí.
      </p>
    );
  }

  return (
    <div className="chart-wrap" ref={wrapRef}>
      <svg
        className="chart-svg"
        width={width}
        height={HEIGHT}
        role="img"
        aria-label={`Calorías por día: ${loggedCount} días registrados, objetivo ${kcalTarget} kcal.`}
        onPointerLeave={() => setActiveIndex(null)}
      >
        {ticks.map((tick) => {
          const y = scaleY(tick);
          return (
            <g key={tick}>
              <line className="chart-grid" x1={plotLeft} x2={plotRight} y1={y} y2={y} />
              <text className="chart-axis-text" x={plotLeft - 8} y={y} textAnchor="end" dominantBaseline="middle">
                {formatKcal(tick)}
              </text>
            </g>
          );
        })}

        {points.map((point, index) => {
          if (!point.logged || point.kcal <= 0) return null;
          const over = point.kcal > kcalTarget;
          return (
            <path
              key={point.date}
              className={`chart-bar ${over ? "is-over" : ""} ${activeIndex === index ? "is-active" : ""}`}
              d={barPath(bandCenter(index) - barWidth / 2, scaleY(point.kcal), barWidth, plotBottom)}
            />
          );
        })}

        <line className="chart-baseline" x1={plotLeft} x2={plotRight} y1={plotBottom} y2={plotBottom} />

        <line className="chart-threshold" x1={plotLeft} x2={plotRight} y1={targetY} y2={targetY} />
        <text className="chart-threshold-text" x={plotRight} y={targetY - 6} textAnchor="end">
          Objetivo {formatKcal(kcalTarget)} kcal
        </text>

        {/* Zonas de contacto: toda la altura de la columna, mucho mayores que la barra. */}
        {points.map((point, index) => (
          <rect
            key={`hit-${point.date}`}
            className="chart-hit"
            x={plotLeft + band * index}
            y={plotTop}
            width={Math.max(1, band)}
            height={plotBottom - plotTop}
            tabIndex={point.logged ? 0 : -1}
            role={point.logged ? "button" : undefined}
            aria-label={
              point.logged
                ? `${formatLongDate(point.date)}: ${formatKcal(point.kcal)} kcal`
                : undefined
            }
            onPointerEnter={() => setActiveIndex(index)}
            onFocus={() => setActiveIndex(index)}
            onBlur={() => setActiveIndex(null)}
          />
        ))}

        {points.map((point, index) => {
          const day = Number(point.date.slice(8, 10));
          const isLast = index === points.length - 1;
          if (day !== 1 && day % 5 !== 0 && !isLast) return null;
          // El último día cae muy cerca del múltiplo de 5 anterior: deja solo uno.
          if (!isLast && points.length - 1 - index < 3) return null;
          return (
            <text
              key={`tick-${point.date}`}
              className="chart-axis-text"
              x={bandCenter(index)}
              y={HEIGHT - 9}
              textAnchor="middle"
            >
              {day}
            </text>
          );
        })}
      </svg>

      {active && active.logged ? (
        <div className="chart-tooltip" style={{ left: tooltipLeft }} role="status">
          <p className="chart-tooltip-value">{formatKcal(active.kcal)} kcal</p>
          <p className="chart-tooltip-label">{formatLongDate(active.date)}</p>
        </div>
      ) : null}

      <ul className="chart-legend">
        <li>
          <span className="chart-swatch" aria-hidden="true" />
          Dentro del objetivo
        </li>
        <li>
          <span className="chart-swatch is-over" aria-hidden="true" />
          Por encima del objetivo
        </li>
      </ul>
    </div>
  );
}
