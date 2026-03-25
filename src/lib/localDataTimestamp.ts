import {
  BODY_MEASUREMENTS_KEY,
  PERIOD_LOG_KEY,
  PERIOD_SETTINGS_KEY,
  TRAINING_LOG_KEY,
  USER_PROFILE_KEY,
} from "@/lib/appTypes";

export const APP_LOCAL_DATA_TS_KEY = "app-local-data-ts-v1";

/** Timestamp logico de la ultima edicion local (para no pisar con un snapshot remoto mas viejo). */
export function getLocalDataTimestamp(): number {
  if (typeof window === "undefined") return 0;
  const x = localStorage.getItem(APP_LOCAL_DATA_TS_KEY);
  return x ? Number(x) : 0;
}

export function setLocalDataTimestamp(ms: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(APP_LOCAL_DATA_TS_KEY, String(ms));
}

export function bumpLocalDataTimestamp(): void {
  setLocalDataTimestamp(Date.now());
}

/** Si no hay marca, inicializa: datos en localStorage -> "ahora" (protege frente a pull viejo); vacio -> 0 (acepta remoto). */
export function initLocalDataTimestampIfMissing(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(APP_LOCAL_DATA_TS_KEY) != null) return;
  const hasAny =
    localStorage.getItem(PERIOD_SETTINGS_KEY) ||
    localStorage.getItem(TRAINING_LOG_KEY) ||
    localStorage.getItem(PERIOD_LOG_KEY) ||
    localStorage.getItem(USER_PROFILE_KEY) ||
    localStorage.getItem(BODY_MEASUREMENTS_KEY);
  setLocalDataTimestamp(hasAny ? Date.now() : 0);
}
