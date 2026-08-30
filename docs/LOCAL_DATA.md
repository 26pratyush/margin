# Local data and backup

Margin keeps the browser as its product surface while storing the primary ledger in a loopback-only Node service backed by SQLite.

The service uses Node.js's built-in `node:sqlite` module. Native npm setup therefore does not require a separate SQLite installation, native dependency compilation, or Docker.

```text
Browser UI → 127.0.0.1:4318 → OS application-data directory → margin.sqlite
```

## Data directory

The service resolves a platform-native default:

- macOS: `~/Library/Application Support/Margin`
- Windows: `%LOCALAPPDATA%/Margin`
- Linux: `${XDG_DATA_HOME:-~/.local/share}/margin`

Set `MARGIN_DATA_DIR` to an absolute path when a user needs a custom location, external drive, or a test directory. The service refuses filesystem roots and reset only clears Margin database records; it does not recursively delete an arbitrary path.

The database and local runtime files are ignored by Git. Never commit real financial data, SQLite files, credentials, or secrets.

## Backup and restore

JSON is the only user-facing backup format. It is the lossless, versioned portability contract and is independent of operating-system paths, SQLite files, browser profiles, and Docker volumes.

The current envelope contains:

- `format` and `formatVersion`.
- `schemaVersion`, app version, export timestamp, and currency.
- Complete entries, categories, commitments, balance snapshots, and planning cycles under `data`.
- An `extensions` object for forward-compatible metadata.
- A SHA-256 integrity digest over the canonical envelope.

The service still accepts the original flat v1 backup shape and migrates it in memory. New exports use v2. An app rejects unsupported future versions rather than silently dropping fields.

Dataset schema version 3 adds the persisted entry lifecycle metadata needed for safe correction and void commands. Existing entries without payload timestamps are backfilled from their SQLite row version during normal startup migration without changing their IDs or financial fields. The backup envelope remains at format version 2: flat v1 backups and pre-planning v2 backups are still normalized with an empty planning-cycle collection, while corrected and voided entries retain their lineage and lifecycle metadata in the existing integrity-protected data.

The SQLite migration adds a per-record schema marker to the existing generic `records` table and backfills entry timestamps where needed. Existing entry records retain marker version 1, while planning-cycle records use the current dataset version 3; no second planning-specific database table is introduced.

Restore validates the full file, verifies its integrity digest, checks cross-record references, shows a preview in the browser, creates a local pre-restore recovery snapshot, and replaces the dataset in one SQLite transaction. Invalid files cannot change the current dataset.

The browser provides download and file-picker based restore, so a backup can be saved outside the application, used after clearing browser data, or imported in another browser or machine. Raw SQLite archives are intentionally out of scope for v0.1.0; they add WAL, locking, and schema portability concerns without improving the browser-based recovery path.

## Local recovery snapshots

Before a valid restore, Margin writes a JSON snapshot under the local data directory's `recovery/` folder and keeps the latest three snapshots. These are an automatic safety net for an accidental restore, not a replacement for copying a JSON backup to another drive or machine.

## Docker

Docker is optional. If used, mount an explicit host directory into the service container. A Docker-managed volume can be useful for container packaging, but it must not be the only backup or restore mechanism.
