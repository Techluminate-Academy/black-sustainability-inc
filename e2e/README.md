# Playwright E2E — member location flows

Tests use **`jerry@techluminateacademy.com`** by default and a fixture API to reset location state between scenarios.

For **paid vs unpaid map visibility** and the P1 / NP1 / NP2 accounts, see [documentation/MAP_QA_TEST_ACCOUNTS.md](../documentation/MAP_QA_TEST_ACCOUNTS.md). The map has **no separate passwords** — sign-in is email-only (Mighty membership).

## Prerequisites

1. Copy env from `.env.example` into `.env.local` (MongoDB, Mighty API, `SESSION_SECRET`, etc.).
2. Add E2E vars:

```bash
E2E_TEST_ENABLED=1
E2E_TEST_SECRET=your-local-secret
E2E_TEST_EMAIL=jerry@techluminateacademy.com
```

3. Install browsers once:

```bash
npx playwright install chromium
```

## Run

```bash
npm run test:e2e
```

Mobile member map UX (375 / 390 / 430px):

```bash
npm run test:e2e -- e2e/bsn-member-map-mobile.spec.ts
```

See [docs/BSN_MEMBER_MAP_MOBILE_PLAYWRIGHT_QA.md](../docs/BSN_MEMBER_MAP_MOBILE_PLAYWRIGHT_QA.md) for coverage and QA notes.

The runner starts **BSN on port 3100** (not 3000) so it does not collide with other local Next apps.

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3100 npm run test:e2e
npm run test:e2e:ui      # interactive UI
npm run test:e2e:headed  # visible browser
```

## Fixture API

`POST /api/test/member-location-fixture` (non-production or `E2E_TEST_ENABLED=1`):

| action | effect |
|--------|--------|
| `clearLocation` | Removes location + coords; clears opt-out |
| `setTestLocation` | Sets New York, NY test coords |
| `clearOptOut` / `setOptOut` | Toggles “Don’t ask again” |

Body: `{ "secret": "...", "email": "...", "action": "clearLocation" }`
