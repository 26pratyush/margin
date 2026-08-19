# MARGIN-004 — Bootstrap reproducible local development

## Goal

Make it straightforward to install, run, test, and reset Margin from a fresh checkout.

## Scope

- Add the selected runtime and dependency configuration.
- Document prerequisites and common commands.
- Add a safe synthetic seed or demo-data path.
- Add a reset path that cannot touch unrelated files.
- Keep local financial data outside version control.

## Command contract

From the repository root, the supported development commands are:

```bash
npm ci
npm run dev
npm run check
npm run build
npm run preview
npm run demo:seed
npm run demo:reset
```

The synthetic demo path is intentionally separate from the eventual Dexie/IndexedDB persistence boundary. It creates only the ignored `app/public/demo-data.json` payload and refuses to remove a non-demo file at that exact path. Containers remain optional packaging tooling rather than a prerequisite for local development.

## Acceptance criteria

- Fresh-clone setup is documented and tested.
- One command starts the local app.
- One command runs checks.
- Synthetic data can be loaded and reset.
- No real data is needed to exercise the project.
