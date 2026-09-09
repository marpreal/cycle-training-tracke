"use client";

import { useMemo, useState } from "react";
import { KcalChart } from "@/components/charts/KcalChart";
import { DietCalendar } from "@/components/nutricion/DietCalendar";
import { DEFAULT_ISO_DATE } from "@/lib/appTypes";
import { monthDietDays, summarizeMonth, type DietDay } from "@/lib/diet";
import { formatKcal } from "@/lib/dietFormat";

type MonthView = { year: number; monthIndex: number };

type DietInsightsCardProps = {
  days: DietDay[];
  kcalTarget: number;
  selectedDate: string;
  todayIso: string;
  hasHydrated: boolean;
  onSelectDate: (isoDate: string) => void;
};

export function DietInsightsCard({
  days,
  kcalTarget,
  selectedDate,
  todayIso,
  hasHydrated,
  onSelectDate,
}: DietInsightsCardProps) {
  // El mes visible por defecto es el de hoy; solo se guarda estado cuando la
  // usuaria navega, así no hace falta sincronizar nada al hidratar.
  const [viewOverride, setViewOverride] = useState<MonthView | null>(null);

  const todayView = useMemo<MonthView>(() => {
    if (todayIso === DEFAULT_ISO_DATE) {
      const now = new Date();
      return { year: now.getFullYear(), monthIndex: now.getMonth() };
    }
    return { year: Number(todayIso.slice(0, 4)), monthIndex: Number(todayIso.slice(5, 7)) - 1 };
  }, [todayIso]);

  const view = viewOverride ?? todayView;

  const monthDays = useMemo(
    () => monthDietDays(days, view.year, view.monthIndex),
    [days, view.year, view.monthIndex],
  );
  const summary = useMemo(() => summarizeMonth(monthDays, kcalTarget), [monthDays, kcalTarget]);

  const monthTitle = new Date(view.year, view.monthIndex, 1).toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });

  function shiftMonth(delta: number) {
    const d = new Date(view.year, view.monthIndex + delta, 1);
    setViewOverride({ year: d.getFullYear(), monthIndex: d.getMonth() });
  }

  const isCurrentMonth =
    view.year === todayView.year && view.monthIndex === todayView.monthIndex;

  if (!hasHydrated) {
    return (
      <article className="card">
        <h2 className="section-title">Calendario y evolución</h2>
        <p className="muted text-sm">Cargando tus datos…</p>
      </article>
    );
  }

  return (
    <article className="card">
      <h2 className="section-title">Calendario y evolución</h2>
      <p className="muted mb-3 text-sm">
        Un mes de un vistazo: el color indica cuánto te acercaste al objetivo de{" "}
        {formatKcal(kcalTarget)} kcal. Toca un día para verlo o apuntar en él.
      </p>

      {/* Un único control de mes: encuadra a la vez el calendario y la gráfica. */}
      <div className="diet-cal-nav">
        <button
          type="button"
          className="date-picker-nav-btn"
          onClick={() => shiftMonth(-1)}
          aria-label="Mes anterior"
        >
          ‹
        </button>
        <span className="diet-cal-title capitalize">{monthTitle}</span>
        <button
          type="button"
          className="date-picker-nav-btn"
          onClick={() => shiftMonth(1)}
          aria-label="Mes siguiente"
        >
          ›
        </button>
        {!isCurrentMonth ? (
          <button
            type="button"
            className="action-button action-end diet-cal-today"
            onClick={() => setViewOverride(null)}
          >
            Mes actual
          </button>
        ) : null}
      </div>

      <DietCalendar
        year={view.year}
        monthIndex={view.monthIndex}
        monthDays={monthDays}
        kcalTarget={kcalTarget}
        selectedDate={selectedDate}
        todayIso={todayIso}
        onSelectDate={onSelectDate}
      />

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <article className="metric-card">
          <p className="metric-label">Días registrados</p>
          <p className="metric-value-small">
            {summary.daysLogged} <span className="metric-sublabel">de {summary.daysInMonth}</span>
          </p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Media del mes</p>
          <p className="metric-value-small">
            {summary.daysLogged > 0 ? `${formatKcal(summary.avgKcal)} kcal` : "Sin datos"}
          </p>
          <p className="metric-sublabel">Solo cuenta los días apuntados</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Días por encima</p>
          <p className="metric-value-small">{summary.daysOverTarget}</p>
          <p className="metric-sublabel">Objetivo {formatKcal(kcalTarget)} kcal</p>
        </article>
      </div>

      <h3 className="block-title mt-4">Calorías por día</h3>
      <KcalChart points={monthDays} kcalTarget={kcalTarget} />
    </article>
  );
}
