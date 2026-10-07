# Repository skills

This directory is reserved for small, repeatable workflows that future agents can follow. The root `AGENTS.md` remains the primary instruction file.

The repository-wide [developer preflight and evidence contract](../docs/DEVELOPER_PREFLIGHT.md)
is the source of truth that future skills must consume. Skills must preserve
its issue scope, local-data safety, correction boundaries, focused reruns, and
Pull Request/release evidence requirements.

## Planned skills

- `issue-management/` — create, update, link, and close Issues consistently.
- `pull-request/` — create PRs using the repository template and link them to Issues.
- `preflight/` — **implemented**; run repository-aware checks, bounded corrections,
  independent audits, and the final data/privacy/documentation review before a PR.

Issue-management and Pull Request skills remain explicit placeholders. Their
implementation is planned for the later developer-workflow issues; the active
preflight skill is implemented and tracked by MARGIN-023. No skill adds an
automatic mutation path or external GitHub action.
