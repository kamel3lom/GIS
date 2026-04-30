const EE_SCRIPT = 'https://ajax.googleapis.com/ajax/libs/earthengine/0.1.365/earthengine-api.min.js';
const EE_READONLY_SCOPE = 'https://www.googleapis.com/auth/earthengine.readonly';
const SESSION_KEY = 'geoindex:gee-direct-session';

const pollutionPalette = ['2c7bb6', 'abd9e9', 'ffffbf', 'fdae61', 'd7191c'];
const vegetationPalette = ['8c510a', 'd8b365', 'f6e8c3', '5ab4ac', '01665e'];
const waterPalette = ['8c510a', 'dfc27d', '80cdc1', '35978f', '01665e'];
const thermalPalette = ['313695', '74add1', 'ffffbf', 'fdae61', 'a50026'];
const terrainPalette = ['1b6ca8', '8ec07c', 'd8b45d', '8d6e63', 'f5f5f5'];

const GEE_RECIPES = {
  ndvi: {
    name: 'NDVI - مؤشر الغطاء النباتي',
    source: 'Sentinel-2 SR Harmonized / Google Earth Engine',
    bandName: 'NDVI',
    unit: 'index',
    scale: 20,
    rampName: 'vegetation',
    vis: { min: -0.2, max: 0.8, palette: vegetationPalette },
    build: ({ ee, region, start, end }) =>
      sentinelComposite(ee, region, start, end).normalizedDifference(['B8', 'B4']).rename('NDVI').clip(region)
  },
  evi: {
    name: 'EVI - مؤشر الغطاء النباتي المحسن',
    source: 'Sentinel-2 SR Harmonized / Google Earth Engine',
    bandName: 'EVI',
    unit: 'index',
    scale: 20,
    rampName: 'vegetation',
    vis: { min: -0.2, max: 0.8, palette: vegetationPalette },
    build: ({ ee, region, start, end }) => {
      const image = sentinelComposite(ee, region, start, end);
      return image
        .expression('2.5 * ((nir - red) / (nir + 6 * red - 7.5 * blue + 1))', {
          nir: image.select('B8'),
          red: image.select('B4'),
          blue: image.select('B2')
        })
        .rename('EVI')
        .clip(region);
    }
  },
  savi: {
    name: 'SAVI - مؤشر النبات المصحح للتربة',
    source: 'Sentinel-2 SR Harmonized / Google Earth Engine',
    bandName: 'SAVI',
    unit: 'index',
    scale: 20,
    rampName: 'vegetation',
    vis: { min: -0.2, max: 0.8, palette: vegetationPalette },
    build: ({ ee, region, start, end }) => {
      const image = sentinelComposite(ee, region, start, end);
      return image
        .expression('((nir - red) / (nir + red + 0.5)) * 1.5', {
          nir: image.select('B8'),
          red: image.select('B4')
        })
        .rename('SAVI')
        .clip(region);
    }
  },
  gndvi: {
    name: 'GNDVI - مؤشر النبات الأخضر',
    source: 'Sentinel-2 SR Harmonized / Google Earth Engine',
    bandName: 'GNDVI',
    unit: 'index',
    scale: 20,
    rampName: 'vegetation',
    vis: { min: -0.2, max: 0.8, palette: vegetationPalette },
    build: ({ ee, region, start, end }) =>
      sentinelComposite(ee, region, start, end).normalizedDifference(['B8', 'B3']).rename('GNDVI').clip(region)
  },
  ndmi: {
    name: 'NDMI - مؤشر رطوبة الغطاء النباتي',
    source: 'Sentinel-2 SR Harmonized / Google Earth Engine',
    bandName: 'NDMI',
    unit: 'index',
    scale: 20,
    rampName: 'moisture',
    vis: { min: -0.5, max: 0.6, palette: waterPalette },
    build: ({ ee, region, start, end }) =>
      sentinelComposite(ee, region, start, end).normalizedDifference(['B8', 'B11']).rename('NDMI').clip(region)
  },
  ndwi: {
    name: 'NDWI - مؤشر المياه',
    source: 'Sentinel-2 SR Harmonized / Google Earth Engine',
    bandName: 'NDWI',
    unit: 'index',
    scale: 20,
    rampName: 'water',
    vis: { min: -0.5, max: 0.7, palette: waterPalette },
    build: ({ ee, region, start, end }) =>
      sentinelComposite(ee, region, start, end).normalizedDifference(['B3', 'B8']).rename('NDWI').clip(region)
  },
  mndwi: {
    name: 'MNDWI - مؤشر المياه المعدل',
    source: 'Sentinel-2 SR Harmonized / Google Earth Engine',
    bandName: 'MNDWI',
    unit: 'index',
    scale: 20,
    rampName: 'water',
    vis: { min: -0.5, max: 0.7, palette: waterPalette },
    build: ({ ee, region, start, end }) =>
      sentinelComposite(ee, region, start, end).normalizedDifference(['B3', 'B11']).rename('MNDWI').clip(region)
  },
  ndbi: {
    name: 'NDBI - مؤشر العمران',
    source: 'Sentinel-2 SR Harmonized / Google Earth Engine',
    bandName: 'NDBI',
    unit: 'index',
    scale: 20,
    rampName: 'urban',
    vis: { min: -0.4, max: 0.5, palette: ['01665e', 'f6e8c3', 'd8b365', '8c510a'] },
    build: ({ ee, region, start, end }) =>
      sentinelComposite(ee, region, start, end).normalizedDifference(['B11', 'B8']).rename('NDBI').clip(region)
  },
  built_up: {
    name: 'Built-up Index - مؤشر المناطق المبنية',
    aliasOf: 'ndbi'
  },
  vegetation_health: {
    name: 'تحليل صحة الغطاء النباتي',
    aliasOf: 'ndvi'
  },
  water_detection: {
    name: 'كشف المسطحات المائية',
    aliasOf: 'mndwi'
  },
  lst: {
    name: 'LST - تقدير درجة حرارة سطح الأرض',
    source: 'MODIS/061/MOD11A2 / Google Earth Engine',
    bandName: 'LST',
    unit: '°C',
    scale: 1000,
    rampName: 'thermal',
    vis: { min: 10, max: 55, palette: thermalPalette },
    build: ({ ee, region, start, end }) =>
      ee
        .ImageCollection('MODIS/061/MOD11A2')
        .filterDate(start, end)
        .filterBounds(region)
        .select('LST_Day_1km')
        .mean()
        .multiply(0.02)
        .subtract(273.15)
        .rename('LST')
        .clip(region)
  },
  thermal_gradient: {
    name: 'خرائط التدرج الحراري',
    aliasOf: 'lst'
  },
  dem: {
    name: 'DEM - الارتفاعات',
    source: 'USGS/SRTMGL1_003 / Google Earth Engine',
    bandName: 'Elevation',
    unit: 'm',
    scale: 30,
    rampName: 'terrain',
    vis: { min: 0, max: 2500, palette: terrainPalette },
    build: ({ ee, region }) => ee.Image('USGS/SRTMGL1_003').select('elevation').rename('Elevation').clip(region)
  },
  slope: {
    name: 'Slope - الانحدار',
    source: 'USGS/SRTMGL1_003 + ee.Terrain.slope / Google Earth Engine',
    bandName: 'Slope',
    unit: 'degree',
    scale: 30,
    rampName: 'terrain',
    vis: { min: 0, max: 45, palette: terrainPalette },
    build: ({ ee, region }) => ee.Terrain.slope(ee.Image('USGS/SRTMGL1_003')).rename('Slope').clip(region)
  },
  hillshade: {
    name: 'Hillshade - الظلال التضاريسية',
    source: 'USGS/SRTMGL1_003 + ee.Terrain.hillshade / Google Earth Engine',
    bandName: 'Hillshade',
    unit: '0-255',
    scale: 30,
    rampName: 'gray',
    vis: { min: 0, max: 255, palette: ['000000', 'ffffff'] },
    build: ({ ee, region }) => ee.Terrain.hillshade(ee.Image('USGS/SRTMGL1_003')).rename('Hillshade').clip(region)
  },
  precipitation: {
    name: 'الأمطار السنوية CHIRPS',
    source: 'UCSB-CHG/CHIRPS/DAILY / Google Earth Engine',
    bandName: 'Precipitation',
    unit: 'mm',
    scale: 5500,
    rampName: 'water',
    vis: { min: 0, max: 1200, palette: ['fff7bc', 'a1dab4', '41b6c4', '225ea8'] },
    build: ({ ee, region, start, end }) =>
      ee
        .ImageCollection('UCSB-CHG/CHIRPS/DAILY')
        .filterDate(start, end)
        .filterBounds(region)
        .select('precipitation')
        .sum()
        .rename('Precipitation')
        .clip(region)
  },
  viirs_lights: {
    name: 'مؤشرات التلوث الضوئي VIIRS',
    source: 'NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG / Google Earth Engine',
    bandName: 'NightLights',
    unit: 'nW/cm²/sr',
    scale: 500,
    rampName: 'lights',
    vis: { min: 0, max: 60, palette: ['000000', '223b53', 'ffff8c', 'ff7f00', 'ffffff'] },
    build: ({ ee, region, start, end }) =>
      ee
        .ImageCollection('NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG')
        .filterDate(start, end)
        .filterBounds(region)
        .select('avg_rad')
        .mean()
        .rename('NightLights')
        .clip(region)
  },
  no2: camsRecipe('NO2 - ثاني أكسيد النيتروجين', 'total_column_nitrogen_dioxide_surface', 'kg/m²', 0, 0.0004),
  co: camsRecipe('CO - أول أكسيد الكربون', 'total_column_carbon_monoxide_surface', 'kg/m²', 0, 0.08),
  so2: camsRecipe('SO2 - ثاني أكسيد الكبريت', 'total_column_sulphur_dioxide_surface', 'kg/m²', 0, 0.002),
  ch4: camsRecipe('CH4 - الميثان', 'total_column_methane_surface', 'kg/m²', 0, 0.08),
  o3: camsRecipe('O3 - الأوزون', 'gems_total_column_ozone_surface', 'kg/m²', 0, 0.25),
  pm25: camsRecipe('PM2.5 - الجسيمات الدقيقة', 'particulate_matter_d_less_than_25_um_surface', 'kg/m³', 0, 0.00008),
  aod: camsRecipe('AOD - الهباء الجوي', 'total_aerosol_optical_depth_at_550nm_surface', 'index', 0, 2.5),
  air_quality: {
    name: 'جودة الهواء عند توفر مصادر مفتوحة',
    aliasOf: 'no2'
  },
  co2: {
    name: 'CO2 - ثاني أكسيد الكربون',
    source: 'CAMS/GEE greenhouse-gas proxy where available',
    bandName: 'CH4',
    unit: 'kg/m²',
    scale: 44528,
    rampName: 'pollution',
    vis: { min: 0, max: 0.08, palette: pollutionPalette },
    build: ({ ee, region, start, end }) =>
      camsImage(ee, region, start, end, 'total_column_methane_surface').rename('CH4').clip(region),
    note:
      'لا يوجد منتج CO2 حضري عام بنفس بساطة NO2 داخل كل السنوات في كتالوج GEE. تعرض هذه البطاقة أقرب غاز دفيئة متاح من CAMS، ويجب عدم تفسيره كقياس أرضي مباشر لثاني أكسيد الكربون.'
  },
  landcover: {
    name: 'تصنيف الغطاء الأرضي ESA WorldCover',
    source: 'ESA/WorldCover/v200 / Google Earth Engine',
    bandName: 'Map',
    unit: 'class',
    scale: 10,
    categorical: true,
    rampName: 'overlay',
    vis: {
      min: 10,
      max: 100,
      palette: ['006400', 'ffbb22', 'ffff4c', 'f096ff', 'fa0000', 'b4b4b4', 'f0f0f0', '0064c8', '0096a0', '00cf75', 'fae6a0']
    },
    build: ({ ee, region }) => ee.ImageCollection('ESA/WorldCover/v200').first().select('Map').clip(region)
  },
  water_occurrence: {
    name: 'تكرار المياه السطحية JRC',
    source: 'JRC/GSW1_4/GlobalSurfaceWater / Google Earth Engine',
    bandName: 'WaterOccurrence',
    unit: '%',
    scale: 30,
    rampName: 'water',
    vis: { min: 0, max: 100, palette: ['ffffff', 'c7e9f1', '41b6c4', '225ea8'] },
    build: ({ ee, region }) => ee.Image('JRC/GSW1_4/GlobalSurfaceWater').select('occurrence').rename('WaterOccurrence').clip(region)
  }
};

