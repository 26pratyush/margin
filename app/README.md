# Margin app

This directory contains the local-first finance application.

## Current stack

- Browser-based React single-page application.
- TypeScript for UI, domain contracts, and calculations.
- Vite for the local development server and static build.
- Node.js 24 LTS with npm for setup and scripts.
- File-backed SQLite through the loopback Node service for local persistence.
- Node's built-in test runner for service/domain tests, with Vitest and Testing Library for UI behavior tests.

The app runs from a stable `http://localhost:5173` origin and has no hosted backend or dependency on the product website. The primary records live in the local SQLite service; browser storage is reserved for presentation preferences, so export and restore remain part of the product boundary.

The current v0.2.0 slice includes salary and expense entry, optional expense metadata with debit/credit direction, monthly planning and locker reservations, local balance reconciliation, filtered and day-grouped history, safe correction/void actions, and a read-only synthetic first-use preview. The UI delegates reads and writes to the loopback service; it does not calculate global balances from filtered history or write SQLite directly.

The repository root owns the npm workspace and canonical commands. From the repository root:

```bash
npm ci
npm run dev
```

The app is served at `http://localhost:5173`. Root-level quality commands are documented in [Testing and quality gates](../docs/TESTING.md). Additional app commands are:

```bash
npm run check
npm run build
npm run preview
npm run demo:seed
npm run demo:reset
```

The CLI demo commands use synthetic records only. They create or remove the explicitly ignored `app/public/demo-data.json` file; they do not touch local SQLite persistence or unrelated files. The finance app's first-use guide action is a separate read-only preview served by `/api/demo`; it is held in memory, uses a fixed mid-month August fixture, and never calls the CLI seed/reset path. Desktop wrappers and containers remain optional follow-up packaging paths.
