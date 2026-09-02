# Margin product website

The public Margin product website is a static React/Vite site for the published v0.1.0 planning story and the current v0.2.0 product direction. It explains the salary-to-disposable-money loop, including monthly planning and the locker visualization, without importing the finance application, calling an API, or containing personal financial data.

The site is a product explanation and demo surface, not the finance application. It must stay useful even when the local app is not running.

## Local development

From the repository root:

```bash
cd site
npm ci
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

Useful checks:

```bash
npm run format:check
npm run check
npm test
npm run build
npm run preview
```

The site uses synthetic product values and the checked-in screenshots in `site/public/screenshots/` only. It is independent from the local finance app and does not need the Margin service running. Keep public examples clearly synthetic and never copy local database records into screenshots or page content.

The historical public release notes live in [`docs/RELEASE-v0.1.0.md`](../docs/RELEASE-v0.1.0.md); current local-app release preparation is recorded in [`docs/RELEASE-v0.2.0.md`](../docs/RELEASE-v0.2.0.md). The site should link to release notes, local setup, architecture, and the privacy boundary rather than implying that GitHub Pages hosts the finance app. The v0.2.0 finance application remains local-only and is not deployed by this site.

## GitHub Pages publishing

The repository workflow at `.github/workflows/site-pages.yml` builds and publishes the site from `main`.

One-time repository setup:

1. Open the repository on GitHub.
2. Go to **Settings → Pages**.
3. Set **Source** to **GitHub Actions**.
4. Push or merge a change to `main` that touches `site/`.

The workflow installs the locked dependencies from `site/package-lock.json`, runs formatting, type-checking, tests, and a production build, then deploys `site/dist`. The project-site base path is configured as `/margin/` in GitHub Actions and `/` during local development.

The project site is available at `https://26pratyush.github.io/margin/` after successful GitHub Actions deployments from `main`.
