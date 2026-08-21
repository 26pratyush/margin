# Margin product website

The public Margin product website is a static React/Vite site. It explains the product and its local-first boundary without importing the finance application, calling an API, or containing personal financial data.

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

The site uses synthetic product values and the checked-in screenshots in `site/public/screenshots/` only. It is independent from the local finance app and does not need the Margin service running.

## GitHub Pages publishing

The repository workflow at `.github/workflows/site-pages.yml` builds and publishes the site from `main`.

One-time repository setup:

1. Open the repository on GitHub.
2. Go to **Settings → Pages**.
3. Set **Source** to **GitHub Actions**.
4. Push or merge a change to `main` that touches `site/`.

The workflow installs the locked dependencies from `site/package-lock.json`, runs formatting, type-checking, tests, and a production build, then deploys `site/dist`. The project-site base path is configured as `/margin/` in GitHub Actions and `/` during local development.

After the first successful deployment, the project site will be available at `https://26pratyush.github.io/margin/`.
