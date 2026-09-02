# Privacy and Data

# Privacy and Data

Margin is local-first because personal finance records are sensitive and the product does not need bank integrations or a hosted account system.

## Local records

The loopback-only Node service stores the ledger, planning cycles, commitments, reconciliation snapshots, and entry lifecycle history in an OS-specific SQLite application-data directory. The browser is a presentation client, not the primary ledger. JSON export is the lossless, versioned backup and restore format; CSV is for interoperability only.

## Browser preferences and synthetic demo

The first-use guide's versioned `localStorage` flag (`margin.first-use-guide.v1`) is presentation state only. It is not ledger data, is not included in JSON backups, and may reset when browser storage is cleared.

The synthetic preview is deterministic, read-only, and held in memory. It uses no real records, never writes SQLite, sends no mutation requests, and is not persisted across restarts. Public screenshots and the product website use synthetic values only.

## Repository and release hygiene

Never commit real financial records, SQLite files, exported backups, credentials, or production secrets. GitHub and GitHub Pages contain source, documentation, project history, and synthetic product artifacts only. Corrections, voids, reconciliation, import, export, reset, and demo boundaries remain local operations.
