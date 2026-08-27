# Roadmap

The roadmap is intentionally outcome-based. Dates should be added only when there is a realistic time commitment.

## v0.1 — First local planning release

Status: Released as [`v0.1.0`](https://github.com/26pratyush/margin/releases/tag/v0.1.0) on 2026-08-26. The [static product website](https://26pratyush.github.io/margin/) is live; interactive browser review remains a documented follow-up.

- Confirm the local-first boundary.
- Choose the application stack and persistence approach.
- Establish local development, testing, and documentation conventions.
- Build the salary, expense, planning, commitment, disposable-balance, and locker loop.
- Publish the static product/demo website and document the first release boundary.

## v0.2 — Core tracking

Status: Planned as [EPIC-003 — Everyday tracking, safe ledger correction, and onboarding](epics/EPIC-003-everyday-tracking-and-safe-ledger-correction.md), beginning with safe correction before analytics or integrations.

- Define and implement safe editing/voiding for active salary and expense entries.
- Add weekly/monthly transaction history filters without changing global balances.
- Make expense name and category progressive metadata with an explicit uncategorized state.
- Add a concise first-use guide and isolated synthetic demo mode.
- Re-run the full local-first regression and accessibility review for the expanded everyday flow.

## v0.3 — Commitments and insights

- Add SIP, RD, and recurring commitments.
- Show planned versus actual money movement.
- Add category and time-based charts.
- Add month summaries and comparisons.

## v0.4 — Safety and polish

- Add export and import.
- Add backup guidance and recovery flows.
- Improve accessibility, empty states, and error handling.
- Prepare synthetic data and screenshots.

## v1.0 — Stable personal release

- Declare the public data and API contracts stable after real-world validation.
- Revisit packaging or installation only if the local browser boundary proves insufficient.
- Publish a compatibility commitment for future migrations and releases.
