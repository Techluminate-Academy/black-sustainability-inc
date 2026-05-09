# JavaScript Performance Analysis - Main Thread Blocking Issues

**Date:** Nov 24, 2025  
**Critical Issue:** Total Blocking Time (TBT) - 8,470ms mobile / 5,780ms desktop

---

## 🚨 Critical Blocking Operations Identified

### 1. **Excessive Console Logging (HIGHEST IMPACT)**

**Location:** `pages/index.tsx` and `components/common/Mapbox/MapboxMap.tsx`

**Problem:**
- **55+ console.log statements** in `pages/index.tsx`
- **8+ console.log statements** in `MapboxMap.tsx`
- Each `console.log` call:
  - Serializes objects to strings (expensive)
  - Formats output
  - Writes to DevTools (even if not open, overhead exists)
  - Blocks main thread during execution

**Impact:** Estimated 2-3 seconds of blocking time from console.logs alone

**Examples:**
```javascript
// pages/index.tsx - Lines 413-475
console.log("🚀 Fetch data useEffect triggered");
console.log("🚀 fetchData function called");
console.log(`🚀 About to fetch /api/getData?page=1&limit=${initialLimit}...`);
console.log("⏱️ TIMING: Fetch started at", fetchStartTime);
console.log("⏱️ TIMING: API response received in", responseTime, "ms");
console.log("⏱️ TIMING: Data parsed in", parseTime, "ms");
console.log("⏱️ TIMING: Data filtered in", filterTime, "ms - Count:", filteredNullData.length);
console.log("⏱️ TIMING: State set in", setStateTime, "ms");
console.log("🚀 Finally block - setting loading to false");
console.log("🚀 Calling fetchData()");
console.log("🚀 After calling fetchData()");

// MapboxMap.tsx - Lines 102, 117, 133, 135, 145, 317
console.log(`🔄 updateMarkers called with ${data.length} records`);
console.log(`📊 Updating source with ${data.length} records`);
console.log(`✅ Source updated with ${geoJsonData.features.length} features`);
console.log(`❌ No source found to update!`);
console.log(`🗺️ Map optimization: ${effectiveIsMobile ? 'Mobile' : 'Desktop'}...`);
console.log(`📍 Found ${unclusteredFeatures.length} unclustered points...`);
```

**Fix:** Remove ALL console.log statements or wrap in `if (process.env.NODE_ENV === 'development')` checks

---

### 2. **Synchronous Data Processing - offsetDuplicateCoordinates()**

**Location:** `components/common/Mapbox/MapboxMap.tsx:32-61`

**Problem:**
- Runs synchronously on main thread
- Processes entire dataset in one go
- Called during map initialization (line 157)
- No chunking or yielding to browser

**Code:**
```javascript
function offsetDuplicateCoordinates(dataArray: any[]) {
  const coordMap: Record<string, any[]> = {};
  // First loop - O(n) - blocks main thread
  for (const item of dataArray) {
    const lat = parseFloat(item?.location?.coordinates[1]);
    const lng = parseFloat(item?.location?.coordinates[0]);
    if (isNaN(lat) || isNaN(lng)) continue;
    const key = `${lat},${lng}`;
    if (!coordMap[key]) coordMap[key] = [];
    coordMap[key].push(item);
  }

  // Second loop - O(n) - blocks main thread
  for (const key in coordMap) {
    const group = coordMap[key];
    if (group.length <= 1) continue;
    // Nested loop - O(n*m) - worst case scenario
    for (let i = 0; i < group.length; i++) {
      // Math calculations for each item
      const angle = i * angleStep;
      const adjustedOffset = dynamicOffset * (1 + i * 0.1);
      const dLat = Math.sin(angle) * adjustedOffset;
      const dLng = Math.cos(angle) * adjustedOffset;
      // ... more operations
    }
  }
}
```

**Impact:** 
- For 100 records: ~50-100ms blocking
- For 1000 records: ~500-1000ms blocking
- Called during critical render path

**Fix:** Use `requestIdleCallback` or chunk processing with `requestAnimationFrame`

---

### 3. **Synchronous Array Operations in Critical Path**

**Location:** Multiple locations

**Problem:**
- `.filter()`, `.map()`, `.forEach()` operations run synchronously
- No yielding to browser between operations
- Multiple operations chained together

**Examples:**

```javascript
// pages/index.tsx:440 - Synchronous filter
const filteredNullData = result.data.filter((item: any) => item !== null);

// pages/index.tsx:531 - Another synchronous filter
const newRecords = result.data.filter((item: any) => item !== null);

// MapboxMap.tsx:120 - Synchronous map operation
features: data.map((item: any) => ({
  type: "Feature",
  properties: { id: item.id },
  geometry: {
    type: "Point",
    coordinates: [
      parseFloat(item?.location?.coordinates[0]) || mapCenter[0],
      parseFloat(item?.location?.coordinates[1]) || mapCenter[1],
    ],
  },
}))

// MapboxMap.tsx:180 - Another synchronous map
features: dataForClustering.map((item: any) => ({
  // ... same structure
}))

// MapboxMap.tsx:277 - Synchronous map in template string
${leaves.map((leaf: any) => {
  const record = dataForClustering.find((d: any) => d.id === leaf.properties.id);
  // ... string concatenation
}).join('')}
```

