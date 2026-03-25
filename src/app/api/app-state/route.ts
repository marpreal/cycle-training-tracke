import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { parseAppSnapshot, type AppSnapshotV1 } from "@/lib/appSnapshot";
import { appSnapshotTable } from "@/lib/db/schema";
import { getDb, isDbConfigured } from "@/lib/db";
import { isSyncCookieValid } from "@/lib/syncAuthServer";

function unauthorized(): NextResponse {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

function checkAuth(request: Request): NextResponse | null {
  const secret = process.env.APP_SYNC_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Sincronizacion no configurada en el servidor" }, { status: 503 });
  }
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) {
    return null;
  }
  if (isSyncCookieValid(request)) {
    return null;
  }
  return unauthorized();
}

export async function GET(request: Request) {
  const authErr = checkAuth(request);
  if (authErr) return authErr;
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 });
  }

  try {
    const db = getDb();
    const rows = await db.select().from(appSnapshotTable).where(eq(appSnapshotTable.id, 1)).limit(1);
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
  const authErr = checkAuth(request);
  if (authErr) return authErr;
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 });
  }

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
    const db = getDb();
    await db
      .insert(appSnapshotTable)
      .values({
        id: 1,
        payloadJson,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: appSnapshotTable.id,
        set: {
          payloadJson,
          updatedAt: now,
        },
      });
    return NextResponse.json({ ok: true, updatedAt: now.getTime() });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al guardar en la base de datos" }, { status: 500 });
  }
}
