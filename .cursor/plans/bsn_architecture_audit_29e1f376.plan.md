---
name: BSN Architecture Audit
overview: "Audit of the Black Sustainability Network Next.js (Pages Router) codebase: security and secrets first, then current layering, MongoDB/Mighty/Airtable/Redis/Wix touchpoints, billing and map visibility risks, and an incremental migration toward thin API routes, domain modules, and stronger tests—without rewriting the app."
todos:
  - id: phase0-security
    content: "Phase 0: Secrets/auth hardening — server-only Airtable tokens, remove JWT fallback, NextAuth TLS, impersonation prod policy, audit NEXT_PUBLIC_*"
    status: pending
  - id: phase1-fence
    content: "Phase 1: Legacy fence — gate Wix→Airtable apply, document SoT, add import/architecture guard tests"
    status: pending
  - id: phase2-adapters
    content: "Phase 2: Extract lib/integrations for Mongo, Redis, Mighty, Airtable; single connection patterns"
    status: pending
  - id: phase3-modules
    content: "Phase 3: Move orchestration to modules/* (members, location, map, sync); thin API handlers"
    status: pending
  - id: phase4-billing
    content: "Phase 4: Single writer for subscription.isPaidActive; relabel Airtable paying as mirror-only"
    status: pending
  - id: phase5-ci
    content: "Phase 5: CI workflow + expand tests (webhook idempotency, cache, search limits, gating)"
    status: pending
  - id: phase6-obs
    content: "Phase 6: Structured logging / correlation ids for webhooks and sync failures"
    status: pending
  - id: phase7-legacy
    content: "Phase 7: Archive Wix + airtableRecords hot paths after stakeholder sign-off"
    status: pending
isProject: false
---

# Executive Summary

The app is a **Next.js Pages Router** project with a large client-only home page ([`pages/index.tsx`](pages/index.tsx)), API routes under [`pages/api/`](pages/api/), and shared logic split between [`lib/`](lib/) and small [`features/`](features/) slices. **Runtime map and directory data already read from MongoDB `mightyMembers`**, with **viewer gating based on `subscription.isPaidActive`** ([`lib/mapViewerGating.js`](lib/mapViewerGating.js), used by [`pages/api/getMarkers.js`](pages/api/getMarkers.js), [`getData.js`](pages/api/getData.js), [`filterData.js`](pages/api/filterData.js), [`searchData.js`](pages/api/searchData.js)). **Mighty webhooks upsert `mightyMembers` and derive paid status from event types** ([`lib/mightyWebhook.ts`](lib/mightyWebhook.ts)); **Airtable is mirrored best-effort** from webhooks and `update-location` ([`lib/airtableMightyMembers.ts`](lib/airtableMightyMembers.ts), [`pages/api/webhooks/mighty.ts`](pages/api/webhooks/mighty.ts), [`pages/api/member/update-location.ts`](pages/api/member/update-location.ts)).

**Security and hygiene (do first):** (0) **Privileged tokens must not ship in browser bundles** — audit every `NEXT_PUBLIC_*` usage (e.g. Airtable in [`features/freeSignup/airtableUtils.ts`](features/freeSignup/airtableUtils.ts)); route through server-only APIs and **rotate** if ever exposed. (1) **Admin JWT** must not use a string fallback when `JWT_SECRET` is missing ([`pages/api/admin/verify.ts`](pages/api/admin/verify.ts)). (2) **NextAuth** email transport uses `rejectUnauthorized: false` ([`pages/api/auth/[...nextauth].js`](pages/api/auth/[...nextauth].js)) — fix or restrict to dev. (3) **Tester impersonation** ([`pages/api/test/impersonate.ts`](pages/api/test/impersonate.ts), `.env.example`) — confirm prod disablement / allowlists. (4) **Build gates:** `eslint.ignoreDuringBuilds: true` and `reactStrictMode: false` in [`next.config.mjs`](next.config.mjs) weaken default quality signals.

**Main product/architecture risks:** (1) **Wix → Airtable reconciliation scripts and admin flows still treat Airtable “Paying Member” as writable authority** ([`scripts/wix-airtable-sync-apply.ts`](scripts/wix-airtable-sync-apply.ts), [`lib/reconciliation/airtableClient.ts`](lib/reconciliation/airtableClient.ts), [`pages/api/admin/batch-upload.ts`](pages/api/admin/batch-upload.ts)) while **map truth is Mighty-driven in Mongo**—operational confusion and staff tooling can diverge from live pins. (2) **Cache invalidation is inconsistent**: Mighty paths use [`lib/mightyCacheInvalidate.ts`](lib/mightyCacheInvalidate.ts); legacy [`pages/api/updateMember.ts`](pages/api/updateMember.ts) only deletes `search:*`. (3) **Search loads all matches into memory** ([`pages/api/searchData.js`](pages/api/searchData.js)). (4) **No webhook idempotency** by event id in [`lib/mightyWebhook.ts`](lib/mightyWebhook.ts) (retries can re-apply patches / inflate `$addToSet`). (5) **Mixed JS/TS and duplicated Mongo/Redis patterns** (e.g. [`pages/api/member-records.js`](pages/api/member-records.js) opens its own `MongoClient`). (6) **Auth fragmentation:** NextAuth + BSN JWT (`bsn_session`) + admin JWT + dev cookies — each path must stay aligned with gating.

