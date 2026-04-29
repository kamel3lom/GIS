# GeoIndex Studio User Guide

GeoIndex Studio is a browser-first educational GIS and remote sensing tool. It is designed for beginners and avoids fake buttons or hidden API keys.

## Quick Start

1. Open the app.
2. Pick a basemap. OpenStreetMap works without a key.
3. Search for a place, draw a study area, or upload a boundary.
4. Upload vector data or a georeferenced GeoTIFF when the selected analysis needs data.
5. Choose an analysis and run it.
6. Review the computed statistics.
7. Generate an interpretation.
8. Export a map, poster, PDF, or vector file.

## Supported Local Files

- GeoJSON / JSON
- KML
- GPX
- CSV with `lat/lon` or `latitude/longitude`
- zipped Shapefile
- georeferenced GeoTIFF

## Browser Analyses

Vector analyses use Turf.js. Raster indices use values read from uploaded GeoTIFF files. The app does not compute satellite indices from basemap tiles.

## AI Interpretation

Without an API key, the app uses a free rule-based interpreter. Optional Gemini, OpenAI, OpenRouter, and Ollama integrations use the user's own key or local endpoint.

## Exports

The app can export PNG, posters, PDF, GeoJSON, KML, and Shapefile ZIP for vector data. Raster-to-Shapefile conversion is not faked.
