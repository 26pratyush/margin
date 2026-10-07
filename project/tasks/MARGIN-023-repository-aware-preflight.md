# MARGIN-023 — Repository-aware preflight and failure-correction skill

**Parent epic:** [EPIC-004 — Developer workflow and release confidence](https://github.com/26pratyush/margin/issues/52)

**GitHub issue:** [#54](https://github.com/26pratyush/margin/issues/54)

**Depends on:** [MARGIN-022 — Developer workflow and preflight contract](MARGIN-022-developer-workflow-and-preflight-contract.md)

**Priority:** P1

## Goal

Replace the `SKILLS/preflight/` placeholder with an executable Margin-specific
workflow for repository discovery, focused validation, safe correction,
independent review, and final regression evidence. The skill must be useful in a
fresh checkout and must preserve the local-first finance-data boundary.

## Deliverables

- `SKILLS/preflight/SKILL.md` with the required inputs, status and finding
  contracts, repository-aware discovery, bounded correction rounds, focused
  reruns, reviewer delegation, and final-gate evidence format.
- `SKILLS/preflight/README.md` describing the active skill and linking the
  MARGIN-022 contract.
- `SKILLS/README.md` distinguishing the implemented preflight skill from the
  remaining placeholder skills.
- This task brief and its index entry.
- A concise verification record in `docs/TESTING.md`.

## Safety and delegation contract

The main agent remains the sole integrator and decision-maker. Delegated
auditors may inspect the repository read-only. A delegated writer may patch only
an explicitly assigned, disjoint file set in an isolated worktree; no delegated
agent may commit, push, mutate GitHub, handle credentials, or touch a normal
finance-data directory. If isolation or model selection is unavailable, the
skill falls back to read-only or serial execution.

The skill stops for secrets, real financial data, destructive operations, wrong
repository or branch, missing authority, unsafe workflow permissions, or
ambiguous expected behavior. It allows at most three correction rounds for the
same unresolved finding and requires a focused rerun after each correction.

## Acceptance criteria

- A fresh checkout can use the documented commands to verify repository
  identity, worktree state, runtime, dependencies, scripts, workflows, issue
  context, and task scope before running checks.
- Changed paths drive the smallest useful focused checks, followed by the full
  root quality gate and the independent site gate when applicable.
- Findings distinguish code, test-contract, environment, scope/authority, and
  architecture failures and include evidence, owner/correction status, and a
  focused rerun.
- Automatic corrections are limited to formatting and clearly mechanical,
  in-scope changes. Tests, thresholds, schemas, backups, dependencies,
  permissions, and ambiguous behavior require review or escalation.
- The workflow records PR-ready checks, privacy/local-data review, known risks,
  and release evidence without exposing credentials or personal data.
- The skill does not change application code, package scripts, quality
  thresholds, workflows, dependency versions, or finance data contracts.

## Verification plan

Use synthetic data only and a temporary `MARGIN_DATA_DIR` for data-related
checks. Validate clean, documentation-only, service/domain, UI, site-only,
missing-runtime/dependency, dirty-worktree, suspicious-file, mechanical-fix,
ambiguous-failure, architecture-review, documentation-review, unavailable-
subagent, and concurrent-scope-conflict scenarios. Run the bundled validator
at the optional host path shown below when its `PyYAML` dependency is
available:

```bash
python3 /Users/prat/.codex/skills/.system/skill-creator/scripts/quick_validate.py SKILLS/preflight
```

Then run the root formatting/lint/test/type/build checks, `npm run quality`,
and the site gate when relevant. If that optional host validator is unavailable,
perform the documented frontmatter/contract review and record the environment
limitation rather than installing dependencies or weakening the gate. Review
the finished skill with independent Terra and Luna audits before PR preparation.

## Non-goals

This task does not implement repository skills beyond preflight, new GitHub
Actions jobs, security/dependency scanners, browser smoke tests, product or
data-model changes, new quality thresholds, or automatic GitHub Project
administration. Those remain assigned to the later MARGIN-024 through
MARGIN-028 work.
