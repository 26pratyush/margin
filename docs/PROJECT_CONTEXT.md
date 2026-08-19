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
- **Inspectable decisions:** important product and architecture choices are documented.
- **Safe by default:** synthetic data in the repository, explicit exports, and no accidental cloud dependency.

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
- **Commitment:** money planned or reserved for a recurring obligation, such as an SIP or RD.
- **Disposable balance:** income minus expenses and commitments for the selected period.
- **Period:** a week, month, or custom date range used for summaries.

## Current decisions

- The working app runs locally.
- GitHub is the source of truth for code, documentation, issues, epics, and pull requests.
- GitHub Pages hosts only the static product/demo website.
- The app and demo site live in separate top-level directories in one repository unless a later decision changes that.
- The static product/demo site will deploy from `site/` to GitHub Pages through GitHub Actions; the finance app has no hosted deployment boundary.
- Containers are optional local development and packaging tooling. Whether the selected runtime benefits from Docker or Podman is decided in `MARGIN-002` and implemented, if needed, in `MARGIN-004`.
- Versioned releases use Git tags and GitHub Releases. Public container images are optional and must contain no personal data.
- The v0.1 finance app is a browser-based local SPA served from `localhost`.
- The v0.1 UI stack is React, TypeScript, and Vite on Node.js 24 LTS with npm.
- Local persistence uses IndexedDB through Dexie behind a typed repository interface; there is no sync or hosted database.
- JSON is the lossless backup format and CSV is a secondary interoperability export.

## Open decisions

- Currency and locale defaults.
- License.
- First release scope after the foundation vertical slice.
- Optional PWA installation or desktop packaging if browser constraints justify it.

## Working rule for future chats

Before changing code, identify the relevant epic and task, read this file plus the task brief, and update the project documentation if a decision changes. Do not invent a hosted backend or cloud data path without explicitly revisiting the local-first boundary.
