"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDate, getCurrentCycleDay, getNextPeriodDate, getPhaseInfo } from "@/lib/cycle";
import { trainingTemplates, type TrainingDayTemplate } from "@/data/trainingPlan";

type PeriodSettings = {
  lastPeriodStart: string;
  cycleLength: number;
  periodLength: number;
};

type TrainingRecord = {
  id: string;
  date: string;
  templateId: string;
  effort: 1 | 2 | 3 | 4 | 5;
  notes: string;
};

const PERIOD_SETTINGS_KEY = "period-settings-v1";
const TRAINING_LOG_KEY = "training-log-v1";

const defaultSettings: PeriodSettings = {
  lastPeriodStart: new Date().toISOString().split("T")[0],
  cycleLength: 28,
  periodLength: 5,
};

function loadSettings(): PeriodSettings {
  if (typeof window === "undefined") return defaultSettings;
  const savedSettings = localStorage.getItem(PERIOD_SETTINGS_KEY);
  return savedSettings ? (JSON.parse(savedSettings) as PeriodSettings) : defaultSettings;
}

function loadTrainingLog(): TrainingRecord[] {
  if (typeof window === "undefined") return [];
  const savedLog = localStorage.getItem(TRAINING_LOG_KEY);
  return savedLog ? (JSON.parse(savedLog) as TrainingRecord[]) : [];
}

function getTemplateById(id: string): TrainingDayTemplate | undefined {
  return trainingTemplates.find((template) => template.id === id);
}

export default function Home() {
  const [settings, setSettings] = useState<PeriodSettings>(loadSettings);
  const [trainingLog, setTrainingLog] = useState<TrainingRecord[]>(loadTrainingLog);
  const [newLogDate, setNewLogDate] = useState(new Date().toISOString().split("T")[0]);
  const [newLogTemplate, setNewLogTemplate] = useState(trainingTemplates[0].id);
  const [newLogEffort, setNewLogEffort] = useState<TrainingRecord["effort"]>(3);
  const [newLogNotes, setNewLogNotes] = useState("");

  useEffect(() => {
    localStorage.setItem(PERIOD_SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(TRAINING_LOG_KEY, JSON.stringify(trainingLog));
  }, [trainingLog]);

  const cycleDay = useMemo(() => getCurrentCycleDay(settings.lastPeriodStart), [settings.lastPeriodStart]);
  const phase = useMemo(
    () => getPhaseInfo(cycleDay, settings.cycleLength),
    [cycleDay, settings.cycleLength],
  );
  const nextPeriod = useMemo(
    () => getNextPeriodDate(settings.lastPeriodStart, settings.cycleLength),
    [settings.lastPeriodStart, settings.cycleLength],
  );
  const daysToNext = useMemo(
    () =>
      Math.max(
        0,
        Math.ceil((nextPeriod.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
      ),
    [nextPeriod],
  );

  const sortedLogs = useMemo(
    () => [...trainingLog].sort((a, b) => b.date.localeCompare(a.date)),
    [trainingLog],
  );

  function addTrainingLog() {
    const record: TrainingRecord = {
      id: crypto.randomUUID(),
      date: newLogDate,
      templateId: newLogTemplate,
      effort: newLogEffort,
      notes: newLogNotes.trim(),
    };
    setTrainingLog((current) => [record, ...current]);
    setNewLogNotes("");
  }

  function removeTrainingLog(id: string) {
    setTrainingLog((current) => current.filter((item) => item.id !== id));
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-8">
      <header className="card">
        <p className="eyebrow">Cycle + Training Tracker</p>
        <h1 className="title">Your weekly dashboard</h1>
        <p className="muted">
          Track your period, know your current phase, and log training sessions in one place.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <article className="metric-card">
          <p className="metric-label">Cycle day</p>
          <p className="metric-value">{cycleDay}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Current phase</p>
          <p className="metric-value-small">{phase.name}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Next period</p>
          <p className="metric-value-small">{formatDate(nextPeriod)}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Days remaining</p>
          <p className="metric-value">{daysToNext}</p>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="card">
          <h2 className="section-title">Period settings</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="field">
              <span>Last period start</span>
              <input
                type="date"
                value={settings.lastPeriodStart}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, lastPeriodStart: event.target.value }))
                }
              />
            </label>
            <label className="field">
              <span>Cycle length (days)</span>
              <input
                type="number"
                min={20}
                max={40}
                value={settings.cycleLength}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    cycleLength: Number(event.target.value),
                  }))
                }
              />
            </label>
            <label className="field">
              <span>Period length (days)</span>
              <input
                type="number"
                min={2}
                max={10}
                value={settings.periodLength}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    periodLength: Number(event.target.value),
                  }))
                }
              />
            </label>
          </div>
          <p className="phase-description">{phase.description}</p>
        </article>

        <article className="card">
          <h2 className="section-title">Add training log</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="field">
              <span>Date</span>
              <input type="date" value={newLogDate} onChange={(event) => setNewLogDate(event.target.value)} />
            </label>
            <label className="field">
              <span>Session</span>
              <select value={newLogTemplate} onChange={(event) => setNewLogTemplate(event.target.value)}>
                {trainingTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Effort (1-5)</span>
              <select
                value={newLogEffort}
                onChange={(event) => setNewLogEffort(Number(event.target.value) as TrainingRecord["effort"])}
              >
                {[1, 2, 3, 4, 5].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className="field sm:col-span-2">
              <span>Notes</span>
              <textarea
                rows={3}
                value={newLogNotes}
                onChange={(event) => setNewLogNotes(event.target.value)}
                placeholder="How did it feel? Weight increase? Recovery?"
              />
            </label>
          </div>
          <button className="primary-button" type="button" onClick={addTrainingLog}>
            Save session
          </button>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="card">
          <h2 className="section-title">Weekly templates</h2>
          <div className="stack">
            {trainingTemplates.map((template) => (
              <details key={template.id} className="template-card">
                <summary>
                  <strong>{template.name}</strong> - {template.focus}
                </summary>
                {template.blocks.map((block) => (
                  <div key={block.title} className="table-wrapper">
                    <p className="block-title">{block.title}</p>
                    <table>
                      <thead>
                        <tr>
                          <th>Exercise</th>
                          <th>Sets</th>
                          <th>Reps</th>
                          <th>Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {block.exercises.map((exercise) => (
                          <tr key={exercise.name}>
                            <td>{exercise.name}</td>
                            <td>{exercise.sets}</td>
                            <td>{exercise.reps}</td>
                            <td>{exercise.notes || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </details>
            ))}
          </div>
        </article>

        <article className="card">
          <h2 className="section-title">Session history</h2>
          <div className="stack">
            {sortedLogs.length === 0 ? (
              <p className="muted">No sessions yet. Add your first one.</p>
            ) : (
              sortedLogs.map((log) => {
                const template = getTemplateById(log.templateId);
                return (
                  <div key={log.id} className="log-card">
                    <div>
                      <p className="log-title">{template?.name || "Session"}</p>
                      <p className="muted">
                        {log.date} · Effort {log.effort}/5
                      </p>
                      {log.notes ? <p className="log-notes">{log.notes}</p> : null}
                    </div>
                    <button type="button" className="danger-button" onClick={() => removeTrainingLog(log.id)}>
                      Delete
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
