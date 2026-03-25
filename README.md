# Cycle + Training Tracker

A visual dashboard to track:

- period cycles (current phase, cycle day, next period prediction)
- weekly training templates
- real session history with notes and effort

## Where data lives

- **By default**, everything is stored in the browser (`localStorage`), so it works offline and without an account.
- **Optionally**, you can sync the same data to a **free hosted SQLite database** ([Turso](https://turso.tech)): the app keeps `localStorage` and also pushes/pulls a single JSON snapshot via `/api/app-state` using a shared secret (`APP_SYNC_SECRET`).

## Run locally

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

Copy `.env.example` to `.env.local`. Remote sync is off until you set `NEXT_PUBLIC_REMOTE_SYNC=true` and configure Turso + `APP_SYNC_SECRET`.

### Create the Turso table (once per database)

With `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in `.env.local`:

```bash
npm run db:push
```

## Build check

```bash
npm run lint
npm run build
```

## Deploy to Vercel

1. Push this folder to a GitHub repository.
2. Go to [Vercel New Project](https://vercel.com/new).
3. Import the repository and deploy.
4. In the Vercel project settings, add the same environment variables as in `.env.example` (Turso URL/token, `APP_SYNC_SECRET`, and optionally `NEXT_PUBLIC_REMOTE_SYNC=true`).
5. Run `npm run db:push` locally against your Turso credentials once so the `app_snapshot` table exists.

Edits in the UI stay in the browser; with remote sync enabled they are also stored on Turso.
