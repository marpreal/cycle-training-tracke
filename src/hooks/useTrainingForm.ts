"use client";

import { useState } from "react";
import { trainingTemplates } from "@/data/trainingPlan";
import { DEFAULT_ISO_DATE, type TrainingRecord } from "@/lib/appTypes";
import { DEFAULT_LOAD_SETS, MAX_LOAD_SETS, type ExerciseLoadEntry } from "@/lib/trainingLoads";

export type FormSetsMap = Record<string, { w: string; r: string }[]>;
export type DetailMap = Record<string, boolean>;

function emptySetRow(): { w: string; r: string } {
  return { w: "", r: "" };
}

function parseNum(value: string): number | null {
  const clean = value.trim().replace(",", ".");
  if (!clean) return null;
  const n = Number(clean);
  return Number.isFinite(n) ? n : null;
}

export interface UseTrainingFormReturn {
  newLogDate: string;
  setNewLogDate: (v: string) => void;
  newLogTemplate: string;
  newLogEffort: TrainingRecord["effort"];
  setNewLogEffort: (v: TrainingRecord["effort"]) => void;
  newLogNotes: string;
  setNewLogNotes: (v: string) => void;
  newLogLoads: FormSetsMap;
  loadDetailByExercise: DetailMap;
  editingLogId: string | null;
  newCustomExerciseName: string;
  setNewCustomExerciseName: (v: string) => void;
  // helpers
  getFormSetsForExercise: (name: string) => { w: string; r: string }[];
  isLoadDetail: (name: string) => boolean;
  updateSetLoad: (exercise: string, setIndex: number, field: "w" | "r", value: string) => void;
  updateUniformLoad: (exercise: string, field: "w" | "r", value: string) => void;
  setLoadDetailMode: (exercise: string, wantDetail: boolean) => void;
  addSetForExercise: (exercise: string) => void;
  removeLastSetForExercise: (exercise: string) => void;
  // lifecycle
  changeTemplate: (templateId: string) => void;
  resetForm: () => void;
  initDate: (today: string) => void;
  populateFormFromRecord: (log: TrainingRecord) => void;
  buildParsedLoads: (exercises: { name: string }[]) => ExerciseLoadEntry[];
}