**Impact:**
- Each `.map()` on 100 items: ~10-20ms
- Each `.filter()` on 100 items: ~5-10ms
- Chained operations compound blocking time

**Fix:** Break into chunks, use `requestIdleCallback` for non-critical operations

---

### 4. **Multiple Synchronous State Updates**

**Location:** `pages/index.tsx:444-455`

**Problem:**
- 8 state updates in rapid succession
- Each triggers React reconciliation
- No batching optimization
- Blocks render pipeline

**Code:**
```javascript
// All these run synchronously, one after another
setFullTotalCount(result.totalCount);
setTotalCount(result.totalCount);
setOriginalData(filteredNullData);
setFilteredData(filteredNullData);
setChunkSizes([chunkSize, chunkSize, totalRecords - 2 * chunkSize]);
setLoadedData(filteredNullData.slice(0, chunkSize));
setCurrentIndex(chunkSize);
setChunkIndex(1);
setSidebarPage(1);
```

**Impact:**
- Each `setState` triggers re-render calculation
- React 18 auto-batching helps, but still overhead
- Estimated 100-200ms of blocking

**Fix:** Use `startTransition` or batch updates with `requestAnimationFrame`

---

### 5. **Map Initialization Blocking**

**Location:** `components/common/Mapbox/MapboxMap.tsx:152-416`

**Problem:**
- Map initialization runs synchronously
- `offsetDuplicateCoordinates()` called before map init
- GeoJSON data creation blocks main thread
- Layer creation is synchronous
- Event listener setup is synchronous

**Code Flow:**
```javascript
const initMap = async () => {
  setLoading(true);
  fetchedLocations = filteredData;
  offsetDuplicateCoordinates(fetchedLocations); // BLOCKS HERE
  
  mapRef.current = new mapboxgl.Map({...}); // BLOCKS HERE
  
  mapRef.current.on("load", () => {
    // GeoJSON creation - BLOCKS
    const geoJsonData = {
      features: dataForClustering.map((item: any) => ({...}))
    };
    
    // Source/layer creation - BLOCKS
    mapRef.current.addSource("users-cluster", {...});
    mapRef.current.addLayer({...});
    mapRef.current.addLayer({...});
  });
};
```

**Impact:**
- Map initialization: ~500-1000ms
- GeoJSON creation: ~100-300ms
- Layer setup: ~50-100ms
- Total: ~650-1400ms blocking

**Fix:** Defer non-critical operations, use `requestIdleCallback` for data processing

---

### 6. **Marker Cleanup in forEach Loop**

**Location:** `components/common/Mapbox/MapboxMap.tsx:106-112, 320-324`

**Problem:**
- Synchronous `forEach` loops
- DOM manipulation in loop
- React root unmounting blocks

**Code:**
```javascript
// Synchronous cleanup
markersRef.current.forEach(({ marker, popupRoot }) => {
  const popup = marker.getPopup();
  if (popup && popup.isOpen()) popup.remove();
  marker.remove(); // DOM manipulation
  if (popupRoot) popupRoot.unmount(); // React cleanup
});
markersRef.current = [];
```

**Impact:**
- Each marker removal: ~5-10ms
- 100 markers: ~500-1000ms blocking
- Called during data updates

**Fix:** Batch cleanup, use `requestAnimationFrame` for DOM operations

---

### 7. **String Template Operations**

**Location:** `components/common/Mapbox/MapboxMap.tsx:273-301`

**Problem:**
- Large template string with nested `.map()` operations
- String concatenation in loop
- `find()` operations inside map (O(n²) complexity)

**Code:**
```javascript
popupContainer.innerHTML = `
  <div>
    ${leaves.map((leaf: any) => {
      const record = dataForClustering.find((d: any) => d.id === leaf.properties.id); // O(n) inside O(n)
      // ... string building
    }).join('')}
  </div>
`;
```

**Impact:**
- O(n²) complexity for cluster popup
- String concatenation is expensive
- For 50 leaves: ~100-200ms blocking

**Fix:** Pre-build lookup map, use DocumentFragment, defer rendering

---

### 8. **Synchronous Data Fetching Callbacks**

**Location:** `pages/index.tsx:428-470`

**Problem:**
- Promise chain with synchronous operations
- No yielding between operations
- All processing happens in one task

