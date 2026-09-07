"use client";

import { useState } from "react";
import {
  DEFAULT_ISO_DATE,
  type FrequentMeal,
  type MealRecord,
  type MealType,
} from "@/lib/appTypes";

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

export function parseKcalInput(value: string): number | null {
  const n = parsePositiveNumber(value, MAX_KCAL_PER_MEAL);
  return n == null ? null : Math.round(n);
}

export function parseProteinInput(value: string): number | null {
  const n = parsePositiveNumber(value, MAX_PROTEIN_PER_MEAL);
  return n == null ? null : Math.round(n * 10) / 10;
}

export function useMealForm() {
  const [todayIso, setTodayIso] = useState(DEFAULT_ISO_DATE);
  const [mealDateInput, setMealDateInput] = useState(DEFAULT_ISO_DATE);
  const [mealTypeInput, setMealTypeInput] = useState<MealType>("desayuno");
  const [mealNameInput, setMealNameInput] = useState("");
  const [mealKcalInput, setMealKcalInput] = useState("");
  const [mealProteinInput, setMealProteinInput] = useState("");
  const [saveAsFrequent, setSaveAsFrequent] = useState(false);
  const [showDateField, setShowDateField] = useState(false);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);

  /** La descripcion es opcional: basta con la fecha y las kcal. */
  const canSaveMeal = mealDateInput !== DEFAULT_ISO_DATE && parseKcalInput(mealKcalInput) != null;

  const isOtherDate = mealDateInput !== todayIso && mealDateInput !== DEFAULT_ISO_DATE;

  function startEditMeal(entry: MealRecord) {
    setEditingMealId(entry.id);
    setMealDateInput(entry.date);
    setMealTypeInput(entry.meal);
    setMealNameInput(entry.name);
    setMealKcalInput(String(entry.kcal));
    setMealProteinInput(entry.proteinG != null ? String(entry.proteinG) : "");
    setSaveAsFrequent(false);
    if (entry.date !== todayIso) setShowDateField(true);
  }

  function applyFrequentMeal(frequent: FrequentMeal) {
    setEditingMealId(null);
    if (frequent.meal) setMealTypeInput(frequent.meal);
    setMealNameInput(frequent.name);
    setMealKcalInput(String(frequent.kcal));
    setMealProteinInput(frequent.proteinG != null ? String(frequent.proteinG) : "");
    setSaveAsFrequent(false);
  }

  /** Mantiene fecha y tipo de comida para encadenar varios registros del mismo día. */
  function resetMealFields() {
    setEditingMealId(null);
    setMealNameInput("");
    setMealKcalInput("");
    setMealProteinInput("");
    setSaveAsFrequent(false);
  }

  function useTodayDate() {
    if (todayIso !== DEFAULT_ISO_DATE) setMealDateInput(todayIso);
    setShowDateField(false);
  }

  function initDate(today: string) {
    setTodayIso(today);
    setMealDateInput(today);
  }

  return {
    todayIso,
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
    saveAsFrequent,
    setSaveAsFrequent,
    showDateField,
    setShowDateField,
    editingMealId,
    canSaveMeal,
    isOtherDate,
    parseKcalInput,
    parseProteinInput,
    startEditMeal,
    applyFrequentMeal,
    resetMealFields,
    useTodayDate,
    initDate,
  };
}

export type UseMealFormReturn = ReturnType<typeof useMealForm>;
