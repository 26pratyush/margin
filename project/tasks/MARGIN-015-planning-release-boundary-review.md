# MARGIN-015 — Complete the planning release-boundary review

## Parent

- Epic: [#22 — Core tracking and salary planning](https://github.com/26pratyush/margin/issues/22)
- Depends on: [#27 — MARGIN-014 regression coverage and manual verification](https://github.com/26pratyush/margin/issues/27)
- Issue: [#28 — MARGIN-015 release-boundary review](https://github.com/26pratyush/margin/issues/28)

## Goal

Review the completed salary-planning slice as the first coherent `v0.1.0` release boundary, update the public product surfaces and project documentation, and record evidence without adding new product behavior.

## Release scope

The release includes salary and expense recording, categories and notes, local SQLite persistence, monthly planning and rollover, expected versus actual salary, planned commitments, disposable balance, the monthly locker, JSON backup/restore, reconciliation, and safe reset.

The release explicitly excludes hosted accounts, bank integrations, cloud sync, recurring automation, CSV restore, desktop packaging, and broad budgeting or insights work.

## Work areas

- Review domain, persistence, backup, local-only networking, privacy, and planning semantics against the accepted decisions.
- Review desktop/mobile, keyboard, focus, contrast, reduced-motion, loading, empty, error, zero, and negative-balance states.
- Update the static product site with the current planning loop, locker explanation, synthetic examples, and release links.
- Update the root README, architecture/deployment/local-data/testing/context docs, roadmap, Wiki decision log, and release notes.
- Capture the first-release validation commands, manual flow, known limitations, and the next smallest product decision.

## Acceptance criteria

- The release review has evidence-backed pass/follow-up results.
- Public website and README describe the current `v0.1.0` product accurately.
- Release documentation contains no real financial data, secrets, or unsupported feature claims.
- `npm run quality` and the independent site checks pass.
- A fresh synthetic local flow verifies restart, planning, reserve, backup/restore, reset, negative, and zero states.
- Any defect or scope gap is split into a separate issue.
- The release remains `v0.1.0`; `v1.0.0` is deferred until the public data and API contracts are intentionally declared stable.

## Review outcome

The automated and synthetic release-boundary checks passed on 2026-08-26; the evidence is recorded in [the testing log](../../docs/TESTING.md). The release-review Pull Request was merged, Pages deployment was verified, and `v0.1.0` was tagged and published from validated `main` commit `269a1f3` in the [GitHub Release](https://github.com/26pratyush/margin/releases/tag/v0.1.0). Interactive browser review remains a documented follow-up. The repository license gate is complete with [PolyForm Noncommercial License 1.0.0](../../LICENSE).

The recommended next smallest product slice is safe ledger correction—edit or void an existing salary or expense with explicit confirmation and recalculated summaries. It remains a separate follow-up issue and is not implemented here.

## License decision

The repository uses the [PolyForm Noncommercial License 1.0.0](../../LICENSE). This is source-available rather than OSI-approved open source because commercial use is expressly restricted. Personal and other permitted noncommercial use, modification, and redistribution remain allowed under the license terms.

## Out of scope

- New planning rules or new finance behavior.
- Bank integrations, hosted services, recurring automation, multi-account support, or broad analytics.
- A new browser automation framework or a redesign of GitHub Actions.
