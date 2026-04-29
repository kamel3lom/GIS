import {
  ensureFeatureCollection,
  flattenFeatures,
  formatArea,
  formatDistance,
  makeResultObject,
  summarizeGeoJSON,
  turf
} from './geospatial';

function firstPolygon(features) {
  return features.find((feature) => feature.geometry?.type?.includes('Polygon'));
}

function pointsOnly(features) {
  return features.filter((feature) => feature.geometry?.type?.includes('Point'));
}

function polygonsOnly(features) {
  return features.filter((feature) => feature.geometry?.type?.includes('Polygon'));
}

export function getDominantClass(classes = []) {
  if (!classes.length) return null;
  return [...classes].sort((a, b) => (b.areaM2 || 0) - (a.areaM2 || 0) || b.count - a.count)[0];
}

export function vectorSummaryResult({ drawnGeoJSON, uploadedGeoJSON, studyArea, context }) {
  const features = [
    ...flattenFeatures(drawnGeoJSON),
    ...flattenFeatures(uploadedGeoJSON)
  ];
  const fc = turf.featureCollection(features);
  const summary = summarizeGeoJSON(fc);
  const study = studyArea ? summarizeGeoJSON(studyArea) : null;

  const stats = {
    min: null,
    max: null,
    mean: null,
    median: null,
    stdDev: null,
    featureCount: summary.featureCount,
    totalAreaM2: summary.totalAreaM2,
    totalLengthM: summary.totalLengthM,
    totalPerimeterM: summary.totalPerimeterM,
    studyAreaM2: study?.totalAreaM2 || summary.totalAreaM2,
    classes: summary.classes,
    human: {
      totalArea: formatArea(summary.totalAreaM2),
      totalLength: formatDistance(summary.totalLengthM),
      totalPerimeter: formatDistance(summary.totalPerimeterM),
      studyArea: formatArea(study?.totalAreaM2 || summary.totalAreaM2)
    }
  };

  return makeResultObject({
    id: 'vector_summary',
    name: 'ملخص الرسم والقياس',
    source: 'رسومات وطبقات مرفوعة',
    dateRange: context.dateRange,
    resolution: 'Vector',
    stats,
    geojson: fc,
    notes: ['تم حساب المساحات والأطوال داخل المتصفح بواسطة Turf.js.']
  });
}

export function runBufferAnalysis({ drawnGeoJSON, uploadedGeoJSON, distanceMeters = 1000, context }) {
  const fc = ensureFeatureCollection({
    type: 'FeatureCollection',
    features: [...flattenFeatures(drawnGeoJSON), ...flattenFeatures(uploadedGeoJSON)]
  });
  if (!fc.features.length) {
    throw new Error('ارسم أو ارفع طبقة Vector أولا لتنفيذ Buffer.');
  }
  const buffered = turf.featureCollection(
    fc.features
      .map((feature) => {
        try {
          return turf.buffer(feature, distanceMeters, { units: 'meters' });
        } catch {
          return null;
        }
      })
      .filter(Boolean)
  );
  const summary = summarizeGeoJSON(buffered);
  const stats = {
    min: null,
    max: null,
    mean: null,
    median: null,
    stdDev: null,
    featureCount: buffered.features.length,
    totalAreaM2: summary.totalAreaM2,
    bufferDistanceM: distanceMeters,
    classes: summary.classes,
    human: {
      totalArea: formatArea(summary.totalAreaM2),
      bufferDistance: formatDistance(distanceMeters)
    }
  };
  return makeResultObject({
    id: 'buffer',
    name: 'تحليل نطاقات الوصول Buffer',
    source: 'رسومات وطبقات مرفوعة',
    dateRange: context.dateRange,
    resolution: 'Vector',
    stats,
    geojson: buffered,
    notes: ['Buffer تقريبي ولا يمثل زمن وصول فعلي عبر شبكة طرق.']
  });
}

export function runOverlayAnalysis({ studyArea, uploadedGeoJSON, context }) {
  const studyFeatures = flattenFeatures(studyArea);
  const uploadFeatures = flattenFeatures(uploadedGeoJSON);
  const aoi = firstPolygon(studyFeatures);
  if (!aoi) throw new Error('تحليل التداخل يحتاج منطقة دراسة Polygon.');
  if (!uploadFeatures.length) throw new Error('ارفع طبقة Vector للتداخل أولا.');

  const intersections = [];
  for (const feature of polygonsOnly(uploadFeatures)) {
    try {
      const intersected = turf.intersect(turf.featureCollection([aoi, feature]));
      if (intersected) {
        intersected.properties = {
          ...feature.properties,
          overlay_source: 'uploaded-layer'
        };
        intersections.push(intersected);
      }
    } catch {
      // Keep running; invalid geometries are skipped.
    }
  }
  const resultFc = turf.featureCollection(intersections);
  const aoiArea = turf.area(aoi);
  const overlaySummary = summarizeGeoJSON(resultFc);
  const percentage = aoiArea > 0 ? (overlaySummary.totalAreaM2 / aoiArea) * 100 : null;
  const stats = {
    min: null,
    max: null,
    mean: percentage,
    median: null,
    stdDev: null,
    featureCount: resultFc.features.length,
    studyAreaM2: aoiArea,
    overlapAreaM2: overlaySummary.totalAreaM2,
    overlapPercentage: percentage,
    classes: overlaySummary.classes,
    human: {
      studyArea: formatArea(aoiArea),
      overlapArea: formatArea(overlaySummary.totalAreaM2),
      overlapPercentage: percentage == null ? 'غير متاح' : `${percentage.toFixed(2)}%`
    }
  };

  return makeResultObject({
    id: 'overlay',
    name: 'تحليل التداخل المكاني Overlay',
    source: 'منطقة الدراسة + طبقة مرفوعة',
    dateRange: context.dateRange,
    resolution: 'Vector',
    stats,
    geojson: resultFc,
    notes:
      intersections.length > 0
        ? ['تم حساب تقاطع المضلعات المرفوعة مع منطقة الدراسة.']
        : ['لم يتم العثور على تداخل مضلعي صالح داخل منطقة الدراسة.']
  });
}

