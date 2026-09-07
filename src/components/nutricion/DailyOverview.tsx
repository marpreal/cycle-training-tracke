"use client";

import { ProgressMeter } from "@/components/nutricion/ProgressMeter";
import { formatGrams, formatKcal, formatKg } from "@/lib/dietFormat";
import { targetProgress, type WeightTrend } from "@/lib/diet";

type DailyOverviewProps = {
  dateIso: string;
  kcal: number;
  proteinG: number;
  kcalTarget: number;
  proteinTarget: number;
  targetWeightKg: number | null;
  weightTrend: WeightTrend;
  currentWeightKg: number;
  hasHydrated: boolean;
};

function formatLongDate(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "long" });
}

export function DailyOverview({
  dateIso,
  kcal,
  proteinG,
  kcalTarget,
  proteinTarget,
  targetWeightKg,
  weightTrend,
  currentWeightKg,
  hasHydrated,
}: DailyOverviewProps) {
  const kcalProgress = targetProgress(kcal, kcalTarget);
  const proteinProgress = targetProgress(proteinG, proteinTarget);
  const displayWeight = weightTrend.latestWeightKg ?? currentWeightKg;

  if (!hasHydrated) {
    return (
      <section className="diet-today" aria-label="Resumen de hoy">
        <p className="diet-today-date">Hoy</p>
        <p className="muted text-sm">Cargando tus datos…</p>
      </section>
    );
  }

  return (
    <section className="diet-today" aria-label="Resumen de hoy">
      <p className="diet-today-date">Hoy · {formatLongDate(dateIso)}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <ProgressMeter
          label="Calorías de hoy"
          progress={kcalProgress}
          valueNow={kcal}
          valueText={`${formatKcal(kcal)} / ${formatKcal(kcalTarget)} kcal`}
          remainingText={
            kcalProgress.over
              ? `${formatKcal(-kcalProgress.remaining)} kcal por encima`
              : `Te quedan ${formatKcal(kcalProgress.remaining)} kcal`
          }
        />
        <ProgressMeter
          label="Proteína de hoy"
          progress={proteinProgress}
          valueNow={proteinG}
          valueText={`${formatGrams(proteinG)} / ${formatGrams(proteinTarget)} g de proteína`}
          remainingText={
            proteinProgress.over
              ? `${formatGrams(-proteinProgress.remaining)} g por encima`
              : `Te quedan ${formatGrams(proteinProgress.remaining)} g`
          }
        />
      </div>
      <p className="diet-weight-line">
        Peso: <strong>{formatKg(displayWeight)} kg</strong>
        {targetWeightKg != null ? (
          <span className="muted"> · Objetivo: {formatKg(targetWeightKg)} kg</span>
        ) : null}
        {weightTrend.latestDate ? (
          <span className="muted"> · último pesaje {weightTrend.latestDate}</span>
        ) : null}
      </p>
    </section>
  );
}
