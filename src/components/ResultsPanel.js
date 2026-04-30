import { formatArea, formatDistance } from '../lib/geospatial';
import { formatNumber } from '../lib/rasterAnalysis';

export function renderResultsPanel(result) {
  if (!result) {
    return `
      <section class="empty-state">
        <h2>لا توجد نتائج بعد</h2>
        <p>اختر مدينة وسنة ومؤشرا ثم اضغط "تنفيذ التحليل". لن تظهر أي نسبة إلا بعد حسابها فعليا من Google Earth Engine.</p>
      </section>
    `;
  }
  const stats = result.stats || {};
  const rows = [
    ['اسم التحليل', result.name],
    ['مصدر البيانات', result.source || 'غير محدد'],
    ['تاريخ البيانات', formatDateRange(result.dateRange)],
    ['الدقة', result.resolution || 'غير متاح'],
    ['مساحة منطقة الدراسة', stats.human?.studyArea || formatArea(stats.studyAreaM2 || stats.totalAreaM2)],
    ['Minimum', formatNumber(stats.min)],
    ['Maximum', formatNumber(stats.max)],
    ['Mean', formatNumber(stats.mean)],
    ['Median', formatNumber(stats.median)],
    ['Standard Deviation', formatNumber(stats.stdDev)],
    ['مجموع الأطوال', stats.human?.totalLength || formatDistance(stats.totalLengthM)],
    ['المحيط', stats.human?.totalPerimeter || formatDistance(stats.totalPerimeterM)]
  ];
  const classRows = (stats.classes || [])
    .map(
      (item) => `
        <tr>
          <td>${item.label}</td>
          <td>${item.count ?? 'غير متاح'}</td>
          <td>${item.areaM2 == null ? 'غير متاح بسبب نقص البيانات' : formatArea(item.areaM2)}</td>
          <td>${item.percentage == null ? 'غير متاح' : `${item.percentage.toFixed(2)}%`}</td>
        </tr>`
    )
    .join('');

  return `
    <section class="results-panel">
      <h2>${result.name}</h2>
      <div class="metric-grid">
        ${rows
          .map(
            ([label, value]) => `
              <article class="metric-card">
                <span>${label}</span>
                <strong>${value ?? 'غير متاح بسبب نقص البيانات'}</strong>
              </article>`
          )
          .join('')}
      </div>
      <h3>النسب حسب الفئات</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>الفئة</th><th>العدد</th><th>المساحة</th><th>النسبة</th></tr></thead>
          <tbody>${classRows || '<tr><td colspan="4">غير متاح بسبب نقص البيانات</td></tr>'}</tbody>
        </table>
      </div>
      <canvas id="results-chart" height="170"></canvas>
      <p class="microcopy">${(result.notes || []).join(' ')}</p>
    </section>
  `;
}

function formatDateRange(dateRange) {
  if (!dateRange) return 'غير متاح';
  if (typeof dateRange === 'string') return dateRange;
  return `${dateRange.start || 'غير محدد'} إلى ${dateRange.end || 'غير محدد'}`;
}
