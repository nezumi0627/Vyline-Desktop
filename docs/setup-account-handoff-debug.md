# Vyline Setup / Account Data / Handoff / Diagnostics

## Scope

This change introduces the contracts and storage boundary for per-account settings, first-run setup progress, handoff manifests, and privacy-safe diagnostics. The account key is the authenticated LINE user MID; the legacy `accountId` remains a session/runtime key until the login migration is complete.

## Data ownership

- `apps/desktop`: setup wizard, settings editor, handoff screens, and preview/confirmation UX.
- `backend/src/api`: input validation and HTTP error mapping only.
- `backend/src/service`: setup/settings, redaction, handoff orchestration.
- `backend/src/storage`: filesystem layout, atomic writes, migration and deletion/backup.
- `packages/types`: shared versioned contracts.
- `packages/protocol`: authentication and LINE protocol state; never exported by handoff.

## Versioned account layout

```text
VylineData/
├─ accounts/{safe-mid}/settings.json
├─ accounts/{safe-mid}/preferences.json
├─ accounts/{safe-mid}/debug/
├─ accounts/{safe-mid}/handoff/
├─ global/app-settings.json
└─ logs/
```

Tokens, cookies, passwords, E2EE keys and session material are excluded from settings and handoff contracts. Existing flat files are read as a migration source and must be preserved if migration fails.

## Handoff contract

The `HandoffManifest` in `@vyline/types` is the only public manifest contract. A future archive writer must include `manifest.json`, calculate SHA-256 for each included file, and use `encryption.mode` to leave room for password/OS-keychain protection without changing the manifest shape. Handoff archives must never include authentication or message content by default.

## Diagnostics

Diagnostic records are structured, bounded, and sanitized before export. MID/GID/URLs/content and credential-like fields are redacted; anonymous identifiers use SHA-256 and are not reversible. Message text collection is represented as the literal `false` in the account settings contract, so a future UI cannot accidentally enable it through a partial update.

## Migration and rollback

1. Read the new versioned path first.
2. If absent, read the legacy path and write a new copy through an atomic temporary file.
3. Never delete the legacy source during automatic migration.
4. On parse or write failure, keep the source and return a safe default/error code.
5. Destructive account deletion must create an explicit backup before removal.

## Current implementation slice

The first slice adds shared contracts, MID-scoped settings API (`GET/PUT/PATCH /api/settings/accounts/:mid`), atomic JSON writes, and redaction tests. The setup wizard, ZIP archive implementation, OS credential store, and GitHub Issue UI are intentionally next slices so they can be reviewed independently and tested without exposing secrets.
