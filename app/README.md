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

MARGIN-004 will add the actual package configuration and canonical commands. The intended setup is:

```bash
npm ci
npm run dev
```

Build and preview commands will be documented with the scaffold. Desktop wrappers and containers remain optional follow-up packaging paths.
