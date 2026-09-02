# Margin v0.2.0 release preparation

Status: In preparation on `codex/MARGIN-021-everyday-tracking-regression-review`. Do not tag or publish until the branch is reviewed, merged, and the maintainer approves the release.

## Release boundary

v0.2.0 completes the everyday local-tracking slice:

- Safe correction and voiding for active salary and expense records, with lineage, conflict protection, recalculated balances, and recoverable history.
- Transaction history presets, custom inclusive date ranges, type/status filters, filtered totals, and continuous civil-day grouping.
- Progressive expense metadata with explicit debit/credit direction and stable uncategorized presentation.
- Local balance sync with one adjustment or a zero-difference snapshot.
- A versioned first-use guide and deterministic, isolated, read-only synthetic preview anchored on 15 August 2026, including a reserve due on 31 August 2026.
- Regression, backup/restore, restart, legacy-data, accessibility, and service-boundary evidence for the complete slice.

The release remains local-first. No hosted finance runtime, account system, analytics, bank integration, or schema-changing migration is introduced by this preparation work.

## Required gates

Run from the repository root:

```bash
npm ci
npm run quality
cd site
npm ci
npm run format:check
npm run check
npm test
npm run build
```

The synthetic manual flow must use a fresh temporary `MARGIN_DATA_DIR` and verify empty-workspace onboarding, demo entry/exit isolation, salary and expense direction, history filters, correction and void lifecycle, balance sync, month-end reserve due date, restart persistence, JSON validation/restore, zero balance, and negative disposable balance. Keep all values synthetic.

## Sign-off checklist

- [ ] Review the MARGIN-021 pull request and confirm only in-scope files changed.
- [ ] Confirm `npm run quality` and the independent `site/` gate pass on the merge candidate.
- [ ] Confirm the repository-wide documentation audit and current v0.2.0 release references match the validated tree.
- [ ] Run the synthetic manual flow in an interactive browser when browser control is available; retain the documented automated fallback if it is unavailable.
- [ ] Confirm no real financial data, credentials, hosted persistence, or demo writes are present.
- [ ] Close child issues and EPIC-003 only after acceptance evidence is reviewed.
- [ ] Merge to `main`, then create the annotated `v0.2.0` tag and GitHub Release from the validated merge commit.
- [ ] Update `project/TRACKING.md`, `project/ROADMAP.md`, and this checklist with the final commit and release links.

## Evidence

The detailed commands, test boundaries, synthetic manual result, browser limitation, and privacy review are maintained in [`docs/TESTING.md`](TESTING.md) under the MARGIN-021 review record.
