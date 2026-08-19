# Deployment and release boundary

## Local application

The Margin finance application is developed and used locally. It is not deployed to GitHub Pages and does not need a hosted API or hosted database for the initial product.

The v0.1 application is a browser SPA served locally from `http://localhost:5173`.

The canonical local workflow is a native npm workspace:

```bash
npm ci
npm run dev
npm run check
npm run build
npm run preview
```

The `app/` workspace contains the Vite application, while the repository root owns the lockfile and command wrappers. The public `site/` directory remains an independent build boundary.

## GitHub Pages product website

GitHub Pages is reserved for the static product/demo website in `site/`.

Expected deployment shape:

```text
GitHub main branch
        ↓
GitHub Actions build
        ↓
GitHub Pages
        ↓
Screenshots, product explanation, roadmap, GitHub links
```

The site must build independently from the `site/` directory and contain no personal financial data, secrets, application database, finance API, or server-side dependency. Pull requests may build and validate the site, but only the default branch may publish it.

## Container policy

Containers are optional and are not required for the MARGIN-004 development path. The native npm workflow is faster for day-to-day work and remains the canonical contributor experience. A later `Containerfile` may provide a reproducible static build/preview path for CI or packaging.

- The native local command remains the canonical path unless the runtime decision says otherwise.
- Docker Desktop is optional for personal or non-commercial open-source development; Podman is an open-source-compatible alternative.
- Local data must use an ignored path or local volume and must never be copied into an image.
- No container is deployed as a hosted finance service.

## Local packaging and backup

The primary package is a source checkout with a committed npm lockfile. A local user runs the app with the documented npm command; no account, cloud service, or platform-specific installer is required for v0.1.

The app stores records in browser-managed IndexedDB and provides an explicit versioned JSON export/import path. CSV is available as a secondary export. Browser storage is not treated as a backup because users can clear site data, use private browsing, change origins, or encounter quota eviction.

## Release rule

Versioned software releases use `v0.x.y` Git tags and GitHub Releases. Release notes should identify the validated commit and include only source, documentation, or synthetic build artifacts. A public GitHub Container Registry image may be added later if the selected local runtime benefits from one; it is not required for v0.1.

The product website can be published after a coherent set of screenshots and product explanations exists. The finance app does not need to be publicly reachable for the website to be useful.