export class GeeClient {
  constructor(onStatusChange = () => {}) {
    this.status = 'disconnected';
    this.projectId = '';
    this.oauthClientId = '';
    this.onStatusChange = onStatusChange;
  }

  setStatus(status, message = '') {
    this.status = status;
    this.onStatusChange({ status, message });
  }

  get session() {
    return {
      status: this.status,
      projectId: this.projectId,
      oauthClientId: this.oauthClientId,
      isConnected: this.status === 'connected'
    };
  }

  async restoreSession() {
    const saved = readSession();
    if (!saved?.projectId || !saved?.oauthClientId) return false;
    this.projectId = saved.projectId;
    this.oauthClientId = saved.oauthClientId;
    try {
      this.setStatus('checking', 'جاري استعادة جلسة Earth Engine...');
      await this.authenticateInternal(false);
      this.setStatus('connected', 'تمت استعادة اتصال Earth Engine لهذه الصفحة.');
      return true;
    } catch {
      this.setStatus('disconnected', 'لم يتم العثور على جلسة Google فعالة. اضغط ربط Google Earth Engine.');
      return false;
    }
  }

  async authenticate({ projectId, oauthClientId }) {
    this.projectId = projectId?.trim();
    this.oauthClientId = oauthClientId?.trim();
    if (!this.projectId) throw new Error('أدخل Google Cloud / Earth Engine Project ID مرة واحدة.');
    if (!this.oauthClientId) throw new Error('أدخل OAuth Client ID مرة واحدة.');
    this.setStatus('checking', 'جاري فتح مصادقة Google Earth Engine...');
    await this.authenticateInternal(true);
    writeSession({ projectId: this.projectId, oauthClientId: this.oauthClientId });
    this.setStatus('connected', 'تم الربط المباشر مع Google Earth Engine. اختر مدينة ومؤشرا وسنة ثم اضغط تنفيذ.');
    return this.session;
  }

