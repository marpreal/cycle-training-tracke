export function formatKcal(value: number): string {
  return Math.round(value).toLocaleString("es-ES");
}

/** Un decimal solo cuando aporta: 28,5 g pero 30 g. */
export function formatGrams(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded)
    ? rounded.toLocaleString("es-ES")
    : rounded.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function formatKg(value: number): string {
  return value.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function formatSignedKg(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${formatKg(Math.abs(value))}`;
}
