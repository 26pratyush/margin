# MARGIN-006 — Create local persistence and backup boundary

## Goal

Store local financial records behind a clear interface and establish the first backup/export direction.

## Scope

- Implement the selected local persistence mechanism.
- Define create, read, update, delete, and reset behavior.
- Add validation before writes.
- Keep storage files in an ignored local-data location.
- Define a deterministic CSV or JSON export shape, even if the full UI comes later.

## Acceptance criteria

- Data survives an application restart locally.
- Invalid records are rejected with understandable errors.
- Reset behavior is explicit and safe.
- A synthetic dataset can be exported or the format is documented for the next task.
- No persistence path requires Render or another hosted service.
