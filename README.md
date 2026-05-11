# Black Sustainability Inc.

[![CI](https://github.com/Techluminate-Academy/black-sustainability-inc/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Techluminate-Academy/black-sustainability-inc/actions/workflows/ci.yml)

Member directory and map for Black Sustainability Inc., powered by a Mighty Networks integration.

## Documentation

Design notes, architecture, and historical references are in **[documentation/](documentation/)**. Start with [documentation/ARCHITECTURE.md](documentation/ARCHITECTURE.md) for data flows and source-of-truth boundaries, and [documentation/FOLDER_LAYOUT.md](documentation/FOLDER_LAYOUT.md) for where feature slices (`features/`), shared UI (`components/`), and domain code (`lib/domain/`) live.

## Stack

- [Next.js](https://nextjs.org/) (Pages router) + TypeScript
- MongoDB (`mightyMembers` collection synced from Mighty webhooks)
- Redis (Upstash) for read-side caching of map/list/search APIs
- Mapbox GL for the directory map
- NextAuth + a custom BSN session cookie for Mighty SSO
- Jest + React Testing Library for tests

## Local development

```bash
npm install
cp .env.example .env  # then fill in values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm test` | Run the Jest suite |
| `npm run test:ci` | Jest in CI mode (used by GitHub Actions) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | Next.js / ESLint |

## Branching and deploys

This repo uses a strict three-branch workflow. **Read [`.cursor/rules/branching-strategy.mdc`](.cursor/rules/branching-strategy.mdc) before opening a PR.**

In short:

- `main` — production. Deployed by Render. Every change lands via a feature-branch PR with CI green.
- `main-copy` — disposable staging branch. Reset to `main` before each feature test.
- `feature/<slug>` — one per ticket. Cut off `main`, merged back via PR.

Render auto-deploys from `main` only **after CI checks pass** on the commit, so a broken build never reaches production.

## Test coverage

Coverage is concentrated on the Mighty integration surface (the read paths users hit most):

- `lib/mapFeatures.ts`, `lib/mightyMemberAirtableShape.js`, `lib/mightyCacheInvalidate.ts` — 100%
- `lib/mapViewerGating.js` — 96%
- `pages/api/searchData.js`, `getMarkers.js`, `getData.js`, `filterData.js` — 87–95%
- `lib/mightyWebhook.ts` — 91%

See `__tests__/` for the suites.