  async authenticateInternal(interactive) {
    await loadScript(EE_SCRIPT);
    const ee = window.ee;
    if (!ee?.data) throw new Error('تعذر تحميل مكتبة Earth Engine JavaScript الرسمية.');

    await new Promise((resolve, reject) => {
      const finish = () => this.initializeEe(resolve, reject);
      const missing = () => {
        if (!interactive) {
          reject(new Error('لا توجد جلسة Google محفوظة.'));
          return;
        }
        ee.data.authenticateViaPopup(finish, (error) => reject(normalizeEeError(error)));
      };
      ee.data.authenticateViaOauth(
        this.oauthClientId,
        finish,
        (error) => reject(normalizeEeError(error)),
        [EE_READONLY_SCOPE],
        missing,
        true
      );
    });
  }

  initializeEe(resolve, reject) {
    const ee = window.ee;
    const onSuccess = () => resolve(true);
    const onError = (error) => reject(normalizeEeError(error));
    try {
      ee.initialize(null, null, onSuccess, onError, null, this.projectId);
    } catch {
      ee.initialize(null, null, onSuccess, onError);
    }
  }

  async runAnalysis(analysisId, studyArea, dateRange, resolution, context = {}) {
    if (this.status !== 'connected') throw new Error('اربط Google Earth Engine أولا.');
    const ee = window.ee;
    const recipe = resolveRecipe(analysisId);
    if (!recipe) throw new Error('هذا المؤشر غير مضاف بعد إلى وصفات Earth Engine المباشرة.');
    const region = geometryToEe(ee, studyArea);
    const dates = normalizeDates(dateRange);
    const image = recipe.build({ ee, region, start: dates.start, end: dates.end, year: dates.year });
    const mapId = image.getMap(recipe.vis || {});
    const stats = recipe.categorical
      ? await evaluateCategoricalStats(ee, image, region, recipe)
      : await evaluateNumericStats(ee, image, region, recipe);
    return {
      id: analysisId,
      analysisId,
      name: context.name || recipe.name || analysisId,
      source: recipe.source || 'Google Earth Engine',
      dateRange: dates,
      resolution: resolution || `${recipe.scale || 30} متر`,
      stats: {
        ...stats,
        unit: recipe.unit,
        studyAreaM2: approximateArea(studyArea)
      },
      tileUrl: mapIdToTileUrl(mapId),
      bbox: featureBounds(studyArea),
      rampName: recipe.rampName || context.rampName || 'overlay',
      unit: recipe.unit,
      interpretationTemplateId: context.interpretationTemplateId,
      notes: [
        recipe.note || 'تم حساب الخريطة والإحصاءات مباشرة من Google Earth Engine حسب المدينة والسنة المختارتين.',
        'إذا لم تظهر بيانات كافية فقد تكون السنة خارج مدى المنتج أو المنطقة لا تغطيها المشاهد الصالحة.'
      ]
    };
  }

