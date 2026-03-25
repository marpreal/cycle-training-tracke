import { createClient } from "@libsql/client";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { parseAppSnapshot, type AppSnapshotV1 } from "@/lib/appSnapshot";
import { appSnapshotTable } from "@/lib/db/schema";
import { getDb, isDbConfigured } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!isDbConfigured()) {
    return NextResponse.json(
      {
        error:
          "Turso no configurado. En Vercel anade TURSO_DATABASE_URL y TURSO_AUTH_TOKEN y redeploy.",
      },
      { status: 503 },
    );
  }

  const userId = session.user.id;

  try {
    const db = getDb();
    const rows = await db.select().from(appSnapshotTable).where(eq(appSnapshotTable.userId, userId)).limit(1);
    if (rows.length === 0) {
      return NextResponse.json({ snapshot: null as AppSnapshotV1 | null });
    }
    const raw = JSON.parse(rows[0].payloadJson) as unknown;
    const snapshot = parseAppSnapshot(raw);
    if (!snapshot) {
      return NextResponse.json({ error: "Datos en servidor invalidos" }, { status: 500 });
    }
    return NextResponse.json({ snapshot, serverUpdatedAt: rows[0].updatedAt.getTime() });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al leer la base de datos" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!isDbConfigured()) {
    return NextResponse.json(
      {
        error:
          "Turso no configurado. En Vercel anade TURSO_DATABASE_URL y TURSO_AUTH_TOKEN y redeploy.",
      },
      { status: 503 },
    );
  }

  const userId = session.user.id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const snapshot = parseAppSnapshot(body);
  if (!snapshot) {
    return NextResponse.json({ error: "Snapshot invalido" }, { status: 400 });
  }

  const now = new Date();
  const payloadJson = JSON.stringify({ ...snapshot, updatedAt: now.getTime() });

  try {
    const tsMs = now.getTime();
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    });
    await client.execute({
      sql: "INSERT OR REPLACE INTO app_snapshot (user_id, payload_json, updated_at) VALUES (?, ?, ?)",
      args: [userId, payloadJson, tsMs],
    });
    return NextResponse.json({ ok: true, updatedAt: tsMs });
  } catch (e) {
    console.error(e);
    const detail =
      e instanceof Error
        ? e.message
        : typeof e === "string"
          ? e
          : undefined;
    return NextResponse.json(
      { error: "Error al guardar en la base de datos", detail },
      { status: 500 },
    );
  }
}
