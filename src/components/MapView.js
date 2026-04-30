import L from 'leaflet';
import { featureCollectionBounds, formatArea, formatDistance, summarizeGeoJSON, turf } from '../lib/geospatial';
import { getTileLayerOptions, sourceById } from '../lib/sourcesRegistry';
import { colorRamps } from '../lib/rasterAnalysis';

export class MapView {
  constructor({ elementId, onDrawingChange, onStudyAreaChange, onStatus }) {
    this.elementId = elementId;
    this.onDrawingChange = onDrawingChange || (() => {});
    this.onStudyAreaChange = onStudyAreaChange || (() => {});
    this.onStatus = onStatus || (() => {});
    this.map = null;
    this.baseLayer = null;
    this.drawnItems = L.featureGroup();
    this.uploadedLayers = L.featureGroup();
    this.resultLayer = null;
    this.rasterLayer = null;
    this.geeLayer = null;
    this.studyAreaLayer = null;
    this.legendControl = null;
    this.coordinateControl = null;
    this.currentDrawHandler = null;
  }

  init() {
    this.map = L.map(this.elementId, {
      zoomControl: false,
      preferCanvas: true
    }).setView([24.7136, 46.6753], 6);

    L.control.zoom({ position: 'topleft' }).addTo(this.map);
    L.control.scale({ metric: true, imperial: false, position: 'bottomleft' }).addTo(this.map);
    this.drawnItems.addTo(this.map);
    this.uploadedLayers.addTo(this.map);
    this.setBaseSource('osm');
    this.addCoordinateDisplay();
    this.addNorthArrow();
    this.updateLegend(null);
    return this;
  }

  setBaseSource(sourceId, date = new Date(Date.now() - 86400000).toISOString().slice(0, 10)) {
    const source = sourceById(sourceId);
    const tile = getTileLayerOptions(source, date);
    if (!tile) {
      this.onStatus(source?.notes || 'هذا المصدر غير مفعّل مباشرة داخل المتصفح.');
      return false;
    }
    if (this.baseLayer) this.map.removeLayer(this.baseLayer);
    this.baseLayer = L.tileLayer(tile.url, tile.options).addTo(this.map);
    this.baseLayer.bringToBack();
    this.onStatus(`تم تفعيل مصدر الخريطة: ${source.nameAr}. ${source.notes}`);
    return true;
  }

  addDrawToolbar() {
    const drawControl = new L.Control.Draw({
      position: 'topleft',
      draw: {
        circle: false,
        circlemarker: false,
        marker: true,
        polyline: {
          shapeOptions: { color: '#61d7ff', weight: 4 }
        },
        polygon: {
          allowIntersection: false,
          showArea: true,
          shapeOptions: { color: '#d8b45d', weight: 3, fillOpacity: 0.18 }
        },
        rectangle: {
          shapeOptions: { color: '#d8b45d', weight: 3, fillOpacity: 0.16 }
        }
      },
      edit: {
        featureGroup: this.drawnItems,
        remove: true
      }
    });
    this.map.addControl(drawControl);
  }

  bindDrawEvents() {
    this.map.on(L.Draw.Event.CREATED, (event) => {
      const layer = event.layer;
      this.decorateLayer(layer);
      this.drawnItems.addLayer(layer);
      this.handleDrawingUpdated();
      const geojson = layer.toGeoJSON();
      if (geojson.geometry?.type?.includes('Polygon')) {
        this.setStudyArea(geojson);
      }
    });
    this.map.on(L.Draw.Event.EDITED, () => this.handleDrawingUpdated());
    this.map.on(L.Draw.Event.DELETED, () => {
      this.handleDrawingUpdated();
      if (this.studyAreaLayer) {
        this.map.removeLayer(this.studyAreaLayer);
        this.studyAreaLayer = null;
        this.onStudyAreaChange(null);
      }
    });
  }

  startDraw(type) {
    if (this.currentDrawHandler) this.currentDrawHandler.disable();
    const options = {
      marker: () => new L.Draw.Marker(this.map),
      polyline: () => new L.Draw.Polyline(this.map, { shapeOptions: { color: '#61d7ff', weight: 4 } }),
      polygon: () =>
        new L.Draw.Polygon(this.map, {
          allowIntersection: false,
          showArea: true,
          shapeOptions: { color: '#d8b45d', weight: 3, fillOpacity: 0.18 }
        }),
      rectangle: () =>
        new L.Draw.Rectangle(this.map, {
          shapeOptions: { color: '#d8b45d', weight: 3, fillOpacity: 0.16 }
        })
    };
    if (!options[type]) return;
    this.currentDrawHandler = options[type]();
    this.currentDrawHandler.enable();
  }

