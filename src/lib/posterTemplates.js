import posterTemplates from '../data/poster-templates.json';
import { captureElement, canvasToBlob, downloadBlob, safeFileName } from './exportUtils';
import { formatArea } from './geospatial';
import { colorRamps, formatNumber } from './rasterAnalysis';

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
  const mapCanvas = await captureMapForPoster({ mapElement, result, interpretation, orientation });
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

async function captureMapForPoster({ mapElement, result, interpretation, orientation }) {
  try {
    return await captureElement(mapElement, { scale: 2 });
  } catch (error) {
    console.warn('Map capture failed, using clean analysis snapshot for poster export.', error);
    return createCleanAnalysisCanvas({ result, interpretation, orientation });
  }
}

async function createCleanAnalysisCanvas({ result, interpretation, orientation }) {
  const width = orientation === 'horizontal' ? 1500 : 1100;
  const height = orientation === 'horizontal' ? 860 : 1160;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const padding = 54;
  const stats = result?.stats || {};

  drawBackground(ctx, width, height);
  drawHeader(ctx, result, padding, width);

  const mapBox = {
    x: padding,
    y: 190,
    w: width - padding * 2,
    h: orientation === 'horizontal' ? 390 : 560
  };
  await drawMapLikePanel(ctx, mapBox, result);
  drawLegend(ctx, result, padding, mapBox.y + mapBox.h + 30, width - padding * 2);
  drawStats(ctx, stats, padding, mapBox.y + mapBox.h + 115, width - padding * 2);
  drawInterpretationExcerpt(ctx, interpretation, padding, height - 230, width - padding * 2);

  return canvas;
}

function drawBackground(ctx, width, height) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#07111f');
  gradient.addColorStop(1, '#101926');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

function drawHeader(ctx, result, padding, width) {
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#d8b45d';
  ctx.font = '28px Segoe UI, Tahoma, Arial';
  ctx.fillText('GeoIndex Studio', width - padding, 72);
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 46px Segoe UI, Tahoma, Arial';
  ctx.fillText(result?.name || 'خريطة تحليل جغرافي', width - padding, 128);
  ctx.fillStyle = '#b7c8d9';
  ctx.font = '24px Segoe UI, Tahoma, Arial';
  ctx.fillText(`${result?.source || 'مصدر غير محدد'} · ${formatDateRange(result?.dateRange)}`, width - padding, 166);
}

async function drawMapLikePanel(ctx, box, result) {
  ctx.save();
  roundRect(ctx, box.x, box.y, box.w, box.h, 22);
  ctx.clip();
  ctx.fillStyle = '#dce4df';
  ctx.fillRect(box.x, box.y, box.w, box.h);

  const image = result?.rasterOverlay?.dataUrl ? await loadImage(result.rasterOverlay.dataUrl).catch(() => null) : null;
  if (image) {
    drawCoverImage(ctx, image, box);
  } else {
    drawSyntheticSurface(ctx, box, result);
  }
  ctx.restore();

  ctx.strokeStyle = 'rgba(216,180,93,0.75)';
  ctx.lineWidth = 4;
  roundRect(ctx, box.x, box.y, box.w, box.h, 22);
  ctx.stroke();
}

function drawSyntheticSurface(ctx, box, result) {
  const ramp = colorRamps[result?.rampName] || colorRamps.overlay;
  const gradient = ctx.createLinearGradient(box.x, box.y + box.h, box.x + box.w, box.y);
  ramp.forEach(([, color], index) => gradient.addColorStop(index / Math.max(1, ramp.length - 1), color));
  ctx.fillStyle = gradient;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  for (let i = 0; i < 18; i += 1) {
    const y = box.y + 28 + i * (box.h / 16);
    ctx.beginPath();
    ctx.moveTo(box.x - 40, y);
    ctx.bezierCurveTo(box.x + box.w * 0.25, y - 70, box.x + box.w * 0.65, y + 70, box.x + box.w + 40, y - 20);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawLegend(ctx, result, x, y, width) {
  const ramp = colorRamps[result?.rampName] || colorRamps.overlay;
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 26px Segoe UI, Tahoma, Arial';
  ctx.fillText('مفتاح الخريطة', x + width, y);
  const barY = y + 24;
  const gradient = ctx.createLinearGradient(x, barY, x + width, barY);
  ramp.forEach(([, color], index) => gradient.addColorStop(index / Math.max(1, ramp.length - 1), color));
  ctx.fillStyle = gradient;
  roundRect(ctx, x, barY, width, 26, 13);
  ctx.fill();
  ctx.fillStyle = '#b7c8d9';
  ctx.font = '20px Segoe UI, Tahoma, Arial';
  ctx.textAlign = 'left';
  ctx.fillText(String(ramp[0][0]), x, barY + 58);
  ctx.textAlign = 'right';
  ctx.fillText(String(ramp[ramp.length - 1][0]), x + width, barY + 58);
}

function drawStats(ctx, stats, x, y, width) {
  const items = [
    ['Minimum', formatNumber(stats.min)],
    ['Maximum', formatNumber(stats.max)],
    ['Mean', formatNumber(stats.mean)],
    ['Median', formatNumber(stats.median)],
    ['Std. Dev.', formatNumber(stats.stdDev)],
    ['Area', stats.studyAreaM2 ? formatArea(stats.studyAreaM2) : 'غير متاح']
  ];
  const gap = 14;
  const colW = (width - gap * 2) / 3;
  items.forEach(([label, value], index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const bx = x + col * (colW + gap);
    const by = y + row * 92;
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    roundRect(ctx, bx, by, colW, 74, 12);
    ctx.fill();
    ctx.textAlign = 'right';
    ctx.direction = 'rtl';
    ctx.fillStyle = '#9fb5c8';
    ctx.font = '19px Segoe UI, Tahoma, Arial';
    ctx.fillText(label, bx + colW - 18, by + 28);
    ctx.fillStyle = '#fff6d8';
    ctx.font = '700 22px Segoe UI, Tahoma, Arial';
    ctx.fillText(value, bx + colW - 18, by + 56);
  });
}

function drawInterpretationExcerpt(ctx, interpretation, x, y, width) {
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  roundRect(ctx, x, y, width, 160, 16);
  ctx.fill();
  ctx.fillStyle = '#d8b45d';
  ctx.font = '700 24px Segoe UI, Tahoma, Arial';
  ctx.fillText('ملخص التفسير', x + width - 22, y + 42);
  ctx.fillStyle = '#eef8ff';
  ctx.font = '22px Segoe UI, Tahoma, Arial';
  wrapText(ctx, interpretation || 'لم يتم توليد تفسير بعد.', x + width - 22, y + 78, width - 44, 34, 3);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function drawCoverImage(ctx, image, box) {
  const scale = Math.max(box.w / image.width, box.h / image.height);
  const w = image.width * scale;
  const h = image.height * scale;
  ctx.drawImage(image, box.x + (box.w - w) / 2, box.y + (box.h - h) / 2, w, h);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const words = String(text).replace(/\s+/g, ' ').trim().split(' ');
  let line = '';
  let lineCount = 0;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineHeight;
      lineCount += 1;
      if (lineCount >= maxLines) return;
    } else {
      line = test;
    }
  }
  if (line && lineCount < maxLines) ctx.fillText(line, x, y);
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function formatDateRange(dateRange) {
  if (!dateRange) return 'تاريخ غير محدد';
  if (typeof dateRange === 'string') return dateRange;
  return `${dateRange.start || 'غير محدد'} إلى ${dateRange.end || 'غير محدد'}`;
}