**Code:**
```javascript
fetch(`/api/getData?page=1&limit=${initialLimit}`)
  .then((response) => {
    // Synchronous JSON parsing
    return response.json();
  })
  .then(async (result) => {
    // Synchronous filtering
    const filteredNullData = result.data.filter((item: any) => item !== null);
    
    // 8 synchronous state updates
    setFullTotalCount(result.totalCount);
    setTotalCount(result.totalCount);
    // ... more state updates
  })
```

**Impact:**
- JSON parsing: ~50-100ms
- Filtering: ~20-50ms
- State updates: ~100-200ms
- Total: ~170-350ms in one task

**Fix:** Break into smaller tasks, use `requestIdleCallback` for non-critical updates

---

## 📊 Performance Impact Summary

| Operation | Estimated Blocking Time | Frequency | Total Impact |
|-----------|------------------------|-----------|--------------|
| Console.logs | 2-3s | Once per load | **2-3s** |
| offsetDuplicateCoordinates | 50-1000ms | On data change | **50-1000ms** |
| Array operations (.map/.filter) | 50-200ms | Multiple times | **200-500ms** |
| State updates (batched) | 100-200ms | On data load | **100-200ms** |
| Map initialization | 500-1000ms | Once | **500-1000ms** |
| Marker cleanup | 50-500ms | On data update | **50-500ms** |
| Template string building | 100-200ms | On cluster click | **100-200ms** |
| **TOTAL ESTIMATED** | | | **3,000-6,400ms** |

**Actual TBT:** 8,470ms (mobile) / 5,780ms (desktop)  
**Estimated overhead:** Additional blocking from React reconciliation, DOM updates, etc.

---

## 🎯 Optimization Strategy

### Phase 1: Quick Wins (Immediate 2-3s improvement)
1. ✅ Remove ALL console.log statements
2. ✅ Wrap remaining logs in `if (process.env.NODE_ENV === 'development')`

### Phase 2: Break Up Long Tasks (1-2s improvement)
1. ✅ Use `requestIdleCallback` for `offsetDuplicateCoordinates`
2. ✅ Chunk array operations (process 50 items at a time)
3. ✅ Defer non-critical state updates with `startTransition`
4. ✅ Use `requestAnimationFrame` for DOM operations

### Phase 3: Optimize Data Processing (500ms-1s improvement)
1. ✅ Pre-compute lookup maps (avoid O(n²) operations)
2. ✅ Use DocumentFragment for DOM creation
3. ✅ Batch marker cleanup operations
4. ✅ Memoize expensive calculations

### Phase 4: Advanced Optimizations (500ms improvement)
1. ✅ Web Workers for heavy computations
2. ✅ Virtual scrolling for large lists
3. ✅ Code splitting for map component
4. ✅ Lazy load map until needed

---

## 🔧 Specific Code Fixes Needed

### Fix 1: Remove Console Logs
```javascript
// BEFORE
console.log("🚀 Fetch data useEffect triggered");

// AFTER
if (process.env.NODE_ENV === 'development') {
  console.log("🚀 Fetch data useEffect triggered");
}
```

### Fix 2: Chunk offsetDuplicateCoordinates
```javascript
// BEFORE
offsetDuplicateCoordinates(fetchedLocations);

// AFTER
const processInChunks = (data: any[], chunkSize = 50) => {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    let index = 0;
    const processChunk = (deadline: IdleDeadline) => {
      while (deadline.timeRemaining() > 0 && index < data.length) {
        const chunk = data.slice(index, index + chunkSize);
        offsetDuplicateCoordinates(chunk);
        index += chunkSize;
      }
      if (index < data.length) {
        requestIdleCallback(processChunk);
      }
    };
    requestIdleCallback(processChunk, { timeout: 1000 });
  } else {
    offsetDuplicateCoordinates(data);
  }
};
```

### Fix 3: Batch State Updates
```javascript
// BEFORE
setFullTotalCount(result.totalCount);
setTotalCount(result.totalCount);
setOriginalData(filteredNullData);
// ... more

// AFTER
import { startTransition } from 'react';

startTransition(() => {
  setFullTotalCount(result.totalCount);
  setTotalCount(result.totalCount);
  setOriginalData(filteredNullData);
  // ... more
});
```

### Fix 4: Defer Map Operations
```javascript
// BEFORE
const geoJsonData = {
  features: dataForClustering.map((item: any) => ({...}))
};

// AFTER
requestIdleCallback(() => {
  const geoJsonData = {
    features: dataForClustering.map((item: any) => ({...}))
  };
  if (mapRef.current) {
    const source = mapRef.current.getSource("users-cluster");
    if (source) source.setData(geoJsonData);
  }
}, { timeout: 500 });
```

---

## 📈 Expected Results

After implementing all fixes:
- **TBT Mobile:** 8,470ms → ~1,500-2,000ms (75-80% reduction)
- **TBT Desktop:** 5,780ms → ~1,000-1,500ms (75-80% reduction)
- **Performance Score Mobile:** 29 → ~55-60
- **Performance Score Desktop:** 51 → ~75-80

