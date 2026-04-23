"use client";

import { useRef } from "react";
import {
  buildFullPlanText,
  buildLocalStorageBackupJson,
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleRestoreJson(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as Record<string, unknown>;
        const keys = [
          "period-settings-v1",
          "training-log-v1",
          "period-log-v1",
          "user-profile-v1",
          "body-measurements-v1",
          "steps-log-v1",
          "training-plans-v1",
          "custom-exercises-by-template-v1",
          "progression-horizon-weeks-v1",
          "app-local-data-ts-v1",
        ];
        let restored = 0;
        for (const k of keys) {
          if (data[k] !== undefined) {
            localStorage.setItem(k, typeof data[k] === "string" ? data[k] as string : JSON.stringify(data[k]));
            restored++;
          }
        }
        alert(`Datos restaurados (${restored} claves). La página se recargará.`);
        window.location.reload();
      } catch {
        alert("Archivo inválido. Asegúrate de usar un backup generado por esta app.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

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

      <div className="mt-4 border-t pt-4">
        <p className="muted mb-2 text-sm font-medium">Backup completo (JSON)</p>
        <p className="muted mb-3 text-xs">
          Descarga todos tus datos locales como JSON para hacer una copia de seguridad o restaurarlos en otro navegador.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="action-button action-end"
            onClick={() =>
              downloadTextFile(
                `backup-${new Date().toISOString().slice(0, 10)}.json`,
                buildLocalStorageBackupJson(),
                "application/json;charset=utf-8",
              )
            }
          >
            Descargar backup (.json)
          </button>
          <button
            type="button"
            className="action-button action-end"
            onClick={() => fileInputRef.current?.click()}
          >
            Restaurar desde backup (.json)
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleRestoreJson}
          />
        </div>
      </div>
    </article>
  );
}
