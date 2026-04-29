import { geeStatusLabel } from '../lib/geeClient';
import { privacyNotice } from '../lib/privacy';

export function renderAuthPanel(geeStatus = 'disconnected') {
  return `
    <section class="control-section auth-panel">
      <div class="section-heading">
        <h2>الربط بـ Google Earth Engine</h2>
        <span class="status-pill" id="gee-status">${geeStatusLabel[geeStatus]}</span>
      </div>
      <label class="field">
        <span>Google Cloud / Earth Engine Project ID</span>
        <input id="gee-project-id" type="text" placeholder="مثال: my-earthengine-project" autocomplete="off" />
      </label>
      <label class="field">
        <span>OAuth Client ID</span>
        <input id="gee-client-id" type="text" placeholder="OAuth Web Client ID من Google Cloud" autocomplete="off" />
      </label>
      <label class="field">
        <span>Asset ID اختياري</span>
        <input id="gee-asset-id" type="text" placeholder="مثال: users/name/asset أو projects/.../assets/..." autocomplete="off" />
      </label>
      <div class="tool-grid two">
        <button id="gee-connect" type="button">اختبار الاتصال</button>
        <button id="gee-load-asset" type="button">اختبار فتح Asset</button>
        <a class="button-link" href="./docs/GEE_SETUP_AR.md" target="_blank" rel="noreferrer">فتح دليل الإعداد</a>
      </div>
      <p class="microcopy">لا يتم تخزين OAuth token في ملفات المشروع. الاتصال يحتاج موافقة Google الحقيقية وصلاحيات Earth Engine.</p>
    </section>
    <section class="control-section auth-panel">
      <div class="section-heading">
        <h2>إعدادات AI</h2>
        <span>مفاتيحك الخاصة فقط</span>
      </div>
      <label class="field">
        <span>مزود التفسير</span>
        <select id="ai-provider">
          <option value="rule-based">تفسير داخلي مجاني</option>
          <option value="gemini">Gemini API Key</option>
          <option value="openai">OpenAI API Key</option>
          <option value="openrouter">OpenRouter API Key</option>
          <option value="ollama">Ollama local endpoint</option>
        </select>
      </label>
      <label class="field">
        <span>API Key أو اتركه فارغا للتفسير الداخلي</span>
        <input id="ai-api-key" type="password" placeholder="استخدم مفتاحي الخاص" autocomplete="off" />
      </label>
      <label class="field">
        <span>النموذج أو endpoint المحلي</span>
        <input id="ai-model-endpoint" type="text" placeholder="model name أو http://localhost:11434" autocomplete="off" />
      </label>
      <label class="checkbox-row">
        <input id="ai-save-local" type="checkbox" />
        <span>أوافق على حفظ المفتاح محليا داخل المتصفح فقط</span>
      </label>
      <div class="tool-grid two">
        <button id="save-ai-settings" type="button">حفظ إعدادات AI محليا</button>
        <button id="delete-ai-keys" class="danger-action" type="button">حذف المفاتيح</button>
        <button id="clear-local-data" class="danger-action" type="button">مسح كل البيانات المحلية</button>
      </div>
      <ul class="privacy-list">
        ${privacyNotice().map((item) => `<li>${item}</li>`).join('')}
      </ul>
    </section>
    <section class="control-section auth-panel">
      <div class="section-heading">
        <h2>Google Drive اختياري</h2>
        <span>غير مفعّل بعد</span>
      </div>
      <p class="microcopy">حفظ الملفات مباشرة إلى Google Drive يحتاج OAuth وصلاحيات Drive واضحة من المستخدم. هذه النسخة تصدّر الملفات محليا من المتصفح، ولا تدّعي رفعها إلى Drive دون تكامل رسمي.</p>
    </section>
  `;
}
