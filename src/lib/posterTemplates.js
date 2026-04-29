import posterTemplates from '../data/poster-templates.json';
import { captureElement, canvasToBlob, downloadBlob, safeFileName } from './exportUtils';
import { formatArea } from './geospatial';
import { formatNumber } from './rasterAnalysis';

export function getPosterTemplates() {
  return posterTemplates;
}

export function renderPosterElement({ mapCanvas, result, interpretation, templateId, orientation = 'vertical' }) {
  const template = posterTemplates.find((item) => item.id === templateId) || posterTemplates[0];
  const poster = document.createElement('section');
  poster.className = `poster poster-${orientation}`;
  poster.dir = 'rtl';
  poster.style.setProperty('--poster-bg', template.background);
  poster.style.setProperty('--poster-text', template.text);
  poster.style.setProperty('--poster-accent', template.accent);
  poster.style.setProperty('--poster-panel', template.panel);

  const stats = result?.stats || {};
  const classes = stats.classes || [];
  const classRows = classes
    .map(
      (item) => `
        <tr>
          <td>${item.label}</td>
          <td>${item.percentage == null ? 'غير متاح' : `${item.percentage.toFixed(2)}%`}</td>
          <td>${item.areaM2 == null ? 'غير متاح' : formatArea(item.areaM2)}</td>
        </tr>`
    )
    .join('');

  poster.innerHTML = `
    <div class="poster-watermark">${template.watermark} · ${template.watermark} · ${template.watermark}</div>
    <header class="poster-header">
      <div>
        <p>GeoIndex Studio</p>
        <h1>${result?.name || 'خريطة تحليل جغرافي'}</h1>
      </div>
      <strong>kamel3lom</strong>
    </header>
    <main class="poster-main">
      <figure class="poster-map">
        <img alt="map export" src="${mapCanvas.toDataURL('image/png')}" />
        <span class="north-arrow">N</span>
        <span class="scale-note">مقياس تقريبي حسب مستوى التكبير</span>
      </figure>
      <aside class="poster-stats">
        <h2>المؤشرات</h2>
        <dl>
          <dt>المصدر</dt><dd>${result?.source || 'غير محدد'}</dd>
          <dt>الدقة</dt><dd>${result?.resolution || 'غير متاح'}</dd>
          <dt>Minimum</dt><dd>${formatNumber(stats.min)}</dd>
          <dt>Maximum</dt><dd>${formatNumber(stats.max)}</dd>
          <dt>Mean</dt><dd>${formatNumber(stats.mean)}</dd>
          <dt>Median</dt><dd>${formatNumber(stats.median)}</dd>
          <dt>Std. Dev.</dt><dd>${formatNumber(stats.stdDev)}</dd>
        </dl>
        <table>
          <thead><tr><th>الفئة</th><th>النسبة</th><th>المساحة</th></tr></thead>
          <tbody>${classRows || '<tr><td colspan="3">غير متاح بسبب نقص البيانات</td></tr>'}</tbody>
        </table>
      </aside>
      <section class="poster-interpretation">
        <h2>التفسير الأكاديمي</h2>
        <p>${interpretation || 'لم يتم توليد تفسير بعد.'}</p>
      </section>
    </main>
    <footer class="poster-footer">
      <span>GeoIndex Studio · kamel3lom</span>
      <span>${new Date().toLocaleString('ar-SA')}</span>
    </footer>
  `;
  return poster;
}

export async function exportPoster({ mapElement, result, interpretation, templateId, orientation }) {
  const mapCanvas = await captureElement(mapElement, { scale: 2 });
  const poster = renderPosterElement({ mapCanvas, result, interpretation, templateId, orientation });
  poster.style.position = 'fixed';
  poster.style.inset = '-100000px auto auto -100000px';
  poster.style.width = orientation === 'horizontal' ? '1920px' : '1365px';
  poster.style.height = orientation === 'horizontal' ? '1080px' : '2048px';
  document.body.appendChild(poster);
  const canvas = await captureElement(poster, {
    scale: 1,
    width: orientation === 'horizontal' ? 1920 : 1365,
    height: orientation === 'horizontal' ? 1080 : 2048,
    backgroundColor: null
  });
  poster.remove();
  const blob = await canvasToBlob(canvas);
  downloadBlob(blob, safeFileName(`GeoIndex-Poster-${orientation}`, 'png'));
  return blob;
}
