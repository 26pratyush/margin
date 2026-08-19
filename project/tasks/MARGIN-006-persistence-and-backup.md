# MARGIN-006 — Create local persistence and backup boundary

## Goal

Store local financial records behind a clear interface and establish the first backup/export direction.

## Scope

- Implement the selected local persistence mechanism.
- Define create, read, update, delete, and reset behavior.
- Add validation before writes.
- Persist balance snapshots and reconciliation adjustments without rewriting prior ledger history.
- Keep storage files in an ignored local-data location.
- Define a deterministic CSV or JSON export shape, even if the full UI comes later.

## Acceptance criteria

- Data survives an application restart locally.
- Invalid records are rejected with understandable errors.
- Reset behavior is explicit and safe.
- A synthetic dataset can be exported or the format is documented for the next task.
- A real-balance sync can create and restore a reconciliation snapshot and its adjustment entry.
- No persistence path requires GitHub Pages or another hosted service.
