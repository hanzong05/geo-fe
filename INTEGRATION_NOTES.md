# Philippines Maps Integration Notes

## Overview
Successfully integrated the Philippines JSON maps from [faeldon/philippines-json-maps](https://github.com/faeldon/philippines-json-maps) into the Next.js application with proper SSR handling.

## Changes Made

### 1. Map Data Files
Added to `public/maps/`:
- **tarlac-province.json** - Tarlac Province boundary (PSGC: 306900000)
- **tarlac-municities.json** - All municipalities/cities within Tarlac
- **region-3-provinces.json** - All provinces in Region 3 (Central Luzon)

### 2. Map Component Updates (`app/components/map.tsx`)

#### SSR Issue Fixes
- **Problem**: Leaflet tries to access `window` object during server-side rendering
- **Solution**: Implemented dynamic imports with `ssr: false` for all react-leaflet components

#### Key Changes:
1. **Dynamic Imports**: All react-leaflet components now use `next/dynamic` with `{ ssr: false }`
   - MapContainer
   - TileLayer
   - GeoJSON
   - Marker
   - ZoomToTarlac (with useMap hook)
   - LocationMarker (with useMapEvents hook)

2. **Client-Side Only Rendering**: Added `mounted` state to conditionally render map only after component mounts on client

3. **Dynamic CSS Loading**: Leaflet CSS is now loaded dynamically via JavaScript to avoid SSR import issues

4. **Local GeoJSON**: Replaced Overpass API calls with local file fetching from `/maps/tarlac-province.json`

## Benefits

### Performance
- ✅ **Instant Loading**: No external API calls
- ✅ **Offline Support**: Works without internet connection
- ✅ **Reduced Server Load**: No SSR rendering of heavy map libraries

### Accuracy
- ✅ **Official Data**: Uses PSA PSGC data (Q4 2023)
- ✅ **Proper Boundaries**: Accurate provincial boundaries
- ✅ **PSGC Codes**: Each feature includes official PSGC identifiers

### Maintainability
- ✅ **Local Control**: Full dataset available in project
- ✅ **Version Locked**: No dependency on external API availability
- ✅ **Easy Updates**: Simply replace JSON files when PSA releases updates

## Source Repository

The complete `philippines-json-maps` directory contains:
- All 17 regions of the Philippines
- All provinces and districts
- All municipalities and cities
- All barangays
- Multiple resolutions (high/medium/low)
- Both GeoJSON and TopoJSON formats

## Usage Example

```typescript
// Fetch and display Tarlac province boundary
const response = await fetch('/maps/tarlac-province.json');
const geoJson: FeatureCollection = await response.json();

<GeoJSON
  data={geoJson}
  style={{
    fillColor: '#3b82f6',
    fillOpacity: 0.3,
    color: '#1d4ed8',
    weight: 3,
  }}
/>
```

## Troubleshooting

### Common Issues

1. **Map not rendering**
   - Ensure component has `'use client'` directive
   - Verify all imports use `next/dynamic` with `ssr: false`
   - Check that `mounted` state is true before rendering

2. **GeoJSON not loading**
   - Verify files exist in `public/maps/`
   - Check browser console for fetch errors
   - Ensure file paths are correct (relative to public directory)

3. **Hydration errors**
   - Component must not render on server (use mounted check)
   - Leaflet CSS must load dynamically
   - All leaflet components must use dynamic imports

## Future Enhancements

Potential additions:
- Add municipality/city boundaries layer
- Implement region selector
- Add search functionality for provinces
- Display PSGC codes on hover
- Add barangay-level data
