"use client";

import { useEffect, useState } from "react";
import { DEFAULT_ISO_DATE, type StepsRecord } from "@/lib/appTypes";

export function useStepsForm({
  hasHydrated,
  sessionStatus,
}: {
  hasHydrated: boolean;
  sessionStatus: string;
}) {
  const [stepDateInput, setStepDateInput] = useState(DEFAULT_ISO_DATE);
  const [stepCountInput, setStepCountInput] = useState("");
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [fitStepsStatus, setFitStepsStatus] = useState("");

  // Auto-fetch from Google Fit when date changes and user is authenticated
  useEffect(() => {
    if (!hasHydrated) return;
    if (sessionStatus !== "authenticated") return;
    if (!stepDateInput || stepDateInput === DEFAULT_ISO_DATE) return;
    if (editingStepId) return;

    let cancelled = false;
    const dayStartLocal = new Date(`${stepDateInput}T00:00:00`);
    const startMs = dayStartLocal.getTime();
    const endMs = startMs + 24 * 60 * 60 * 1000;
    const qs = new URLSearchParams({
      date: stepDateInput,
      startMs: String(startMs),
      endMs: String(endMs),
    });
    void fetch(`/api/google-fit/steps?${qs.toString()}`, { credentials: "include" })
      .then(async (res) => {
        const payload = (await res.json().catch(() => ({}))) as { steps?: number; error?: string };
        if (!res.ok) throw new Error(payload.error ?? "No se pudieron cargar pasos desde Google Fit.");
        if (typeof payload.steps !== "number" || !Number.isFinite(payload.steps) || payload.steps < 0)
          throw new Error("Google Fit devolvió un valor de pasos inválido.");
        if (cancelled) return;
        setStepCountInput(String(Math.round(payload.steps)));
        setFitStepsStatus("Pasos cargados desde Google Fit.");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : "No se pudieron cargar pasos desde Google Fit.";
        setFitStepsStatus(message);
      });

    return () => {
      cancelled = true;
    };
  }, [editingStepId, hasHydrated, sessionStatus, stepDateInput]);

  function parseStepsInput(value: string): number | null {
    const onlyDigits = value.replace(/[^\d]/g, "");
    if (!onlyDigits) return null;
    const n = Number(onlyDigits);
    if (!Number.isFinite(n) || n < 0 || n > 100_000) return null;
    return Math.round(n);
  }

  const canSaveSteps =
    stepDateInput !== DEFAULT_ISO_DATE && parseStepsInput(stepCountInput) != null;

  function startEditSteps(entry: StepsRecord) {
    setEditingStepId(entry.id);
    setStepDateInput(entry.date);
    setStepCountInput(String(entry.steps));
  }

  function cancelEditSteps() {
    setEditingStepId(null);
    setStepCountInput("");
  }

  function initDate(today: string) {
    setStepDateInput(today);
  }

  return {
    stepDateInput,
    setStepDateInput,
    stepCountInput,
    setStepCountInput,
    editingStepId,
    setEditingStepId,
    fitStepsStatus,
    canSaveSteps,
    parseStepsInput,
    startEditSteps,
    cancelEditSteps,
    initDate,
  };
}

export type UseStepsFormReturn = ReturnType<typeof useStepsForm>;
