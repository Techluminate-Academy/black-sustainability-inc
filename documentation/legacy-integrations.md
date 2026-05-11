# Legacy integrations (Wix-era)

These paths are **not** sources of truth for live map billing or paid visibility.

- **Wix** subscription tooling and Wix → Airtable apply scripts are legacy staff reconciliation. Map pins use **Mighty → MongoDB `mightyMembers`** — see [ARCHITECTURE.md](ARCHITECTURE.md).
- The apply script `scripts/wix-airtable-sync-apply.ts` requires **`ALLOW_WIX_AIRTABLE_APPLY=1`** to run.

When retiring code, replace imports with dry-run entry points or remove callers so CI and greps stay clean.
