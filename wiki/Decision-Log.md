# Decision Log

## D-001 — Local-first application

Margin's working finance application runs locally. This protects the initial product from unnecessary cloud complexity and keeps real financial data out of the hosted demo.

## D-002 — Render hosts only the product website

Render is used for a static portfolio/product site containing screenshots, explanations, and project links. It is not a runtime for the finance app.

## D-003 — One repository, separate app and site directories

The local app and static product site live in separate top-level directories so they can evolve independently while sharing product context.

## Open decisions

- Application stack and runtime.
- Local persistence technology.
- License.
- Currency and locale defaults.
