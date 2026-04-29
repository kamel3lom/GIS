export function renderHelpPanel() {
  return `
    <section class="control-section">
      <h2>مساعدة سريعة</h2>
      <ol class="help-list">
        <li>اختر مصدر خريطة. OSM وEsri يعملان كطبقات عرض مجانية.</li>
        <li>ابحث عن مكان أو ارسم مضلع منطقة الدراسة أو ارفع GeoJSON/KML/GPX/CSV/Shapefile ZIP.</li>
        <li>لتحليلات Raster مثل NDVI ارفع GeoTIFF متعدد الحزم ثم اضبط أرقام الحزم.</li>
        <li>اضغط تنفيذ التحليل. أي تحليل لا يملك بيانات فعلية سيظهر سبب عدم التفعيل بوضوح.</li>
        <li>استخدم التفسير الداخلي المجاني أو أدخل API Key خاصا بك لمزود AI.</li>
        <li>صدّر الخريطة أو البوستر أو بيانات Vector حسب نوع النتيجة.</li>
      </ol>
      <div class="doc-links">
        <a href="./docs/USER_GUIDE_AR.md" target="_blank" rel="noreferrer">دليل المستخدم العربي</a>
        <a href="./docs/USER_GUIDE_EN.md" target="_blank" rel="noreferrer">English guide</a>
        <a href="./docs/LIMITATIONS.md" target="_blank" rel="noreferrer">حدود الأداة</a>
        <a href="./docs/PRIVACY.md" target="_blank" rel="noreferrer">الخصوصية</a>
      </div>
      <div class="reference-search">
        <h2>بحث اختياري عن مراجع مساعدة</h2>
        <form id="reference-search-form" class="search-row">
          <input id="reference-query" type="search" placeholder="مثال: NDVI Landsat interpretation" />
          <button type="submit">البحث عن مراجع مساعدة</button>
        </form>
        <div id="reference-results" class="catalog-list"></div>
        <p class="microcopy">البحث لا يدخل في حساب النتائج ولا يخلط المعلومات العامة مع القيم المحسوبة.</p>
      </div>
    </section>
  `;
}
