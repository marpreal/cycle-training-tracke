import { NextResponse } from "next/server";

import { auth } from "@/auth";

export const runtime = "nodejs";

const GOOGLE_FIT_AGGREGATE_URL = "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate";

function isoDayRange(dateIso: string): { startNs: string; endNs: string } {
  const startMs = Date.parse(`${dateIso}T00:00:00.000Z`);
  if (!Number.isFinite(startMs)) {
    throw new Error("Fecha invalida");
  }
  const endMs = startMs + 24 * 60 * 60 * 1000;
  return {
    startNs: String(BigInt(startMs) * 1_000_000n),
    endNs: String(BigInt(endMs) * 1_000_000n),
  };
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!session.accessToken) {
    return NextResponse.json(
      { error: "Falta permiso de Google Fit. Cierra sesion y entra de nuevo con Google." },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Parametro date invalido (YYYY-MM-DD)." }, { status: 400 });
  }

  let startNs: string;
  let endNs: string;
  try {
    ({ startNs, endNs } = isoDayRange(date));
  } catch {
    return NextResponse.json({ error: "Fecha invalida." }, { status: 400 });
  }

  const body = {
    aggregateBy: [{ dataTypeName: "com.google.step_count.delta" }],
    bucketByTime: { durationMillis: 24 * 60 * 60 * 1000 },
    startTimeNanos: startNs,
    endTimeNanos: endNs,
  };

  const fitRes = await fetch(GOOGLE_FIT_AGGREGATE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.accessToken}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (fitRes.status === 401 || fitRes.status === 403) {
    return NextResponse.json(
      { error: "Google rechazo el token. Cierra sesion y entra de nuevo." },
      { status: 401 },
    );
  }
  if (!fitRes.ok) {
    return NextResponse.json({ error: "No se pudieron leer pasos desde Google Fit." }, { status: 502 });
  }

  const data = (await fitRes.json().catch(() => ({}))) as {
    bucket?: Array<{
      dataset?: Array<{
        point?: Array<{
          value?: Array<{ intVal?: number }>;
        }>;
      }>;
    }>;
  };

  let total = 0;
  for (const bucket of data.bucket ?? []) {
    for (const dataset of bucket.dataset ?? []) {
      for (const point of dataset.point ?? []) {
        for (const value of point.value ?? []) {
          if (typeof value.intVal === "number" && Number.isFinite(value.intVal)) {
            total += value.intVal;
          }
        }
      }
    }
  }

  return NextResponse.json({ date, steps: Math.max(0, Math.round(total)) });
}
