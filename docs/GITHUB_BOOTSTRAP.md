# GitHub bootstrap checklist

This file records the small amount of authenticated GitHub setup that remains after the repository files are prepared.

> Historical one-time checklist: the repository, project, epics, and initial task issues are already initialized. The current active work is EPIC-003 and v0.2.0 release preparation; do not repeat the publish, first-epic, or first-task commands below on an existing checkout.

## 1. Publish the local foundation

Run these commands from the repository root after authenticating GitHub locally:

```bash
git remote add origin https://github.com/26pratyush/margin.git
git branch -M main
git add .
git commit -m "chore: establish Margin project foundation"
git push -u origin main
```

If `origin` already exists, skip the first command.

## 2. Configure the repository

- Keep the repository public for the GitHub Free Pages and Actions path; never publish personal financial data, credentials, or secrets.
- Set `main` as the default branch.
- Enable Issues, Projects, and Wiki under repository settings.
- Add the labels listed in `project/LABELS.md`.
- Add milestones listed in `project/TRACKING.md`.
- Protect `main` once Pull Requests and checks are in regular use.

## 3. Configure the GitHub Project

The `Margin — Product Development` project has been created for `26pratyush/margin`, and the initial issues are in Backlog. Keep its fields, views, and workflow conventions aligned with `project/TRACKING.md`.

Use the Roadmap, Current Wave, Board, Backlog, Bugs, and Product Website views. Do not add more fields until a real workflow needs them.

## 4. Create the first Epic

Create an issue titled:

```text
[EPIC] Foundation and first local vertical slice
```

Use `project/epics/EPIC-001-foundation.md` as the issue body. Add it to the Project as an Epic with `Wave = Wave 0`, `Target release = v0.1`, and `Priority = P0`.

## 5. Create child task issues

Create one issue for each task in `project/tasks/`. Use the task title and brief as the issue title/body. Link each issue to the Epic as a sub-issue when available; otherwise reference the Epic in the issue body and add the issue to the same Project.

The first task to move to `In progress` should be `MARGIN-001`. Do not start `MARGIN-002` until the project baseline is visible on GitHub.

## 6. Add the Wiki pages

The `wiki/` directory is Wiki-ready source. GitHub Wikis are separate from the main repository, so copy the Markdown pages into the Wiki after the repository is published:

- `wiki/Home.md`
- `wiki/Product-Vision.md`
- `wiki/Architecture.md`
- `wiki/Privacy-and-Data.md`
- `wiki/Project-Workflow.md`
- `wiki/Decision-Log.md`

Keep technical files that must change with code in `docs/`; use the Wiki for stable, long-form project context.

## 7. Publish the product website with GitHub Pages later

When `site/` contains a real static site, configure GitHub Pages to publish it through GitHub Actions. Deploy only the product/demo website. The local finance app should not be configured as a hosted service.
