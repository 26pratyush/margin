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
