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
