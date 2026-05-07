# Philippines Maps

These GeoJSON files are sourced from [faeldon/philippines-json-maps](https://github.com/faeldon/philippines-json-maps).

## Available Files

### Province Boundaries
- **tarlac-province.json** (32KB) - Tarlac Province boundary polygon
  - PSGC Code: 306900000
  - Region: Region 3 (Central Luzon)
  - Area: ~2,974 km²

### Municipality/City Boundaries
- **tarlac-municities.json** (21KB) - All municipalities and cities within Tarlac Province

### Regional Data
- **region-3-provinces.json** (153KB) - All provinces in Region 3 (Central Luzon)
  - Includes: Bataan, Bulacan, Nueva Ecija, Pampanga, Tarlac, Zambales, Aurora

## Data Details
- **Source**: Philippine Statistics Authority (PSA) PSGC data (Q4 2023)
- **Projection**: EPSG:32651, Lat/Long
- **Resolution**: Medium (1% simplification)
- **Format**: GeoJSON FeatureCollection
- **License**: MIT

## Usage in Map Component

```typescript
// Load Tarlac province boundary
const response = await fetch('/maps/tarlac-province.json');
const geoJson = await response.json();

// Use with react-leaflet
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

## Administrative Levels

- **Level 1**: Region (e.g., Region 3 - Central Luzon)
- **Level 2**: Province/District (e.g., Tarlac)
- **Level 3**: Municipality/City
- **Level 4**: Barangay (available in source repository)

## Full Repository

For the complete dataset including all regions, provinces, municipalities, and barangays across the Philippines, see the `philippines-json-maps` directory in the project root.
