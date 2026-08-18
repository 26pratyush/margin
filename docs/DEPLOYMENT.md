# Deployment boundary

## Local application

The Margin finance application is developed and used locally. It is not deployed to Render and does not need a hosted API or hosted database for the initial product.

The local setup instructions will be added once the application stack is selected.

## Render product website

Render is reserved for the static product/demo website in `site/`.

Expected deployment shape:

```text
GitHub main branch
        ↓
Render Static Site
        ↓
Screenshots, product explanation, roadmap, GitHub links
```

The site should deploy from the `site/` directory and contain no personal financial data, secrets, application database, or server-side dependency.

## Release rule

The product website can be deployed after a coherent set of screenshots and product explanations exists. The finance app does not need to be publicly reachable for the website to be useful.
