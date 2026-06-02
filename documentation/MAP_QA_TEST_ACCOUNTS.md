# Map QA — test accounts and sign-in

The BSN Member Map does **not** use separate map passwords. Testers sign in with the **same email as their Mighty Networks account** (one-step email verification against Mighty + our directory).

There are **no “User A passwords”** stored in this app. If testing instructions mention User A / User B, use the emails below and sign in at `/signin`.

## Standard visibility test trio

These labels match the internal map visibility acceptance script (`scripts/select-map-visibility-test-members.js`).

| Label | Role | Email | What to expect on the map |
|-------|------|-------|---------------------------|
| **P1** (paid) | Paying / `isPaidActive` | `projectinfo216@gmail.com` | Sees **own pin** when logged in |
| **NP1** (unpaid) | Non-paying | `utleyp@gmail.com` | Does **not** see own pin; sees others |
| **NP2** (unpaid) | Non-paying | `akofaoyin@gmail.com` | Same as NP1 |

Re-run the selector against current Mongo if you need fresh emails:

```bash
node -r dotenv/config scripts/select-map-visibility-test-members.js
```

## Staff / dev account

| Label | Email | Notes |
|-------|-------|--------|
| Jerry (dev) | `jerry@techluminateacademy.com` | E2E fixtures + local testing; may or may not be paid on the map |

## Optional: impersonation (approved QA testers only)

For QA without changing real subscription data:

1. Sign in with your **Mighty email** (must be an approved QA tester — see table below).
2. Use the **Tester impersonation** toolbar (bottom-right) to view the map as **paid** or **unpaid**.
3. Or `POST /api/test/impersonate` with `BSN_IMPERSONATE_SECRET` (scripts).

Built-in tester emails (`lib/qaTesterAllowlist.ts`):

| Tester | Mighty / sign-in email |
|--------|-------------------------|
| Jerry (dev) | `jerry@techluminateacademy.com` |
| Kelyce | `kelyce@blacksustainability.org` |
| Alexis (Vidot) | `alexis.vidot@gmail.com`, `research@blacksustainability.org` |

Additional emails: set `BSN_IMPERSONATE_ALLOWLIST` (merged with the built-in list). See `.env.example` (`BSN_IMPERSONATE_*`).

## Profile photos

- **Map markers** use `avatarUrl` from Mongo (synced from Mighty webhooks).
- **Header profile circle** loads the same Mighty photo via `/api/auth/session` (Mongo first, then Mighty Admin API if missing).

Photos come from the member’s **Mighty Networks profile**; upload or change the photo in Mighty, not on the map.

## Location testing (Playwright / fixtures)

See `e2e/README.md`. Fixture API can reset location for allowlisted emails (default: `jerry@techluminateacademy.com`).

## Manual sign-in steps

1. Open `/signin`.
2. Enter the test member’s **Mighty email**.
3. Click **Continue to map**.
4. If location is missing → forced `/update-location` (unless they chose “Don’t ask again”).
5. Use **My location** or the profile photo in the nav to update location later.
