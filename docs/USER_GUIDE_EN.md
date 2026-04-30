# User Guide

## Simple Flow

1. Open the data and sources tab.
2. Enter the Google Cloud / Earth Engine Project ID and OAuth Web Client ID.
3. Connect Google Earth Engine.
4. Return to the analysis tab.
5. Search for a city or capital and select it.
6. Select the year.
7. Select an indicator and run the analysis.

The user does not need to draw a point or polygon, upload GeoJSON, configure a GEE server, or provide an Asset ID.

## City Boundary

The app uses the city boundary returned by the search provider when available. If no boundary is returned, it falls back to a bounding box around the city.

## Indicators

The list shows direct GEE indicators that the app has ready recipes for, such as NDVI, NDWI, NDBI, LST, NO2, CHIRPS precipitation, VIIRS night lights, and ESA WorldCover. If a product is unavailable for the selected year or area, the app shows the error clearly.

## Interpretation

The interpretation button reads the current result only: selected indicator, city, year, source, and computed statistics. If the selected indicator changed, the app recalculates before interpreting so stale text is not reused.

## Export

Map and poster exports are available from the export tab. Some GEE tiles may block browser screenshots because of CORS restrictions.