The roadmap below is **incremental**: **Phase 0** security/secrets, then extract adapters and domain services, tighten billing boundaries, add tests/CI, then isolate or retire Wix-era writers.

---

# Inferred project profile

| Dimension | Finding |
|-----------|---------|
| **Project / product** | **Black Sustainability** (`package.json`: `black-sustainability`). **Inferred** product: **Black Sustainability Network (BSN)** — copy on [`pages/join-map/index.tsx`](pages/join-map/index.tsx), domains like `maps.blacksustainability.org`. |
| **Business purpose** | Public **member directory / map**; **join-the-map** signup; **admin** (batch uploads, form versions, analytics); **sync** between Mighty, Airtable-style data, Wix-era reconciliation. |
| **Primary users** | Public visitors; **members** (paying vs non-paying affects self-exclusion on map — [`lib/mapViewerGating.js`](lib/mapViewerGating.js)); **admins** (`adminUsers` + JWT); **operators** (scripts, sync). |
| **Stack** | Next.js 14 **Pages Router**, React 18, **partial TS** (many `.js` API routes), Tailwind, MUI/Emotion, Formik, maps (Mapbox/Leaflet/Google libs). |
| **Datastores** | MongoDB **`members`** ([`lib/mongodb.js`](lib/mongodb.js)); NextAuth DB **`orgUserData`** on same cluster; **Redis** ([`lib/redis.js`](lib/redis.js)). **Mongoose** in `package.json` but **no imports found** — treat as **unused / legacy**. |
| **External systems** | Mighty (Admin API + webhooks), Airtable, Wix SDK + sync scripts, Cloudinary, GA Data API, email (Nodemailer/Mandrill), Photon geocoding. **No Stripe** in repo; billing logic centers on **Wix** reconciliation types and **Mighty** subscription fields on `mightyMembers`. |
| **Auth** | NextAuth email + MongoDB adapter; **BSN session** JWT cookie ([`lib/bsnSession.ts`](lib/bsnSession.ts), [`pages/api/auth/login.ts`](pages/api/auth/login.ts)); **admin** Bearer JWT; optional **test impersonation**. |
| **Source of truth (federated)** | **Map visibility:** `mightyMembers.subscription.isPaidActive` (Mighty/webhook-driven). **Airtable:** mirror + staff/Wix-era “Paying Member” fields — **must not** contradict Mongo for pins after Phase 4. |
| **Legacy / debt** | `airtableRecords`, Airtable field names in queries, dual session paths, orphan [`lib/getData.js`](lib/getData.js) (wrong default import from `mongodb` — **unused**), [`pages/index.tsx`](pages/index.tsx) uses `next/navigation` on Pages Router. |

---

# System shape (at a glance)

- **BFF-style Next.js:** UI + [`pages/api/*`](pages/api/) for data, cache, auth, webhooks, admin.
- **Read path:** Map/list APIs → Mongo `mightyMembers` + Redis cache; **gating** excludes non-paying viewers’ own listing (`getExcludeViewerMighty`).
- **Write path:** Mighty webhooks, member location APIs, batch upload, free signup, Airtable mirror calls, Wix–Airtable scripts.
- **Ops:** Cache warmup (`postbuild`), Wix fetch/sync, backfills under [`scripts/`](scripts/).

---

# Strengths (evidence-based)

