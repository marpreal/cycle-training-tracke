import type { TrainingRecord } from "@/lib/appTypes";
import { trainingTemplates, type TrainingDayTemplate } from "@/data/trainingPlan";
import { formatLoadsForHistory } from "@/lib/trainingLoads";

function getTemplateById(id: string): TrainingDayTemplate | undefined {
  return trainingTemplates.find((t) => t.id === id);
}

function templateToText(t: TrainingDayTemplate): string {
  const lines: string[] = [`## ${t.name} — ${t.focus}`, ""];
  for (const block of t.blocks) {
    lines.push(`### ${block.title}`, "");
    for (const ex of block.exercises) {
      lines.push(`- ${ex.name} · ${ex.sets}×${ex.reps}${ex.notes ? ` · ${ex.notes}` : ""}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

export function buildFullPlanText(): string {
  const header =
    "Plan de entrenamiento (exportado)\n" +
    `Generado: ${new Date().toLocaleString("es-ES")}\n\n`;
  return header + trainingTemplates.map(templateToText).join("\n---\n\n");
}

export function buildSessionLogText(logs: TrainingRecord[], monthPrefix: string | null): string {
  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date));
  const filtered =
    monthPrefix == null || monthPrefix === ""
      ? sorted
      : sorted.filter((l) => l.date.startsWith(monthPrefix));
  const title =
    monthPrefix == null || monthPrefix === ""
      ? "Historial de sesiones (completo)"
      : `Historial de sesiones (${monthPrefix})`;
  const lines: string[] = [
    title,
    `Generado: ${new Date().toLocaleString("es-ES")}`,
    "",
  ];
  for (const log of filtered) {
    const tpl = getTemplateById(log.templateId);
    lines.push(`--- ${log.date} · ${tpl?.name ?? log.templateId} · esfuerzo ${log.effort}/5`);
    if (log.notes) lines.push(`Notas: ${log.notes}`);
    for (const load of log.exerciseLoads ?? []) {
      lines.push(`  ${formatLoadsForHistory(load)}`);
    }
    lines.push("");
  }
  if (filtered.length === 0) lines.push("(Sin sesiones en este filtro.)");
  return lines.join("\n");
}

export function downloadTextFile(filename: string, content: string, mime = "text/plain;charset=utf-8"): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Abre ventana imprimible para guardar como PDF desde el navegador. */
export function openPrintWindow(title: string, bodyHtml: string): void {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 1.5rem; max-width: 48rem; margin: 0 auto; line-height: 1.45; }
    pre { white-space: pre-wrap; word-break: break-word; }
    h1 { font-size: 1.25rem; }
    @media print { body { padding: 0; } }
  </style></head><body><h1>${title}</h1><pre>${bodyHtml.replace(/</g, "&lt;")}</pre>
  <script>window.onload=function(){ window.print(); }</script>
  </body></html>`);
  w.document.close();
}
