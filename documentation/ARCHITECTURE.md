# BSN platform architecture (source of truth)

## Repository structure

Product UI is organized as **vertical feature slices** under `features/<name>/`. Shared widgets and layouts live under `components/`. **Pages** (`pages/`) and **API routes** (`pages/api/`) stay route-oriented and should stay thin; server orchestration and rules live under **`lib/domain/`** and **`lib/`**. See [FOLDER_LAYOUT.md](FOLDER_LAYOUT.md) for the full convention and where new code should go.

## Map and directory (runtime)

- **MongoDB** database `members`, collection **`mightyMembers`**, is the runtime store for the public map and directory APIs (`/api/getMarkers`, `/api/getData`, `/api/filterData`, `/api/searchData`).
- **Paid / active visibility on the map** is determined by **`mightyMembers.subscription.isPaidActive`**, updated from **Mighty Networks** webhooks and Admin API usage (see `lib/mightyWebhook.ts`, `pages/api/webhooks/mighty.ts`). Non-paying signed-in viewers are gated in `lib/mapViewerGating.js` (`getExcludeViewerMighty`).

## Billing and subscriptions (authority)

- **Mighty Networks** is the authority for billing, subscription state, and paid/active membership.
- **Airtable** (including “Paying Member” style fields) is a **staff / operations mirror**. It must not be treated as the authority for whether a member appears as paid on the live map.
- **Wix** is **legacy** (see [legacy-integrations.md](legacy-integrations.md)). Wix reconciliation scripts must not overwrite Mongo map truth. The Wix → Airtable apply script is gated with **`ALLOW_WIX_AIRTABLE_APPLY=1`**.

## Caching

- **Redis** caches public list/map/search responses when the response is not viewer-specific. Invalidation is centralized in `lib/mightyCacheInvalidate.ts` after Mighty webhooks and member location updates.

## Auth (high level)

- **BSN session** (`bsn_session` cookie, JWT) is used for member map sign-in (`lib/bsnSession.ts`).
- **Admin dashboard** uses JWT signed with **`JWT_SECRET`** (required; no fallback).
- **NextAuth** handles email magic-link flows; SMTP TLS defaults to verified certificates unless **`EMAIL_TLS_REJECT_UNAUTHORIZED=0`** for local dev.

## Free signup Airtable

- Browser code calls **`/api/airtable/free-signup-metadata`** and **`/api/airtable/free-signup-record`** so Airtable tokens stay server-side (`lib/server/airtableFreeSignupServer.ts`).

## Admin batch CSV → Airtable

- The **“Paying Member (keep current)”** column is **not** written from batch upload unless **`ALLOW_STAFF_BATCH_PAYING_AIRTABLE=1`**. Prefer updating paid mirror fields from Mighty sync rather than CSV.
