import { createHmac, timingSafeEqual } from "crypto";

export const SYNC_AUTH_COOKIE = "sync-auth-token";

/** Valor de cookie derivado del secreto (no guarda el secreto en claro). */
export function expectedSyncCookieValue(): string {
  const secret = process.env.APP_SYNC_SECRET;
  if (!secret) return "";
  return createHmac("sha256", secret).update("cycle-tracker-sync-v1").digest("hex");
}

function parseCookies(header: string | null): Record<string, string> {
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i === -1) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    out[k] = decodeURIComponent(v);
  }
  return out;
}

export function isSyncCookieValid(request: Request): boolean {
  const expected = expectedSyncCookieValue();
  if (!expected) return false;
  const cookie = parseCookies(request.headers.get("cookie"))[SYNC_AUTH_COOKIE];
  if (!cookie || cookie.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(cookie, "utf8"), Buffer.from(expected, "utf8"));
  } catch {
    return false;
  }
}
