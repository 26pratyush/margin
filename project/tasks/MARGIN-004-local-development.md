# MARGIN-004 — Bootstrap reproducible local development

## Goal

Make it straightforward to install, run, test, and reset Margin from a fresh checkout.

## Scope

- Add the selected runtime and dependency configuration.
- Document prerequisites and common commands.
- Add a safe synthetic seed or demo-data path.
- Add a reset path that cannot touch unrelated files.
- Keep local financial data outside version control.

## Acceptance criteria

- Fresh-clone setup is documented and tested.
- One command starts the local app.
- One command runs checks.
- Synthetic data can be loaded and reset.
- No real data is needed to exercise the project.
