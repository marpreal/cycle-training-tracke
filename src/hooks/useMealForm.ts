"use client";

import { useState } from "react";
import { DEFAULT_ISO_DATE, type MealRecord, type MealType } from "@/lib/appTypes";

const MAX_KCAL_PER_MEAL = 5_000;
const MAX_PROTEIN_PER_MEAL = 500;

/** Acepta coma o punto como separador decimal, igual que el resto de la app. */
function parsePositiveNumber(value: string, max: number): number | null {
  const clean = value.trim().replace(",", ".");
  if (!clean) return null;
  const n = Number(clean);
  if (!Number.isFinite(n) || n < 0 || n > max) return null;
  return n;
}

export function useMealForm() {
  const [mealDateInput, setMealDateInput] = useState(DEFAULT_ISO_DATE);
  const [mealTypeInput, setMealTypeInput] = useState<MealType>("desayuno");
  const [mealNameInput, setMealNameInput] = useState("");
  const [mealKcalInput, setMealKcalInput] = useState("");
  const [mealProteinInput, setMealProteinInput] = useState("");
  const [editingMealId, setEditingMealId] = useState<string | null>(null);

  function parseKcalInput(value: string): number | null {
    const n = parsePositiveNumber(value, MAX_KCAL_PER_MEAL);
    return n == null ? null : Math.round(n);
  }

  function parseProteinInput(value: string): number | null {
    const n = parsePositiveNumber(value, MAX_PROTEIN_PER_MEAL);
    return n == null ? null : Math.round(n);
  }

  /** La descripcion es opcional: basta con la fecha y las kcal. */
  const canSaveMeal =
    mealDateInput !== DEFAULT_ISO_DATE && parseKcalInput(mealKcalInput) != null;

  function startEditMeal(entry: MealRecord) {
    setEditingMealId(entry.id);
    setMealDateInput(entry.date);
    setMealTypeInput(entry.meal);
    setMealNameInput(entry.name);
    setMealKcalInput(String(entry.kcal));
    setMealProteinInput(entry.proteinG != null ? String(entry.proteinG) : "");
  }

  /** Mantiene fecha y tipo de comida para encadenar varios registros del mismo día. */
  function resetMealFields() {
    setEditingMealId(null);
    setMealNameInput("");
    setMealKcalInput("");
    setMealProteinInput("");
  }

  function initDate(today: string) {
    setMealDateInput(today);
  }

  return {
    mealDateInput,
    setMealDateInput,
    mealTypeInput,
    setMealTypeInput,
    mealNameInput,
    setMealNameInput,
    mealKcalInput,
    setMealKcalInput,
    mealProteinInput,
    setMealProteinInput,
    editingMealId,
    canSaveMeal,
    parseKcalInput,
    parseProteinInput,
    startEditMeal,
    resetMealFields,
    initDate,
  };
}

export type UseMealFormReturn = ReturnType<typeof useMealForm>;
