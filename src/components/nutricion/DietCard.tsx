"use client";

import { useState } from "react";
import { SpanishDatePicker } from "@/components/SpanishDatePicker";
import { DailyOverview } from "@/components/nutricion/DailyOverview";
import { QuickAddBar } from "@/components/nutricion/QuickAddBar";
import {
  DEFAULT_ISO_DATE,
  MEAL_LABELS,
  MEAL_TYPES,
  type FrequentMeal,
  type MealRecord,
  type MealType,
} from "@/lib/appTypes";
import {
  findDay,
  groupDayByMealType,
  type DietDay,
  type RollingAverage,
  type WeightTrend,
} from "@/lib/diet";
import { formatGrams, formatKcal, formatKg, formatSignedKg } from "@/lib/dietFormat";
import type { UseMealFormReturn } from "@/hooks/useMealForm";

const COLLAPSED_DAYS = 5;

function formatDay(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short" });
}

type DietCardProps = {
  meals: UseMealFormReturn;
  days: DietDay[];
  frequentMeals: FrequentMeal[];
  rolling7: RollingAverage;
  weightTrend: WeightTrend;
  kcalTarget: number;
  proteinTarget: number;
  targetWeightKg: number | null;
  currentWeightKg: number;
  hasHydrated: boolean;
  onSave: () => void;
  onRemove: (id: string) => void;
  onQuickAdd: (frequent: FrequentMeal) => void;
  onSaveFrequent: (frequent: FrequentMeal) => void;
  onRemoveFrequent: (id: string) => void;
};

