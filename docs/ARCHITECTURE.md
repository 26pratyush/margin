# Architecture

## Current boundary

```text
Local user
   ↓
Margin application
   ↓
Local persistence

GitHub ── source, issues, PRs, project tracking, Wiki, releases

GitHub Pages ── static product/demo website only
```

The product website is not the finance application. It must not call a Margin API or connect to the user's financial data.

## Proposed application shape

Start with a modular local application rather than distributed services:

- Presentation layer for the dashboard and entry flows.
- Domain layer for balance, period, category, and commitment calculations.
- Persistence layer behind a small interface.
- Export/import boundary for backup and portability.
- Test fixtures using synthetic financial records.

The exact framework, runtime, and persistence technology are deliberately left open for `MARGIN-002` and `MARGIN-003`.

## Domain model direction

The first domain model is expected to include:

- `IncomeEntry`
- `ExpenseEntry`
- `Category`
- `Commitment`
- `PeriodSummary`

The model should preserve dates and amounts as first-class values. Calculation logic should not be hidden inside UI components.

## Data safety requirements

- Local data must be excluded from version control.
- Export format should be documented and deterministic.
- Import should validate records before writing them.
- Destructive operations should have clear confirmation and recovery expectations.
- Screenshots and demo fixtures must use synthetic values.

## Deployment and container boundary

- The finance application remains local and has no hosted API or hosted database.
- The static site is built independently from `site/` and published to GitHub Pages after it has a real build.
- Docker or Podman may be used to make local development and CI reproducible, but containers must not move financial data into a hosted service.
- Container images, if introduced later, are packaging artifacts only and must contain code, dependencies, and synthetic fixtures—not local databases, credentials, or user records.
