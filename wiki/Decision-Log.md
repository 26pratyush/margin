# Decision Log

## D-001 — Local-first application

Margin's working finance application runs locally. This protects the initial product from unnecessary cloud complexity and keeps real financial data out of the hosted demo.

## D-002 — GitHub Pages hosts only the product website

GitHub Pages is used for a static portfolio/product site containing screenshots, explanations, and project links. It is not a runtime for the finance app.

## D-003 — One repository, separate app and site directories

The local app and static product site live in separate top-level directories so they can evolve independently while sharing product context.

## Open decisions

- Application stack and runtime.
- Local persistence technology.
- License.
- Currency and locale defaults.

## Delivery policy

- Docker or Podman is optional local development and packaging tooling, not a hosted finance runtime.
- GitHub Actions and GitHub Pages are the planned free delivery path for the public static site.
- GitHub tags and Releases are the planned versioning path for source and synthetic build artifacts.