export function DietCard({
  meals,
  days,
  frequentMeals,
  rolling7,
  weightTrend,
  kcalTarget,
  proteinTarget,
  targetWeightKg,
  currentWeightKg,
  hasHydrated,
  onSave,
  onRemove,
  onQuickAdd,
  onSaveFrequent,
  onRemoveFrequent,
}: DietCardProps) {
  const [showAllDays, setShowAllDays] = useState(false);

  const selectedDay = findDay(days, meals.mealDateInput);
  const todayDay = findDay(days, meals.todayIso);
  const groups = groupDayByMealType(selectedDay);
  const previousDays = days.filter((day) => day.date !== meals.mealDateInput);
  const visiblePreviousDays = showAllDays ? previousDays : previousDays.slice(0, COLLAPSED_DAYS);
  const showDatePicker = meals.showDateField || meals.isOtherDate;

  return (
    <article className="card">
      <h2 className="section-title">Dieta: comidas y calorías</h2>

      <DailyOverview
        dateIso={meals.todayIso}
        kcal={todayDay?.kcal ?? 0}
        proteinG={todayDay?.proteinG ?? 0}
        kcalTarget={kcalTarget}
        proteinTarget={proteinTarget}
        targetWeightKg={targetWeightKg}
        weightTrend={weightTrend}
        currentWeightKg={currentWeightKg}
        hasHydrated={hasHydrated}
      />

      <div className="mt-4">
        <QuickAddBar
          frequentMeals={frequentMeals}
          onQuickAdd={onQuickAdd}
          onSaveFrequent={onSaveFrequent}
          onRemoveFrequent={onRemoveFrequent}
          disabled={meals.mealDateInput === DEFAULT_ISO_DATE}
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
        <label className="field">
          <span>Qué has comido · opcional</span>
          <input
            type="text"
            value={meals.mealNameInput}
            onChange={(e) => meals.setMealNameInput(e.target.value)}
            placeholder="ej. Yogur proteico con avena"
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
            placeholder="ej. 28,5"
          />
        </label>
        {showDatePicker ? (
          <label className="field sm:col-span-2">
            <span>Fecha</span>
            <SpanishDatePicker value={meals.mealDateInput} onChange={meals.setMealDateInput} />
          </label>
        ) : null}
      </div>

      <label className="load-detail-toggle mt-3">
        <input
          type="checkbox"
          checked={meals.saveAsFrequent}
          onChange={(e) => meals.setSaveAsFrequent(e.target.checked)}
        />
        <span>Guardar como frecuente</span>
      </label>

      <div className="mt-3 flex flex-wrap items-center gap-2">
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
        {showDatePicker ? (
          <button
            type="button"
            className="muted text-xs underline underline-offset-2"
            onClick={meals.useTodayDate}
          >
            Volver a hoy
          </button>
        ) : (
          <button
            type="button"
            className="muted text-xs underline underline-offset-2"
            onClick={() => meals.setShowDateField(true)}
          >
            Otra fecha
          </button>
        )}
      </div>
      {hasHydrated && !meals.canSaveMeal ? (
        <p className="mt-2 text-xs text-red-500">
          {meals.mealDateInput === DEFAULT_ISO_DATE
            ? "Selecciona una fecha válida."
            : "Introduce las kcal (entre 0 y 5.000)."}
        </p>
      ) : null}

      {hasHydrated ? (
        <>
          <h3 className="block-title mt-4">
            {meals.isOtherDate ? formatDay(meals.mealDateInput) : "Hoy"}
          </h3>
          {groups.length === 0 ? (
            <p className="muted text-sm">
              Aún no has apuntado nada{meals.isOtherDate ? " ese día" : " hoy"}.
            </p>
          ) : (
            <div className="stack">
              {groups.map((group) => (
                <section key={group.meal} className="meal-group" aria-label={group.label}>
                  <div className="meal-group-head">
                    <h4 className="meal-group-title">{group.label}</h4>
                    <p className="meal-group-kcal">{formatKcal(group.kcal)} kcal</p>
                  </div>
                  {group.entries.map((entry) => (
                    <DietEntryRow
                      key={entry.id}
                      entry={entry}
                      onEdit={() => meals.startEditMeal(entry)}
                      onRemove={() => onRemove(entry.id)}
                    />
                  ))}
                </section>
              ))}
            </div>
          )}

          <h3 className="block-title mt-4">Tendencia</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <article className="metric-card">
              <p className="metric-label">Media 7 días · calorías</p>
              <p className="metric-value-small">
                {rolling7.daysLogged > 0 ? `${formatKcal(rolling7.avgKcal)} kcal` : "Sin datos"}
              </p>
              <p className="metric-sublabel">
                {rolling7.daysLogged > 0
                  ? `${rolling7.daysLogged} de ${rolling7.windowDays} días registrados`
                  : "Apunta algún día para verlo"}
              </p>
            </article>
            <article className="metric-card">
              <p className="metric-label">Media 7 días · proteína</p>
              <p className="metric-value-small">
                {rolling7.daysLogged > 0 ? `${formatGrams(rolling7.avgProteinG)} g` : "Sin datos"}
              </p>
              <p className="metric-sublabel">Objetivo {formatGrams(proteinTarget)} g/día</p>
            </article>
            <article className="metric-card">
              <p className="metric-label">Peso medio esta semana</p>
              <p className="metric-value-small">
                {weightTrend.currentWeekAvg != null
                  ? `${formatKg(weightTrend.currentWeekAvg)} kg`
                  : "Sin pesajes"}
              </p>
              <p className="metric-sublabel">
                {weightTrend.previousWeekAvg != null
                  ? `Semana anterior: ${formatKg(weightTrend.previousWeekAvg)} kg`
                  : "Sin semana anterior para comparar"}
              </p>
            </article>
          </div>
          <p className="phase-description mt-3 text-sm">
            {weightTrend.deltaKg == null ? (
              <>
                La tendencia se calcula con la media semanal de peso, no con el último pesaje. Hacen
                falta pesajes en esta semana y en la anterior para poder compararlas.
              </>
            ) : (
              <>
                Tendencia:{" "}
                <strong
                  style={{
                    color:
                      weightTrend.deltaKg < 0
                        ? "#16a34a"
                        : weightTrend.deltaKg > 0
                          ? "#dc2626"
                          : "var(--muted)",
                  }}
                >
                  {formatSignedKg(weightTrend.deltaKg)} kg
                </strong>{" "}
                respecto a la semana pasada (media de {weightTrend.currentWeekCount} pesaje
                {weightTrend.currentWeekCount === 1 ? "" : "s"} frente a{" "}
                {weightTrend.previousWeekCount}).
              </>
            )}
          </p>

          {previousDays.length > 0 ? (
            <>
              <h3 className="block-title mt-4">Días anteriores</h3>
              <div className="stack">
                {visiblePreviousDays.map((day) => (
                  <div key={day.date} className="log-card">
                    <div>
                      <p className="log-title">{formatDay(day.date)}</p>
                      <p className="muted text-sm">
                        {formatKcal(day.kcal)} kcal
                        {day.proteinG > 0 ? ` · ${formatGrams(day.proteinG)} g proteína` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="action-button action-end"
                      onClick={() => {
                        meals.setMealDateInput(day.date);
                        meals.setShowDateField(true);
                      }}
                    >
                      Ver
                    </button>
                  </div>
                ))}
              </div>
              {previousDays.length > COLLAPSED_DAYS ? (
                <button
                  type="button"
                  className="muted mt-2 text-xs underline underline-offset-2"
                  onClick={() => setShowAllDays((v) => !v)}
                >
                  {showAllDays ? "Ver solo los últimos" : `Ver todos (${previousDays.length})`}
                </button>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}
    </article>
  );
}

type DietEntryRowProps = {
  entry: MealRecord;
  onEdit: () => void;
  onRemove: () => void;
};

function DietEntryRow({ entry, onEdit, onRemove }: DietEntryRowProps) {
  return (
    <div className="diet-entry">
      <span className="diet-entry-name">
        {entry.name || <span className="muted">Sin descripción</span>}
        {entry.proteinG != null && entry.proteinG > 0 ? (
          <span className="diet-entry-protein"> · {formatGrams(entry.proteinG)} g proteína</span>
        ) : null}
      </span>
      <span className="diet-entry-side">
        <span className="text-sm font-semibold">{formatKcal(entry.kcal)} kcal</span>
        <span className="diet-entry-actions">
          <button type="button" className="action-button action-end" onClick={onEdit}>
            Editar
          </button>
          <button type="button" className="danger-button" onClick={onRemove}>
            Borrar
          </button>
        </span>
      </span>
    </div>
  );
}
