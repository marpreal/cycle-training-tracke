"use client";

import { formatLoadsForHistory, volumeKgRepsForSession } from "@/lib/trainingLoads";
import type { TrainingRecord } from "@/lib/appTypes";

function EffortPips({ effort }: { effort: 1 | 2 | 3 | 4 | 5 }) {
  return (
    <span className="effort-pips" aria-label={`Esfuerzo ${effort} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`effort-pip ${n <= effort ? "is-filled" : ""}`} />
      ))}
    </span>
  );
}

interface SessionCardProps {
  log: TrainingRecord;
  templateName: string;
  daysSincePrevSame: number | null;
  weeksInBlock: number;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export function SessionCard({
  log,
  templateName,
  daysSincePrevSame,
  weeksInBlock,
  isEditing,
  onEdit,
  onDelete,
}: SessionCardProps) {
  const vol = volumeKgRepsForSession(log);

  return (
    <div className={`session-card ${isEditing ? "is-editing" : ""}`}>
      <div className="session-card-header">
        <span className="session-card-title">{templateName}</span>
        <span className="session-card-date">{log.date}</span>
        <EffortPips effort={log.effort} />
      </div>
      {daysSincePrevSame != null ? (
        <p className="muted text-xs">
          {daysSincePrevSame} días desde la misma sesión · Semana {weeksInBlock}
        </p>
      ) : null}
      {log.notes ? <p className="session-card-notes">{log.notes}</p> : null}
      {log.exerciseLoads && log.exerciseLoads.length > 0 ? (
        <div className="session-card-loads">
          {log.exerciseLoads.map((entry) => (
            <p key={entry.exerciseName}>{formatLoadsForHistory(entry)}</p>
          ))}
          {vol > 0 ? (
            <p className="session-card-volume">
              Volumen total: {Math.round(vol).toLocaleString("es-ES")} kg×reps
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="session-card-actions">
        <button type="button" className="action-button action-end" onClick={onEdit}>
          Editar
        </button>
        <button type="button" className="danger-button" onClick={onDelete}>
          Borrar
        </button>
      </div>
    </div>
  );
}
