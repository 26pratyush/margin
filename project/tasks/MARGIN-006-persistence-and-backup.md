# MARGIN-006 — Create local persistence and backup boundary

## Goal

Store local financial records behind a clear interface and establish the first backup/export direction.

## Scope

- Implement the selected local persistence mechanism.
- Define create, read, update, delete, and reset behavior.
- Add validation before writes.
- Persist balance snapshots and reconciliation adjustments without rewriting prior ledger history.
- Keep storage files in an ignored local-data location.
- Define a deterministic, versioned JSON export shape with integrity verification; CSV remains secondary interoperability output.
- Provide browser restore preview, automatic pre-restore recovery, and atomic replacement.

## Acceptance criteria

- Data survives an application restart locally.
- Invalid records are rejected with understandable errors.
- Reset behavior is explicit and safe.
- A synthetic dataset can be exported and restored through the browser boundary.
- A real-balance sync can create and restore a reconciliation snapshot and its adjustment entry.
- A tampered, invalid, or unsupported backup is rejected without changing current data.
- JSON is the only supported user backup format; raw SQLite archives are not required for v0.1 recovery.
- No persistence path requires GitHub Pages or another hosted service.
