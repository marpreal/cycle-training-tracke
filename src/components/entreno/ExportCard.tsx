"use client";

import {
  buildFullPlanText,
  buildSessionLogText,
  downloadTextFile,
  openPrintWindow,
} from "@/lib/trainingExport";
import type { TrainingRecord } from "@/lib/appTypes";

interface ExportCardProps {
  trainingLog: TrainingRecord[];
  exportMonth: string;
  onExportMonthChange: (v: string) => void;
}

export function ExportCard({ trainingLog, exportMonth, onExportMonthChange }: ExportCardProps) {
  return (
    <article className="card mb-4">
      <h2 className="section-title">Exportar entrenos</h2>
      <p className="muted mb-3 text-sm">
        Descarga el plan en texto o el historial de sesiones. Para PDF, usa &quot;Imprimir / guardar
        como PDF&quot; en el navegador.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="field min-w-[10rem]">
          <span>Mes del historial</span>
          <input
            type="month"
            value={exportMonth}
            onChange={(e) => onExportMonthChange(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="action-button action-end"
          onClick={() => downloadTextFile("plan-entrenamiento.txt", buildFullPlanText())}
        >
          Plan completo (.txt)
        </button>
        <button
          type="button"
          className="action-button action-end"
          onClick={() =>
            downloadTextFile(
              `sesiones-${exportMonth}.txt`,
              buildSessionLogText(trainingLog, exportMonth),
            )
          }
        >
          Historial del mes (.txt)
        </button>
        <button
          type="button"
          className="action-button action-end"
          onClick={() =>
            downloadTextFile("sesiones-completo.txt", buildSessionLogText(trainingLog, null))
          }
        >
          Historial completo (.txt)
        </button>
        <button
          type="button"
          className="primary-button"
          onClick={() =>
            openPrintWindow(
              "Entrenos",
              `${buildFullPlanText()}\n\n---\n\n${buildSessionLogText(trainingLog, null)}`,
            )
          }
        >
          Imprimir / PDF
        </button>
      </div>
    </article>
  );
}