  async getMapTileUrl(context = {}) {
    return this.runAnalysis(context.analysisId || 'ndvi', context.studyArea, context.dateRange, context.resolution, context);
  }

  disconnect(message = 'تم قطع الاتصال محليا.') {
    clearSession();
    this.setStatus('disconnected', message);
  }
}

function resolveRecipe(id) {
  const recipe = GEE_RECIPES[id];
  if (!recipe?.aliasOf) return recipe;
  return { ...GEE_RECIPES[recipe.aliasOf], name: recipe.name || GEE_RECIPES[recipe.aliasOf].name };
}

function sentinelComposite(ee, region, start, end) {
  return ee
    .ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterDate(start, end)
    .filterBounds(region)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 45))
    .median()
    .divide(10000);
}

function camsRecipe(name, band, unit, min, max) {
  return {
    name,
    source: 'ECMWF/CAMS/NRT / Google Earth Engine',
    bandName: band,
    unit,
    scale: 44528,
    rampName: 'pollution',
    vis: { min, max, palette: pollutionPalette },
    build: ({ ee, region, start, end }) => camsImage(ee, region, start, end, band).rename(band).clip(region)
  };
}

function camsImage(ee, region, start, end, band) {
  return ee
    .ImageCollection('ECMWF/CAMS/NRT')
    .filterDate(start, end)
    .filterBounds(region)
    .filter(ee.Filter.eq('model_initialization_hour', 0))
    .select(band)
    .mean();
}

