import { NextResponse } from "next/server";

import { isDbConfigured } from "@/lib/db";

export const runtime = "nodejs";

/** Diagnostico sin secretos (abre /api/sync-status). */
export async function GET() {
  return NextResponse.json({
    remoteSyncUi: process.env.NEXT_PUBLIC_REMOTE_SYNC === "true",
    dbConfigured: isDbConfigured(),
    authSecretConfigured: Boolean(process.env.AUTH_SECRET),
    googleOAuthConfigured: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
  });
}