- **Fail-closed gating** documented for unknown subscription state ([`lib/mapViewerGating.js`](lib/mapViewerGating.js)).
- **Webhook verification:** constant-time secret compare, multiple header shapes ([`pages/api/webhooks/mighty.ts`](pages/api/webhooks/mighty.ts)).
- **Reconciliation / reports:** [`lib/reconciliation/*`](lib/reconciliation/), Wix authority aggregation, optional email reports.
- **Tests:** Jest + Testing Library — webhook, gating, member APIs, free signup ([`__tests__/`](__tests__/).
- **Performance:** Redis cache key versioning ([`pages/api/getData.js`](pages/api/getData.js)), image remote patterns, webpack dev cache.

---

# Current Next.js Architecture Findings

**UI pages (representative):** [`pages/index.tsx`](pages/index.tsx) (map/directory), [`pages/signin.js`](pages/signin.js), [`pages/update-location.tsx`](pages/update-location.tsx), [`pages/join-map/index.tsx`](pages/join-map/index.tsx), [`pages/onboarding.tsx`](pages/onboarding.tsx), [`pages/admin/*`](pages/admin/), [`pages/form-builder/*`](pages/form-builder/), [`pages/schema-editor/*`](pages/schema-editor/), [`pages/dashboard.js`](pages/dashboard.js), [`pages/profile.js`](pages/profile.js), etc.

**API routes:** Full list under [`pages/api/`](pages/api/) (88 TS/JS files from inventory). Notable groups:
- **Public map/list:** [`getMarkers.js`](pages/api/getMarkers.js), [`getData.js`](pages/api/getData.js), [`filterData.js`](pages/api/filterData.js), [`searchData.js`](pages/api/searchData.js)
- **Auth:** [`auth/login.ts`](pages/api/auth/login.ts), [`auth/session.ts`](pages/api/auth/session.ts), [`auth/[...nextauth].js`](pages/api/auth/[...nextauth].js), [`auth/verify-code.ts`](pages/api/auth/verify-code.ts), verification send endpoints
- **Member self-service:** [`member/me.ts`](pages/api/member/me.ts), [`member/update-location.ts`](pages/api/member/update-location.ts), [`member/location-prompt-optout.ts`](pages/api/member/location-prompt-optout.ts)
- **Mighty:** [`webhooks/mighty.ts`](pages/api/webhooks/mighty.ts)
- **Legacy / staff / forms:** [`updateMember.ts`](pages/api/updateMember.ts), [`getRecordByEmail.ts`](pages/api/getRecordByEmail.ts), [`getSingleRecord.ts`](pages/api/getSingleRecord.ts), [`airtable/*`](pages/api/airtable/), [`admin/*`](pages/api/admin/), [`batch-upload.ts`](pages/api/batch-upload.ts)
- **External API:** [`member-records.js`](pages/api/member-records.js) (Bearer token + `users` collection)

**Business logic in routes vs libs:** Webhook route is relatively thin ([`pages/api/webhooks/mighty.ts`](pages/api/webhooks/mighty.ts)); **heavy logic lives in** [`lib/mightyWebhook.ts`](lib/mightyWebhook.ts). Map/list routes embed **query building, caching, aggregation** inline (JS files).

**Tight coupling to backend shapes:** [`lib/mightyMemberAirtableShape.js`](lib/mightyMemberAirtableShape.js) maps `mightyMembers` → **Airtable-shaped `fields`** for the UI; [`pages/index.tsx`](pages/index.tsx) and typings ([`typings`](typings/)) assume that legacy shape.

**Folder character:** [`lib/`](lib/) mixes **integrations** (Mighty, Airtable, Wix, Redis, Mongo), **domain-ish** helpers (`mapViewerGating`, `buildIndustryHouseQuery`), and **reconciliation** (`lib/reconciliation/*`). [`features/`](features/) is small (mostly free signup / upgrade). [`utils/`](utils/) is generic.

**Legacy / transitional:** `airtableRecords` Mongo collection ([`pages/api/updateMember.ts`](pages/api/updateMember.ts), [`getRecordByEmail.ts`](pages/api/getRecordByEmail.ts), [`getSingleRecord.ts`](pages/api/getSingleRecord.ts)); Wix stack ([`lib/wix/*`](lib/wix/), [`scripts/wix-*`](scripts/)); [`scripts/warm-redis-cache.js`](scripts/warm-redis-cache.js) still references **`airtableRecords`** for warming (stale vs production APIs on `mightyMembers`).

**JS vs TS:** Many API routes remain **`.js`** (`getData`, `getMarkers`, `filterData`, `searchData`, `clearCache`, `performance`, etc.) while newer member/auth/webhook paths are **`.ts`**. [`tsconfig.json`](tsconfig.json) has `strict: true` but **`allowJs: true`** and large JS surface.

**Hard to test / reason about:** Monolithic [`pages/index.tsx`](pages/index.tsx); duplicated cache/query logic across four endpoints; **dual session paths** (BSN JWT cookie + NextAuth + dev cookie) in [`lib/mapViewerGating.js`](lib/mapViewerGating.js); webhook upsert with geocode + subscription + location protection in one function ([`upsertMightyMemberFromWebhook`](lib/mightyWebhook.ts)).

---

# Security and configuration findings

| Issue | Evidence | Action |
|-------|----------|--------|
| Client-exposed API tokens | `NEXT_PUBLIC_AIRTABLE_*` patterns in features/scripts | Server-only env + API routes; rotate if bundled |
| Admin JWT fallback | [`pages/api/admin/verify.ts`](pages/api/admin/verify.ts) `JWT_SECRET \|\| 'fallback-secret'` | Fail closed; rotate tokens after fix |
| SMTP TLS | [`pages/api/auth/[...nextauth].js`](pages/api/auth/[...nextauth].js) `rejectUnauthorized: false` | Proper CA / dev-only exception |
| Impersonation | [`pages/api/test/impersonate.ts`](pages/api/test/impersonate.ts) | Prod off or strict allowlist + secret |
| Lint / strict mode | [`next.config.mjs`](next.config.mjs) | Re-enable ESLint in CI/build when feasible; `reactStrictMode` on when stable |
| Redis singleton | [`lib/redis.js`](lib/redis.js) connects at import | Document failure mode; optional lazy connect + degrade |

---

# MongoDB Architecture Findings

**Connection:** [`lib/mongodb.js`](lib/mongodb.js) — singleton `MongoClient`, database name **`members`**.

**Collections (from code):**
- **`mightyMembers`** — map/directory runtime ([`pages/api/getMarkers.js`](pages/api/getMarkers.js), [`lib/mightyWebhook.ts`](lib/mightyWebhook.ts), member APIs).
- **`airtableRecords`** — legacy Airtable-shaped mirror ([`pages/api/updateMember.ts`](pages/api/updateMember.ts), [`getSingleRecord.ts`](pages/api/getSingleRecord.ts)).
- **`verifications`** — email verification codes ([`pages/api/auth/verify-code.ts`](pages/api/auth/verify-code.ts)); TTL helper [`lib/setupMongoIndexes.js`](lib/setupMongoIndexes.js).
- **`users`** — API tokens for [`member-records.js`](pages/api/member-records.js).

**Read/write `mightyMembers`:** Reads in map/list routes and `member/me`; writes in [`lib/mightyWebhook.ts`](lib/mightyWebhook.ts), [`pages/api/member/update-location.ts`](pages/api/member/update-location.ts), [`location-prompt-optout.ts`](pages/api/member/location-prompt-optout.ts).

**Scattered access:** Yes — routes call `connectToDatabase` directly; [`member-records.js`](pages/api/member-records.js) uses **separate** `MongoClient` instances and **`client.db()` without explicit DB name** for `users` (depends on URI default), then `members` DB for data.

**Repository recommendation:** Introduce **`MemberRepository`**, **`MapQueryRepository`** (aggregation for markers), and **`VerificationRepository`** under e.g. `modules/members`, `modules/map`, wrapping [`lib/mongodb.js`](lib/mongodb.js). Centralize **projection** and **filters** used by getData/filter/search.

**Indexes (likely needed):**
- `mightyMembers`: **`email`** (unique sparse optional), **`mightyId`** (unique sparse optional), **`geo` 2dsphere** if bounding-box queries are added; compound for **industry + _id** pagination; **text index** if replacing regex search.
- **`subscription.isPaidActive`** optional for admin/reporting (gating currently loads doc by email regex — see risks).

**Query scale notes:** [`searchData.js`](pages/api/searchData.js) uses **regex** on multiple fields and **`find().toArray()` without limit** — will degrade with growth. [`getData.js`](pages/api/getData.js) / [`filterData.js`](pages/api/filterData.js) use `countDocuments` + `skip/limit` sorted by `_id` — acceptable for moderate data; **skip deep pagination** is eventually costly.

---

# Airtable Architecture Findings

**Staff / Mighty mirror table:** [`lib/airtableMightyMembers.ts`](lib/airtableMightyMembers.ts) uses **Mighty Members** table (env-driven), fields like `Mighty Member ID`, `Primary Email`, `City`, optional **`isPaidActive` / plan / status** mirroring from Mongo/Mighty.

**Operational / legacy “billing-shaped” fields:** **`Paying Member (keep current)`** appears in [`lib/reconciliation/airtableClient.ts`](lib/reconciliation/airtableClient.ts), [`lib/backfills/nonPayingBackfill.ts`](lib/backfills/nonPayingBackfill.ts), [`pages/api/admin/batch-upload.ts`](pages/api/admin/batch-upload.ts), Wix sync scripts — these **write paying flags from Wix or manual ops**, not from Mighty subscription reconciliation.

**Writes:** Webhook fire-and-forget ([`pages/api/webhooks/mighty.ts`](pages/api/webhooks/mighty.ts)); `update-location` fire-and-forget ([`pages/api/member/update-location.ts`](pages/api/member/update-location.ts)); **Wix apply script** ([`scripts/wix-airtable-sync-apply.ts`](scripts/wix-airtable-sync-apply.ts)); **admin batch** ([`pages/api/admin/batch-upload.ts`](pages/api/admin/batch-upload.ts)); **updateMember** path updates Airtable then Mongo `airtableRecords` ([`pages/api/updateMember.ts`](pages/api/updateMember.ts)).

**Failure modes:** Webhook and update-location **log and continue** on Airtable failure — appropriate for mirror; **no structured retry queue**.

**Adapter recommendation:** Consolidate into `lib/integrations/airtable/` with **`airtable.fields.ts`** (single source of field names), **`airtableMightyMembers.adapter.ts`** (mirror), and **`airtableStaffOperations.adapter.ts`** (batch / legacy base if still needed). Separate **“mirror writes”** from **“historical Wix reconciliation writes”** at module boundaries.

---

# Mighty Networks Architecture Findings

**Admin API:** [`lib/mightyAdmin.ts`](lib/mightyAdmin.ts) — `fetchMightyMemberById`, `mightyGetMemberByEmail`, `upsertMightyCustomFieldAnswer`, optional `updateMightyMemberLocation`.

**Webhooks:** [`pages/api/webhooks/mighty.ts`](pages/api/webhooks/mighty.ts) validates shared secret (constant-time), calls [`upsertMightyMemberFromWebhook`](lib/mightyWebhook.ts), then async Airtable + [`invalidateMightyMemberCaches`](lib/mightyCacheInvalidate.ts).

**Subscription normalization:** [`deriveSubscriptionPatch` / `deriveSubscriptionSummary`](lib/mightyWebhook.ts) set **`subscription.isPaidActive`** from **event type names** (e.g. purchased / renewed → true; canceled → false). **Gap:** events that do not flip flags leave paid status unchanged (may be correct if webhooks are complete; risk if Mighty sends state-only payloads).

**Custom field / location:** Map location field id from env; custom field events can override location text and trigger geocode ([`lib/mightyWebhook.ts`](lib/mightyWebhook.ts)). **Self-service protection:** compares `memberLocationUpdatedAt` vs event time and `source` ([`lib/mightyWebhook.ts`](lib/mightyWebhook.ts) lines 463–494).

**Webhook auth:** Multiple accepted headers; token from env ([`pages/api/webhooks/mighty.ts`](pages/api/webhooks/mighty.ts)).

**Idempotency:** **Not implemented** (no store of processed `event_id`); `$addToSet` on statuses can grow on duplicates.

**Layering recommendation:** Split into `mighty.client.ts`, `mightyWebhook.verify.ts` (headers), `mightyMember.mapper.ts`, `mightySubscription.mapper.ts`, and `mightyWebhook.service.ts` orchestrating DB + side effects — matching your target structure.

---

# Redis and Cache Findings

**Client:** [`lib/redis.js`](lib/redis.js) — `ioredis` singleton on `REDIS_URL`.

**Keys:** Documented in [`lib/mightyCacheInvalidate.ts`](lib/mightyCacheInvalidate.ts): `map-locations:v5:mightyMembers`, `getData:v8:...`, `filterData:v8:...`, `search:v3:...`.

**Cached endpoints:** [`getMarkers.js`](pages/api/getMarkers.js) (compressed), [`getData.js`](pages/api/getData.js), [`filterData.js`](pages/api/filterData.js), [`searchData.js`](pages/api/searchData.js). **TTL:** [`constants/CacheExpiry.js`](constants/CacheExpiry.js) (3600s).

**Invalidation:** [`invalidateMightyMemberCaches`](lib/mightyCacheInvalidate.ts) after webhook + member location routes. **Gap:** [`pages/api/updateMember.ts`](pages/api/updateMember.ts) deletes **`search:*` only** — **does not** clear map/getData/filter v8 keys, so **stale public data** if `airtableRecords` path still used for anything user-facing (today user-facing APIs use `mightyMembers`, so risk is mainly **consistency** if any client still hits legacy).

**Viewer-specific bypass:** When `getExcludeViewerMighty` returns exclusions, **cache is skipped** ([`pages/api/getMarkers.js`](pages/api/getMarkers.js)) — correct pattern.

**Centralized service:** Recommend `cacheKeys.ts` + `memberMapCache.service.ts` wrapping get/set/invalidate; **single function** called from all writers.

---

# Billing Source-of-Truth Risks

| Area | Evidence | Risk |
|------|----------|------|
| Map visibility | [`getExcludeViewerMighty`](lib/mapViewerGating.js) uses **`subscription.isPaidActive === true`** on `mightyMembers` | **Aligned with Mighty** if webhooks keep Mongo accurate |
| Legacy gating helper | [`getExcludeViewerId`](lib/mapViewerGating.js) uses **Airtable `Paying Member (keep current)`** on a collection | **Dead for current map routes** (grep shows no API usage); **remove or quarantine** to avoid future misuse |
| Wix → Airtable | [`scripts/wix-airtable-sync-apply.ts`](scripts/wix-airtable-sync-apply.ts) + [`aggregateAuthorizations`](lib/billing/aggregateAuthorization.ts) | **Writes Airtable paying**; **does not update `mightyMembers`** — staff view can contradict map |
| Admin batch | [`pages/api/admin/batch-upload.ts`](pages/api/admin/batch-upload.ts) sets **Paying Member** | Same divergence risk |
| Airtable login fallback | [`pages/api/auth/login.ts`](pages/api/auth/login.ts) allows sign-in via **Airtable** if Mighty email lookup fails | **Identity / UX fallback**, not map billing — document; consider **Mongo `mightyMembers`** fallback instead |

**Enforcement plan (conceptual):** Single module **`billingStatus.service.ts`** that defines **authorized map visibility = `mightyMembers.subscription.isPaidActive`**. Any Airtable “paying” field becomes **`staffMirrorPaying`** or labeled **non-authoritative** in code and docs. **Wix scripts** → **dry-run only** or **archived** (see Wix plan below).

---

# Map and Location Architecture Findings

**Markers query:** [`pages/api/getMarkers.js`](pages/api/getMarkers.js) — aggregation pipeline, requires lat/lng exists, projects Airtable-ish marker shape.

**Location storage:** `mightyMembers.location`, `latitude`, `longitude`, `geo`, `memberLocationUpdatedAt`, `source` ([`pages/api/member/update-location.ts`](pages/api/member/update-location.ts)).

**Geocoding:** Photon in webhook when coords missing ([`lib/geocodePhoton.ts`](lib/geocodePhoton.ts) via [`lib/mightyWebhook.ts`](lib/mightyWebhook.ts)); **Google Places** on [`pages/update-location.tsx`](pages/update-location.tsx) client, sends lat/lng to API.

**Update flow:** Mongo first, then best-effort Airtable + Mighty custom field ([`pages/api/member/update-location.ts`](pages/api/member/update-location.ts)).

**Stale webhook clobber:** Handled in [`lib/mightyWebhook.ts`](lib/mightyWebhook.ts) (`protectLocation`).

**Missing coordinates:** [`scripts/report-missing-coordinates.ts`](scripts/report-missing-coordinates.ts) reports Mongo + optional Airtable; aligns with [`reports/missing-coordinates-*.csv`](reports/) in user workspace.

**Location prompt:** [`pages/signin.js`](pages/signin.js) calls [`/api/member/me`](pages/api/member/me.ts) after login; redirects to [`update-location`](pages/update-location.tsx) if missing coords/location and not opted out. Opt-out: [`location-prompt-optout.ts`](pages/api/member/location-prompt-optout.ts).

---

# Frontend Architecture Findings

**Direct fetches:** [`pages/index.tsx`](pages/index.tsx) calls `/api/auth/session`, `/api/getMarkers`, `/api/getData`, `/api/searchData`, `/api/filterData` (see grep hits ~lines 327–718). **No central API client.**

**Response shapes:** Depends on **`toAirtableishDoc`** ([`lib/mightyMemberAirtableShape.js`](lib/mightyMemberAirtableShape.js)) — **intentional compatibility layer**.

**Auth UX:** [`pages/signin.js`](pages/signin.js) + [`pages/api/auth/login.ts`](pages/api/auth/login.ts) + [`lib/bsnSession.ts`](lib/bsnSession.ts).

**Structure recommendation:** Gradual extraction to `features/map`, `features/directory`, `shared/api`, `shared/types` — **start with typed fetch wrappers** and session hooks to shrink [`pages/index.tsx`](pages/index.tsx).

**Note:** [`pages/update-location.tsx`](pages/update-location.tsx) imports `next/navigation` inside `pages/` — works in modern Next but is **inconsistent** with Pages Router idioms (`next/router` elsewhere in [`pages/signin.js`](pages/signin.js)); track as tech debt.

---

# Testing Gaps

**Existing tests (sample):** [`__tests__/mightyWebhook.test.ts`](__tests__/mightyWebhook.test.ts), [`__tests__/mapViewerGating.test.ts`](__tests__/mapViewerGating.test.ts), [`__tests__/api/member-update-location.test.ts`](__tests__/api/member-update-location.test.ts), [`__tests__/api/member-location-optout.test.ts`](__tests__/api/member-location-optout.test.ts), [`__tests__/airtableMightyMembers.test.ts`](__tests__/airtableMightyMembers.test.ts), [`features/freeSignup/__tests__/*`](features/freeSignup/__tests__/).

**Config:** [`jest.config.js`](jest.config.js) + [`jest.setup.ts`](jest.setup.ts). **No `.github` workflows** found — **CI gap**.

**Missing high-value tests:** Webhook **idempotency**; **subscription edge cases** (unknown event types); **cache invalidation** contract; **search** performance guard (limit); **regression: Wix/Airtable cannot flip `mightyMembers.subscription.isPaidActive`** (only Mighty path); API route **integration tests** for `getMarkers`/`getData` gating + cache bypass.

---

# Scalability Risks

- **searchData:** unbounded result set; regex; potential **ReDoS** if `q` is unvalidated.
- **Redis `KEYS` / `SCAN`:** [`invalidateMightyMemberCaches`](lib/mightyCacheInvalidate.ts) uses SCAN — OK; [`updateMember`](pages/api/updateMember.ts) uses **`keys('search:*')`** — **blocking** on large keyspaces.
- **Webhook:** no idempotency; **Admin API fetch** on thin payloads adds latency and rate-limit exposure.
- **Observability:** console logging; no unified request/webhook correlation id.
- **Env validation:** scattered `process.env` reads; no startup schema (e.g. zod) for required production vars.

---

# Recommended Target Architecture

Align with your proposed structure:

- **`pages/`** — UI routes only (keep API under `pages/api` until App Router migration is a deliberate project).
- **`pages/api/`** — thin controllers: parse request → call `modules/*` → map errors to HTTP.
- **`modules/`** — `members`, `billing`, `location`, `map`, `sync`, `auth`, `cache`, `admin`.
- **`lib/integrations/`** — `mongodb`, `redis`, `mighty`, `airtable`, `email`, `geocode`.
- **`jobs/`** — move long-running scripts from [`scripts/`](scripts/) with clear **dry-run / apply** entrypoints.
- **`legacy/`** — Wix reconciliation, `airtableRecords` writers, verification JWT if superseded.

---

# Proposed Folder Structure

Use your template verbatim as the north star; **first increment** can be `lib/integrations/*` + `modules/*` **without** moving `pages` yet.

---

# Domain Boundary Plan

- **Billing:** Only `modules/billing` + Mighty webhook / optional future **Mighty poll reconciliation** may set `subscription.isPaidActive`.
- **Location:** Only `modules/location` writes location fields and encodes **clobber rules**.
- **Map:** `modules/map` owns marker aggregation and list DTOs (wrap Airtable-ish projection).
- **Sync:** `modules/sync` orchestrates webhook handling, Airtable mirror, cache invalidation.

---

# Source-of-Truth Enforcement Plan

1. **Document** in code (single README or `ARCHITECTURE.md` — only if team wants) that **`mightyMembers.subscription.isPaidActive` is authoritative** for map/directory visibility.
2. **Rename / annotate** Airtable fields in TypeScript as **`StaffMirror*`** types (optional) to prevent accidental imports in billing module.
3. **Add guard tests** ensuring admin/Wix code paths **never call** `collection.update` on `subscription.isPaidActive` (lint or unit test on allowed fields list for `airtableRecords` / admin batch).
4. **Mighty reconciliation job (future):** periodic fetch of subscription state for members with stale `updatedAt` — reduces reliance on perfect webhook coverage.

---

# Wix Decommission Plan

| Item | Action |
|------|--------|
| [`scripts/wix-airtable-sync-apply.ts`](scripts/wix-airtable-sync-apply.ts) | **Disable in prod**; rename to `legacy-wix-airtable-sync-apply.ts` or move under `legacy/wix/`; **default to dry-run**; require explicit `ALLOW_WIX_AIRTABLE_APPLY=1` |
| [`package.json`](package.json) scripts `wix-airtable-sync-*`, `wix-fetch` | Mark **deprecated** in script header; CI warning |
| [`lib/wix/*`](lib/wix/), [`lib/reconciliation/computeWixAirtableDiff.ts`](lib/reconciliation/computeWixAirtableDiff.ts) | **`legacy/`** folder; no imports from `modules/billing` |
| [`lib/billing/aggregateAuthorization.ts`](lib/billing/aggregateAuthorization.ts) | Keep only for **historical reports**; do not use for map |
| Tests | Add **“no Wix import in modules/members or modules/billing”** (eslint rule or simple grep test) |

---

# Testing Strategy

- **Unit:** mappers (Mighty payload → patch), `deriveSubscriptionPatch`, location protection predicate, `toAirtableishDoc`.
- **Integration:** API tests with mocked Mongo/Redis for `getMarkers` (cache hit, cache bypass, exclusion).
- **Contract:** Snapshot stable JSON for marker/list DTO for mobile/future clients.
- **CI:** GitHub Actions — `npm test`, `npm run lint`, `next build` on PR.

---

# Scalability Plan

- Add **Mongo indexes** for `mightyMembers` (email, mightyId, geo, industry pagination).
- Replace **regex search** with **text index** or Atlas Search; **cap** result size.
- Webhook: **idempotency** collection `{ eventId, processedAt }` with TTL.
- Replace `redis.keys` in [`updateMember.ts`](pages/api/updateMember.ts) with **SCAN** or **central invalidate**.
- Background queue (optional): Airtable mirror + heavy geocode off request path.

---

# Migration Roadmap

**Phase 0: Security and secrets** — **Goal:** no privileged tokens in client bundles; safe auth defaults. **Files:** [`features/freeSignup/airtableUtils.ts`](features/freeSignup/airtableUtils.ts), [`pages/api/admin/verify.ts`](pages/api/admin/verify.ts), [`pages/api/auth/[...nextauth].js`](pages/api/auth/[...nextauth].js), [`pages/api/test/impersonate.ts`](pages/api/test/impersonate.ts), env docs. **Risks:** missed call sites for `NEXT_PUBLIC_*`. **Tests:** grep for `NEXT_PUBLIC_AIRTABLE` in client-imported modules; admin verify rejects missing secret. **Acceptance:** Airtable reads only from server; JWT secret required in prod. **Complexity:** Medium.

**Phase 1: Architecture inventory and legacy fence** — **Goal:** visibility and guardrails. **Files:** [`package.json`](package.json), [`scripts/wix-*`](scripts/), [`lib/reconciliation/*`](lib/reconciliation/), [`pages/api/admin/batch-upload.ts`](pages/api/admin/batch-upload.ts). **Risks:** ops habits. **Tests:** grep/architectural test for disallowed imports. **Acceptance:** Wix apply gated; doc of SoT. **Complexity:** Low–Medium.

**Phase 2: Extract integration adapters** — **Goal:** Mongo/Redis/Mighty/Airtable clients isolated. **Files:** [`lib/mongodb.js`](lib/mongodb.js), [`lib/redis.js`](lib/redis.js), [`lib/mightyAdmin.ts`](lib/mightyAdmin.ts), [`lib/airtableMightyMembers.ts`](lib/airtableMightyMembers.ts). **Risks:** import cycles. **Tests:** adapter unit tests with mocked `fetch`. **Acceptance:** no direct `ioredis` outside redis adapter. **Complexity:** Medium.

**Phase 3: Domain services** — **Goal:** `modules/members`, `location`, `map`, `sync` own orchestration. **Files:** [`lib/mightyWebhook.ts`](lib/mightyWebhook.ts), [`pages/api/member/*.ts`](pages/api/member/), map routes. **Risks:** behavior drift during move — use existing tests. **Acceptance:** API handlers < ~50 lines. **Complexity:** High.

**Phase 4: Enforce Mighty billing SoT** — **Goal:** Airtable/Wix cannot drive pins. **Files:** admin batch, backfills, reconciliation. **Risks:** staff workflows. **Tests:** field-level update allowlist. **Acceptance:** single writer for `isPaidActive`. **Complexity:** Medium–High.

**Phase 5: Tests and CI** — **Goal:** regression safety. **Files:** [`__tests__/*`](__tests__), new `.github/workflows/ci.yml`. **Acceptance:** CI green on PRs. **Complexity:** Low–Medium.

**Phase 6: Observability** — **Goal:** webhook + sync tracing. **Files:** webhook handler, adapters. **Acceptance:** structured logs with `eventId`, `mightyId`. **Complexity:** Medium.

**Phase 7: Retire legacy** — **Goal:** remove or archive Wix + `airtableRecords` hot paths. **Files:** [`pages/api/updateMember.ts`](pages/api/updateMember.ts), [`warm-redis-cache.js`](scripts/warm-redis-cache.js). **Acceptance:** no production dependency on `airtableRecords` for public map. **Complexity:** High (needs stakeholder sign-off).

---

# Priority Refactor Tickets

0. **Secrets / client boundary** — audit `NEXT_PUBLIC_*`; move Airtable to server-only APIs; **rotate** credentials if exposure suspected.
1. **Admin JWT** — remove fallback secret; require `JWT_SECRET` in production.
2. **Webhook idempotency** (`event_id` dedup store + tests).
3. **Unify cache invalidation** — extend [`mightyCacheInvalidate`](lib/mightyCacheInvalidate.ts); fix [`updateMember`](pages/api/updateMember.ts) `KEYS` usage.
4. **Search pagination / limit** in [`searchData.js`](pages/api/searchData.js).
5. **Extract `MapDataService`** from getData/filter/search/getMarkers (DRY).
6. **member-records** — use [`connectToDatabase`](lib/mongodb.js); avoid double client.
7. **Index migration** script for `mightyMembers` (email, mightyId, geo).
8. **CI workflow** (test + lint + build).
9. **Quarantine Wix apply** behind env + `legacy/` folder.
10. **Remove or isolate** [`getExcludeViewerId`](lib/mapViewerGating.js).
11. **Delete or fix** orphan [`lib/getData.js`](lib/getData.js) (broken default import; unused).
12. **Typed API client** + slim down [`pages/index.tsx`](pages/index.tsx).
13. **Prune dead deps** — verify **Mongoose** and npm **`fs`** polyfill packages before removal.

---

# Files to Inspect First

- [`lib/mightyWebhook.ts`](lib/mightyWebhook.ts) — subscription + location + Mongo upsert.
- [`lib/mapViewerGating.js`](lib/mapViewerGating.js) — visibility rules.
- [`pages/api/getMarkers.js`](pages/api/getMarkers.js) + [`getData.js`](pages/api/getData.js) + [`searchData.js`](pages/api/searchData.js) — cache + query patterns.
- [`lib/mightyCacheInvalidate.ts`](lib/mightyCacheInvalidate.ts) — invalidation contract.
- [`pages/api/auth/login.ts`](pages/api/auth/login.ts) — Mighty + Airtable fallback.
- [`scripts/wix-airtable-sync-apply.ts`](scripts/wix-airtable-sync-apply.ts) — Airtable paying writes.
- [`pages/api/admin/batch-upload.ts`](pages/api/admin/batch-upload.ts) — staff writes to Paying Member.
- [`pages/api/updateMember.ts`](pages/api/updateMember.ts) — legacy Mongo + Redis.
- [`features/freeSignup/airtableUtils.ts`](features/freeSignup/airtableUtils.ts) — env / client exposure audit.
- [`pages/api/admin/verify.ts`](pages/api/admin/verify.ts) — JWT verification.

---

# Open Questions

1. **Mighty webhook completeness:** Are there member states (e.g. active subscription without a “renewed” event) where **`isPaidActive` would stay wrong** without a periodic Mighty Admin API reconciliation?
2. **Airtable “Paying Member” after Wix sunset:** Should staff batch uploads **stop accepting** paying flags entirely, or **rename** column to “Staff notes only”?
3. **App Router migration:** Is moving [`pages/index.tsx`](pages/index.tsx) to App Router on the roadmap (affects data fetching patterns)?
4. **`member-records` external API:** Who consumes it, and should it expose **`mightyMembers`** with the same DTO as internal clients?
5. **Credential rotation:** If `NEXT_PUBLIC_AIRTABLE_*` ever shipped to browsers, has the token been rotated and old keys revoked?

---

# Longer-term (optional)

- **Gradual App Router** adoption only if team benefits outweigh migration cost.
- **Extract sync/reconciliation** into a **worker** or scheduled jobs so the web tier stays thin.
- **Rate limiting** on `auth/login`, `send-verification`, and public write APIs.
- **Synthetic health checks** (add `/api/health` if missing) for uptime monitoring.
