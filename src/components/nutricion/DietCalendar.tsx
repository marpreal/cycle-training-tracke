"use client";

import { useMemo } from "react";
import { formatKcal } from "@/lib/dietFormat";
import type { MonthDay } from "@/lib/diet";

const WEEKDAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

/**
 * Tramos de intensidad respecto al objetivo. Es una escala secuencial de un solo
 * tono (violeta, claro → oscuro) más el estado "por encima", que la app ya pinta
 * en rojo en las barras de progreso.
 */
export type HeatLevel = "empty" | "low" | "mid" | "high" | "over";

export function heatLevel(kcal: number, target: number, logged: boolean): HeatLevel {
  if (!logged || kcal <= 0) return "empty";
  if (target <= 0) return "mid";
  const ratio = kcal / target;
  if (ratio > 1) return "over";
  if (ratio < 0.5) return "low";
  if (ratio < 0.8) return "mid";
  return "high";
}

type CalendarCell = MonthDay | null;

type DietCalendarProps = {
  year: number;
  monthIndex: number;
  monthDays: MonthDay[];
  kcalTarget: number;
  selectedDate: string;
  todayIso: string;
  onSelectDate: (isoDate: string) => void;
};

function formatLongDate(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
}

export function DietCalendar({
  year,
  monthIndex,
  monthDays,
  kcalTarget,
  selectedDate,
  todayIso,
  onSelectDate,
}: DietCalendarProps) {
  const cells = useMemo<CalendarCell[]>(() => {
    // La semana empieza en lunes, igual que en el resto de la app.
    const startPad = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
    const out: CalendarCell[] = Array.from({ length: startPad }, () => null);
    out.push(...monthDays);
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [monthDays, year, monthIndex]);

  return (
    <>
      <div className="diet-cal-weekdays" aria-hidden="true">
        {WEEKDAY_LABELS.map((label, i) => (
          <span key={i} className="diet-cal-wd">
            {label}
          </span>
        ))}
      </div>
      <div className="diet-cal-grid">
        {cells.map((cell, index) => {
          if (!cell) return <span key={`empty-${index}`} className="diet-cal-cell is-blank" />;
          const level = heatLevel(cell.kcal, kcalTarget, cell.logged);
          const dayNumber = Number(cell.date.slice(8, 10));
          return (
            <button
              key={cell.date}
              type="button"
              className={[
                "diet-cal-cell",
                `heat-${level}`,
                cell.date === selectedDate ? "is-selected" : "",
                cell.date === todayIso ? "is-today" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onSelectDate(cell.date)}
              aria-pressed={cell.date === selectedDate}
              aria-label={
                cell.logged
                  ? `${formatLongDate(cell.date)}: ${formatKcal(cell.kcal)} kcal`
                  : `${formatLongDate(cell.date)}: sin registrar`
              }
              title={
                cell.logged
                  ? `${formatKcal(cell.kcal)} kcal de ${formatKcal(kcalTarget)}`
                  : "Sin registrar"
              }
            >
              <span className="diet-cal-day">{dayNumber}</span>
              <span className="diet-cal-kcal">{cell.logged ? formatKcal(cell.kcal) : "·"}</span>
            </button>
          );
        })}
      </div>

      <ul className="chart-legend diet-cal-legend">
        <li>
          <span className="chart-swatch heat-empty" aria-hidden="true" />
          Sin registrar
        </li>
        <li>
          <span className="chart-swatch heat-low" aria-hidden="true" />
          Menos de la mitad
        </li>
        <li>
          <span className="chart-swatch heat-mid" aria-hidden="true" />
          Medio
        </li>
        <li>
          <span className="chart-swatch heat-high" aria-hidden="true" />
          Cerca del objetivo
        </li>
        <li>
          <span className="chart-swatch heat-over" aria-hidden="true" />
          Por encima
        </li>
      </ul>
    </>
  );
}
