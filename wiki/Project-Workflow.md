# Project Workflow

Work starts from a GitHub Issue and is organized under an Epic. The issue is placed in the GitHub Project, implemented on a focused branch, and merged through a Pull Request.

The foundation and first planning release are complete. Current everyday-tracking work is organized under EPIC-003 and ends with MARGIN-021, the final v0.2.0 regression and release-preparation pass. Task briefs in the repository provide durable context for separate implementation chats. If an implementation changes scope or a dependency, update the issue and the matching project file.

## Release-readiness sequence

1. Run `npm run quality` for the root app/service gate.
2. Run the independent `site/` format, type-check, test, and build checks.
3. Verify the synthetic guide/demo, real-data isolation, correction/void lifecycle, history filters, balance sync, backup/restore, and restart behavior with a temporary `MARGIN_DATA_DIR`.
4. Perform a fresh review and update [the v0.2.0 release-preparation record](../docs/RELEASE-v0.2.0.md).
5. Merge the Pull Request, then tag and publish only from the validated `main` commit after approval.
