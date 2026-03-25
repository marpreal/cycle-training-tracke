import type { AppSnapshotV1 } from "@/lib/appSnapshot";

function authHeaders(secret: string): HeadersInit {
  if (!secret) return {};
  return { Authorization: `Bearer ${secret}` };
}

export async function fetchRemoteSnapshot(secret: string): Promise<{
  snapshot: AppSnapshotV1 | null;
  serverUpdatedAt?: number;
  error?: string;
  needsAuth?: boolean;
}> {
  const res = await fetch("/api/app-state", {
    credentials: "include",
    headers: authHeaders(secret),
  });
  if (res.status === 401) {
    return {
      snapshot: null,
      error: secret ? "Clave incorrecta o no autorizada" : "Sin sesion de sincronizacion",
      needsAuth: true,
    };
  }
  if (res.status === 503) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    return { snapshot: null, error: j.error ?? "Servidor sin base de datos o sin clave" };
  }
  if (!res.ok) {
    return { snapshot: null, error: "Error al leer del servidor" };
  }
  const data = (await res.json()) as {
    snapshot: AppSnapshotV1 | null;
    serverUpdatedAt?: number;
  };
  return { snapshot: data.snapshot ?? null, serverUpdatedAt: data.serverUpdatedAt, needsAuth: false };
}

export async function pushRemoteSnapshot(
  secret: string,
  snapshot: AppSnapshotV1,
): Promise<{ ok: boolean; error?: string; updatedAt?: number }> {
  const res = await fetch("/api/app-state", {
    method: "PUT",
    credentials: "include",
    headers: {
      ...authHeaders(secret),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(snapshot),
  });
  if (res.status === 401) {
    return { ok: false, error: "Clave incorrecta" };
  }
  if (res.status === 503) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: j.error ?? "Servidor sin base de datos" };
  }
  if (!res.ok) {
    return { ok: false, error: "Error al guardar en el servidor" };
  }
  const data = (await res.json().catch(() => ({}))) as { updatedAt?: number };
  return { ok: true, updatedAt: data.updatedAt };
}
