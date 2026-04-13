"use client";

import { SessionCard } from "./SessionCard";
import type { TrainingRecord } from "@/lib/appTypes";
import type { TrainingDayTemplate } from "@/data/trainingPlan";

interface LogExtra {
  daysSincePrevSame: number | null;
  weeksInBlock: number;
}

interface TrainingHistoryPanelProps {
  paginatedTrainingLogs: TrainingRecord[];
  filteredCount: number;
  trainingLogEmpty: boolean;
  logProgressionById: Map<string, LogExtra>;
  editingLogId: string | null;
  onEditLog: (log: TrainingRecord) => void;
  onDeleteLog: (id: string) => void;
  templates: TrainingDayTemplate[];
  // filter
  sessionFilterMonth: string;
  onFilterMonthChange: (v: string) => void;
  sessionFilterAll: boolean;
  onFilterAllChange: (v: boolean) => void;
  availableMonths: string[];
  // pagination
  sessionPageClamped: number;
  sessionTotalPages: number;
  onPageChange: (page: number) => void;
}

export function TrainingHistoryPanel({
  paginatedTrainingLogs,
  filteredCount,
  trainingLogEmpty,
  logProgressionById,
  editingLogId,
  onEditLog,
  onDeleteLog,
  templates,
  sessionFilterMonth,
  onFilterMonthChange,
  sessionFilterAll,
  onFilterAllChange,
  availableMonths,
  sessionPageClamped,
  sessionTotalPages,
  onPageChange,
}: TrainingHistoryPanelProps) {
  return (
    <article className="card flex flex-col">
      <h2 className="section-title">Histórico de sesiones</h2>

      <div className="mb-3 flex flex-wrap items-end gap-2">
        {!sessionFilterAll ? (
          <label className="field min-w-[12rem]">
            <span>Mes</span>
            <input
              type="month"
              value={sessionFilterMonth}
              onChange={(e) => {
                onPageChange(0);
                onFilterMonthChange(e.target.value);
              }}
            />
          </label>
        ) : null}
        {availableMonths.length > 0 ? (
          <label className="mt-auto flex cursor-pointer select-none items-center gap-1.5 pb-2 text-sm">
            <input
              type="checkbox"
              checked={sessionFilterAll}
              onChange={(e) => {
                onPageChange(0);
                onFilterAllChange(e.target.checked);
              }}
            />
            Todas
          </label>
        ) : null}
      </div>

      <p className="muted mb-2 text-xs">
        {filteredCount} sesión{filteredCount === 1 ? "" : "es"}
        {sessionTotalPages > 1 ? ` · pág. ${sessionPageClamped + 1}/${sessionTotalPages}` : ""}
      </p>

      <div className="stack">
        {filteredCount === 0 ? (
          <p className="muted">
            {trainingLogEmpty
              ? "Aún no hay sesiones. Usa el formulario de la izquierda para registrar la primera."
              : "No hay sesiones en este mes."}
          </p>
        ) : (
          paginatedTrainingLogs.map((log) => {
            const template = templates.find((t) => t.id === log.templateId);
            const extra = logProgressionById.get(log.id);
            return (
              <SessionCard
                key={log.id}
                log={log}
                templateName={template?.name ?? "Sesión"}
                daysSincePrevSame={extra?.daysSincePrevSame ?? null}
                weeksInBlock={extra?.weeksInBlock ?? 1}
                isEditing={editingLogId === log.id}
                onEdit={() => onEditLog(log)}
                onDelete={() => onDeleteLog(log.id)}
              />
            );
          })
        )}
      </div>

      {sessionTotalPages > 1 ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
          <button
            type="button"
            className="action-button action-end"
            disabled={sessionPageClamped <= 0}
            onClick={() => onPageChange(Math.max(0, sessionPageClamped - 1))}
          >
            Anterior
          </button>
          <span className="muted text-sm">
            {sessionPageClamped + 1} / {sessionTotalPages}
          </span>
          <button
            type="button"
            className="action-button action-end"
            disabled={sessionPageClamped >= sessionTotalPages - 1}
            onClick={() => onPageChange(Math.min(sessionTotalPages - 1, sessionPageClamped + 1))}
          >
            Siguiente
          </button>
        </div>
      ) : null}
    </article>
  );
}
