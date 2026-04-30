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

const directGeeAnalysisIds = new Set([
  'ndvi',
  'evi',
  'savi',
  'gndvi',
  'ndmi',
  'ndwi',
  'mndwi',
  'ndbi',
  'built_up',
  'vegetation_health',
  'water_detection',
  'lst',
  'thermal_gradient',
  'dem',
  'slope',
  'hillshade',
  'precipitation',
  'viirs_lights',
  'no2',
  'co2',
  'co',
  'so2',
  'ch4',
  'o3',
  'pm25',
  'aod',
  'air_quality',
  'landcover',
  'water_occurrence'
]);

export function renderAnalysisSelector(catalog, selectedId = 'vector_summary') {
  const directCatalog = catalog.filter((item) => directGeeAnalysisIds.has(item.id));
  const groups = directCatalog.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return `
    <section class="control-section">
      <div class="section-heading">
        <h2>2. نوع التحليل</h2>
        <span>اختر المؤشر ثم اضغط تنفيذ</span>
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
                          ${item.name_ar}${item.geeSupported ? ' - GEE مباشر' : ''}
                        </option>`
                    )
                    .join('')}
                </optgroup>`
            )
            .join('')}
        </select>
      </label>
      <div class="analysis-meta" id="analysis-meta"></div>
      <button id="run-analysis" class="primary-action" type="button">تنفيذ التحليل من Google Earth Engine</button>
    </section>
  `;
}
