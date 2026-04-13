"use client";

import { useEffect, useMemo, useState } from "react";
import type { TrainingRecord } from "@/lib/appTypes";

export const SESSION_PAGE_SIZE = 5;

export function useSessionHistory(trainingLog: TrainingRecord[]) {
  const [sessionFilterMonth, setSessionFilterMonth] = useState("2000-01");
  const [sessionFilterAll, setSessionFilterAll] = useState(false);
  const [sessionPage, setSessionPage] = useState(0);

  useEffect(() => {
    const d = new Date();
    setSessionFilterMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }, []);

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    for (const log of trainingLog) set.add(log.date.slice(0, 7));
    return [...set].sort().reverse();
  }, [trainingLog]);

  const filteredTrainingLogs = useMemo(() => {
    const list = [...trainingLog].sort((a, b) => b.date.localeCompare(a.date));
    if (sessionFilterAll) return list;
    return list.filter((l) => l.date.startsWith(sessionFilterMonth));
  }, [trainingLog, sessionFilterAll, sessionFilterMonth]);

  const sessionTotalPages = Math.max(1, Math.ceil(filteredTrainingLogs.length / SESSION_PAGE_SIZE));
  const sessionPageClamped = Math.min(sessionPage, sessionTotalPages - 1);

  const paginatedTrainingLogs = useMemo(() => {
    const start = sessionPageClamped * SESSION_PAGE_SIZE;
    return filteredTrainingLogs.slice(start, start + SESSION_PAGE_SIZE);
  }, [filteredTrainingLogs, sessionPageClamped]);

  return {
    sessionFilterMonth,
    setSessionFilterMonth,
    sessionFilterAll,
    setSessionFilterAll,
    sessionPage,
    setSessionPage,
    availableMonths,
    filteredTrainingLogs,
    paginatedTrainingLogs,
    sessionTotalPages,
    sessionPageClamped,
  };
}
