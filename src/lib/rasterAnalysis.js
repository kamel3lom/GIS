import { fromArrayBuffer } from 'geotiff';
import { makeResultObject } from './geospatial';

export const colorRamps = {
  vegetation: [
    [-1, '#16324f'],
    [0, '#c9b27c'],
    [0.2, '#e5d86e'],
    [0.5, '#55a95c'],
    [1, '#0d5f36']
  ],
  water: [
    [-1, '#6b4b34'],
    [0, '#e3d7a7'],
    [0.3, '#4fc3f7'],
    [1, '#0759a3']
  ],
  moisture: [
    [-1, '#7a4f22'],
    [0, '#e1c16e'],
    [0.3, '#6cc5c0'],
    [1, '#145ea8']
  ],
  urban: [
    [-1, '#194f3c'],
    [0, '#d7d1a5'],
    [0.2, '#ca8d4b'],
    [1, '#7b2d26']
  ],
  thermal: [
    [-10, '#0b3c7d'],
    [20, '#4cc9f0'],
    [35, '#ffd166'],
    [50, '#f35b04'],
    [70, '#7a0403']
  ],
  terrain: [
    [-500, '#1b6ca8'],
    [0, '#8ec07c'],
    [500, '#d8b45d'],
    [1500, '#8d6e63'],
    [4000, '#f5f5f5']
  ],
  gray: [
    [0, '#111111'],
    [255, '#ffffff']
  ],
  diverging: [
    [-1, '#b2182b'],
    [0, '#f7f7f7'],
    [1, '#2166ac']
  ],
  overlay: [
    [0, '#61d7ff'],
    [1, '#d8b45d']
  ]
};

const defaultBandMap = {
  blue: 1,
  green: 2,
  red: 3,
  nir: 4,
  swir1: 5,
  thermal: 6
};

export async function readGeoTiff(file) {
  const arrayBuffer = await file.arrayBuffer();
  const tiff = await fromArrayBuffer(arrayBuffer);
  const image = await tiff.getImage();
  const rasters = await image.readRasters({ interleave: false });
  const bbox = image.getBoundingBox();
  if (!bbox || bbox.some((value) => !Number.isFinite(value))) {
    throw new Error('GeoTIFF لا يحتوي حدودا جغرافية مقروءة. ارفع ملفا مموضعا جغرافيا.');
  }
  return {
    name: file.name,
    width: image.getWidth(),
    height: image.getHeight(),
    bbox,
    bands: Array.from(rasters),
    bandCount: rasters.length,
    noData: image.getGDALNoData(),
    metadata: {
      samplesPerPixel: image.getSamplesPerPixel(),
      fileDirectory: image.getFileDirectory()
    }
  };
}

function valueAt(raster, bandNumber, index) {
  const band = raster.bands[(Number(bandNumber) || 1) - 1];
  if (!band) return NaN;
  const value = Number(band[index]);
  if (raster.noData != null && value === Number(raster.noData)) return NaN;
  return Number.isFinite(value) ? value : NaN;
}

function safeRatio(numerator, denominator) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || Math.abs(denominator) < 1e-12) {
    return NaN;
  }
  return numerator / denominator;
}

export function computeRasterIndex(raster, analysisId, bandMap = defaultBandMap, options = {}) {
  if (!raster?.bands?.length) throw new Error('لا توجد بيانات Raster مقروءة.');
  const total = raster.width * raster.height;
  const values = new Float32Array(total);
  const L = Number(options.saviL ?? 0.5);

  for (let index = 0; index < total; index += 1) {
    const blue = valueAt(raster, bandMap.blue, index);
    const green = valueAt(raster, bandMap.green, index);
    const red = valueAt(raster, bandMap.red, index);
    const nir = valueAt(raster, bandMap.nir, index);
    const swir1 = valueAt(raster, bandMap.swir1, index);
    const thermal = valueAt(raster, bandMap.thermal, index);
    let value = NaN;

    switch (analysisId) {
      case 'ndvi':
      case 'vegetation_health':
        value = safeRatio(nir - red, nir + red);
        break;
      case 'evi':
        value = safeRatio(2.5 * (nir - red), nir + 6 * red - 7.5 * blue + 1);
        break;
      case 'savi':
        value = safeRatio((nir - red) * (1 + L), nir + red + L);
        break;
      case 'gndvi':
        value = safeRatio(nir - green, nir + green);
        break;
      case 'ndmi':
        value = safeRatio(nir - swir1, nir + swir1);
        break;
      case 'ndwi':
      case 'water_detection':
        value = safeRatio(green - nir, green + nir);
        break;
      case 'mndwi':
        value = safeRatio(green - swir1, green + swir1);
        break;
      case 'ndbi':
      case 'built_up':
        value = safeRatio(swir1 - nir, swir1 + nir);
        break;
      case 'lst':
      case 'thermal_gradient':
        value = thermal > 180 ? thermal - 273.15 : thermal;
        break;
      case 'dem':
        value = valueAt(raster, bandMap.dem || 1, index);
        break;
      default:
        throw new Error('هذا التحليل غير مدعوم داخل المتصفح دون GEE أو بيانات إضافية.');
    }
    values[index] = Number.isFinite(value) ? value : NaN;
  }

  const stats = computeRasterStats(values, {
    analysisId,
    width: raster.width,
    height: raster.height,
    bbox: raster.bbox,
    resolution: options.resolution
  });
  const rampName = rampForAnalysis(analysisId);
  const dataUrl = rasterValuesToDataUrl(values, raster.width, raster.height, rampName, stats);

  const result = makeResultObject({
    id: analysisId,
    name: options.analysisName || analysisId.toUpperCase(),
    source: raster.name || 'GeoTIFF مرفوع',
    dateRange: options.dateRange,
    resolution: options.resolution || 'حسب GeoTIFF',
    stats,
    geojson: null,
    notes: [
      'تم حساب المؤشر من القيم الرقمية داخل GeoTIFF المرفوع.',
      'إذا كانت الحزم غير مرتبة كما اخترت، ستكون النتيجة غير صحيحة؛ راجع أرقام الحزم.'
    ]
  });
  result.rasterOverlay = {
    dataUrl,
    width: raster.width,
    height: raster.height,
    bbox: raster.bbox,
    rampName
  };
  return result;
}

