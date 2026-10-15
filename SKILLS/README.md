# Repository skills

This directory is reserved for small, repeatable workflows that future agents can follow. The root `AGENTS.md` remains the primary instruction file.

The repository-wide [developer preflight and evidence contract](../docs/DEVELOPER_PREFLIGHT.md)
is the source of truth that future skills must consume. Skills must preserve
its issue scope, local-data safety, correction boundaries, focused reruns, and
Pull Request/release evidence requirements.

## Active skills

- `issue-management/` — **implemented**; preview and apply confirmed Issue and
  Project updates with dependency and completion evidence.
- `pull-request/` — **implemented**; prepare and apply confirmed issue-linked
  branch pushes and Pull Requests using the repository template.
- `preflight/` — **implemented**; run repository-aware checks, bounded corrections,
  independent audits, and the final data/privacy/documentation review before a PR.
- `release/` — **implemented**; prepare and apply confirmed tags and GitHub
  Releases from validated merged `main` commits.

The shared [GitHub workflow contract](GITHUB_WORKFLOW_CONTRACT.md) defines the
preview-first mutation boundary and common handoff format. All skills consume
the canonical [developer preflight contract](../docs/DEVELOPER_PREFLIGHT.md);
none changes application behavior, finance data contracts, Actions, or
dependencies.
