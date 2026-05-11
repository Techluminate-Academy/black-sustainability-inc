# Documentation

Internal references and historical notes live here so the repository root stays minimal. **`README.md`** at the project root remains the entry point for developers.

## Canonical references

| Document | Purpose |
|----------|---------|
| [FOLDER_LAYOUT.md](FOLDER_LAYOUT.md) | Vertical UI slices (`features/`), shared UI (`components/`), thin `pages/` + `pages/api/`, domain (`lib/domain/`) |
| [legacy-integrations.md](legacy-integrations.md) | Wix-era / staff-only tooling; not map billing truth |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Platform source of truth: MongoDB `mightyMembers`, Mighty billing, Redis cache, Airtable mirror role |
| [BSN_MASTER_DOCUMENT.md](BSN_MASTER_DOCUMENT.md) | Broad platform reference |
| [BSN_MEMBERSHIP_ONBOARDING_ARCHITECTURE.md](BSN_MEMBERSHIP_ONBOARDING_ARCHITECTURE.md) | Membership / onboarding flows |

## Operations and setup

| Document | Purpose |
|----------|---------|
| [RENDER_SETUP.md](RENDER_SETUP.md) | Render deployment |
| [NEXTAUTH_SETUP.md](NEXTAUTH_SETUP.md) | NextAuth configuration |
| [ADMIN_SYSTEM_README.md](ADMIN_SYSTEM_README.md) | Admin tooling |

## Historical / analysis (read-only context)

Analysis drafts, security bulletins, batch-upload emails, and performance notes from earlier milestones are kept here for audit context—not as live runbooks unless referenced elsewhere.

## Research and decision traces

Previously under a local-only `docs/` folder; these are design notes and traces kept for context:

| Document | Purpose |
|----------|---------|
| [research/MAP-MARKERS-GATING.md](research/MAP-MARKERS-GATING.md) | Map marker visibility / gating notes |
| [research/MAP-VISIBILITY-DECISION-TRACE-FRONTEND.md](research/MAP-VISIBILITY-DECISION-TRACE-FRONTEND.md) | Frontend visibility decision trace |
| [research/BSN_MEMBERSHIP_BILLING_RECONCILIATION_REPORT.md](research/BSN_MEMBERSHIP_BILLING_RECONCILIATION_REPORT.md) | Billing reconciliation report draft |

## Sample data

| Path | Purpose |
|------|---------|
| [samples/new-map-members-2025.csv](samples/new-map-members-2025.csv) | Sample export (not production data) |
