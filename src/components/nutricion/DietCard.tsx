"use client";

import { useState } from "react";
import { SpanishDatePicker } from "@/components/SpanishDatePicker";
import { DEFAULT_ISO_DATE, MEAL_LABELS, MEAL_TYPES, type MealType } from "@/lib/appTypes";
import type { DietDay, DietStats } from "@/lib/diet";
import { formatWeekStart } from "@/lib/trainingWeeks";
import type { UseMealFormReturn } from "@/hooks/useMealForm";

const COLLAPSED_DAYS = 7;
const MAX_WEEKS_SHOWN = 8;

function formatKcal(value: number): string {
  return `${Math.round(value).toLocaleString("es-ES")} kcal`;
}

function formatDay(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

/** "Te quedan 320 kcal" / "180 kcal por encima" respecto a un objetivo. */
function balanceText(consumed: number, target: number): { text: string; over: boolean } {
  const diff = Math.round(target - consumed);
  return diff >= 0
    ? { text: `Te quedan ${diff.toLocaleString("es-ES")} kcal`, over: false }
    : { text: `${Math.abs(diff).toLocaleString("es-ES")} kcal por encima`, over: true };
}

interface DietCardProps {
  meals: UseMealFormReturn;
  stats: DietStats;
  days: DietDay[];
  /** Objetivo calórico diario del perfil (mantenimiento ± ajuste). */
  targetCalories: number;
  /** Objetivo de proteína diaria (g). */
  proteinTarget: number;
  hasHydrated: boolean;
  onSave: () => void;
  onRemove: (id: string) => void;
}

export function DietCard({
  meals,
  stats,
  days,
  targetCalories,
  proteinTarget,
  hasHydrated,
  onSave,
  onRemove,
}: DietCardProps) {
  const [showAllDays, setShowAllDays] = useState(false);

  const todayBalance = balanceText(stats.today.kcal, targetCalories);
  const weekTarget = targetCalories * 7;
  const weekBalance = balanceText(stats.week.kcal, weekTarget);
  const visibleDays = showAllDays ? days : days.slice(0, COLLAPSED_DAYS);
  const visibleWeeks = stats.weeks.slice(0, MAX_WEEKS_SHOWN);

  return (
    <article className="card">
      <h2 className="section-title">Dieta: comidas y calorías</h2>
      <p className="muted mb-3 text-sm">
        Apunta lo que comes con sus kcal aproximadas. Los totales se comparan con tu objetivo
        calórico del perfil ({formatKcal(targetCalories)}/día).
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="field">
          <span>Fecha</span>
          <SpanishDatePicker value={meals.mealDateInput} onChange={meals.setMealDateInput} />
        </label>
        <label className="field">
          <span>Comida</span>
          <select
            value={meals.mealTypeInput}
            onChange={(e) => meals.setMealTypeInput(e.target.value as MealType)}
          >
            {MEAL_TYPES.map((type) => (
              <option key={type} value={type}>
                {MEAL_LABELS[type]}
              </option>
            ))}
          </select>
        </label>
        <label className="field sm:col-span-2">
          <span>Qué has comido</span>
          <input
            type="text"
            value={meals.mealNameInput}
            onChange={(e) => meals.setMealNameInput(e.target.value)}
            placeholder="ej. Yogur con avena y plátano"
          />
        </label>
        <label className="field">
          <span>Calorías (kcal)</span>
          <input
            type="text"
            inputMode="decimal"
            value={meals.mealKcalInput}
            onChange={(e) => meals.setMealKcalInput(e.target.value)}
            placeholder="ej. 350"
          />
        </label>
        <label className="field">
          <span>Proteína (g) · opcional</span>
          <input
            type="text"
            inputMode="decimal"
            value={meals.mealProteinInput}
            onChange={(e) => meals.setMealProteinInput(e.target.value)}
            placeholder="ej. 22"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className="primary-button"
          type="button"
          onClick={onSave}
          disabled={!meals.canSaveMeal}
        >
          {meals.editingMealId ? "Guardar comida" : "Añadir comida"}
        </button>
        {meals.editingMealId ? (
          <button className="action-button action-end" type="button" onClick={meals.resetMealFields}>
            Cancelar
          </button>
        ) : null}
      </div>
      {hasHydrated && !meals.canSaveMeal ? (
        <p className="mt-2 text-xs text-red-500">
          {meals.mealDateInput === DEFAULT_ISO_DATE
            ? "Selecciona una fecha válida."
            : meals.mealNameInput.trim() === ""
              ? "Escribe qué has comido."
              : "Introduce las kcal (entre 0 y 5.000)."}
        </p>
      ) : null}

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <article className="metric-card">
          <p className="metric-label">Hoy</p>
          <p className="metric-value-small">{hasHydrated ? formatKcal(stats.today.kcal) : "—"}</p>
          <p className={`metric-sublabel ${hasHydrated && todayBalance.over ? "text-red-500" : ""}`}>
            {hasHydrated ? todayBalance.text : "—"}
          </p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Esta semana</p>
          <p className="metric-value-small">{hasHydrated ? formatKcal(stats.week.kcal) : "—"}</p>
          <p className={`metric-sublabel ${hasHydrated && weekBalance.over ? "text-red-500" : ""}`}>
            {hasHydrated ? `${weekBalance.text} (obj. ${formatKcal(weekTarget)})` : "—"}
          </p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Media diaria (semana)</p>
          <p className="metric-value-small">
            {hasHydrated ? formatKcal(stats.week.avgKcalPerLoggedDay) : "—"}
          </p>
          <p className="metric-sublabel">
            {hasHydrated ? `${stats.week.daysLogged} de 7 días registrados` : "—"}
          </p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Este mes</p>
          <p className="metric-value-small">{hasHydrated ? formatKcal(stats.month.kcal) : "—"}</p>
          <p className="metric-sublabel">
            {hasHydrated
              ? `${formatKcal(stats.month.avgKcalPerLoggedDay)}/día en ${stats.month.daysLogged} días`
              : "—"}
          </p>
        </article>
      </div>

      {hasHydrated && stats.today.proteinG > 0 ? (
        <p className="phase-description mt-3 text-sm">
          Proteína de hoy: <strong>{Math.round(stats.today.proteinG)} g</strong> de un objetivo de ~
          {proteinTarget} g.
        </p>
      ) : null}

      {!hasHydrated ? null : stats.isEmpty ? (
        <p className="muted mt-4 text-sm">
          Todavía no has apuntado ninguna comida. Añade la primera y aquí verás las kcal por día y
          por semana.
        </p>
      ) : (
        <>
          <p className="block-title mt-4 mb-2">Por día</p>
          <div className="stack">
            {visibleDays.map((day) => {
              const dayBalance = balanceText(day.kcal, targetCalories);
              return (
                <div key={day.date} className="log-card" style={{ flexDirection: "column", alignItems: "stretch" }}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="log-title">{formatDay(day.date)}</p>
                    <p className="text-sm">
                      <strong>{formatKcal(day.kcal)}</strong>
                      {day.proteinG > 0 ? (
                        <span className="muted"> · {day.proteinG} g proteína</span>
                      ) : null}
                      <span className={`ml-2 text-xs ${dayBalance.over ? "text-red-500" : "muted"}`}>
                        {dayBalance.text}
                      </span>
                    </p>
                  </div>
                  <div className="stack mt-2">
                    {day.entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-sm"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <span className="min-w-0">
                          <span className="muted">{MEAL_LABELS[entry.meal]}</span> · {entry.name}
                          <span className="muted">
                            {" "}
                            · {formatKcal(entry.kcal)}
                            {entry.proteinG != null && entry.proteinG > 0
                              ? ` · ${entry.proteinG} g prot.`
                              : ""}
                          </span>
                        </span>
                        <span className="flex gap-2">
                          <button
                            type="button"
                            className="action-button action-end"
                            onClick={() => meals.startEditMeal(entry)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="danger-button"
                            onClick={() => onRemove(entry.id)}
                          >
                            Borrar
                          </button>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {days.length > COLLAPSED_DAYS ? (
            <button
              type="button"
              className="muted mt-2 text-xs underline underline-offset-2"
              onClick={() => setShowAllDays((v) => !v)}
            >
              {showAllDays ? "Ver solo los últimos días" : `Ver todos los días (${days.length})`}
            </button>
          ) : null}

          <p className="block-title mt-4 mb-2">Por semana</p>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Semana del</th>
                  <th>Días registrados</th>
                  <th>kcal totales</th>
                  <th>Media kcal/día</th>
                  <th>Proteína total</th>
                </tr>
              </thead>
              <tbody>
                {visibleWeeks.map((week) => (
                  <tr key={week.weekStart}>
                    <td>{formatWeekStart(week.weekStart)}</td>
                    <td>{week.daysLogged}</td>
                    <td>{formatKcal(week.kcal)}</td>
                    <td>{formatKcal(week.avgKcalPerLoggedDay)}</td>
                    <td>{week.proteinG > 0 ? `${week.proteinG} g` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {stats.weeks.length > MAX_WEEKS_SHOWN ? (
            <p className="muted mt-2 text-xs">
              Mostrando las {MAX_WEEKS_SHOWN} semanas más recientes.
            </p>
          ) : null}
        </>
      )}
    </article>
  );
}
