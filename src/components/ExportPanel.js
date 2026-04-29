export function renderExportPanel(templates) {
  return `
    <section class="control-section">
      <div class="section-heading">
        <h2>التصدير</h2>
        <span>لا يتم تحويل Raster إلى Shapefile دون تحويل حقيقي</span>
      </div>
      <label class="field">
        <span>قالب البوستر</span>
        <select id="poster-template">
          ${templates
            .map((template) => `<option value="${template.id}">${template.name_ar}</option>`)
            .join('')}
        </select>
      </label>
      <div class="export-grid">
        <button id="export-png" type="button">تصدير صورة PNG</button>
        <button id="export-poster-vertical" type="button">بوستر GIS عمودي</button>
        <button id="export-poster-horizontal" type="button">بوستر GIS أفقي</button>
        <button id="export-pdf" type="button">تصدير PDF</button>
        <button id="export-geojson" type="button">تصدير GeoJSON</button>
        <button id="export-shapefile" type="button">تصدير Shapefile</button>
        <button id="export-kml" type="button">تصدير KML</button>
      </div>
      <p class="microcopy">تصدير الصور يعتمد على قدرة المتصفح والبلاطات التي تسمح CORS. إذا رفض مصدر خرائط خارجي الالتقاط، جرّب OSM أو صدّر البيانات Vector.</p>
    </section>
  `;
}