export function runPointInPolygonAnalysis({ studyArea, uploadedGeoJSON, context }) {
  const aoi = firstPolygon(flattenFeatures(studyArea));
  if (!aoi) throw new Error('عد النقاط يحتاج منطقة دراسة Polygon.');
  const points = pointsOnly(flattenFeatures(uploadedGeoJSON));
  if (!points.length) throw new Error('ارفع طبقة نقاط GeoJSON/CSV أو ارسم نقاطا أولا.');

  const inside = [];
  const outside = [];
  for (const point of points) {
    if (turf.booleanPointInPolygon(point, aoi)) inside.push(point);
    else outside.push(point);
  }
  const percentage = points.length ? (inside.length / points.length) * 100 : null;
  const stats = {
    min: null,
    max: null,
    mean: percentage,
    median: null,
    stdDev: null,
    totalPoints: points.length,
    insideCount: inside.length,
    outsideCount: outside.length,
    insidePercentage: percentage,
    classes: [
      { label: 'داخل منطقة الدراسة', count: inside.length, percentage },
      { label: 'خارج منطقة الدراسة', count: outside.length, percentage: 100 - percentage }
    ],
    human: {
      insidePercentage: `${percentage.toFixed(2)}%`
    }
  };

  return makeResultObject({
    id: 'point_in_polygon',
    name: 'عد النقاط داخل منطقة الدراسة',
    source: 'منطقة الدراسة + نقاط مرفوعة',
    dateRange: context.dateRange,
    resolution: 'Vector',
    stats,
    geojson: turf.featureCollection(inside),
    notes: ['تم حساب عدد النقاط التي تقع داخل مضلع منطقة الدراسة.']
  });
}

export function runUrbanDensityFromVector({ studyArea, uploadedGeoJSON, context }) {
  const aoi = firstPolygon(flattenFeatures(studyArea));
  if (!aoi) throw new Error('كثافة العمران تحتاج منطقة دراسة Polygon.');
  const polygons = polygonsOnly(flattenFeatures(uploadedGeoJSON));
  if (!polygons.length) {
    throw new Error('ارفع مضلعات مبان أو مناطق مبنية كطبقة Vector أولا.');
  }

  const builtIntersections = [];
  for (const polygon of polygons) {
    try {
      const clipped = turf.intersect(turf.featureCollection([aoi, polygon]));
      if (clipped) builtIntersections.push(clipped);
    } catch {
      // Skip invalid geometry.
    }
  }
  const builtFc = turf.featureCollection(builtIntersections);
  const builtArea = summarizeGeoJSON(builtFc).totalAreaM2;
  const aoiArea = turf.area(aoi);
  const percentage = aoiArea > 0 ? (builtArea / aoiArea) * 100 : null;

  return makeResultObject({
    id: 'urban_density',
    name: 'كثافة العمران داخل منطقة الدراسة',
    source: 'مضلعات مرفوعة من المستخدم',
    dateRange: context.dateRange,
    resolution: 'Vector',
    stats: {
      min: null,
      max: null,
      mean: percentage,
      median: null,
      stdDev: null,
      builtAreaM2: builtArea,
      studyAreaM2: aoiArea,
      builtPercentage: percentage,
      classes: [
        { label: 'مناطق مبنية مرفوعة', areaM2: builtArea, percentage },
        { label: 'باقي منطقة الدراسة', areaM2: Math.max(0, aoiArea - builtArea), percentage: 100 - percentage }
      ],
      human: {
        builtArea: formatArea(builtArea),
        studyArea: formatArea(aoiArea),
        builtPercentage: `${percentage.toFixed(2)}%`
      }
    },
    geojson: builtFc,
    notes: ['هذا الحساب يعتمد فقط على المضلعات المرفوعة، ولا ينزل مباني OSM تلقائيا.']
  });
}

export function runVectorAnalysis(analysisId, inputs) {
  switch (analysisId) {
    case 'buffer':
    case 'influence_zones':
    case 'services_proximity':
    case 'proximity_roads_industrial':
      return runBufferAnalysis(inputs);
    case 'overlay':
      return runOverlayAnalysis(inputs);
    case 'point_in_polygon':
      return runPointInPolygonAnalysis(inputs);
    case 'urban_density':
      return runUrbanDensityFromVector(inputs);
    case 'vector_summary':
    default:
      return vectorSummaryResult(inputs);
  }
}
