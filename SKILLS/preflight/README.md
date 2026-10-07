# Margin preflight skill

The active [`SKILL.md`](SKILL.md) is the repository-aware preflight for Margin
implementation, documentation, workflow, dependency, release, and review work.
It operationalizes the canonical [developer preflight and evidence contract](../../docs/DEVELOPER_PREFLIGHT.md)
without replacing that policy.

The skill discovers repository and issue scope, selects the smallest useful
checks, classifies code versus environment failures, permits only bounded
in-scope corrections, and finishes with independent review and the full quality
gate. It is local-first: it does not handle credentials, mutate GitHub, or
reset, seed, restore, or delete the user's normal finance data.

Implementation and verification are tracked in
[`MARGIN-023`](../../project/tasks/MARGIN-023-repository-aware-preflight.md).
