# Local data and backup

Margin keeps the browser as its product surface while storing the primary ledger in a loopback-only Node service backed by SQLite.

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

JSON is the lossless, versioned backup format. The envelope contains `format`, `formatVersion`, `schemaVersion`, app version, currency, and complete arrays for entries, categories, commitments, and balance snapshots. Import validates the complete dataset before replacing anything and performs the replacement in one SQLite transaction.

The browser provides download and file-picker based restore, so a backup can be saved outside the application, used after clearing browser data, or imported in another browser or machine. A raw SQLite copy is not the only recovery path.

## Docker

Docker is optional. If used, mount an explicit host directory into the service container. A Docker-managed volume can be useful for container packaging, but it must not be the only backup or restore mechanism.
