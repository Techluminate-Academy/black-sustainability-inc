# Map Visibility Decision Trace (Frontend)

**Scope:** How map access / map visibility is decided on the frontend. Findings only; no implementation changes.

---

## 1. Map entry component(s)

| Entry point | File path | Notes |
|-------------|-----------|--------|
| **Public directory map** | `pages/index.tsx` | Single map on the home page. Map is rendered via dynamic import of `MapboxMap`. |
| Map component | `components/common/Mapbox/MapboxMap.tsx` | Receives `filteredData` and renders Mapbox GL markers/clusters from it. |

**Other map-related pages (not a second “map view”):**

- `pages/join-map/index.tsx` – signup/form page; no map.
- `components/common/LeafletMap/index.tsx` – references `/api/getMarkers` with bbox params; not used by the main index map (index uses MapboxMap + getMarkers without bbox).

There is **no separate admin map**; only the public directory map on the home page.

---

## 2. Data fetch: where map data comes from

### 2.1 Default map data (no search, no industry filter)

- **Hook/usage:** `pages/index.tsx` – `useEffect` calls `fetch("api/getMarkers")`, then `setMapLocations(json.data)`.
- **Endpoint:** `GET /api/getMarkers` (implemented in `pages/api/getMarkers.js`).
- **Backend behavior:**
  - Reads from MongoDB collection `airtableRecords`.
  - Aggregation: `$project` builds `location.coordinates` from `fields["LONGITUDE (NEW)"]` and `fields["LATITUDE (NEW)"]` (converted to double; null on error).
  - **Only filter applied:** `$match` so that both coordinates are non-null:
    - `'location.coordinates.0': { $ne: null }`
    - `'location.coordinates.1': { $ne: null }`
  - No filter on “Include me on Global BSN Map”, “Paying Member (keep current)”, membership status, or any other visibility field.

So **default map visibility** is: **all records in MongoDB that have valid LATITUDE (NEW) and LONGITUDE (NEW)**.

### 2.2 Sidebar / search / industry filter path

- **Hook/usage:** `pages/index.tsx` – `useEffect` calls `fetch(\`/api/getData?page=1&limit=...\`)`, then sets `filteredData` from `result.data` (after a null filter only).
- **Endpoints:**
  - `GET /api/getData` – `pages/api/getData.js`
  - `GET /api/filterData` – `pages/api/filterData.js` (same query shape: optional `industryHouse`, pagination)

Both APIs:

- Query MongoDB `airtableRecords` with optional filter `fields["PRIMARY INDUSTRY HOUSE"] === industryHouse`.
- Return raw documents (e.g. `id`, `createdTime`, `fields`). They **do not** add `location` or `location.coordinates`; that shape exists only in getMarkers.

So when the user has a search query or industry selected, the map is passed `filteredData` from getData/filterData. Those documents have `fields` but **no top-level `location`**. MapboxMap expects `item.location.coordinates`; when missing it falls back to `mapCenter`. So in that mode, visibility is effectively “all returned list records,” but markers without `location` are drawn at the same center point (data shape mismatch).

### 2.3 Data flow summary

- **Map prop:**  
  `filteredData = (searchQuery === "" && selectedIndustry === "") ? mapLocations : filteredData`  
  (see `pages/index.tsx` ~815–819, memo `mapData`).
- **Default:** Map uses `mapLocations` from **getMarkers** (has `location.coordinates`; server filters only by non-null lat/lng).
- **With search/industry:** Map uses `filteredData` from **getData/filterData** (no `location` on items; client does not add it).

---

## 3. Client-side filter logic

### 3.1 In `pages/index.tsx`

- **Exact condition used for the list:**  
  `dataArray.filter((item: any) => item !== null)` (inside `filterDataInChunks`).  
  No other client-side filter (no paying, membership, “Include me on map”, or visibility flag).

### 3.2 In `components/common/Mapbox/MapboxMap.tsx`

- **No** filtering by paying, membership, “Include me on Global BSN Map”, or similar.
- Coordinates:
  - In offset-duplicate logic: `if (isNaN(lat) || isNaN(lng)) continue` – skips only invalid numeric coordinates when building the duplicate-offset map; does not remove the item from the dataset passed to the map.
  - For GeoJSON/features: `parseFloat(item?.location?.coordinates?.[0]) || mapCenter[0]` (and same for index 1). So if `location.coordinates` is missing or invalid, the marker is still shown at `mapCenter`, not omitted.

So the **exact client-side conditions** that affect what gets a marker are:

- **Default (mapLocations):** None beyond what the server sent; every item in `mapLocations` is used (server already restricted to non-null lat/lng).
- **Search/filter (filteredData):** Again no extra visibility filter; items without `location` still get a marker at `mapCenter`.

There is **no** client-side expression like “if paying then show” or “if Include me on map then show” or “if status !== inactive then show” in the map or index code.

---

## 4. Assumptions (inferred behavior)

1. **Default map:** “If a record has non-null LATITUDE (NEW) and LONGITUDE (NEW) in MongoDB, it is shown on the map.” No check for “Include me on Global BSN Map” or paying/membership.
2. **MongoDB contents:** Map visibility is whatever is in `airtableRecords`. That collection is populated by `utils/sync-airtable.js`, which upserts **all** Airtable records (no server-side filter by view or field there). So visibility is not restricted by Airtable view or “Include me on map” at sync time either.
3. **Search/industry mode:** The map receives list data (getData/filterData) that has no `location`; markers fall back to `mapCenter`. So effectively “all list results are considered for the map,” but only in a degenerate way (same coordinates).
4. **Auth:** `isAuthenticated` on the map page is used for UI (e.g. popup, blur of names) only; it does **not** gate which records appear on the map. The map page itself is public (no route guard).

---

## 5. Route guards / auth gates

- **Map page (`pages/index.tsx`):** No `getServerSideProps` or middleware that blocks access. Page is **public**.
- **isAuthenticated:** Used only to show a popup and to blur names in the map UI (`nameStyle = !authStatus ? 'filter: blur(4px); user-select: none;'` in MapboxMap). It does **not** change which records are fetched or which markers are shown.

---

## 6. Summary table

| Layer | File(s) | Visibility condition (exact) |
|-------|--------|-----------------------------|
| **Map markers (default)** | `pages/api/getMarkers.js` | `'location.coordinates.0': { $ne: null }, 'location.coordinates.1': { $ne: null }` (after building location from LATITUDE/LONGITUDE). No paying, no “Include me on map”. |
| **List/sidebar** | `pages/api/getData.js`, `pages/api/filterData.js` | Optional `fields["PRIMARY INDUSTRY HOUSE"] === industryHouse`; no paying or map visibility filter. |
| **Client (index)** | `pages/index.tsx` | `item !== null` only. |
| **Client (MapboxMap)** | `components/common/Mapbox/MapboxMap.tsx` | No filter by paying/visible; uses `item?.location?.coordinates` or `mapCenter`. |

**Conclusion:** Map visibility on the frontend (and in the map API) is determined **only by the presence of valid LATITUDE (NEW) and LONGITUDE (NEW)** in the MongoDB document. The fields “Include me on Global BSN Map” and “Paying Member (keep current)” are **not** used anywhere in the map data path or in client-side map visibility logic.
