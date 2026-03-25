# Cycle + Training Tracker

A visual dashboard to track:

- period cycles (current phase, cycle day, next period prediction)
- weekly training templates
- real session history with notes and effort

## Where data lives

- **By default**, everything is stored in the browser (`localStorage`), so it works offline.
- **Optional cloud copy**: sign in with **Google** (Auth.js). Each user gets one JSON snapshot in [Turso](https://turso.tech) keyed by Google account id (`user_id`). The session cookie works in normal and private browsing until you close all private windows.

## Run locally

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill:

- `AUTH_SECRET` (e.g. `openssl rand -base64 32`)
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` from [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (OAuth client type **Web**; add redirect `http://localhost:3000/api/auth/callback/google` and origin `http://localhost:3000`)
- `AUTH_URL=http://localhost:3000`
- `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN`
- `NEXT_PUBLIC_REMOTE_SYNC=true` (rebuild after changing)

### Turso schema

With Turso env vars loaded:

```bash
npm run db:push
```

If you previously used the old single-row schema (`id` integer), you may need to drop the `app_snapshot` table in the Turso SQL console once, then run `db:push` again.

## Build check

```bash
npm run lint
npm run build
```

## Deploy to Vercel

1. Add the same variables as `.env.example` in **Project → Settings → Environment Variables** (Production).
2. Set `AUTH_URL` to your site URL, e.g. `https://your-app.vercel.app`.
3. In the Google OAuth client, add **Authorized redirect URI**: `https://your-app.vercel.app/api/auth/callback/google` and **JavaScript origin** your Vercel URL.
4. Redeploy after changing `NEXT_PUBLIC_*` or `AUTH_*`.

Open `/api/sync-status` on the deployed site to verify `dbConfigured`, `authSecretConfigured`, and `googleOAuthConfigured`.
