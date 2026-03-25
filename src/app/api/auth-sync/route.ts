import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { expectedSyncCookieValue, SYNC_AUTH_COOKIE } from "@/lib/syncAuthServer";

export async function POST(request: Request) {
  const appSecret = process.env.APP_SYNC_SECRET;
  if (!appSecret) {
    return NextResponse.json({ error: "Sincronizacion no configurada en el servidor" }, { status: 503 });
  }

  let body: { secret?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  if (body.secret !== appSecret) {
    return NextResponse.json({ error: "Clave incorrecta" }, { status: 401 });
  }

  const cookieVal = expectedSyncCookieValue();
  if (!cookieVal) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }

  const cookieStore = await cookies();
  cookieStore.set(SYNC_AUTH_COOKIE, cookieVal, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
  });

  return NextResponse.json({ ok: true });
}
