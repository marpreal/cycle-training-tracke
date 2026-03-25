import type { AppSnapshotV1 } from "@/lib/appSnapshot";

export async function fetchRemoteSnapshot(secret: string): Promise<{
  snapshot: AppSnapshotV1 | null;
  serverUpdatedAt?: number;
  error?: string;
}> {
  const res = await fetch("/api/app-state", {
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (res.status === 401) {
    return { snapshot: null, error: "Clave incorrecta o no autorizada" };
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
  return { snapshot: data.snapshot ?? null, serverUpdatedAt: data.serverUpdatedAt };
}

export async function pushRemoteSnapshot(secret: string, snapshot: AppSnapshotV1): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("/api/app-state", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${secret}`,
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
  return { ok: true };
}
