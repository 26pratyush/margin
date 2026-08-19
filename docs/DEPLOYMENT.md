# Deployment and release boundary

## Local application

The Margin finance application is developed and used locally. It is not deployed to GitHub Pages and does not need a hosted API or hosted database for the initial product.

The local setup instructions will be added once the application stack is selected.

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

Containers are optional. MARGIN-002 decides whether the selected local runtime benefits from containerization; MARGIN-004 may then add a `Dockerfile` and portable `compose.yaml` for reproducible development and CI.

- The native local command remains the canonical path unless the runtime decision says otherwise.
- Docker Desktop is optional for personal or non-commercial open-source development; Podman is an open-source-compatible alternative.
- Local data must use an ignored path or local volume and must never be copied into an image.
- No container is deployed as a hosted finance service.

## Release rule

Versioned software releases use `v0.x.y` Git tags and GitHub Releases. Release notes should identify the validated commit and include only source, documentation, or synthetic build artifacts. A public GitHub Container Registry image may be added later if the selected local runtime benefits from one; it is not required for v0.1.

The product website can be published after a coherent set of screenshots and product explanations exists. The finance app does not need to be publicly reachable for the website to be useful.
