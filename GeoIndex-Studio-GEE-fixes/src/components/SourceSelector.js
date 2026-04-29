import { availableResolutionsForSource, mapSources } from '../lib/sourcesRegistry';

export function renderSourceSelector(currentSource = 'osm') {
  return `
    <section class="control-section">
      <div class="section-heading">
        <h2>1. مصدر الخريطة</h2>
        <span>الوضع المجاني الافتراضي</span>
      </div>
      <div class="source-grid">
        ${mapSources
          .map((source) => {
            const active = source.id === currentSource ? 'is-active' : '';
            const disabled = source.browserSupported ? '' : 'is-disabled';
            const label = source.browserSupported ? 'مفعّل' : source.requiresKey ? 'يحتاج مفتاح/مصادقة' : 'غير مفعّل بعد';
            return `
              <button class="source-card ${active} ${disabled}" data-source-id="${source.id}" type="button">
                <strong>${source.nameAr}</strong>
                <small>${label}</small>
                <span>${source.notes}</span>
              </button>
            `;
          })
          .join('')}
      </div>
      <label class="field">
        <span>تاريخ طبقات NASA GIBS عند استخدامها</span>
        <input id="source-date" type="date" value="${new Date(Date.now() - 86400000).toISOString().slice(0, 10)}" />
      </label>
      <p class="microcopy" id="resolution-hint">الدقات المتاحة: ${availableResolutionsForSource(currentSource).join('، ')}</p>
    </section>
  `;
}