export function useTrainingForm(): UseTrainingFormReturn {
  const [newLogDate, setNewLogDate] = useState(DEFAULT_ISO_DATE);
  const [newLogTemplate, setNewLogTemplate] = useState(trainingTemplates[0].id);
  const [newLogEffort, setNewLogEffort] = useState<TrainingRecord["effort"]>(3);
  const [newLogNotes, setNewLogNotes] = useState("");
  const [newLogLoads, setNewLogLoads] = useState<FormSetsMap>({});
  const [loadDetailByExercise, setLoadDetailByExercise] = useState<DetailMap>({});
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [newCustomExerciseName, setNewCustomExerciseName] = useState("");

  function getFormSetsForExercise(exerciseName: string): { w: string; r: string }[] {
    const row = newLogLoads[exerciseName];
    if (!row || row.length === 0) return Array.from({ length: DEFAULT_LOAD_SETS }, () => emptySetRow());
    return row.slice(0, MAX_LOAD_SETS);
  }

  function isLoadDetail(exerciseName: string): boolean {
    return loadDetailByExercise[exerciseName] === true;
  }

  function updateSetLoad(exerciseName: string, setIndex: number, field: "w" | "r", value: string) {
    setNewLogLoads((cur) => {
      const prev = cur[exerciseName] ?? Array.from({ length: DEFAULT_LOAD_SETS }, () => emptySetRow());
      const next = prev.map((cell, idx) => (idx === setIndex ? { ...cell, [field]: value } : cell));
      return { ...cur, [exerciseName]: next.slice(0, MAX_LOAD_SETS) };
    });
  }

  function updateUniformLoad(exerciseName: string, field: "w" | "r", value: string) {
    setNewLogLoads((cur) => {
      const prev = cur[exerciseName] ?? Array.from({ length: DEFAULT_LOAD_SETS }, () => emptySetRow());
      const len = Math.min(MAX_LOAD_SETS, Math.max(1, prev.length));
      const base = { ...prev[0], [field]: value };
      return { ...cur, [exerciseName]: Array.from({ length: len }, () => ({ ...base })) };
    });
  }

  function setLoadDetailMode(exerciseName: string, wantDetail: boolean) {
    if (!wantDetail) {
      setNewLogLoads((cur) => {
        const prev = cur[exerciseName] ?? Array.from({ length: DEFAULT_LOAD_SETS }, () => emptySetRow());
        const len = Math.min(MAX_LOAD_SETS, Math.max(1, prev.length));
        const first = prev[0] ?? emptySetRow();
        return { ...cur, [exerciseName]: Array.from({ length: len }, () => ({ ...first })) };
      });
    }
    setLoadDetailByExercise((prev) => ({ ...prev, [exerciseName]: wantDetail }));
  }

  function addSetForExercise(exerciseName: string) {
    setNewLogLoads((cur) => {
      const prev = cur[exerciseName] ?? Array.from({ length: DEFAULT_LOAD_SETS }, () => emptySetRow());
      if (prev.length >= MAX_LOAD_SETS) return cur;
      return { ...cur, [exerciseName]: [...prev, emptySetRow()] };
    });
  }

  function removeLastSetForExercise(exerciseName: string) {
    setNewLogLoads((cur) => {
      const prev = cur[exerciseName] ?? Array.from({ length: DEFAULT_LOAD_SETS }, () => emptySetRow());
      if (prev.length <= 1) return cur;
      return { ...cur, [exerciseName]: prev.slice(0, -1) };
    });
  }

  function changeTemplate(templateId: string) {
    setNewLogTemplate(templateId);
    setNewLogLoads({});
    setLoadDetailByExercise({});
  }

  function resetForm() {
    setEditingLogId(null);
    setNewLogNotes("");
    setNewLogLoads({});
    setLoadDetailByExercise({});
  }

  function initDate(today: string) {
    setNewLogDate(today);
  }

  function populateFormFromRecord(log: TrainingRecord) {
    setNewLogDate(log.date);
    setNewLogTemplate(log.templateId);
    setNewLogEffort(log.effort);
    setNewLogNotes(log.notes);
    const loads: FormSetsMap = {};
    const details: DetailMap = {};
    for (const entry of log.exerciseLoads ?? []) {
      const rows = entry.sets.map((s) => ({
        w: s.weightKg > 0 ? String(s.weightKg) : "",
        r: s.reps > 0 ? String(s.reps) : "",
      }));
      if (rows.length < 1) rows.push({ w: "", r: "" });
      loads[entry.exerciseName] = rows.slice(0, MAX_LOAD_SETS);
      const allSame =
        rows.length >= 2 && rows.every((r) => r.w === rows[0].w && r.r === rows[0].r);
      details[entry.exerciseName] = !allSame;
    }
    setNewLogLoads(loads);
    setLoadDetailByExercise(details);
    setEditingLogId(log.id);
  }

  function buildParsedLoads(exercises: { name: string }[]): ExerciseLoadEntry[] {
    const result: ExerciseLoadEntry[] = [];
    for (const ex of exercises) {
      const rows = getFormSetsForExercise(ex.name);
      const sets: { weightKg: number; reps: number }[] = [];
      for (const row of rows) {
        const w = parseNum(row.w);
        const r = parseNum(row.r);
        const hasW = w != null && w > 0;
        const hasR = r != null && r > 0;
        if (hasW || hasR) sets.push({ weightKg: hasW ? w! : 0, reps: hasR ? Math.round(r!) : 0 });
      }
      if (sets.length > 0) result.push({ exerciseName: ex.name, sets });
    }
    return result;
  }

  return {
    newLogDate, setNewLogDate,
    newLogTemplate,
    newLogEffort, setNewLogEffort,
    newLogNotes, setNewLogNotes,
    newLogLoads,
    loadDetailByExercise,
    editingLogId,
    newCustomExerciseName, setNewCustomExerciseName,
    getFormSetsForExercise,
    isLoadDetail,
    updateSetLoad,
    updateUniformLoad,
    setLoadDetailMode,
    addSetForExercise,
    removeLastSetForExercise,
    changeTemplate,
    resetForm,
    initDate,
    populateFormFromRecord,
    buildParsedLoads,
  };
}
