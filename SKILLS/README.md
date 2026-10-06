# Repository skills

This directory is reserved for small, repeatable workflows that future agents can follow. The root `AGENTS.md` remains the primary instruction file.

These are placeholders for now; they are intentionally not full skill implementations.

The repository-wide [developer preflight and evidence contract](../docs/DEVELOPER_PREFLIGHT.md)
is the source of truth that future skills must consume. Skills must preserve
its issue scope, local-data safety, correction boundaries, focused reruns, and
Pull Request/release evidence requirements.

## Planned skills

- `issue-management/` — create, update, link, and close Issues consistently.
- `pull-request/` — create PRs using the repository template and link them to Issues.
- `preflight/` — run checks and perform the final data/privacy/documentation review before a PR.

Implementation of these workflows belongs to MARGIN-023 and MARGIN-024. This
index does not activate a skill or add an automatic mutation path.
