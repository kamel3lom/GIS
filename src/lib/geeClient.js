const GIS_SCRIPT = 'https://accounts.google.com/gsi/client';
const EE_ROOT = 'https://earthengine.googleapis.com/v1alpha';
const EE_SCOPE = 'https://www.googleapis.com/auth/earthengine https://www.googleapis.com/auth/cloud-platform';

export class GeeClient {
  constructor(onStatusChange = () => {}) {
    this.status = 'disconnected';
    this.projectId = '';
    this.oauthClientId = '';
    this.accessToken = '';
    this.onStatusChange = onStatusChange;
  }

  setStatus(status, message = '') {
    this.status = status;
    this.onStatusChange({ status, message });
  }

  async authenticate({ projectId, oauthClientId }) {
    this.projectId = projectId?.trim();
    this.oauthClientId = oauthClientId?.trim();
    if (!this.projectId) throw new Error('أدخل Google Cloud / Earth Engine Project ID.');
    if (!this.oauthClientId) throw new Error('أدخل OAuth Client ID لتسجيل الدخول الحقيقي.');

    this.setStatus('checking', 'جاري فتح نافذة المصادقة من Google...');
    await loadScript(GIS_SCRIPT);
    const token = await requestAccessToken(this.oauthClientId);
    this.accessToken = token;
    await this.initialize(this.projectId);
    this.setStatus('connected', 'تم التحقق من الاتصال بواجهة Earth Engine REST.');
    return true;
  }

  async initialize(projectId = this.projectId) {
    if (!this.accessToken) throw new Error('لا يوجد OAuth token في الذاكرة. أعد تسجيل الدخول.');
    const response = await this.eeFetch(`${EE_ROOT}/projects/${encodeURIComponent(projectId)}/config`);
    if (!response.ok) {
      const text = await response.text();
      this.setStatus('failed', 'فشل التحقق من مشروع Earth Engine.');
      throw new Error(
        `فشل التحقق من المشروع. تأكد من تفعيل Earth Engine API وأن حسابك لديه صلاحية. ${text.slice(0, 160)}`
      );
    }
    return response.json();
  }

  async loadAsset(assetId) {
    if (!assetId) throw new Error('أدخل Asset ID أولا.');
    if (!this.accessToken || !this.projectId) throw new Error('اتصل بـ Google Earth Engine أولا.');
    const normalized = normalizeAssetName(assetId, this.projectId);
    const response = await this.eeFetch(`${EE_ROOT}/${normalized}`);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`تعذر فتح الأصل. تحقق من Asset ID والصلاحيات. ${text.slice(0, 160)}`);
    }
    return response.json();
  }

  async runAnalysis() {
    throw new Error(
      'تنفيذ تحليلات Earth Engine الكاملة غير مفعّل بعد في هذه النسخة. الاتصال الحقيقي واختبار المشروع متاحان، أما تشغيل التحليل فيحتاج إضافة تعبيرات EE ومراجعة صلاحيات الحساب.'
    );
  }

  async getMapTileUrl() {
    throw new Error(
      'عرض بلاطات Earth Engine غير مفعّل بعد. لا يتم ادعاء توفر طبقة GEE دون إنشاء Map ID حقيقي من Earth Engine.'
    );
  }

  async getStatistics() {
    throw new Error(
      'إحصاءات Earth Engine غير مفعّلة بعد. استخدم التحليل داخل المتصفح أو ارفع GeoTIFF/GeoJSON إلى أن يكتمل تكامل GEE.'
    );
  }

  async exportToDrive() {
    throw new Error(
      'تصدير Earth Engine إلى Google Drive غير مفعّل في نسخة GitHub Pages. يحتاج تدفق OAuth وصلاحيات Drive واضحة من المستخدم.'
    );
  }

  disconnect() {
    this.accessToken = '';
    this.setStatus('disconnected', 'تم قطع الاتصال محليا. لم يتم تخزين token في ملفات المشروع.');
  }

  async eeFetch(url, options = {}) {
    return fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${this.accessToken}`,
        Accept: 'application/json'
      }
    });
  }
}

function loadScript(src) {
  if (document.querySelector(`script[src="${src}"]`)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('تعذر تحميل مكتبة Google Identity Services.'));
    document.head.appendChild(script);
  });
}

function requestAccessToken(clientId) {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error('مكتبة Google Identity Services لم تحمل بشكل صحيح.'));
      return;
    }
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: EE_SCOPE,
      prompt: 'consent',
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
        } else {
          resolve(response.access_token);
        }
      }
    });
    tokenClient.requestAccessToken();
  });
}

function normalizeAssetName(assetId, projectId) {
  if (assetId.startsWith('projects/')) return assetId;
  const clean = assetId.replace(/^\/+/, '');
  if (clean.startsWith('users/')) {
    return `projects/earthengine-legacy/assets/${clean
      .split('/')
      .map(encodeURIComponent)
      .join('/')}`;
  }
  if (/^[A-Z0-9_]+(\/[A-Z0-9_.$-]+)+$/.test(clean)) {
    return `projects/earthengine-public/assets/${clean
      .split('/')
      .map(encodeURIComponent)
      .join('/')}`;
  }
  return `projects/${encodeURIComponent(projectId)}/assets/${clean
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;
}

export const geeStatusLabel = {
  disconnected: 'غير متصل',
  checking: 'جاري التحقق',
  connected: 'متصل',
  failed: 'فشل الاتصال'
};