function geometryToEe(ee, geojson) {
  const feature = geojson?.type === 'FeatureCollection' ? geojson.features?.[0] : geojson;
  const geometry = feature?.type === 'Feature' ? feature.geometry : feature?.geometry || feature;
  if (!geometry) throw new Error('اختر مدينة أولا ليتم تحديد منطقة الدراسة تلقائيا.');
  if (geometry.type === 'Polygon') return ee.Geometry.Polygon(geometry.coordinates);
  if (geometry.type === 'MultiPolygon') return ee.Geometry.MultiPolygon(geometry.coordinates);
  if (geometry.type === 'Point') return ee.Geometry.Point(geometry.coordinates).buffer(10_000).bounds();
  return ee.Geometry(geometry);
}

async function evaluateNumericStats(ee, image, region, recipe) {
  const reducer = ee
    .Reducer.min()
    .combine(ee.Reducer.max(), '', true)
    .combine(ee.Reducer.mean(), '', true)
    .combine(ee.Reducer.median(), '', true)
    .combine(ee.Reducer.stdDev(), '', true);
  const dictionary = image.reduceRegion({
    reducer,
    geometry: region,
    scale: recipe.scale || 1000,
    bestEffort: true,
    maxPixels: 1e13,
    tileScale: 4
  });
  const values = await evaluateEe(dictionary);
  return {
    min: readStat(values, 'min'),
    max: readStat(values, 'max'),
    mean: readStat(values, 'mean'),
    median: readStat(values, 'median'),
    stdDev: readStat(values, 'stdDev'),
    classes: []
  };
}

async function evaluateCategoricalStats(ee, image, region, recipe) {
  const dictionary = image.reduceRegion({
    reducer: ee.Reducer.frequencyHistogram(),
    geometry: region,
    scale: recipe.scale || 30,
    bestEffort: true,
    maxPixels: 1e13,
    tileScale: 4
  });
  const values = await evaluateEe(dictionary);
  const histogram = Object.values(values || {})[0] || {};
  const total = Object.values(histogram).reduce((sum, value) => sum + Number(value || 0), 0);
  return {
    min: null,
    max: null,
    mean: null,
    median: null,
    stdDev: null,
    classes: Object.entries(histogram).map(([label, count]) => ({
      label: landCoverLabel(label),
      count,
      percentage: total ? (Number(count) / total) * 100 : null,
      areaM2: null
    }))
  };
}

