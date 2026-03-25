/** Semana lunes–domingo (uso habitual en España). */

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function dateToIsoLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function startOfWeekMonday(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}

export type WeekOption = { id: string; label: string; start: string; end: string };

/** Últimas `count` semanas (lunes–domingo), la primera es la semana de `anchor`. */
export function buildWeekOptions(anchor: Date, count: number): WeekOption[] {
  const monday = startOfWeekMonday(anchor);
  const out: WeekOption[] = [];
  for (let i = 0; i < count; i += 1) {
    const start = addDays(monday, -i * 7);
    const end = addDays(start, 6);
    const startIso = dateToIsoLocal(start);
    const endIso = dateToIsoLocal(end);
    const fmt = (dt: Date) =>
      `${pad2(dt.getDate())}/${pad2(dt.getMonth() + 1)}`;
    const label =
      i === 0
        ? `Esta semana (${fmt(start)}–${fmt(end)})`
        : i === 1
          ? `Semana anterior (${fmt(start)}–${fmt(end)})`
          : `${fmt(start)} – ${fmt(end)} ${start.getFullYear()}`;
    out.push({ id: `w-${startIso}`, label, start: startIso, end: endIso });
  }
  return out;
}

export function isDateInRange(isoDate: string, start: string, end: string): boolean {
  return isoDate >= start && isoDate <= end;
}