  decorateLayer(layer) {
    const geojson = layer.toGeoJSON();
    const summary = summarizeGeoJSON(geojson);
    const type = geojson.geometry?.type;
    if (layer.setStyle) {
      layer.setStyle({
        color: type?.includes('Polygon') ? '#d8b45d' : '#61d7ff',
        weight: 3,
        fillOpacity: type?.includes('Polygon') ? 0.18 : 0
      });
    }
    const popupParts = [`<strong>${type || 'Geometry'}</strong>`];
    if (summary.totalAreaM2) popupParts.push(`المساحة: ${formatArea(summary.totalAreaM2)}`);
    if (summary.totalPerimeterM) popupParts.push(`المحيط: ${formatDistance(summary.totalPerimeterM)}`);
    if (summary.totalLengthM) popupParts.push(`الطول: ${formatDistance(summary.totalLengthM)}`);
    layer.bindPopup(popupParts.join('<br>'));
  }

  handleDrawingUpdated() {
    const geojson = this.getDrawnGeoJSON();
    this.onDrawingChange(geojson);
  }

  getDrawnGeoJSON() {
    return this.drawnItems.toGeoJSON();
  }

  clearDrawings() {
    this.drawnItems.clearLayers();
    this.studyAreaLayer = null;
    this.handleDrawingUpdated();
    this.onStudyAreaChange(null);
  }

  setStudyArea(geojson) {
    const fc = geojson.type === 'FeatureCollection' ? geojson : turf.featureCollection([geojson]);
    if (this.studyAreaLayer) this.map.removeLayer(this.studyAreaLayer);
    this.studyAreaLayer = L.geoJSON(fc, {
      style: {
        color: '#ffe08a',
        weight: 4,
        fillColor: '#d8b45d',
        fillOpacity: 0.14,
        dashArray: '8 8'
      }
    }).addTo(this.map);
    const bounds = featureCollectionBounds(fc);
    if (bounds) this.map.fitBounds(bounds, { padding: [28, 28] });
    this.onStudyAreaChange(fc);
    this.onStatus('تم تحديد منطقة الدراسة.');
  }

  addGeoJSONLayer(geojson, name = 'طبقة مرفوعة') {
    const layer = L.geoJSON(geojson, {
      style: {
        color: '#61d7ff',
        weight: 2,
        fillOpacity: 0.18
      },
      pointToLayer: (_feature, latlng) =>
        L.circleMarker(latlng, {
          radius: 6,
          color: '#06111f',
          fillColor: '#61d7ff',
          fillOpacity: 0.9,
          weight: 1
        }),
      onEachFeature: (feature, itemLayer) => {
        const title = feature.properties?.name || feature.properties?.Name || name;
        itemLayer.bindPopup(`<strong>${title}</strong>`);
      }
    });
    layer.addTo(this.uploadedLayers);
    const bounds = featureCollectionBounds(geojson);
    if (bounds) this.map.fitBounds(bounds, { padding: [28, 28] });
    this.onStatus(`تمت إضافة الطبقة: ${name}`);
    return layer;
  }

  addResultGeoJSON(geojson, name = 'نتيجة Vector') {
    if (this.resultLayer) this.map.removeLayer(this.resultLayer);
    this.resultLayer = L.geoJSON(geojson, {
      style: {
        color: '#d8b45d',
        weight: 3,
        fillColor: '#d8b45d',
        fillOpacity: 0.28
      },
      pointToLayer: (_feature, latlng) =>
        L.circleMarker(latlng, {
          radius: 7,
          color: '#ffffff',
          fillColor: '#d8b45d',
          fillOpacity: 0.95,
          weight: 1.5
        })
    }).addTo(this.map);
    const bounds = featureCollectionBounds(geojson);
    if (bounds) this.map.fitBounds(bounds, { padding: [28, 28] });
    this.updateLegend('overlay');
    this.onStatus(`تم عرض نتيجة: ${name}`);
  }

