import Link from "next/link";

export const dynamic = "force-dynamic";

const MESSAGES: Record<
  string,
  { title: string; body: string[]; hint?: string }
> = {
  Configuration: {
    title: "Error de configuración del servidor",
    body: [
      "Falta algo en la configuración de Auth.js o las credenciales de Google no son válidas.",
      "Lo más habitual en local: AUTH_SECRET vacío o sin definir en .env.local, o AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET mal copiados.",
    ],
    hint:
      "Genera AUTH_SECRET con: openssl rand -base64 32. Reinicia el servidor de desarrollo tras guardar .env.local.",
  },
  AccessDenied: {
    title: "Acceso denegado",
    body: ["No tienes permiso para iniciar sesión (o cancelaste el acceso en Google)."],
  },
  Verification: {
    title: "Enlace inválido",
    body: ["El enlace de acceso ya no es válido o ha caducado."],
  },
  OAuthSignin: {
    title: "Error al conectar con Google",
    body: [
      "No se pudo iniciar el flujo OAuth. Revisa AUTH_GOOGLE_ID y AUTH_GOOGLE_SECRET.",
    ],
  },
  OAuthCallback: {
    title: "Error al volver de Google",
    body: [
      "Google rechazo la peticion o el redirect no coincide.",
      "En Google Cloud Console, en el cliente OAuth tipo Web, añade exactamente:",
    ],
    hint:
      "URI de redireccion autorizado: http://localhost:3000/api/auth/callback/google (y el origen JavaScript: http://localhost:3000). En produccion, sustituye por tu dominio.",
  },
  OAuthAccountNotLinked: {
    title: "Cuenta no vinculada",
    body: ["Esa cuenta de Google ya esta asociada a otro metodo de acceso."],
  },
  default: {
    title: "Error al iniciar sesión",
    body: ["Ha ocurrido un error durante el inicio de sesión."],
  },
};

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function AuthErrorPage({ searchParams }: Props) {
  const { error: code } = await searchParams;
  const key = code && MESSAGES[code] ? code : "default";
  const { title, body, hint } = MESSAGES[key];

  return (
    <main className="mx-auto flex min-h-full max-w-lg flex-col justify-center gap-4 p-6">
      <div className="card">
        <p className="eyebrow text-sm">Inicio de sesion</p>
        <h1 className="title mt-1">{title}</h1>
        {code ? (
          <p className="muted mt-2 font-mono text-xs">
            Código: <span className="text-foreground">{code}</span>
          </p>
        ) : null}
        <div className="mt-4 space-y-2 text-sm">
          {body.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
        {hint ? <p className="muted mt-3 text-sm">{hint}</p> : null}
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/" className="action-button action-end">
            Volver a la app
          </Link>
        </div>
      </div>
    </main>
  );
}
