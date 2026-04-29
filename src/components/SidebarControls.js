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
  return `
    <section class="control-section">
      <div class="section-heading">
        <h2>2. منطقة الدراسة</h2>
        <span>بحث، رسم، أو رفع ملف</span>
      </div>
      <form id="search-form" class="search-row">
        <input id="place-search" type="search" placeholder="ابحث عن دولة، مدينة، قرية..." autocomplete="off" />
        <button type="submit">بحث</button>
      </form>
      <div id="search-results" class="search-results"></div>
      <div class="tool-grid">
        <button data-draw="marker" type="button">رسم نقطة</button>
        <button data-draw="polyline" type="button">رسم خط</button>
        <button data-draw="polygon" type="button">رسم مضلع</button>
        <button data-draw="rectangle" type="button">مستطيل AOI</button>
        <button id="measure-distance" data-draw="polyline" type="button">قياس مسافة</button>
        <button id="measure-area" data-draw="polygon" type="button">قياس مساحة</button>
        <button id="clear-drawings" class="danger-action" type="button">حذف الرسومات</button>
      </div>
      <label class="file-drop">
        <span>رفع GeoJSON / KML / GPX / CSV / Shapefile ZIP / GeoTIFF</span>
        <input id="file-upload" type="file" accept=".geojson,.json,.kml,.gpx,.csv,.zip,.tif,.tiff" />
      </label>
      <button id="load-sample" class="secondary-action" type="button">تحميل بيانات تجريبية محسوبة</button>
      <div class="date-grid">
        <label><span>من</span><input id="date-start" type="date" /></label>
        <label><span>إلى</span><input id="date-end" type="date" /></label>
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
    </section>
  `;
}
