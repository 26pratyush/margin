# Margin v0.1.0 release notes

Status: release preparation draft. The implementation boundary and repository license are selected; final publication still requires the release review and a validated merge commit.

## What is included

Margin v0.1.0 is the first coherent local-first product loop for understanding what came in, what was spent, what is planned, and what remains available.

- Salary and expense recording with dates, categories, notes, and INR minor-unit amounts.
- Local SQLite persistence behind a loopback-only Node service.
- Monthly planning cycles with opening balance, rollover, expected salary, actual salary, spending, commitments, closing actual, and disposable balance kept distinct.
- The monthly locker for making planned reserves visible without treating them as spent cash.
- Versioned JSON export, validation, restore, local recovery snapshots, reconciliation, and safe reset.
- A static GitHub Pages product website containing synthetic examples and no finance runtime.

## Explicitly not included

- Bank integrations, hosted accounts, cloud sync, or a hosted finance API.
- Recurring automation, multi-account planning, CSV restore, or desktop packaging.
- A general-purpose budgeting engine or broad analytics redesign.

## Local first run

Requirements: Node.js 24 LTS and npm.

```bash
npm ci
npm run dev
```

Open `http://localhost:5173`. The finance app stores its SQLite database in the OS application-data directory. Set `MARGIN_DATA_DIR` to an absolute temporary path for demonstrations or review. Use JSON export as the lossless backup and restore path.

## Validation record

Before publication, record the validated merge commit and the results of:

```bash
npm run quality
cd site
npm ci
npm run format:check
npm run check
npm test
npm run build
```

The manual review must use synthetic data only and cover salary/expense creation, planning update, restart, reserve-versus-actual behavior, JSON validation and restore, reset, invalid input, negative disposable balance, and zero balance.

The MARGIN-015 release-boundary run completed the automated and synthetic checks on 2026-08-26. The evidence is recorded in [the testing log](TESTING.md): root quality, independent site checks, local restart persistence, backup/restore, reset, negative disposable, and zero-balance behavior passed. Interactive browser review, merge, Pages deployment verification, and the final tag/Release remain publication gates.

## Next product decision

The recommended next smallest slice after v0.1.0 is safe ledger correction: edit or void an existing salary or expense with explicit confirmation and recalculated summaries. It should be filed as a separate issue and prioritized before analytics, recurring automation, or hosted integrations. It is not part of this release.

## Privacy and recovery

The finance application is not deployed to GitHub Pages. Real financial data, SQLite files, exported backups, credentials, and secrets must not be committed or copied into the public site. The JSON backup is the portable recovery contract; raw SQLite archives are not the v0.1 restore path.

## Release checklist

- [x] Select and add the PolyForm Noncommercial License 1.0.0.
- [ ] Complete MARGIN-015 review and record pass/follow-up evidence.
- [ ] Merge the release-review Pull Request into `main`.
- [ ] Confirm the GitHub Pages workflow deploys the current site.
- [ ] Create the annotated `v0.1.0` tag on the validated `main` commit.
- [ ] Create the GitHub Release using these notes and the validated commit.
- [ ] Update issue #28, Epic #22, roadmap, and project status with the release links.
