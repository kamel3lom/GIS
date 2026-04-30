export function renderTabs(activeTab = 'analysis') {
  const tabs = [
    ['analysis', 'التحليل'],
    ['results', 'النتائج والمؤشرات'],
    ['export', 'التصدير'],
    ['data', 'البيانات والمصادر'],
    ['help', 'المساعدة']
  ];
  return `
    <nav class="tab-list" aria-label="تبويبات التحكم">
      ${tabs
        .map(
          ([id, label]) => `
            <button class="tab-button ${id === activeTab ? 'is-active' : ''}" data-tab="${id}" type="button">${label}</button>
          `
        )
        .join('')}
    </nav>
  `;
}

export function renderStudyAreaControls() {
  const currentYear = new Date().getFullYear();
  const defaultYear = currentYear - 1;
  return `
    <section class="control-section">
      <div class="section-heading">
        <h2>1. المدينة والسنة</h2>
        <span>بدون رسم أو ملفات</span>
      </div>
      <form id="search-form" class="search-row">
        <input id="place-search" type="search" placeholder="ابحث عن مدينة أو عاصمة..." autocomplete="off" />
        <button type="submit">اختيار المدينة</button>
      </form>
      <div id="search-results" class="search-results"></div>
      <div class="date-grid">
        <label><span>السنة</span><input id="analysis-year" type="number" min="1984" max="${currentYear}" value="${defaultYear}" /></label>
        <input id="date-start" type="hidden" />
        <input id="date-end" type="hidden" />
        <label><span>الدقة</span>
          <select id="resolution-select">
            <option value="10">10 متر</option>
            <option value="20">20 متر</option>
            <option value="30" selected>30 متر</option>
            <option value="100">100 متر</option>
            <option value="250">250 متر</option>
            <option value="500">500 متر</option>
            <option value="1000">1 كم</option>
          </select>
        </label>
      </div>
      <p class="microcopy">اختيار المدينة يحول حدودها تلقائيا إلى منطقة دراسة ويشغل التحليل عبر GEE عند توفر الربط.</p>
    </section>
  `;
}
