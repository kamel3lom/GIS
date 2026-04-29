import * as turf from '@turf/turf';

export function ensureFeatureCollection(input) {
  if (!input) return turf.featureCollection([]);
  if (input.type === 'FeatureCollection') return input;
  if (input.type === 'Feature') return turf.featureCollection([input]);
  if (input.type && input.coordinates) return turf.featureCollection([turf.feature(input)]);
  return turf.featureCollection([]);
}

export function flattenFeatures(input) {
  return ensureFeatureCollection(input).features.filter(Boolean);
}

export function geometryType(feature) {
  return feature?.geometry?.type || 'Unknown';
}

export function computeFeatureMetrics(feature) {
  const type = geometryType(feature);
  const metrics = {
    type,
    areaM2: 0,
    perimeterM: 0,
    lengthM: 0,
    centroid: null,
    bbox: null
  };

  if (!feature?.geometry) return metrics;
  try {
    metrics.bbox = turf.bbox(feature);
    metrics.centroid = turf.centroid(feature).geometry.coordinates;
  } catch {
    metrics.bbox = null;
  }

  if (type.includes('Polygon')) {
    metrics.areaM2 = turf.area(feature);
    metrics.perimeterM = polygonPerimeter(feature);
  }

  if (type.includes('LineString')) {
    metrics.lengthM = turf.length(feature, { units: 'kilometers' }) * 1000;
  }

  return metrics;
}

export function polygonPerimeter(feature) {
  let lengthKm = 0;
  turf.coordEach(feature, () => {});
  const polygons =
    feature.geometry.type === 'Polygon'
      ? [feature.geometry.coordinates]
      : feature.geometry.type === 'MultiPolygon'
        ? feature.geometry.coordinates
        : [];
  for (const polygon of polygons) {
    for (const ring of polygon) {
      const line = turf.lineString(ring);
      lengthKm += turf.length(line, { units: 'kilometers' });
    }
  }
  return lengthKm * 1000;
}

export function formatArea(areaM2) {
  if (!Number.isFinite(areaM2)) return 'غير متاح';
  if (areaM2 >= 1_000_000) return `${(areaM2 / 1_000_000).toFixed(2)} كم²`;
  if (areaM2 >= 10_000) return `${(areaM2 / 10_000).toFixed(2)} هكتار`;
  return `${areaM2.toFixed(2)} م²`;
}

export function formatDistance(distanceM) {
  if (!Number.isFinite(distanceM)) return 'غير متاح';
  if (distanceM >= 1000) return `${(distanceM / 1000).toFixed(2)} كم`;
  return `${distanceM.toFixed(1)} م`;
}

export function summarizeGeoJSON(input) {
  const fc = ensureFeatureCollection(input);
  const summary = {
    featureCount: fc.features.length,
    geometryCounts: {},
    totalAreaM2: 0,
    totalLengthM: 0,
    totalPerimeterM: 0,
    bbox: null,
    centroid: null,
    classes: []
  };

  for (const feature of fc.features) {
    const type = geometryType(feature);
    summary.geometryCounts[type] = (summary.geometryCounts[type] || 0) + 1;
    const metrics = computeFeatureMetrics(feature);
    summary.totalAreaM2 += metrics.areaM2 || 0;
    summary.totalLengthM += metrics.lengthM || 0;
    summary.totalPerimeterM += metrics.perimeterM || 0;
  }

  try {
    summary.bbox = turf.bbox(fc);
    summary.centroid = turf.centroid(fc).geometry.coordinates;
  } catch {
    summary.bbox = null;
  }

  summary.classes = summarizeByClass(fc);
  return summary;
}

export function summarizeByClass(input, property = 'class') {
  const fc = ensureFeatureCollection(input);
  const classMap = new Map();
  for (const feature of fc.features) {
    const key = feature.properties?.[property] || feature.properties?.type || 'غير مصنف';
    const current = classMap.get(key) || { label: key, count: 0, areaM2: 0 };
    current.count += 1;
    if (feature.geometry?.type?.includes('Polygon')) current.areaM2 += turf.area(feature);
    classMap.set(key, current);
  }
  const totalArea = Array.from(classMap.values()).reduce((sum, item) => sum + item.areaM2, 0);
  return Array.from(classMap.values()).map((item) => ({
    ...item,
    percentage: totalArea > 0 ? (item.areaM2 / totalArea) * 100 : null
  }));
}

export function bboxToLeafletBounds(bbox) {
  if (!bbox) return null;
  return [
    [bbox[1], bbox[0]],
    [bbox[3], bbox[2]]
  ];
}

export function featureCollectionBounds(input) {
  try {
    return bboxToLeafletBounds(turf.bbox(ensureFeatureCollection(input)));
  } catch {
    return null;
  }
}

export function parseCsvPoints(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error('ملف CSV يحتاج صف عناوين وصف بيانات واحد على الأقل.');
  const headers = lines[0].split(',').map((header) => header.trim());
  const latIndex = headers.findIndex((h) => ['lat', 'latitude', 'y', 'خط_العرض'].includes(h.toLowerCase()));
  const lonIndex = headers.findIndex((h) => ['lon', 'lng', 'longitude', 'x', 'خط_الطول'].includes(h.toLowerCase()));
  if (latIndex < 0 || lonIndex < 0) {
    throw new Error('CSV يجب أن يحتوي أعمدة lat/lon أو latitude/longitude.');
  }

  const features = [];
  for (const line of lines.slice(1)) {
    const cells = line.split(',').map((cell) => cell.trim());
    const lat = Number(cells[latIndex]);
    const lon = Number(cells[lonIndex]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const properties = {};
    headers.forEach((header, index) => {
      if (index !== latIndex && index !== lonIndex) properties[header] = cells[index];
    });
    features.push(turf.point([lon, lat], properties));
  }
  return turf.featureCollection(features);
}

export function makeResultObject({ id, name, source, dateRange, resolution, stats, geojson, notes }) {
  return {
    id,
    name,
    source,
    dateRange,
    resolution,
    stats,
    geojson,
    notes,
    createdAt: new Date().toISOString()
  };
}

export { turf };
