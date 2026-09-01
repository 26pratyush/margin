# MARGIN-020 — Add first-use guidance and an isolated synthetic demo mode

- Epic: [#38 — Everyday tracking, safe correction, and onboarding](https://github.com/26pratyush/margin/issues/38)
- GitHub task: [#43](https://github.com/26pratyush/margin/issues/43)
- Priority: P2

## Goal

Help a first-time user understand Margin before entering real local financial data.

## Scope

- Add a short, dismissible, re-openable explanation of salary, expenses, planning, reserved money, and disposable balance.
- Offer an explicit synthetic-data path from an empty/first-use state with visible synthetic labeling.
- Isolate demo state from real local SQLite data; if isolation cannot be proved, ship only the guide and defer the demo action.
- Keep the path offline, local-only, reversible, keyboard accessible, and reduced-motion safe.

## Acceptance criteria

- The guide is skippable, re-openable, and never blocks normal ledger entry.
- Synthetic values are deterministic and cannot overwrite, merge into, or upload a user's real data.
- Exit/reset behavior is explicit and survives refresh/restart and partial failure safely.
- Tests cover first-use/returning-user states, isolation, reset, no-network operation, accessibility, and synthetic content.

## Dependencies and non-goals

Depends on the local-first boundary and EPIC-002. No account system, analytics tracking, tutorial CMS, gamification, or hosted finance path.

## Implementation contract

- The first-use guide is a compact inline panel, not a blocking wizard. It is shown automatically only after a successful real-dataset load confirms that there are no entries, commitments, balance snapshots, or planning cycles. The browser-only preference `margin.first-use-guide.v1=seen` suppresses automatic reopening across refreshes, remounts, and app restarts; Settings can explicitly reopen the guide. Browser storage failures do not affect ledger availability.
- `Try synthetic data` opens a complete, read-only Overview, Transactions, Planning, and Commitments preview. The preview uses fresh in-memory data from the domain calculations on every request and never reads or writes SQLite.
- The read-only demo boundary is `GET /api/demo`, `GET /api/demo/history` with the history filter contract, and `GET /api/demo/planning-cycles/:cycleKey`. There are no demo mutation endpoints. While synthetic mode is active, the browser hides or disables ledger, reconciliation, planning, backup/import, and reset writes.
- The deterministic fixture is version 1 with reference date `2026-08-15`, salary on `2026-08-01`, early-August expense and investment movement, and a synthetic month-end reserve due on `2026-08-31`. History presets, labels, custom-range defaults, and planning use that reference date.
- A persistent `Synthetic demo · Read-only` banner and explicit `Exit demo` action remain visible throughout the preview. Demo mode is held in memory only; exit reloads the real dataset, and an exit failure keeps the synthetic label visible with a retry path.

## Implementation record

Implemented on `codex/MARGIN-020-first-use-guide-and-synthetic-demo`. Automated verification and the final review record are maintained in [docs/TESTING.md](../../docs/TESTING.md).
