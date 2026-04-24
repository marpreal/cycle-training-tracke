import type { AppSnapshotV1 } from "@/lib/appSnapshot";
import type { TrainingPlan } from "@/lib/appTypes";

function stripPlanImages(plans: TrainingPlan[]): TrainingPlan[] {
  return plans.map((p) => {
    if (p.contentType !== "html") return p;
    const stripped = p.content.replace(/<img[^>]+src="data:[^"]*"[^>]*>/gi, "");
    return { ...p, content: stripped };
  });
}

export async function fetchRemoteSnapshot(): Promise<{
  snapshot: AppSnapshotV1 | null;
  serverUpdatedAt?: number;
  error?: string;
  needsAuth?: boolean;
}> {
  const res = await fetch("/api/app-state", {
    credentials: "include",
  });
  if (res.status === 401) {
    return {
      snapshot: null,
      error: "Sesion caducada o no has iniciado sesion",
      needsAuth: true,
    };
  }
  if (res.status === 503) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    return { snapshot: null, error: j.error ?? "Servidor sin base de datos" };
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
  snapshot: AppSnapshotV1,
): Promise<{ ok: boolean; error?: string; updatedAt?: number }> {
  const syncSnapshot: AppSnapshotV1 = snapshot.trainingPlans
    ? { ...snapshot, trainingPlans: stripPlanImages(snapshot.trainingPlans) }
    : snapshot;
  const res = await fetch("/api/app-state", {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(syncSnapshot),
  });
  if (res.status === 401) {
    return { ok: false, error: "Sesion caducada; vuelve a entrar con Google" };
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
