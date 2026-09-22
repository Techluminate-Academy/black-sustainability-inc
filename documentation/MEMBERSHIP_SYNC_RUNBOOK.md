# Scheduled membership sync: safety and recovery

Command: `node utils/sync-airtable.js`. This change is based on the Render-live
`main-copy` revision `752b458`; it retains the discovery-first Mighty → Airtable
step, subscription mapping, and strict post-sync cache invalidation.

## Configuration before rollout

Set these on the cron service, not only the web service:

- `AIRTABLE_PAT` (or `AIRTABLE_ACCESS_TOKEN`): server-only Airtable credential.
- `AIRTABLE_MIGHTY_SYNC_BASE_ID` (also accepts `AIRTABLE_BASE_ID`; the legacy public
  base ID fallback remains because base IDs are not credentials).
- `AIRTABLE_MIGHTY_SYNC_TABLE_ID` or `AIRTABLE_MIGHTY_SYNC_TABLE_NAME` (default
  `Mighty Members`). Set this explicitly when migrating from the legacy table variable.
- `MONGODB_URI`: server-only connection to the same Mongo deployment as the app.
  The database remains `members`, collection `mightyMembers`.
- `REDIS_URL`: the live website's Redis connection, including the same logical DB.
- Existing Mighty credentials and pacing settings remain applicable.

Public-prefixed **credential** fallbacks are no longer accepted by this importer.
All required downstream configuration is checked before running the Mighty step.
Never print credentials to investigate a job failure.

Mongo must support transactions (replica set/Atlas or sharded cluster). There is
no nontransactional fallback: a standalone Mongo server fails safely. The driver
uses snapshot reads and majority writes. A later batch failure aborts all Mongo
member writes in that transaction. Airtable updates and Redis are outside that
transaction; this is not a distributed transaction.

The importer builds partial unique indexes on Mighty ID, linked Airtable record
ID, and case-insensitive nonempty email before member writes. Existing duplicate
identities or incompatible index definitions fail the run; review these in Mongo
before rollout and resolve them deliberately. The job never deletes members or
automatically merges duplicates. Names/casing/whitespace are also checked by the
identity resolver. Test the rollout against a staging database copy first.

## Identity and field ownership

Resolve by existing Airtable link, Mighty ID, then unique compatible normalized
email. All provided identifiers must agree; conflicting or ambiguous matches
abort the Mongo run. Email-only members can acquire Mighty IDs without a second
insert. Distinct source rows cannot update the same Mongo member.

Missing, null, and blank profile/identity fields preserve existing values.
Missing coordinate pairs are preserved; numeric zero is valid. Invalid nonblank
IDs/coordinates reject the source before any Mongo writes. Extended bio retains
precedence over shorter bio fields. This sync does not infer member deletion or
intentional profile clearing from missing fields. Perform intentional clearing
through the owning profile workflow.

Subscription fields are updated only when explicitly supplied by Airtable;
explicit `false` and empty plan arrays are accepted. An omitted checkbox must not
be interpreted as an explicit downgrade. Other subscription metadata is preserved.
`airtable.recordId` is updated with a dotted path; other Airtable metadata and an
existing member's `source` are preserved. New documents get the Airtable source.
Identical members are not rewritten; a `lastSyncDate`-only change does not bump
profile `updatedAt`.

## Fetching, writes, and logs

Fetch all pages and validate all source rows before Mongo writes. Requests time
out at 30 seconds, with at most four attempts per page for transient network,
429, and 5xx failures. Authentication/validation errors do not retry. Rate-limited
requests wait at least 30 seconds and honor Retry-After up to 120 seconds; longer
server delays fail for a later scheduled retry. Malformed pages and repeating
pagination cursors fail rather than publishing an incomplete source.

Mongo writes use batches of 250 in one transaction. Source records and projected
member metadata are still held in memory for full-run identity validation. Large
rosters may require staging/streaming in future; this is intentionally not an
unbounded series of independently committed batches.

`sync_airtable_mongo_step_done` reports fetched, matched, modified, inserted, and
unchanged counts only after commit. Empty Airtable data is a valid no-op and never
causes deletions. Database errors reach the job entry point, which exits nonzero
without dumping driver request data. Cleanup failures do not mask the root error.
`SYNC_REQUIRE_COMPLETE=0` is an explicit override for upstream partial failures;
completion is labelled `degraded` in that case. `--skip-cache` is also reported.

## Redis failure recovery

Missing `REDIS_URL` fails before upstream work. A connection failure occurring
after the Mongo commit still fails the job; Mongo's committed changes remain.
Cache invalidation has a two-minute subprocess timeout. After fixing Redis,
run only the cache step in the deployed environment when possible:

```sh
npx tsx scripts/invalidate-mighty-member-caches.ts
```

Check its exit status, then verify map/directory results. A successful cron does
not establish that every record has a valid location or photo. Avoid `--skip-cache`
as a production workaround for missing credentials.

## Tests

```sh
npm test -- --runInBand __tests__/sync-airtable-cron.test.js __tests__/lib/airtableMongoSync.test.js
```

Unit tests mock external APIs/Mongo and cover transaction usage, late-batch
failure, identity collisions, retries, field preservation, and orchestration.
Real Mongo transaction/index compatibility and Render behavior require staging
validation; the tests do not connect to production services.
