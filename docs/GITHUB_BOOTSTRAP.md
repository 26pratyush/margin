# GitHub bootstrap checklist

This file records the small amount of authenticated GitHub setup that remains after the repository files are prepared.

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

- Keep the repository private until you are comfortable publishing the code and documentation.
- Set `main` as the default branch.
- Enable Issues, Projects, and Wiki under repository settings.
- Add the labels listed in `project/LABELS.md`.
- Add milestones listed in `project/TRACKING.md`.
- Protect `main` once Pull Requests and checks are in regular use.

## 3. Create the GitHub Project

Create `Margin — Product Development`, connect the repository, and configure the fields and views described in `project/TRACKING.md`.

Start with the Roadmap, Current Wave, Backlog, Bugs, and Product Website views. Do not add more fields until a real workflow needs them.

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

## 7. Connect Render later

When `site/` contains a real static site, connect Render to the repository and set the site root directory to `site/`. Deploy only the product/demo website. The local finance app should not be configured as a Render service.
