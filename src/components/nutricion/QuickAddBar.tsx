"use client";

import { useState } from "react";
import { MEAL_LABELS, MEAL_TYPES, type FrequentMeal, type MealType } from "@/lib/appTypes";
import { parseKcalInput, parseProteinInput } from "@/hooks/useMealForm";
import { formatGrams, formatKcal } from "@/lib/dietFormat";

const MEAL_EMOJI: Record<MealType, string> = {
  desayuno: "☕",
  "media-manana": "🥐",
  comida: "🍽️",
  merienda: "🥣",
  cena: "🌙",
  otro: "🥤",
};

type DraftState = {
  id: string | null;
  name: string;
  kcal: string;
  protein: string;
  meal: MealType | "";
};

const EMPTY_DRAFT: DraftState = { id: null, name: "", kcal: "", protein: "", meal: "" };

type QuickAddBarProps = {
  frequentMeals: FrequentMeal[];
  onQuickAdd: (frequent: FrequentMeal) => void;
  onSaveFrequent: (frequent: FrequentMeal) => void;
  onRemoveFrequent: (id: string) => void;
  disabled: boolean;
};

export function QuickAddBar({
  frequentMeals,
  onQuickAdd,
  onSaveFrequent,
  onRemoveFrequent,
  disabled,
}: QuickAddBarProps) {
  const [managing, setManaging] = useState(false);
  const [draft, setDraft] = useState<DraftState>(EMPTY_DRAFT);

  const draftKcal = parseKcalInput(draft.kcal);
  const canSaveDraft = draft.name.trim().length > 0 && draftKcal != null;

  function startCreate() {
    setDraft(EMPTY_DRAFT);
    setManaging(true);
  }

  function startEdit(frequent: FrequentMeal) {
    setDraft({
      id: frequent.id,
      name: frequent.name,
      kcal: String(frequent.kcal),
      protein: frequent.proteinG != null ? String(frequent.proteinG) : "",
      meal: frequent.meal ?? "",
    });
    setManaging(true);
  }

  function submitDraft() {
    if (draftKcal == null) return;
    const name = draft.name.trim();
    if (!name) return;
    onSaveFrequent({
      id: draft.id ?? crypto.randomUUID(),
      name,
      kcal: draftKcal,
      proteinG: parseProteinInput(draft.protein),
      meal: draft.meal === "" ? null : draft.meal,
    });
    setDraft(EMPTY_DRAFT);
  }

  return (
    <section aria-label="Comidas frecuentes">
      <div className="diet-goal-row mb-2">
        <p className="block-title" style={{ margin: 0 }}>
          Añadir rápido
        </p>
        <button
          type="button"
          className="muted text-xs underline underline-offset-2"
          onClick={() => setManaging((v) => !v)}
          aria-expanded={managing}
        >
          {managing ? "Cerrar" : "Gestionar"}
        </button>
      </div>

      {frequentMeals.length === 0 ? (
        <p className="muted text-sm">
          Todavía no tienes comidas frecuentes. Marca «Guardar como frecuente» al añadir una comida
          y aparecerá aquí para añadirla con un clic.
        </p>
      ) : (
        <div className="quick-add-row">
          {frequentMeals.map((frequent) => (
            <button
              key={frequent.id}
              type="button"
              className="quick-add-chip"
              onClick={() => onQuickAdd(frequent)}
              disabled={disabled}
              title={`Añadir ${frequent.name} (${formatKcal(frequent.kcal)} kcal)`}
            >
              {frequent.meal ? `${MEAL_EMOJI[frequent.meal]} ` : ""}
              {frequent.name}{" "}
              <span className="quick-add-kcal">{formatKcal(frequent.kcal)} kcal</span>
            </button>
          ))}
          <button
            type="button"
            className="quick-add-chip"
            onClick={startCreate}
            aria-label="Crear comida frecuente"
          >
            +
          </button>
        </div>
      )}

      {managing ? (
        <div className="template-card mt-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="field sm:col-span-2">
              <span>Nombre</span>
              <input
                type="text"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="ej. Huel Cinnamon Roll 95 g"
              />
            </label>
            <label className="field">
              <span>Calorías (kcal)</span>
              <input
                type="text"
                inputMode="decimal"
                value={draft.kcal}
                onChange={(e) => setDraft((d) => ({ ...d, kcal: e.target.value }))}
              />
            </label>
            <label className="field">
              <span>Proteína (g) · opcional</span>
              <input
                type="text"
                inputMode="decimal"
                value={draft.protein}
                onChange={(e) => setDraft((d) => ({ ...d, protein: e.target.value }))}
              />
            </label>
            <label className="field sm:col-span-2">
              <span>Tipo de comida · opcional</span>
              <select
                value={draft.meal}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, meal: e.target.value as MealType | "" }))
                }
              >
                <option value="">Usar el seleccionado en el formulario</option>
                {MEAL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {MEAL_LABELS[type]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="primary-button"
              onClick={submitDraft}
              disabled={!canSaveDraft}
            >
              {draft.id ? "Guardar cambios" : "Crear frecuente"}
            </button>
            {draft.id ? (
              <button
                type="button"
                className="action-button action-end"
                onClick={() => setDraft(EMPTY_DRAFT)}
              >
                Cancelar
              </button>
            ) : null}
          </div>

          {frequentMeals.length > 0 ? (
            <ul className="stack mt-3" style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {frequentMeals.map((frequent) => (
                <li key={frequent.id} className="diet-entry">
                  <span className="diet-entry-name">
                    {frequent.name}
                    <span className="diet-entry-protein">
                      {" "}
                      · {formatKcal(frequent.kcal)} kcal
                      {frequent.proteinG != null ? ` · ${formatGrams(frequent.proteinG)} g` : ""}
                      {frequent.meal ? ` · ${MEAL_LABELS[frequent.meal]}` : ""}
                    </span>
                  </span>
                  <span className="diet-entry-actions">
                    <button
                      type="button"
                      className="action-button action-end"
                      onClick={() => startEdit(frequent)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => onRemoveFrequent(frequent.id)}
                    >
                      Borrar
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
