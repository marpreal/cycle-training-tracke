export type PhaseInfo = {
  name: string;
  description: string;
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
      description: "La energia puede bajar. Prioriza recuperacion, hidratacion y entreno mas ligero si hace falta.",
    };
  }
  if (cycleDay <= ovulationDay - 3) {
    return {
      name: "Folicular",
      description: "Suele subir la energia. Buena ventana para progresar en fuerza.",
    };
  }
  if (cycleDay <= ovulationDay + 2) {
    return {
      name: "Ovulacion",
      description: "Suelen ser dias de buen rendimiento. Mantén buena tecnica y controla cargas.",
    };
  }
  return {
    name: "Lutea",
    description: "Prioriza sueno, nutricion estable y control de volumen. Ajusta intensidad segun recuperacion.",
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
