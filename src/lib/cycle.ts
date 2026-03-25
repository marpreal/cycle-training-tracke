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

export function getPhaseInfo(cycleDay: number, cycleLength: number): PhaseInfo {
  const ovulationDay = Math.round(cycleLength / 2);

  if (cycleDay <= 5) {
    return {
      name: "Menstrual",
      description: "Energy can be lower. Focus on recovery, hydration and lighter training if needed.",
    };
  }
  if (cycleDay <= ovulationDay - 3) {
    return {
      name: "Follicular",
      description: "Energy usually rises. Great window to build strength and push progression.",
    };
  }
  if (cycleDay <= ovulationDay + 2) {
    return {
      name: "Ovulation",
      description: "Often peak performance days. Keep form strict and avoid ego loading.",
    };
  }
  return {
    name: "Luteal",
    description: "Prioritize sleep, stable nutrition and volume control. Adjust intensity based on recovery.",
  };
}

export function getNextPeriodDate(lastPeriodStart: string, cycleLength: number): Date {
  const startDate = toDateOnly(lastPeriodStart);
  const next = new Date(startDate);
  next.setDate(startDate.getDate() + cycleLength);
  return next;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
