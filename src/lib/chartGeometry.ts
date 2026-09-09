/**
 * Utilidades de escala para las gráficas en SVG (peso y calorías).
 * Sin dependencias: la app no trae librería de gráficos y no merece la pena
 * añadir uno para dos gráficas de una serie.
 */

export type Range = { min: number; max: number };

/** Marcas "redondas" (1 / 2 / 5 × 10ⁿ) dentro del dominio. */
export function niceTicks(min: number, max: number, target = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) return [];
  if (max === min) return [min];
  const rawStep = (max - min) / Math.max(1, target);
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;
  const firstIndex = Math.ceil(min / step);
  const lastIndex = Math.floor(max / step);
  const ticks: number[] = [];
  // Multiplicar por el índice en vez de ir sumando evita el error acumulado en coma flotante.
  for (let i = firstIndex; i <= lastIndex; i += 1) ticks.push(i * step);
  return ticks;
}

/**
 * Dominio vertical que cubre los valores y las referencias (objetivo), con aire
 * arriba y abajo para que la línea no toque los bordes.
 */
export function paddedRange(values: number[], padRatio = 0.12, minPad = 0.5): Range {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return { min: 0, max: 1 };
  const rawMin = Math.min(...finite);
  const rawMax = Math.max(...finite);
  const pad = Math.max((rawMax - rawMin) * padRatio, minPad);
  return { min: rawMin - pad, max: rawMax + pad };
}

/** Proyecta un valor del dominio a una coordenada Y (el eje SVG crece hacia abajo). */
export function makeScaleY(range: Range, top: number, bottom: number): (value: number) => number {
  const span = range.max - range.min || 1;
  return (value) => bottom - ((value - range.min) / span) * (bottom - top);
}

/**
 * Proyecta un valor del dominio horizontal (p. ej. un timestamp) a una coordenada X.
 * Con un dominio de ancho cero centra el punto en lugar de dividir por cero.
 */
export function makeScaleX(range: Range, left: number, right: number): (value: number) => number {
  const span = range.max - range.min;
  if (span <= 0) return () => (left + right) / 2;
  return (value) => left + ((value - range.min) / span) * (right - left);
}

/** Índice del punto más cercano a una coordenada X, para el crosshair. */
export function nearestIndexAt(x: number, xs: number[]): number {
  let best = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < xs.length; i += 1) {
    const distance = Math.abs(xs[i] - x);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  }
  return best;
}

/** Milisegundos de una fecha ISO local (`YYYY-MM-DD`). */
export function isoToTime(isoDate: string): number {
  return new Date(`${isoDate}T00:00:00`).getTime();
}