  addRasterOverlay(overlay, opacity = 0.72) {
    if (!overlay?.dataUrl || !overlay?.bbox) throw new Error('لا توجد طبقة Raster قابلة للعرض.');
    if (this.rasterLayer) this.map.removeLayer(this.rasterLayer);
    const bounds = [
      [overlay.bbox[1], overlay.bbox[0]],
      [overlay.bbox[3], overlay.bbox[2]]
    ];
    this.rasterLayer = L.imageOverlay(overlay.dataUrl, bounds, {
      opacity,
      interactive: false
    }).addTo(this.map);
    this.map.fitBounds(bounds, { padding: [28, 28] });
    this.updateLegend(overlay.rampName);
    this.onStatus('تم عرض طبقة Raster محسوبة على الخريطة.');
  }

  addGeeTileLayer(tileUrl, { opacity = 0.72, rampName = 'overlay', bounds = null } = {}) {
    if (!tileUrl) throw new Error('Google Earth Engine لم يرجع رابط بلاطات صالحا.');
    if (this.geeLayer) this.map.removeLayer(this.geeLayer);
    this.geeLayer = L.tileLayer(tileUrl, {
      opacity,
      crossOrigin: true,
      attribution: 'Google Earth Engine'
    }).addTo(this.map);
    this.geeLayer.bringToFront();
    if (Array.isArray(bounds) && bounds.length === 4) {
      this.map.fitBounds(
        [
          [bounds[1], bounds[0]],
          [bounds[3], bounds[2]]
        ],
        { padding: [28, 28] }
      );
    }
    this.updateLegend(rampName);
    this.onStatus('تم عرض خريطة Google Earth Engine من الخادم المرتبط.');
  }

  setResultOpacity(opacity) {
    const value = Number(opacity);
    if (this.rasterLayer) this.rasterLayer.setOpacity(value);
    if (this.geeLayer) this.geeLayer.setOpacity(value);
    if (this.resultLayer) this.resultLayer.setStyle?.({ fillOpacity: value * 0.42, opacity: Math.max(0.25, value) });
  }

  addCoordinateDisplay() {
    this.coordinateControl = L.control({ position: 'bottomright' });
    this.coordinateControl.onAdd = () => {
      const div = L.DomUtil.create('div', 'coordinate-display');
      div.textContent = 'Lat: -- | Lon: --';
      return div;
    };
    this.coordinateControl.addTo(this.map);
    const container = this.coordinateControl.getContainer();
    this.map.on('mousemove', (event) => {
      container.textContent = `Lat: ${event.latlng.lat.toFixed(5)} | Lon: ${event.latlng.lng.toFixed(5)}`;
    });
  }

  addNorthArrow() {
    const north = L.control({ position: 'topright' });
    north.onAdd = () => {
      const div = L.DomUtil.create('div', 'north-arrow-control');
      div.innerHTML = '<span>N</span>';
      return div;
    };
    north.addTo(this.map);
  }

  updateLegend(rampName) {
    if (this.legendControl) this.map.removeControl(this.legendControl);
    this.legendControl = L.control({ position: 'bottomleft' });
    this.legendControl.onAdd = () => {
      const div = L.DomUtil.create('div', 'map-legend');
      if (!rampName || !colorRamps[rampName]) {
        div.innerHTML = '<strong>مفتاح الخريطة</strong><span>اختر مدينة ومؤشرا ثم شغّل التحليل لعرض المفتاح.</span>';
        return div;
      }
      const ramp = colorRamps[rampName];
      const gradient = ramp.map(([, color], index) => `${color} ${(index / (ramp.length - 1)) * 100}%`).join(', ');
      div.innerHTML = `
        <strong>مفتاح الخريطة</strong>
        <i style="background: linear-gradient(90deg, ${gradient})"></i>
        <div class="legend-values">
          <span>${ramp[0][0]}</span>
          <span>${ramp[ramp.length - 1][0]}</span>
        </div>
      `;
      return div;
    };
    this.legendControl.addTo(this.map);
  }

  flyTo(lat, lon, zoom = 12) {
    this.map.flyTo([lat, lon], zoom, { duration: 0.9 });
  }

  invalidateSize() {
    window.setTimeout(() => this.map?.invalidateSize(), 80);
  }
}
