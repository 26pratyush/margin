# Margin

Margin is a local-first personal finance tracker for understanding where money goes and what remains available after spending, savings, and recurring commitments.

> Know what is available, what is committed, and what has already been spent.

## Project status

Margin is in the foundation stage. The local application now runs a browser UI with a loopback-only Node service and file-backed SQLite persistence.

## Product direction

Margin is designed for someone starting their first job and wanting a granular but calm way to manage money without mindless spending (aka Jordans and foreign booze).

The first useful version should make it easy to:

- Add a monthly salary with one clear action.
- Record expenses with categories, dates, notes, and amounts.
- Break down spending by week, month, category, or custom range.
- See income, spending, planned savings, and remaining disposable money together.
- Model SIPs, RDs, and other recurring commitments.
- Generate useful charts without turning the interface into a dashboard wall.

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
├── assets/screenshots/  # Approved product screenshots for the demo site
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
- [Stack decision](docs/decisions/ADR-001-local-browser-stack.md)
- [GitHub bootstrap checklist](docs/GITHUB_BOOTSTRAP.md)
- [Roadmap](project/ROADMAP.md)
- [Project tracking setup](project/TRACKING.md)
- [Dependency waves](project/DEPENDENCIES.md)
- [First epic](project/epics/EPIC-001-foundation.md)
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
npm test             # Local storage and service tests
npm run quality      # Formatting, lint, tests, coverage, type-check, and build
npm run preview      # Preview the production build locally
npm run data:status  # Show the local SQLite data path and record counts
npm run data:seed    # Replace local records with synthetic data
npm run data:reset   # Reset local records without touching unrelated files
npm run demo:seed    # Create synthetic demo data
npm run demo:reset   # Remove only the generated synthetic demo data
```

The finance app stores its primary data in an OS-specific application-data directory outside the repository. Set `MARGIN_DATA_DIR` to an absolute path to override it. Use the in-app JSON export/import actions as the lossless backup and restore path; browser cache clearing does not remove the SQLite file.

To try the first ledger flow, open Overview or Transactions, choose Add transaction, select Salary or Expense, and save a positive amount with a date. Expenses also require a category; the first use of a category creates it locally and later entries reuse it. The dashboard refreshes after each save, and a browser refresh should show the same records.

## Development workflow

Work should generally follow this path:

1. Select or create a GitHub Issue.
2. Link it to the relevant epic and project view.
3. Create a focused branch.
4. Make the smallest coherent change.
5. Open a Pull Request using the repository template.
6. Run local checks and review the change.
7. Merge into `main` only when the issue's acceptance criteria are met.

The v0.1 application stack and local persistence decision are recorded in the [stack decision](docs/decisions/ADR-001-local-browser-stack.md) and [domain model decision](docs/decisions/ADR-002-domain-model-and-balance-rules.md).

## Delivery and release boundary

- The finance application runs locally and is never deployed with the public website.
- The static product/demo website will be built from `site/` and published to GitHub Pages through GitHub Actions once it has a real build.
- Versioned software releases use Git tags and GitHub Releases. They must contain source or synthetic build artifacts only.
- Containers are optional development and packaging tooling. Any reproducible container setup belongs to `MARGIN-004`.

## Local data and privacy

Local-first does not remove the need for backups. JSON export is the lossless backup format and can be downloaded through the browser, stored on another drive, or imported in another browser or machine. CSV remains an interoperability format, not a restore format.

Never commit real financial data, local database files, credentials, or production secrets to this repository.

## License

The licensing decision is still open and should be made before the first public release.
