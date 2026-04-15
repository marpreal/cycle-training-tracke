"use client";

import { useRef, useState } from "react";
import { unzip } from "fflate";
import type { TrainingPlan } from "@/lib/appTypes";

interface PlanCardProps {
  plans: TrainingPlan[];
  onAddPlan: (plan: TrainingPlan) => void;
  onDeletePlan: (id: string) => void;
  onRenamePlan: (id: string, name: string) => void;
}

// ── ODT parsing helpers ────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
  };
  return map[ext] ?? "image/octet-stream";
}

/** Safe base64 encode for arbitrary binary, chunked to avoid call-stack overflow. */
function uint8ToBase64(bytes: Uint8Array): string {
  const chunkSize = 8192;
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function processOdtChildren(node: Node, imageMap: Map<string, string>): string {
  return Array.from(node.childNodes)
    .map((c) => processOdtNode(c, imageMap))
    .join("");
}

function processOdtNode(node: ChildNode, imageMap: Map<string, string>): string {
  // Text node
  if (node.nodeType === 3) return escapeHtml(node.textContent ?? "");
  if (node.nodeType !== 1) return "";

  const el = node as Element;
  const local = el.localName;
  const ch = () => processOdtChildren(el, imageMap);

  switch (local) {
    case "h": {
      const level = Math.min(6, parseInt(el.getAttribute("text:outline-level") ?? "2", 10));
      return `<h${level}>${ch()}</h${level}>\n`;
    }
    case "p": {
      const inner = ch();
      return inner.trim() ? `<p>${inner}</p>\n` : "<br>\n";
    }
    case "span":
      return ch();
    case "a":
      // Hyperlinks: render text only (no external navigation)
      return ch();
    case "line-break":
      return "<br>";
    case "tab":
      return "&emsp;";
    case "s": {
      const count = parseInt(el.getAttribute("text:c") ?? "1", 10);
      return "&nbsp;".repeat(Math.max(1, count));
    }
    case "list":
      return `<ul>\n${ch()}</ul>\n`;
    case "list-item":
      return `<li>${ch()}</li>\n`;
    case "frame":
      return ch();
    case "image": {
      const href =
        el.getAttributeNS("http://www.w3.org/1999/xlink", "href") ??
        el.getAttribute("xlink:href") ??
        "";
      const src = imageMap.get(href);
      return src
        ? `<img src="${src}" alt="" style="max-width:100%;height:auto;display:block;margin:0.75rem 0">\n`
        : "";
    }
    case "table":
      return `<table style="border-collapse:collapse;width:100%;margin:0.5rem 0">\n${ch()}</table>\n`;
    case "table-row":
      return `<tr>${ch()}</tr>\n`;
    case "table-cell":
    case "covered-table-cell":
      return `<td style="padding:4px 8px;border:1px solid #ccc;vertical-align:top">${ch()}</td>`;
    case "table-header-rows":
      return `<thead>${ch()}</thead>`;
    case "table-columns":
    case "table-column":
      return "";
    default:
      return ch();
  }
}

async function parseOdtToHtml(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  return new Promise((resolve, reject) => {
    // Unzip all entries (images + content.xml)
    unzip(new Uint8Array(buf), (err, files) => {
      if (err) {
        reject(new Error("No se pudo descomprimir el archivo ODT."));
        return;
      }

      // Build image map: Pictures/foo.jpg → data:image/jpeg;base64,...
      const imageMap = new Map<string, string>();
      for (const [name, data] of Object.entries(files)) {
        if (name.startsWith("Pictures/")) {
          const mime = getMimeType(name);
          imageMap.set(name, `data:${mime};base64,${uint8ToBase64(data)}`);
        }
      }

      const contentBytes = files["content.xml"];
      if (!contentBytes) {
        reject(new Error("El archivo ODT no contiene content.xml."));
        return;
      }

      const xmlStr = new TextDecoder("utf-8").decode(contentBytes);
      try {
        const xmlDoc = new DOMParser().parseFromString(xmlStr, "application/xml");
        const NS_OFFICE = "urn:oasis:names:tc:opendocument:xmlns:office:1.0";
        const bodyEl = xmlDoc.getElementsByTagNameNS(NS_OFFICE, "body")[0];
        const textEl = bodyEl?.getElementsByTagNameNS(NS_OFFICE, "text")[0];
        if (!textEl) {
          resolve("<p>(Sin contenido)</p>");
          return;
        }
        resolve(processOdtChildren(textEl, imageMap));
      } catch {
        reject(new Error("Error al procesar el XML del ODT."));
      }
    });
  });
}

// ── Component ──────────────────────────────────────────────────────────────

export function PlanCard({ plans, onAddPlan, onDeletePlan, onRenamePlan }: PlanCardProps) {
  const [activePlanId, setActivePlanId] = useState(plans[0]?.id ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activePlan = plans.find((p) => p.id === activePlanId) ?? plans[0] ?? null;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setUploadError("");
    try {
      let content: string;
      let contentType: "text" | "html" = "text";

      if (file.name.toLowerCase().endsWith(".odt")) {
        content = await parseOdtToHtml(file);
        contentType = "html";
      } else {
        content = await file.text();
      }

      const baseName = file.name.replace(/\.(odt|txt)$/i, "");
      const nextLetter = String.fromCharCode(65 + plans.length);
      const newPlan: TrainingPlan = {
        id: crypto.randomUUID(),
        name: `Plan ${nextLetter} (${baseName})`,
        content,
        contentType,
      };
      onAddPlan(newPlan);
      setActivePlanId(newPlan.id);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Error al leer el archivo.");
    } finally {
      setUploading(false);
    }
  }

  function commitRename() {
    if (renamingId && renameDraft.trim()) {
      onRenamePlan(renamingId, renameDraft.trim());
    }
    setRenamingId(null);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Plan selector + upload row */}
      <div className="flex flex-wrap items-center gap-2">
        {plans.map((plan) => (
          <button
            key={plan.id}
            type="button"
            className={`view-tab ${activePlanId === plan.id ? "is-active" : ""}`}
            onClick={() => setActivePlanId(plan.id)}
          >
            {plan.name}
          </button>
        ))}
        <label
          className="view-tab cursor-pointer select-none"
          title="Sube un archivo .odt o .txt para añadir un nuevo plan"
        >
          {uploading ? "Leyendo…" : "+ Subir plan"}
          <input
            ref={fileInputRef}
            type="file"
            accept=".odt,.txt"
            className="sr-only"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </label>
      </div>

      {uploadError ? <p className="text-xs text-red-500">{uploadError}</p> : null}

      {/* Rename / delete */}
      {activePlan ? (
        <div className="flex flex-wrap items-center gap-2">
          {renamingId === activePlan.id ? (
            <>
              <input
                type="text"
                className="field max-w-[16rem]"
                value={renameDraft}
                onChange={(e) => setRenameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") setRenamingId(null);
                }}
                autoFocus
              />
              <button type="button" className="primary-button" onClick={commitRename}>
                OK
              </button>
              <button
                type="button"
                className="action-button action-end"
                onClick={() => setRenamingId(null)}
              >
                Cancelar
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="action-button action-end"
                onClick={() => {
                  setRenamingId(activePlan.id);
                  setRenameDraft(activePlan.name);
                }}
              >
                Renombrar
              </button>
              <button
                type="button"
                className="danger-button"
                onClick={() => {
                  onDeletePlan(activePlan.id);
                  const remaining = plans.filter((p) => p.id !== activePlan.id);
                  setActivePlanId(remaining[0]?.id ?? "");
                }}
              >
                Eliminar plan
              </button>
            </>
          )}
        </div>
      ) : null}

      {/* Plan content */}
      {activePlan ? (
        <article className="card">
          {activePlan.contentType === "html" ? (
            /* Uploaded ODT — rendered HTML with images */
            /* Content comes from a user-uploaded file on their own device */
            <div
              className="plan-html-content"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: activePlan.content }}
            />
          ) : (
            /* Plain text (default plan or .txt upload) */
            <pre className="whitespace-pre-wrap text-sm leading-relaxed overflow-auto">
              {activePlan.content}
            </pre>
          )}
        </article>
      ) : null}
    </div>
  );
}
