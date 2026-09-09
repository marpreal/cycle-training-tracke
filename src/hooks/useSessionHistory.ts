"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import type { TrainingRecord } from "@/lib/appTypes";

export const SESSION_PAGE_SIZE = 5;

/** Mes en curso del navegador, como `YYYY-MM`. */
function currentMonthSnapshot(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * El servidor no conoce la fecha del navegador, así que renderiza este
 * placeholder y React lo sustituye al hidratar. `useSyncExternalStore` es la
 * forma de hacerlo sin desajuste de hidratación y sin setState en un efecto.
 */
const SERVER_MONTH = "2000-01";
const subscribeToNothing = () => () => {};

export function useSessionHistory(trainingLog: TrainingRecord[]) {
  const [sessionFilterAll, setSessionFilterAll] = useState(false);
  const [sessionPage, setSessionPage] = useState(0);

  // Por defecto el mes actual; solo se guarda estado cuando la usuaria elige otro.
  const currentMonth = useSyncExternalStore(
    subscribeToNothing,
    currentMonthSnapshot,
    () => SERVER_MONTH,
  );
  const [monthOverride, setMonthOverride] = useState<string | null>(null);
  const sessionFilterMonth = monthOverride ?? currentMonth;
  const setSessionFilterMonth = useCallback((month: string) => setMonthOverride(month), []);

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