function evaluateEe(object) {
  return new Promise((resolve, reject) => {
    object.evaluate((value, error) => {
      if (error) reject(normalizeEeError(error));
      else resolve(value);
    });
  });
}

function readStat(values, suffix) {
  const entry = Object.entries(values || {}).find(([key]) => key.endsWith(`_${suffix}`) || key === suffix);
  const value = Number(entry?.[1]);
  return Number.isFinite(value) ? value : null;
}

function mapIdToTileUrl(mapId) {
  if (mapId?.urlFormat) return mapId.urlFormat;
  if (mapId?.tile_fetcher?.url_format) return mapId.tile_fetcher.url_format;
  if (mapId?.tileFetcher?.urlFormat) return mapId.tileFetcher.urlFormat;
  if (mapId?.mapid && mapId?.token) {
    return `https://earthengine.googleapis.com/map/${mapId.mapid}/{z}/{x}/{y}?token=${mapId.token}`;
  }
  throw new Error('تعذر إنشاء رابط بلاطات من نتيجة Earth Engine.');
}

function normalizeDates(dateRange = {}) {
  const year = Number(dateRange.year || String(dateRange.start || '').slice(0, 4) || new Date().getFullYear() - 1);
  return {
    year,
    start: dateRange.start || `${year}-01-01`,
    end: dateRange.end || `${year}-12-31`
  };
}

function approximateArea(geojson) {
  const bounds = featureBounds(geojson);
  if (!bounds) return null;
  const [west, south, east, north] = bounds;
  const latMid = ((south + north) / 2) * (Math.PI / 180);
  const width = Math.abs(east - west) * Math.cos(latMid) * 111_320;
  const height = Math.abs(north - south) * 111_320;
  const area = width * height;
  return Number.isFinite(area) ? area : null;
}

function featureBounds(geojson) {
  const feature = geojson?.type === 'FeatureCollection' ? geojson.features?.[0] : geojson;
  const geometry = feature?.type === 'Feature' ? feature.geometry : feature?.geometry || feature;
  const coords = [];
  collectCoordinates(geometry?.coordinates, coords);
  if (!coords.length) return null;
  const lons = coords.map(([lon]) => lon);
  const lats = coords.map(([, lat]) => lat);
  return [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)];
}

function collectCoordinates(value, output) {
  if (!Array.isArray(value)) return;
  if (typeof value[0] === 'number' && typeof value[1] === 'number') {
    output.push(value);
    return;
  }
  value.forEach((item) => collectCoordinates(item, output));
}

function landCoverLabel(code) {
  const labels = {
    10: 'أشجار',
    20: 'شجيرات',
    30: 'مروج/عشب',
    40: 'زراعة',
    50: 'عمران',
    60: 'أرض عارية',
    70: 'ثلج/جليد',
    80: 'مياه',
    90: 'رطوبة/أراض رطبة',
    95: 'مانغروف',
    100: 'طحالب/نباتات مائية'
  };
  return labels[Number(code)] || `فئة ${code}`;
}

function loadScript(src) {
  if (document.querySelector(`script[src="${src}"]`)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('تعذر تحميل مكتبة Google Earth Engine JavaScript.'));
    document.head.appendChild(script);
  });
}

function normalizeEeError(error) {
  if (!error) return new Error('تعذر تنفيذ طلب Earth Engine.');
  if (error instanceof Error) return error;
  return new Error(error.message || error.details || String(error));
}

function readSession() {
  try {
    return JSON.parse(window.sessionStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

function writeSession(value) {
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(value));
  } catch {
    // إذا كان المتصفح يمنع sessionStorage، يبقى الربط فعالا في ذاكرة الصفحة.
  }
}

function clearSession() {
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // لا يلزم إجراء إضافي.
  }
}

export const geeStatusLabel = {
  disconnected: 'غير متصل',
  checking: 'جاري التحقق',
  connected: 'متصل',
  failed: 'فشل الاتصال'
};