export function buildRasterResult({ analysisId, name, source, values, width, height, bbox, dateRange, resolution }) {
  const typed = Float32Array.from(values.map((value) => (Number.isFinite(Number(value)) ? Number(value) : NaN)));
  const stats = computeRasterStats(typed, { analysisId, width, height, bbox, resolution });
  const rampName = rampForAnalysis(analysisId);
  const dataUrl = rasterValuesToDataUrl(typed, width, height, rampName, stats);
  const result = makeResultObject({
    id: analysisId,
    name,
    source,
    dateRange,
    resolution,
    stats,
    geojson: null,
    notes: ['تم تحميل نتيجة Raster تجريبية صغيرة وحساب إحصاءاتها داخل المتصفح.']
  });
  result.rasterOverlay = { dataUrl, width, height, bbox, rampName };
  return result;
}

export function computeRasterStats(values, context = {}) {
  const valid = [];
  for (const value of values) {
    if (Number.isFinite(value)) valid.push(value);
  }
  if (!valid.length) {
    return {
      min: null,
      max: null,
      mean: null,
      median: null,
      stdDev: null,
      validPixelCount: 0,
      noDataPixelCount: values.length,
      classes: []
    };
  }

  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  for (const value of valid) {
    if (value < min) min = value;
    if (value > max) max = value;
    sum += value;
  }
  const mean = sum / valid.length;
  const sorted = [...valid].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const variance = valid.reduce((acc, value) => acc + (value - mean) ** 2, 0) / valid.length;
  const stdDev = Math.sqrt(variance);
  const pixelAreaM2 = estimatePixelArea(context);
  const classes = classifyValues(valid, context.analysisId, pixelAreaM2);

  return {
    min,
    max,
    mean,
    median,
    stdDev,
    validPixelCount: valid.length,
    noDataPixelCount: values.length - valid.length,
    classes,
    human: {
      min: formatNumber(min),
      max: formatNumber(max),
      mean: formatNumber(mean),
      median: formatNumber(median),
      stdDev: formatNumber(stdDev)
    }
  };
}

function estimatePixelArea({ resolution, bbox, width, height }) {
  const numeric = Number(String(resolution || '').replace(/[^\d.]/g, ''));
  if (Number.isFinite(numeric) && numeric > 0) return numeric * numeric;
  if (bbox && width && height) {
    const latMid = ((bbox[1] + bbox[3]) / 2) * (Math.PI / 180);
    const metersPerDegreeLat = 111_320;
    const metersPerDegreeLon = Math.cos(latMid) * 111_320;
    const pixelWidth = Math.abs((bbox[2] - bbox[0]) / width) * metersPerDegreeLon;
    const pixelHeight = Math.abs((bbox[3] - bbox[1]) / height) * metersPerDegreeLat;
    if (Number.isFinite(pixelWidth * pixelHeight)) return Math.abs(pixelWidth * pixelHeight);
  }
  return null;
}

function classifyValues(values, analysisId, pixelAreaM2) {
  const thresholds = getThresholds(analysisId);
  if (!thresholds.length) return [];
  const total = values.length;
  return thresholds.map((threshold) => {
    const count = values.filter((value) => value >= threshold.min && value < threshold.max).length;
    const areaM2 = pixelAreaM2 == null ? null : count * pixelAreaM2;
    return {
      label: threshold.label,
      min: threshold.min,
      max: threshold.max,
      count,
      percentage: total ? (count / total) * 100 : null,
      areaM2
    };
  });
}

