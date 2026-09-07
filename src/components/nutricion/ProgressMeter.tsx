"use client";

import type { TargetProgress } from "@/lib/diet";

type ProgressMeterProps = {
  label: string;
  progress: TargetProgress;
  /** Texto ya formateado, p. ej. "1.259 / 1.550 kcal". */
  valueText: string;
  remainingText: string;
  valueNow: number;
};

export function ProgressMeter({
  label,
  progress,
  valueText,
  remainingText,
  valueNow,
}: ProgressMeterProps) {
  return (
    <div>
      <div className="diet-goal-row">
        <p className="diet-goal-value">{valueText}</p>
        <p className="diet-goal-remaining">{progress.percent}%</p>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={progress.target}
        aria-valuenow={valueNow}
        aria-valuetext={`${valueText}. ${remainingText}`}
      >
        <div
          className={`progress-fill ${progress.over ? "is-over" : ""}`}
          style={{ width: `${progress.barPercent}%` }}
        />
      </div>
      <p className={`diet-goal-remaining ${progress.over ? "is-over" : ""}`}>{remainingText}</p>
    </div>
  );
}
