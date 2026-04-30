export function renderAIInterpretationPanel(interpretation = '') {
  return `
    <section class="ai-panel">
      <div class="ai-panel-header">
        <div>
          <h2>تفسير النتيجة بالذكاء الاصطناعي</h2>
          <p>التفسير الداخلي يقرأ اسم المؤشر والقيم المحسوبة والفئات الظاهرة، ولا يستبدل التحليل بمؤشر آخر.</p>
        </div>
        <div class="ai-actions">
          <button id="interpret-result" type="button">تفسير النتيجة بالذكاء الاصطناعي</button>
          <button id="copy-interpretation" type="button">نسخ التفسير</button>
          <button id="export-interpretation-map" type="button">تصدير التفسير مع الخريطة</button>
        </div>
      </div>
      <textarea id="interpretation-text" readonly placeholder="سيظهر التفسير الأكاديمي هنا...">${interpretation}</textarea>
    </section>
  `;
}
