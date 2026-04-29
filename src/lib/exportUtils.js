import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import tokml from 'tokml';
import shpwrite from '@mapbox/shp-write';

export function safeFileName(value, extension) {
  const base = String(value || 'geoindex-export')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 80);
  const suffix = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  return `${base}-${suffix}.${extension}`;
}

export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function downloadText(text, fileName, type = 'application/json;charset=utf-8') {
  downloadBlob(new Blob([text], { type }), fileName);
}

export async function captureElement(element, options = {}) {
  if (!element) throw new Error('لا يوجد عنصر لتصديره.');
  return html2canvas(element, {
    backgroundColor: options.backgroundColor || '#07111f',
    scale: options.scale || 2,
    useCORS: true,
    allowTaint: false,
    logging: false,
    ...options
  });
}

export async function exportElementAsPng(element, title = 'GeoIndex-Studio') {
  const canvas = await captureElement(element);
  const blob = await canvasToBlob(canvas, 'image/png');
  downloadBlob(blob, safeFileName(title, 'png'));
  return blob;
}

export async function exportElementAsPdf(element, title = 'GeoIndex-Studio') {
  const canvas = await captureElement(element, { backgroundColor: '#ffffff', scale: 2 });
  const imageData = canvas.toDataURL('image/png');
  const orientation = canvas.width >= canvas.height ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ orientation, unit: 'px', format: [canvas.width, canvas.height] });
  pdf.addImage(imageData, 'PNG', 0, 0, canvas.width, canvas.height);
  pdf.save(safeFileName(title, 'pdf'));
}

export function exportGeoJSON(geojson, title = 'geoindex-vector') {
  if (!geojson?.features?.length) {
    throw new Error('لا توجد بيانات Vector صالحة لتصدير GeoJSON.');
  }
  downloadText(JSON.stringify(geojson, null, 2), safeFileName(title, 'geojson'));
}

export function exportKML(geojson, title = 'geoindex-kml') {
  if (!geojson?.features?.length) {
    throw new Error('لا توجد بيانات Vector صالحة لتصدير KML.');
  }
  const kml = tokml(geojson, {
    name: 'name',
    description: 'description'
  });
  downloadText(kml, safeFileName(title, 'kml'), 'application/vnd.google-earth.kml+xml;charset=utf-8');
}

export function exportShapefile(geojson, title = 'geoindex-shapefile') {
  if (!geojson?.features?.length) {
    throw new Error('لا توجد بيانات Vector صالحة لتصدير Shapefile.');
  }
  const hasRasterOnly = geojson.features.some((feature) => !feature.geometry);
  if (hasRasterOnly) {
    throw new Error('لا يمكن تصدير Raster إلى Shapefile دون تحويل Vector حقيقي.');
  }
  const zipped = shpwrite.zip(geojson, {
    folder: title,
    types: {
      point: 'points',
      polygon: 'polygons',
      line: 'lines'
    }
  });
  const blob = zipped instanceof Blob ? zipped : new Blob([zipped], { type: 'application/zip' });
  downloadBlob(blob, safeFileName(title, 'zip'));
}

export function buildMetadataBlock(result, interpretation, context = {}) {
  return {
    title: context.title || result?.name || 'GeoIndex Studio',
    areaName: context.areaName || 'منطقة الدراسة',
    source: result?.source || 'غير محدد',
    dateRange: typeof result?.dateRange === 'string'
      ? result.dateRange
      : `${result?.dateRange?.start || 'غير محدد'} - ${result?.dateRange?.end || 'غير محدد'}`,
    resolution: result?.resolution || 'غير متاح',
    interpretation: interpretation || 'لم يتم توليد تفسير بعد.',
    stamp: 'kamel3lom'
  };
}

export function canvasToBlob(canvas, type = 'image/png', quality = 0.95) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('تعذر إنشاء ملف الصورة من Canvas.'));
    }, type, quality);
  });
}
