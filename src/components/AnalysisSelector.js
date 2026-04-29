const categoryLabels = {
  vegetation: 'أولا: مؤشرات الغطاء النباتي',
  water: 'ثانيا: المياه والرطوبة',
  urban: 'ثالثا: العمران والتوسع الحضري',
  climate: 'رابعا: الحرارة والمناخ الحضري',
  terrain: 'خامسا: التضاريس',
  environment: 'سادسا: البيئة والتلوث',
  population: 'سابعا: السكان والخدمات',
  drawing: 'ثامنا: أدوات الرسم والقياس'
};

export function renderAnalysisSelector(catalog, selectedId = 'vector_summary') {
  const groups = catalog.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return `
    <section class="control-section">
      <div class="section-heading">
        <h2>3. نوع التحليل</h2>
        <span>يتم تعطيل ما لا يملك بيانات فعلية</span>
      </div>
      <label class="field">
        <span>اختر التحليل</span>
        <select id="analysis-select">
          ${Object.entries(groups)
            .map(
              ([category, items]) => `
                <optgroup label="${categoryLabels[category] || category}">
                  ${items
                    .map(
                      (item) => `
                        <option value="${item.id}" ${item.id === selectedId ? 'selected' : ''}>
                          ${item.name_ar}${item.browserSupported ? '' : ' - يحتاج GEE/بيانات إضافية'}
                        </option>`
                    )
                    .join('')}
                </optgroup>`
            )
            .join('')}
        </select>
      </label>
      <div class="analysis-meta" id="analysis-meta"></div>
      <div class="band-grid">
        <label><span>Blue</span><input id="band-blue" type="number" min="1" value="1" /></label>
        <label><span>Green</span><input id="band-green" type="number" min="1" value="2" /></label>
        <label><span>Red</span><input id="band-red" type="number" min="1" value="3" /></label>
        <label><span>NIR</span><input id="band-nir" type="number" min="1" value="4" /></label>
        <label><span>SWIR1</span><input id="band-swir1" type="number" min="1" value="5" /></label>
        <label><span>Thermal/DEM</span><input id="band-thermal" type="number" min="1" value="6" /></label>
      </div>
      <label class="field compact-field">
        <span>مسافة Buffer بالمتر</span>
        <input id="buffer-distance" type="number" min="1" step="10" value="1000" />
      </label>
      <button id="run-analysis" class="primary-action" type="button">تنفيذ التحليل</button>
    </section>
  `;
}
