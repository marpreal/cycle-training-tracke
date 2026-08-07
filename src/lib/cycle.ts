import { DEFAULT_ISO_DATE, type PeriodRecord } from "@/lib/appTypes";

export type PhaseInfo = {
  name: string;
  description: string;
  /** Hormonas y contexto fisiológico (simple, orientativo). */
  hormones: string;
};

export function toDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

export function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function getCurrentCycleDay(lastPeriodStart: string, today = new Date()): number {
  const startDate = toDateOnly(lastPeriodStart);
  return Math.max(1, daysBetween(startDate, today) + 1);
}

export function getPhaseInfo(cycleDay: number, cycleLength: number, periodLength: number): PhaseInfo {
  const ovulationDay = Math.round(cycleLength / 2);
  const menstrualDays = Math.max(1, periodLength);

  if (cycleDay <= menstrualDays) {
    return {
      name: "Menstrual",
      description:
        "La energía puede bajar. Prioriza recuperación, hidratación y entreno más ligero si hace falta.",
      hormones:
        "El estrógeno y la progesterona están bajos; puede haber molestias o fatiga. El útero elimina el endometrio.",
    };
  }
  if (cycleDay <= ovulationDay - 3) {
    return {
      name: "Folicular",
      description: "Suele subir la energía. Buena ventana para progresar en fuerza.",
      hormones:
        "El estrógeno sube (folículos en el ovario); la progesterona sigue baja. Suelen notarse más energía y mejor humor.",
    };
  }
  if (cycleDay <= ovulationDay + 2) {
    return {
      name: "Ovulación",
      description: "Suelen ser días de buen rendimiento. Mantén buena técnica y controla cargas.",
      hormones:
        "Pico de LH y liberación del óvulo; el estrógeno es alto y luego cae algo. Puede coincidir con buen rendimiento.",
    };
  }
  return {
    name: "Lútea",
    description:
      "Prioriza sueño, nutrición estable y control de volumen. Ajusta intensidad según recuperación.",
    hormones:
      "Tras la ovulación sube la progesterona (cuerpo lúteo). Puede haber retención de líquido, más hambre o cambios de ánimo antes de la regla.",
  };
}

export function getNextPeriodDate(lastPeriodStart: string, cycleLength: number): Date {
  const startDate = toDateOnly(lastPeriodStart);
  const next = new Date(startDate);
  next.setDate(startDate.getDate() + cycleLength);
  return next;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Un ciclo cerrado (de inicio de regla a inicio de la siguiente) comparado con lo esperado. */
export type CycleDelay = {
  /** Inicio de la regla que cierra el ciclo (la "siguiente" regla). */
  startDate: string;
  /** Inicio de la regla anterior, desde donde se cuenta el ciclo. */
  previousStartDate: string;
  /** Días reales entre inicio e inicio. */
  actualCycleLength: number;
  /** Días esperados según la configuración del ciclo. */
  expectedCycleLength: number;
  /** Positivo = retraso, negativo = adelanto, 0 = puntual. */
  delayDays: number;
};

export type PeriodDelayReport = {
  /** Un elemento por ciclo cerrado, del más reciente al más antiguo. */
  cycles: CycleDelay[];
  /** Retraso en curso ahora mismo (días desde la fecha prevista). Null si aún no toca o la regla está activa. */
  currentDelayDays: number | null;
  /** Fecha prevista para la regla actual (solo informativa cuando hay retraso en curso). */
  currentExpectedDate: string | null;
  /** Nº de ciclos que llegaron tarde (delayDays > 0). */
  lateCount: number;
  /** Nº de ciclos que se adelantaron (delayDays < 0). */
  earlyCount: number;
  /** Mayor retraso registrado en días (0 si nunca hubo retraso). */
  maxDelayDays: number;
  /** Media de los retrasos (solo ciclos con delayDays > 0), redondeada a 1 decimal. Null si no hubo ninguno. */
  avgDelayDays: number | null;
};

function isoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

/**
 * Compara cada ciclo registrado con la duración de ciclo configurada para saber
 * cuántos días se retrasó (o adelantó) la regla, e incluye el retraso en curso.
 */
export function buildPeriodDelayReport(
  periodLog: PeriodRecord[],
  cycleLength: number,
  isPeriodOngoing: boolean,
  lastPeriodStart: string,
  today = new Date(),
): PeriodDelayReport {
  const ascending = [...periodLog].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const cycles: CycleDelay[] = [];
  for (let i = 1; i < ascending.length; i++) {
    const previousStartDate = ascending[i - 1].startDate;
    const startDate = ascending[i].startDate;
    const actualCycleLength = daysBetween(toDateOnly(previousStartDate), toDateOnly(startDate));
    if (actualCycleLength <= 0) continue;
    cycles.push({
      startDate,
      previousStartDate,
      actualCycleLength,
      expectedCycleLength: cycleLength,
      delayDays: actualCycleLength - cycleLength,
    });
  }
  cycles.reverse();

  let currentDelayDays: number | null = null;
  let currentExpectedDate: string | null = null;
  // Con la fecha placeholder (aún sin ninguna regla registrada) el "retraso" serían
  // miles de días, así que no se muestra.
  if (!isPeriodOngoing && lastPeriodStart && lastPeriodStart !== DEFAULT_ISO_DATE) {
    const expected = getNextPeriodDate(lastPeriodStart, cycleLength);
    const overdue = daysBetween(expected, today);
    if (overdue > 0) {
      currentDelayDays = overdue;
      currentExpectedDate = isoDate(expected);
    }
  }

  const lateDelays = cycles.filter((c) => c.delayDays > 0).map((c) => c.delayDays);
  const avgDelayDays =
    lateDelays.length > 0
      ? Math.round((lateDelays.reduce((a, b) => a + b, 0) / lateDelays.length) * 10) / 10
      : null;

  return {
    cycles,
    currentDelayDays,
    currentExpectedDate,
    lateCount: lateDelays.length,
    earlyCount: cycles.filter((c) => c.delayDays < 0).length,
    maxDelayDays: lateDelays.length > 0 ? Math.max(...lateDelays) : 0,
    avgDelayDays,
  };
}