function getThresholds(analysisId) {
  if (['ndvi', 'vegetation_health', 'savi', 'gndvi', 'evi'].includes(analysisId)) {
    return [
      { label: 'مياه/غير نباتي غالبا', min: -Infinity, max: 0 },
      { label: 'غطاء ضعيف أو تربة عارية', min: 0, max: 0.2 },
      { label: 'غطاء نباتي متوسط', min: 0.2, max: 0.5 },
      { label: 'غطاء نباتي كثيف', min: 0.5, max: Infinity }
    ];
  }
  if (['ndwi', 'mndwi', 'water_detection'].includes(analysisId)) {
    return [
      { label: 'غير مائي غالبا', min: -Infinity, max: 0 },
      { label: 'رطوبة/مياه محتملة', min: 0, max: 0.3 },
      { label: 'مياه غالبا', min: 0.3, max: Infinity }
    ];
  }
  if (['ndbi', 'built_up'].includes(analysisId)) {
    return [
      { label: 'غير عمراني غالبا', min: -Infinity, max: 0 },
      { label: 'عمراني/مكشوف محتمل', min: 0, max: 0.2 },
      { label: 'عمراني أو تربة جافة قوية', min: 0.2, max: Infinity }
    ];
  }
  if (['ndmi'].includes(analysisId)) {
    return [
      { label: 'جاف/منخفض', min: -Infinity, max: 0 },
      { label: 'متوسط الرطوبة', min: 0, max: 0.3 },
      { label: 'رطب/مرتفع', min: 0.3, max: Infinity }
    ];
  }
  if (['lst', 'thermal_gradient'].includes(analysisId)) {
    return [
      { label: 'أبرد نسبيا', min: -Infinity, max: 20 },
      { label: 'متوسط', min: 20, max: 35 },
      { label: 'أعلى حرارة', min: 35, max: Infinity }
    ];
  }
  return [];
}

function rampForAnalysis(analysisId) {
  if (['ndvi', 'evi', 'savi', 'gndvi', 'vegetation_health'].includes(analysisId)) return 'vegetation';
  if (['ndwi', 'mndwi', 'water_detection'].includes(analysisId)) return 'water';
  if (['ndmi', 'soil_moisture'].includes(analysisId)) return 'moisture';
  if (['ndbi', 'built_up', 'urban_density'].includes(analysisId)) return 'urban';
  if (['lst', 'thermal_gradient', 'uhi'].includes(analysisId)) return 'thermal';
  if (['dem', 'slope', 'aspect', 'hillshade', 'profile'].includes(analysisId)) return 'terrain';
  return 'overlay';
}

export function rasterValuesToDataUrl(values, width, height, rampName, stats) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(width, height);
  const ramp = colorRamps[rampName] || colorRamps.overlay;
  const min = stats?.min ?? ramp[0][0];
  const max = stats?.max ?? ramp[ramp.length - 1][0];

  for (let i = 0; i < values.length; i += 1) {
    const value = values[i];
    const offset = i * 4;
    if (!Number.isFinite(value)) {
      imageData.data[offset + 3] = 0;
      continue;
    }
    const [r, g, b] = colorForValue(value, ramp, min, max);
    imageData.data[offset] = r;
    imageData.data[offset + 1] = g;
    imageData.data[offset + 2] = b;
    imageData.data[offset + 3] = 190;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

function colorForValue(value, ramp, dynamicMin, dynamicMax) {
  const normalizedRamp = ramp.map(([stop, color]) => [
    Number.isFinite(stop) ? stop : stop < 0 ? dynamicMin : dynamicMax,
    hexToRgb(color)
  ]);
  if (value <= normalizedRamp[0][0]) return normalizedRamp[0][1];
  for (let i = 1; i < normalizedRamp.length; i += 1) {
    const [stop, rgb] = normalizedRamp[i];
    const [prevStop, prevRgb] = normalizedRamp[i - 1];
    if (value <= stop) {
      const t = stop === prevStop ? 0 : (value - prevStop) / (stop - prevStop);
      return [
        Math.round(prevRgb[0] + (rgb[0] - prevRgb[0]) * t),
        Math.round(prevRgb[1] + (rgb[1] - prevRgb[1]) * t),
        Math.round(prevRgb[2] + (rgb[2] - prevRgb[2]) * t)
      ];
    }
  }
  return normalizedRamp[normalizedRamp.length - 1][1];
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  return [
    Number.parseInt(clean.slice(0, 2), 16),
    Number.parseInt(clean.slice(2, 4), 16),
    Number.parseInt(clean.slice(4, 6), 16)
  ];
}

export function formatNumber(value) {
  if (value == null || !Number.isFinite(value)) return 'غير متاح';
  return Number(value).toFixed(Math.abs(value) < 10 ? 3 : 2);
}
