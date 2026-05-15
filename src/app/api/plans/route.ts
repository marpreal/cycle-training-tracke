import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { type TrainingPlan } from "@/lib/appTypes";
import { ensureSchema, isDbConfigured } from "@/lib/db";

export const runtime = "nodejs";

const NOT_CONFIGURED = {
  error: "Turso no configurado. En Vercel anade TURSO_DATABASE_URL y TURSO_AUTH_TOKEN y redeploy.",
};

function isValidPlan(p: unknown): p is TrainingPlan {
  if (!p || typeof p !== "object") return false;
  const o = p as Record<string, unknown>;
  return typeof o.id === "string" && typeof o.name === "string" && typeof o.content === "string";
}

async function tursoReadPlans(userId: string): Promise<{ plansJson: string; updatedAt: number } | null> {
  const rawUrl = process.env.TURSO_DATABASE_URL ?? "";
  const token = process.env.TURSO_AUTH_TOKEN ?? "";
  const baseUrl = rawUrl.replace(/^libsql:\/\//, "https://").replace(/\/$/, "");

  const body = JSON.stringify({
    baton: null,
    requests: [
      {
        type: "execute",
        stmt: {
          sql: "SELECT plans_json, updated_at FROM user_plans WHERE user_id = ?",
          args: [{ type: "text", value: userId }],
        },
      },
      { type: "close" },
    ],
  });

  const resp = await fetch(`${baseUrl}/v3/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body,
    cache: "no-store",
  });

  if (!resp.ok) return null;
  const data = (await resp.json()) as {
    results?: Array<{ type: string; response?: { result?: { rows?: Array<Array<{ value: unknown }>> } } } >;
  };
  const rows = data.results?.[0]?.response?.result?.rows;
  if (!rows || rows.length === 0) return null;
  const row = rows[0];
  return {
    plansJson: String(row[0]?.value ?? "[]"),
    updatedAt: Number(row[1]?.value ?? 0),
  };
}

async function tursoWritePlans(userId: string, plansJson: string, updatedAtMs: number): Promise<void> {
  const rawUrl = process.env.TURSO_DATABASE_URL ?? "";
  const token = process.env.TURSO_AUTH_TOKEN ?? "";
  const baseUrl = rawUrl.replace(/^libsql:\/\//, "https://").replace(/\/$/, "");

  const body = JSON.stringify({
    baton: null,
    requests: [
      {
        type: "execute",
        stmt: {
          sql: "INSERT OR REPLACE INTO user_plans (user_id, plans_json, updated_at) VALUES (?, ?, ?)",
          args: [
            { type: "text", value: userId },
            { type: "text", value: plansJson },
            { type: "integer", value: String(updatedAtMs) },
          ],
        },
      },
      { type: "close" },
    ],
  });

  const resp = await fetch(`${baseUrl}/v3/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body,
    cache: "no-store",
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "(no body)");
    throw new Error(`Turso plans write failed: HTTP ${resp.status} – ${text.slice(0, 500)}`);
  }

  const data = (await resp.json()) as {
    results?: Array<{ type: string; error?: { message?: string } }>;
  };
  for (const r of data.results ?? []) {
    if (r.type === "error") {
      throw new Error(`Turso SQL error: ${r.error?.message ?? JSON.stringify(r)}`);
    }
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json(NOT_CONFIGURED, { status: 503 });

  try {
    await ensureSchema();
    const row = await tursoReadPlans(session.user.id);
    if (!row) return NextResponse.json({ plans: null, updatedAt: null });
    let plans: TrainingPlan[];
    try {
      const parsed = JSON.parse(row.plansJson) as unknown;
      plans = Array.isArray(parsed) ? (parsed as unknown[]).filter(isValidPlan) : [];
    } catch {
      plans = [];
    }
    return NextResponse.json({ plans, updatedAt: row.updatedAt });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al leer planes" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json(NOT_CONFIGURED, { status: 503 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 });
  }
  const { plans: rawPlans } = body as Record<string, unknown>;
  if (!Array.isArray(rawPlans)) {
    return NextResponse.json({ error: "plans debe ser un array" }, { status: 400 });
  }

  // Strip images from HTML plans to stay within reasonable payload sizes
  const plans: TrainingPlan[] = (rawPlans as unknown[]).filter(isValidPlan).map((p) => {
    if (p.contentType !== "html") return p;
    return { ...p, content: p.content.replace(/<img[^>]+src="data:[^"]*"[^>]*>/gi, "") };
  });

  const now = Date.now();
  try {
    await ensureSchema();
    await tursoWritePlans(session.user.id, JSON.stringify(plans), now);
    return NextResponse.json({ ok: true, updatedAt: now });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al guardar planes" }, { status: 500 });
  }
}
