export const mapSources = [
  {
    id: 'osm',
    nameAr: 'OpenStreetMap',
    nameEn: 'OpenStreetMap',
    type: 'tile',
    browserSupported: true,
    requiresKey: false,
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    notes: 'الخريطة الافتراضية المجانية. لا تستخدم لاستخراج قيم طيفية.'
  },
  {
    id: 'esri_imagery',
    nameAr: 'Esri World Imagery',
    nameEn: 'Esri World Imagery',
    type: 'tile',
    browserSupported: true,
    requiresKey: false,
    maxZoom: 19,
    attribution:
      'Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    url:
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    notes: 'طبقة صور للعرض البصري فقط ضمن شروط Esri.'
  },
  {
    id: 'nasa_gibs_viirs',
    nameAr: 'NASA GIBS VIIRS True Color',
    nameEn: 'NASA GIBS VIIRS True Color',
    type: 'wmts',
    browserSupported: true,
    requiresKey: false,
    maxZoom: 9,
    attribution:
      'Imagery by NASA EOSDIS GIBS, part of NASA Earthdata',
    urlForDate: (date) =>
      `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
    notes:
      'طبقة عرض يومية تقريبا. إذا لم تظهر البلاطات فاختر تاريخا أقدم أو استخدم OSM/Esri.'
  },
  {
    id: 'sentinel_copernicus',
    nameAr: 'Sentinel / Copernicus',
    nameEn: 'Sentinel / Copernicus',
    type: 'stac',
    browserSupported: false,
    requiresKey: false,
    geeSupported: true,
    notes:
      'غير مفعلة كطبقة مباشرة في هذه النسخة لأن اختيار المنتجات وقراءة COG/STAC يحتاج مسارا أو خادما مخصصا. يمكن استخدامها عبر GEE بعد المصادقة أو برفع GeoTIFF.'
  },
  {
    id: 'landsat',
    nameAr: 'Landsat',
    nameEn: 'Landsat',
    type: 'stac',
    browserSupported: false,
    requiresKey: false,
    geeSupported: true,
    notes:
      'غير مفعلة مباشرة دون اختيار مشاهد أو GEE. داخل المتصفح يمكن رفع GeoTIFF محسوب أو متعدد الحزم.'
  },
  {
    id: 'modis',
    nameAr: 'NASA MODIS',
    nameEn: 'NASA MODIS',
    type: 'catalog',
    browserSupported: false,
    requiresKey: false,
    geeSupported: true,
    notes:
      'تحتاج تحميل منتجات جاهزة أو استخدام GEE. لا يتم ادعاء التحليل دون مصدر بيانات فعلي.'
  },
  {
    id: 'google_maps_optional',
    nameAr: 'Google Maps اختياري',
    nameEn: 'Google Maps Optional',
    type: 'api',
    browserSupported: false,
    requiresKey: true,
    geeSupported: false,
    notes:
      'غير مفعلة افتراضيا. تحتاج API Key من المستخدم وقد تتطلب فوترة Google. لا توجد مفاتيح مخفية في المشروع.'
  },
  {
    id: 'gee',
    nameAr: 'Google Earth Engine اختياري',
    nameEn: 'Google Earth Engine Optional',
    type: 'gee',
    browserSupported: false,
    requiresKey: false,
    geeSupported: true,
    notes:
      'يتطلب Project ID وOAuth Client ID وحساب Earth Engine مفعل. التحليلات عبره لا تعمل دون مصادقة حقيقية.'
  }
];

export const sourceById = (id) => mapSources.find((source) => source.id === id);

export function getTileLayerOptions(source, date) {
  if (!source || !source.browserSupported) return null;
  const url = source.urlForDate ? source.urlForDate(date) : source.url;
  return {
    url,
    options: {
      attribution: source.attribution,
      maxZoom: source.maxZoom || 18,
      crossOrigin: true
    }
  };
}

export function availableResolutionsForSource(sourceId) {
  const matrix = {
    osm: ['متغيرة - خريطة أساس فقط'],
    esri_imagery: ['متغيرة - عرض فقط'],
    nasa_gibs_viirs: ['375m', '750m', '1km تقريبا'],
    sentinel_copernicus: ['10m', '20m', '60m'],
    landsat: ['30m', '100m حراري تقريبا'],
    modis: ['250m', '500m', '1km'],
    gee: ['حسب المجموعة المختارة']
  };
  return matrix[sourceId] || ['غير محدد'];
}
