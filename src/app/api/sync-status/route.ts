import { NextResponse } from "next/server";

import { isDbConfigured } from "@/lib/db";

export const runtime = "nodejs";

/** Diagnostico sin secretos (abre /api/sync-status). */
export async function GET() {
  return NextResponse.json({
    remoteSyncUi: process.env.NEXT_PUBLIC_REMOTE_SYNC === "true",
    dbConfigured: isDbConfigured(),
    authSecretConfigured: Boolean(process.env.AUTH_SECRET?.trim()),
    googleOAuthConfigured: Boolean(
      process.env.AUTH_GOOGLE_ID?.trim() && process.env.AUTH_GOOGLE_SECRET?.trim(),
    ),
    authUrlConfigured: Boolean(process.env.AUTH_URL?.trim() ?? process.env.NEXTAUTH_URL?.trim()),
  });
}
