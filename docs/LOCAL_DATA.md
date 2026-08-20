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
- Complete entries, categories, commitments, and balance snapshots under `data`.
- An `extensions` object for forward-compatible metadata.
- A SHA-256 integrity digest over the canonical envelope.

The service still accepts the original flat v1 backup shape and migrates it in memory. New exports use v2. An app rejects unsupported future versions rather than silently dropping fields.

Restore validates the full file, verifies its integrity digest, checks cross-record references, shows a preview in the browser, creates a local pre-restore recovery snapshot, and replaces the dataset in one SQLite transaction. Invalid files cannot change the current dataset.

The browser provides download and file-picker based restore, so a backup can be saved outside the application, used after clearing browser data, or imported in another browser or machine. Raw SQLite archives are intentionally out of scope for v0.1; they add WAL, locking, and schema portability concerns without improving the browser-based recovery path.

## Local recovery snapshots

Before a valid restore, Margin writes a JSON snapshot under the local data directory's `recovery/` folder and keeps the latest three snapshots. These are an automatic safety net for an accidental restore, not a replacement for copying a JSON backup to another drive or machine.

## Docker

Docker is optional. If used, mount an explicit host directory into the service container. A Docker-managed volume can be useful for container packaging, but it must not be the only backup or restore mechanism.
