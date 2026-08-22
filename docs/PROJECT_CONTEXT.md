# Margin project context

This is the canonical handoff document for anyone working on Margin in a separate chat or issue.

## One-sentence description

Margin is a minimalist, local-first personal finance tracker that shows what money is available, what is committed, and what has already been spent.

## User and problem

The primary user is someone starting their first job and receiving a regular salary. They want granular visibility into spending without paying for a finance app or adapting to a rigid product. The product should help them avoid mindless spending by making the consequences of a purchase easy to understand.

## Core user outcome

At any point in a pay period, the user should be able to answer:

1. How much money came in?
2. How much has been spent?
3. How much is reserved for SIPs, RDs, and recurring commitments?
4. How much remains available for discretionary spending?
5. Where is spending concentrated this week or month?

## Product principles

- **Local-first:** real financial data stays on the user's machine.
- **Clear before clever:** calculations and labels should be understandable.
- **Low friction:** adding salary or an expense should take seconds.
- **Useful density:** show meaningful information without dashboard clutter.
- **Calm visual language:** dark, minimalist, restrained, and readable; no neon gradients or decorative AI-dashboard styling.
- **Interface language:** graphite surfaces, warm ivory text, lichen green for primary emphasis, and restrained teal-blue for secondary orientation cues; the full palette lives in [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).
- **Inspectable decisions:** important product and architecture choices are documented.
- **Safe by default:** synthetic data in the repository, explicit exports, and no accidental cloud dependency.
- **Reconciled, not pretend-perfect:** the app records important activity and can sync its calculated actual balance to a user-entered real account balance without inventing individual small transactions.

## Product boundaries

### In scope

- Monthly salary and income entries.
- One-time and recurring expenses.
- User-defined categories.
- Weekly, monthly, and custom-range summaries.
- SIP, RD, and other planned commitments.
- Remaining disposable balance calculations.
- Charts and trend views.
- Local export and backup.
- Static public product/demo website.

### Not part of the first version

- Bank account aggregation.
- Automatic transaction imports.
- Hosted multi-user accounts.
- Payment processing.
- Investment advice or portfolio recommendations.
- Tax filing or tax optimization.
- AI-generated financial decisions.

## Key terms

- **Income:** money entering the tracked system, such as salary.
- **Expense:** money already spent.
- **Investment:** an actual debit for an investment contribution; it reduces cash but is reported separately from ordinary spending.
- **Refund:** money returned from an expense or investment.
- **Commitment:** money planned or reserved for a recurring obligation, such as an SIP or RD.
- **Actual balance:** calculated cash after active credits, debits, and reconciliation adjustments, before planned commitments.
- **Reconciliation:** a comparison between calculated actual balance and the real account balance entered by the user.
- **Disposable balance:** income minus expenses and commitments for the selected period.
- **Period:** a week, month, or custom date range used for summaries.
- **Planning cycle:** a local calendar-month range `[start, end)` used to compare opening actual cash, expected and actual salary, movement, commitments, and disposable balance.
- **Expected salary:** a planning fact that does not affect actual cash until an active income entry is recorded.
- **Rollover:** the previous cycle's actual closing balance becoming the next cycle's opening actual balance; disposable balance and commitment reservations are not treated as new income.

## Current decisions

- The working app runs locally.
- GitHub is the source of truth for code, documentation, issues, epics, and pull requests.
- GitHub Pages hosts only the static product/demo website.
- The app and demo site live in separate top-level directories in one repository unless a later decision changes that.
- The static product/demo site will deploy from `site/` to GitHub Pages through GitHub Actions; the finance app has no hosted deployment boundary.
- Containers are optional local development and packaging tooling. The browser runtime is selected; any reproducible Docker or Podman setup belongs to `MARGIN-004`.
- Versioned releases use Git tags and GitHub Releases. Public container images are optional and must contain no personal data.
- The v0.1 finance app is a browser-based local SPA served from `localhost`.
- The v0.1 UI stack is React, TypeScript, and Vite on Node.js 24 LTS with npm.
- The repository root provides the canonical npm workspace commands; `app/` contains the finance application and `site/` remains an independent website boundary.
- Local persistence uses a loopback-only Node service with a file-backed SQLite database behind a typed repository interface; there is no sync or hosted database.
- JSON is the lossless backup format and CSV is a secondary interoperability export.
- The domain model separates actual ledger entries, planned commitments, and reconciliation snapshots.
- Reconciliation compares real account balance to actual cash, then records a separate adjustment for untracked activity; commitments are applied afterward to derive disposable balance.
- Monthly planning uses local calendar-month cycles. Opening and closing actual balances are derived from active ledger movements; expected salary is kept separate until an actual income entry exists; remaining commitments are applied afterward to derive disposable balance.
- Financial dates remain canonical as ISO `YYYY-MM-DD` in storage, domain values, APIs, and backups; the UI formats them for the user's locale, including `DD/MM/YYYY` for India.
- v0.1 uses one local ledger currency, defaulting to INR with two decimal places, and does not support FX conversion.

## Open decisions

- License.
- First release scope after the foundation vertical slice.
- Optional PWA installation or desktop packaging if browser constraints justify it.

## Working rule for future chats

Before changing code, identify the relevant epic and task, read this file plus the task brief, and update the project documentation if a decision changes. Do not invent a hosted backend or cloud data path without explicitly revisiting the local-first boundary.

The monthly planning and rollover rules are recorded in [ADR-003](decisions/ADR-003-monthly-planning-and-rollover.md) and are implemented incrementally through EPIC-002.
