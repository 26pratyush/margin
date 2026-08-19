# MARGIN-002 — Choose local application stack and runtime

## Goal

Choose a pragmatic technology path for a local-first app that is pleasant to develop, test, and maintain.

The accepted decision record is [`docs/decisions/ADR-001-local-browser-stack.md`](../../docs/decisions/ADR-001-local-browser-stack.md).

## Questions to answer

- Is the app a browser-based local app, a desktop wrapper, or another local runtime?
- What language and framework provide the best balance of UX, iteration speed, and maintainability?
- How will the app run from a fresh clone?
- Which persistence technology works reliably in the chosen local runtime?
- How will packaging or backup work later?

## Acceptance criteria

- A short decision record compares realistic options.
- One option is selected for v0.1.
- The decision includes local setup, testing, persistence, and future export considerations.
- `docs/PROJECT_CONTEXT.md` and `docs/ARCHITECTURE.md` are updated.

## Constraint

Do not introduce a hosted backend or cloud data requirement.
