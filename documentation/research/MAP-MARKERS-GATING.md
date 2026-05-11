# Map markers gating: hide self when viewerPaying=false

## Rule

- **Unauthenticated visitors:** See all markers (no change from before).
- **Authenticated paying member:** See all markers (including their own).
- **Authenticated non-paying member:** See all markers **except their own** (their marker is hidden from them only; others still see it).

## Implementation

- **Endpoint:** `pages/api/getMarkers.js`
- **Viewer identification:** Server-side only. Viewer is identified by **email**:
  1. **NextAuth session:** If `getServerSession(req, null, authOptions)` returns a session, use `session.user.email`.
  2. **bsn_user_data cookie:** If no NextAuth session, parse the `bsn_user_data` cookie and use `loginEmail` or `email` (same cookie used by the map page for “logged in” state).
- **Match key to airtableRecords:** Viewer is matched to a MongoDB document in `airtableRecords` by **email**, case-insensitive: `fields["EMAIL ADDRESS"]` compared to the viewer email (regex `^…$` with `i` flag). The **canonical identifier** used to exclude the viewer’s marker is the **Airtable record id** stored on that document (`id` or `airtableId`; the pipeline excludes by `id`).
- **Paying status:** Read from the viewer’s record: `fields["Paying Member (keep current)"]`. Treated as **true** only if the value is `true`, `1`, or the string `"true"` / `"True"`; otherwise **false** (including `null`/`undefined`/`"false"`).
- **Exclusion:** If the viewer is authenticated (email resolved), has a record in `airtableRecords`, and `viewerPaying === false`, the aggregation adds a `$match: { id: { $ne: viewerRecordId } }` stage so that **only that viewer’s record** is excluded from the markers result. No other records are filtered by paying status.
- **Caching:** The global Redis cache (`map-locations1`) is used only when the response is “all markers” (unauthenticated, or viewer not found, or viewer is paying). When the viewer is non-paying and we exclude their record, we do **not** read from or write to the cache (viewer-specific response).

## Debug logging

Set `MAP_MARKERS_GATING_DEBUG=true` (or `1`) in the environment to enable minimal server-side logs when gating runs:

- Logged: viewer record id (first 12 chars), `paying`, and whether self is excluded.
- Not logged: full record fields or email.

Example:

```
[getMarkers gating] viewerId=recXXXXXXXX… paying=false excludeSelf=true
```

## Acceptance (manual)

1. **Unauthenticated:** Can see a known non-paying member’s marker.
2. **Authenticated paying=true:** Can see their own marker.
3. **Authenticated paying=false:** Cannot see their own marker; can see other markers (including other non-paying members).
