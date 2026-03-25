# Cycle + Training Tracker

A visual dashboard to track:

- period cycles (current phase, cycle day, next period prediction)
- weekly training templates
- real session history with notes and effort

Data is stored in browser `localStorage`, so you can edit your week directly from the app.

## Run locally

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Build check

```bash
npm run lint
npm run build
```

## Deploy to Vercel

1. Push this folder to a GitHub repository.
2. Go to [Vercel New Project](https://vercel.com/new).
3. Import the repository and deploy.
4. Any future weekly edits can be done in the UI directly (stored per browser), or by editing code and redeploying.
