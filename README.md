# Margin

Margin is a local-first personal finance tracker for understanding where money goes and what remains available after spending, savings, and recurring commitments.

> Know what is available, what is committed, and what has already been spent.

## Project status

Margin shipped its first coherent `v0.1.0` release on 2026-08-26. The current product line is preparing the `v0.2.0` core-tracking release through MARGIN-021: correction and void lifecycle actions, filtered history, optional expense metadata, local balance sync, and an isolated first-use demo are implemented and under final regression review.

[Click here to access the website](https://26pratyush.github.io/margin/)

## Product direction

Margin is designed for someone starting their first job and wanting a granular but calm way to manage money without mindless spending (aka Jordans and foreign booze).

The current v0.2.0 slice makes it easy to:

- Add a monthly salary with one clear action.
- Record expenses with a required amount and date, optional metadata, and an explicit debit or credit direction (debit by default).
- Plan a calendar month without confusing expected salary with actual cash.
- See income, spending, planned savings, commitments, actual balance, and disposable money together.
- Reserve money in the monthly locker without treating a plan as a completed debit.
- Review continuous transaction history with Today, week, month, all-time, and custom date filters, grouped by civil day with filtered totals.
- Correct or void active salary and expense entries without deleting their history.
- Sync an entered real balance through one adjustment or a zero-difference snapshot.
- Reopen the first-use guide from Settings or try a clearly labelled, read-only synthetic preview.
- Export, validate, restore, reconcile, and safely reset local records.

Recurring commitment automation, charts and broad insights, bank integrations, and investment valuation remain roadmap work rather than hidden v0.2 promises.

## Product boundaries

Margin is intentionally local-first:

- The working finance application runs locally on the user's computer.
- Real financial data is not stored on the public product website.
- GitHub stores code, documentation, project tracking, issues, pull requests, and releases.
- GitHub Pages hosts only the static product/demo website with screenshots and explanations.

## Repository layout

```text
margin/
├── app/                 # Local finance application; implementation starts here
├── site/                # Static product/demo website for GitHub Pages
├── site/public/screenshots/ # Synthetic product screenshots for the demo site
├── docs/                # Versioned project and technical context
├── project/             # Roadmap, epics, task briefs, dependencies, labels
├── wiki/                # Wiki-ready Markdown pages
├── .github/             # Issue templates and pull request template
├── README.md
├── CONTRIBUTING.md
├── SECURITY.md
└── .gitignore
```

## Project resources

- [Project context](docs/PROJECT_CONTEXT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Development workflow](docs/GITHUB_WORKFLOW.md)
- [Deployment boundary](docs/DEPLOYMENT.md)
- [Local data and backup](docs/LOCAL_DATA.md)
- [Testing and quality gates](docs/TESTING.md)
- [Design system](docs/DESIGN_SYSTEM.md)
- [Product website](site/README.md)
- [v0.1.0 release notes](docs/RELEASE-v0.1.0.md)
- [v0.2.0 release preparation](docs/RELEASE-v0.2.0.md)
- [Stack decision](docs/decisions/ADR-001-local-browser-stack.md)
- [GitHub bootstrap checklist](docs/GITHUB_BOOTSTRAP.md)
- [Roadmap](project/ROADMAP.md)
- [Project tracking setup](project/TRACKING.md)
- [Dependency waves](project/DEPENDENCIES.md)
- [First epic](project/epics/EPIC-001-foundation.md)
- [Current epic: everyday tracking and safe ledger correction](project/epics/EPIC-003-everyday-tracking-and-safe-ledger-correction.md)
- [Wiki-ready pages](wiki/Home.md)

## Local setup

The finance application runs locally in a browser. Use Node.js 24 LTS and npm; `.node-version` records the preferred major version and the committed lockfile keeps dependencies reproducible.

From a fresh checkout:

```bash
npm ci
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). `npm run dev` starts both the Vite browser UI and the loopback-only SQLite service.

Useful commands:

```bash
npm run check        # TypeScript validation
npm run build        # Static production build
npm test             # Service/domain and UI tests
npm run test:service # Service/domain tests only
npm run test:ui      # UI tests only
npm run quality      # Formatting, lint, tests, coverage, type-check, and build
npm run preview      # Preview the production build locally
npm run data:status  # Show the local SQLite data path and record counts
npm run data:seed    # Replace local records with synthetic data
npm run data:reset   # Reset local records without touching unrelated files
npm run demo:seed    # Create synthetic demo data
npm run demo:reset   # Remove only the generated synthetic demo data
```

The finance app stores its primary data in an OS-specific application-data directory outside the repository. Set `MARGIN_DATA_DIR` to an absolute path to override it. Use the in-app JSON export/import actions as the lossless backup and restore path; browser cache clearing does not remove the SQLite file.

To try the first ledger flow, open Overview or Transactions, choose Add transaction, select Salary or Expense, and save a positive amount with a date. Expense metadata is optional; choose debit for spending or credit for refunds and other incoming money that is not salary. The dashboard refreshes after each save, and a browser refresh should show the same records. See [Testing and quality gates](docs/TESTING.md) for the independent `site/` verification commands and release evidence.

## Development workflow

Work should generally follow this path:

1. Select or create a GitHub Issue.
2. Link it to the relevant epic and project view.
3. Create a focused branch.
4. Make the smallest coherent change.
5. Open a Pull Request using the repository template.
6. Run local checks and review the change.
7. Merge into `main` only when the issue's acceptance criteria are met.

The application stack and local persistence decision are recorded in the [stack decision](docs/decisions/ADR-001-local-browser-stack.md) and [domain model decision](docs/decisions/ADR-002-domain-model-and-balance-rules.md). Current lifecycle, history, and synthetic-preview boundaries are documented in [Architecture](docs/ARCHITECTURE.md) and [Local data](docs/LOCAL_DATA.md).

## Delivery and release boundary

- The finance application runs locally and is never deployed with the public website.
- The static product/demo website is built from `site/` and published to GitHub Pages through GitHub Actions.
- Versioned software releases use Git tags and GitHub Releases. They must contain source or synthetic build artifacts only.
- `v0.1.0` is the published first local planning release; its historical boundary and evidence are tracked in [MARGIN-015](project/tasks/MARGIN-015-planning-release-boundary-review.md).
- Current `v0.2.0` release preparation is tracked in [MARGIN-021](project/tasks/MARGIN-021-everyday-tracking-regression-review.md) and [RELEASE-v0.2.0](docs/RELEASE-v0.2.0.md). The tag and GitHub Release remain pending final review, merge, and release approval.
- The published [`v0.1.0` release](https://github.com/26pratyush/margin/releases/tag/v0.1.0) and [static product website](https://26pratyush.github.io/margin/) are available. The finance application remains local-only.
- Containers are optional development and packaging tooling. Any reproducible container setup belongs to `MARGIN-004`.

## Local data and privacy

Local-first does not remove the need for backups. JSON export is the lossless backup format and can be downloaded through the browser, stored on another drive, or imported in another browser or machine. CSV remains an interoperability format, not a restore format.

Never commit real financial data, local database files, credentials, or production secrets to this repository.

## License

Margin is source-available under the [PolyForm Noncommercial License 1.0.0](LICENSE.md). It permits personal and other permitted noncommercial use, modification, and redistribution subject to the license terms. The license grants no commercial-use rights; commercial use requires separate written permission from the copyright holder unless another legal exception applies.

This is intentionally not an OSI-approved open-source license: the Open Source Definition requires commercial use to be allowed. Third-party dependencies and assets remain under their own licenses.
