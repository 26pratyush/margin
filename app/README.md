# Margin app

This directory contains the planned local-first finance application.

## v0.1 stack

- Browser-based React single-page application.
- TypeScript for UI, domain contracts, and calculations.
- Vite for the local development server and static build.
- Node.js 24 LTS with npm for setup and scripts.
- Dexie over IndexedDB for local persistence.
- Vitest and React Testing Library for unit/component checks; Playwright for browser smoke tests.

The app runs from a stable `http://localhost:5173` origin and has no hosted backend or dependency on the product website. Browser storage is local to that origin, so export and restore are part of the product boundary.

The repository root owns the npm workspace and canonical commands. From the repository root:

```bash
npm ci
npm run dev
```

The app is served at `http://localhost:5173`. Additional commands are:

```bash
npm run check
npm run build
npm run preview
npm run demo:seed
npm run demo:reset
```

The demo commands use synthetic records only. They create or remove the explicitly ignored `app/public/demo-data.json` file; they do not touch browser persistence or unrelated files. Dexie/IndexedDB persistence and its reset flow belong to MARGIN-006. Desktop wrappers and containers remain optional follow-up packaging paths.
