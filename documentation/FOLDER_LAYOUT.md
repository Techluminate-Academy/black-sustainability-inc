# Source folder layout

This repo uses the **Next.js Pages Router** with code at the repository root (no `src/` app tree).

## Recommended shape (vertical UI + horizontal domain)

| Layer | Folder | Owns |
|-------|--------|------|
| **Product UI (vertical slices)** | `features/<slice>/` | One user journey or product area: components, hooks, client services that call `/api/*`, colocated tests |
| **Shared UI** | `components/` | Cross-feature primitives, layouts, admin shell — reused building blocks, not a full journey |
| **HTTP surface** | `pages/` + `pages/api/` | Routes stay **URL-oriented**: thin page components and thin API handlers |
| **Domain + integrations** | `lib/domain/`, `lib/`, `lib/integrations/` | Server rules, DB/Airtable/Mighty/Redis — **no React** under `lib/domain/` |

New work should default to: **build the slice in `features/`**, **keep handlers thin** in `pages/api/`, **put orchestration in `lib/domain/`** (or existing `lib/*` helpers).

## `features/` — UI feature slices (vertical)

Use for **end-to-end user flows** grouped by product area:

- React components, hooks, small client-side helpers, and colocated tests (`__tests__/`)
- Examples: `features/freeSignup/` (join-the-map), `features/loginUpgrade/` (membership options)
- Import style: `@/features/<slice>/...`

**Do not** put here: API route modules, direct Mongo/Redis calls, webhook logic, or secrets. Those belong in `pages/api/` + `lib/`.

## `components/` — shared presentation

Use when UI is **reused across features** or is a generic widget (maps, modals, nav, form builder):

- `components/common/` — primitives (maps, cards, loaders)
- `components/layouts/` — page shells (map layout, footer, sidebar)
- `components/admin/` — staff dashboard chrome

If a component is only used by one feature and carries that flow’s semantics, prefer **`features/<slice>/`** so the slice stays cohesive.

## `pages/` and `pages/api/` — routing only

- **`pages/*.tsx`**: compose `features/*` and `components/*`, minimal glue.
- **`pages/api/*`**: parse request → call **`lib/domain/`** or **`lib/*`** → return JSON/errors. Avoid growing business logic inside route files; extract to domain services when it repeats or tests need it.

## `lib/domain/` — domain services (server)

Use for **application rules** consumed by API routes and scripts:

- **No React**
- Group by area: `billing/`, `members/`, `location/`, `sync/`, etc.
- Example: `lib/domain/location/memberLocationUpdate.service.ts`

Imports: `@/lib/domain/...`

## `lib/` (rest)

- **`lib/integrations/`** — thin adapters (Mongo, Redis, Mighty, Airtable re-exports)
- **`lib/server/`** — server-only helpers (e.g. Airtable tokens for browser-facing APIs)
- Other top-level `lib/*` — webhooks, gating, cache invalidation, sessions (incrementally callable from domain services)

## Legacy Wix / staff-only tooling

See [legacy-integrations.md](legacy-integrations.md). There is no top-level `legacy/` code folder; legacy behavior lives in `lib/wix/`, `scripts/wix-*`, and gated scripts.

## Documentation

Long-form notes and runbooks: [documentation/README.md](README.md).
