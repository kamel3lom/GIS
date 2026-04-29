const GIS_SCRIPT = 'https://accounts.google.com/gsi/client';
const EE_ROOT = 'https://earthengine.googleapis.com/v1alpha';
const EE_SCOPE = 'https://www.googleapis.com/auth/earthengine https://www.googleapis.com/auth/cloud-platform';
const SESSION_KEY = 'geoindex:gee-session';

export class GeeClient {
  constructor(onStatusChange = () => {}) {
    this.status = 'disconnected';
    this.projectId = '';
    this.oauthClientId = '';
    this.assetId = '';
    this.serverUrl = '';
    this.accessToken = '';
    this.expiresAt = 0;
    this.onStatusChange = onStatusChange;
  }

  setStatus(status, message = '') {
    this.status = status;
    this.onStatusChange({ status, message });
  }

  get session() {
    return {
      status: this.status,
      projectId: this.projectId,
      oauthClientId: this.oauthClientId,
      assetId: this.assetId,
      serverUrl: this.serverUrl,
      isConnected: this.status === 'connected' && Boolean(this.accessToken)
    };
  }

  async restoreSession() {
    const saved = readSession();
    if (!saved?.accessToken || !saved?.projectId || !saved?.oauthClientId) return false;
    if (saved.expiresAt && saved.expiresAt < Date.now() + 60_000) {
      clearSession();
      return false;
    }

    this.projectId = saved.projectId;
    this.oauthClientId = saved.oauthClientId;
    this.assetId = saved.assetId || '';
    this.serverUrl = saved.serverUrl || '';
    this.accessToken = saved.accessToken;
    this.expiresAt = saved.expiresAt || 0;

    try {
      this.setStatus('checking', 'جاري استعادة اتصال Earth Engine المحفوظ لهذه الصفحة...');
      await this.initialize(this.projectId);
      this.setStatus('connected', 'تمت استعادة اتصال Earth Engine. سيبقى الاتصال فعالا حتى إغلاق الصفحة أو انتهاء صلاحية Google token.');
      return true;
    } catch {
      this.disconnect('انتهت صلاحية جلسة Earth Engine السابقة. أعد الربط مرة واحدة.');
      return false;
    }
  }

  async authenticate({ projectId, oauthClientId, assetId = '', serverUrl = '' }) {
    this.projectId = projectId?.trim();
    this.oauthClientId = oauthClientId?.trim();
    this.assetId = assetId?.trim();
    this.serverUrl = normalizeServerUrl(serverUrl);
    if (!this.projectId) throw new Error('أدخل Google Cloud / Earth Engine Project ID.');
    if (!this.oauthClientId) throw new Error('أدخل OAuth Client ID لتسجيل الدخول الحقيقي.');

    this.setStatus('checking', 'جاري فتح نافذة المصادقة من Google...');
    await loadScript(GIS_SCRIPT);
    const token = await requestAccessToken(this.oauthClientId);
    this.accessToken = token.accessToken;
    this.expiresAt = token.expiresAt;
    await this.initialize(this.projectId);
    this.saveSession();
    this.setStatus('connected', 'تم الربط مع Earth Engine وحفظ الجلسة حتى إغلاق الصفحة.');
    return this.session;
  }

  saveSession() {
    writeSession({
      projectId: this.projectId,
      oauthClientId: this.oauthClientId,
      assetId: this.assetId,
      serverUrl: this.serverUrl,
      accessToken: this.accessToken,
      expiresAt: this.expiresAt
    });
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

  async loadAsset(assetId = this.assetId) {
    const cleanAssetId = assetId?.trim();
    if (!cleanAssetId) throw new Error('أدخل Asset ID أولا.');
    this.assetId = cleanAssetId;
    this.saveSession();
    if (!this.accessToken || !this.projectId) throw new Error('اتصل بـ Google Earth Engine أولا.');
    const normalized = normalizeAssetName(cleanAssetId, this.projectId);
    const response = await this.eeFetch(`${EE_ROOT}/${normalized}`);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`تعذر فتح الأصل. تحقق من Asset ID والصلاحيات. ${text.slice(0, 160)}`);
    }
    return response.json();
  }

  async runAnalysis(analysisId, studyArea, dateRange, resolution, context = {}) {
    if (!this.accessToken || !this.projectId) throw new Error('اتصل بـ Google Earth Engine أولا.');
    if (!this.serverUrl) {
      throw new Error(
        'الربط مع Google نجح، لكن تنفيذ التحليلات يحتاج رابط خادم GEE الذي يحتوي سكربتاتك وخرائطك. أدخل رابط الخادم في تبويب البيانات والمصادر.'
      );
    }

    const payload = {
      analysisId,
      studyArea,
      dateRange,
      resolution,
      areaName: context.areaName || '',
      assetId: this.assetId || context.assetId || '',
      projectId: this.projectId
    };
    const data = await this.callAnalysisServer('analyze', payload);
    return attachAccessTokenToTileUrl(normalizeGeeResult(data, { analysisId, dateRange, resolution }), this.accessToken);
  }

  async getMapTileUrl(context = {}) {
    if (!this.serverUrl) {
      throw new Error('أدخل رابط خادم GEE حتى يمكن تحميل خريطة الحساب مباشرة.');
    }
    const data = await this.callAnalysisServer('map', {
      projectId: this.projectId,
      assetId: context.assetId || this.assetId,
      analysisId: context.analysisId,
      studyArea: context.studyArea,
      dateRange: context.dateRange,
      resolution: context.resolution
    });
    const result = attachAccessTokenToTileUrl(normalizeGeeResult(data, context), this.accessToken);
    if (!result.tileUrl) throw new Error('الخادم لم يرجع tileUrl أو map.tileUrl لعرض خريطة GEE.');
    return result;
  }

  async callAnalysisServer(action, payload) {
    const endpoints = buildServerEndpoints(this.serverUrl, action);
    const errors = [];
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${this.accessToken}`
          },
          body: JSON.stringify(payload)
        });
        const text = await response.text();
        const data = parseJsonResponse(text);
        if (!response.ok) {
          errors.push(data?.error || data?.message || `${response.status} ${response.statusText}`);
          continue;
        }
        return data;
      } catch (error) {
        errors.push(error.message);
      }
    }
    throw new Error(`تعذر استدعاء خادم GEE (${action}). ${errors.filter(Boolean).join(' | ')}`);
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

  disconnect(message = 'تم قطع الاتصال محليا.') {
    this.accessToken = '';
    this.expiresAt = 0;
    clearSession();
    this.setStatus('disconnected', `${message} لم يتم تخزين token في ملفات المشروع.`);
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
          const expiresIn = Number(response.expires_in || 3600);
          resolve({
            accessToken: response.access_token,
            expiresAt: Date.now() + Math.max(60, expiresIn - 30) * 1000
          });
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

function normalizeServerUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

function buildServerEndpoints(serverUrl, action) {
  const clean = normalizeServerUrl(serverUrl);
  if (!clean) return [];
  if (clean.endsWith(`/${action}`)) return [clean];
  if (clean.endsWith('/api/gee')) return [`${clean}/${action}`];
  return [`${clean}/api/gee/${action}`, `${clean}/${action}`];
}

function parseJsonResponse(text) {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function normalizeGeeResult(data, fallback = {}) {
  const raw = data?.result || data;
  const map = raw?.map || data?.map || {};
  const stats = raw?.stats || data?.stats || {};
  const id = raw?.id || raw?.analysisId || fallback.analysisId;
  const tileUrl = raw?.tileUrl || raw?.tileTemplate || map.tileUrl || map.tileTemplate || '';
  const bbox = raw?.bbox || map.bbox || stats.bbox || fallback.bbox || null;
  return {
    id,
    analysisId: id,
    name: raw?.name || raw?.analysisName || fallback.name || id,
    source: raw?.source || data?.source || 'Google Earth Engine',
    dateRange: raw?.dateRange || fallback.dateRange,
    resolution: raw?.resolution || fallback.resolution,
    stats,
    geojson: raw?.geojson || data?.geojson || null,
    tileUrl,
    bbox,
    rampName: raw?.rampName || map.rampName || raw?.colorRamp || fallback.rampName || 'pollution',
    unit: raw?.unit || stats.unit || '',
    interpretationTemplateId: raw?.interpretationTemplateId || raw?.templateId || fallback.interpretationTemplateId,
    notes: raw?.notes || data?.notes || ['تم استدعاء النتيجة من خادم Google Earth Engine المرتبط.']
  };
}

function attachAccessTokenToTileUrl(result, accessToken) {
  if (!result.tileUrl || !accessToken || !result.tileUrl.includes('earthengine.googleapis.com')) return result;
  if (/[?&]access_token=/.test(result.tileUrl)) return result;
  const separator = result.tileUrl.includes('?') ? '&' : '?';
  return {
    ...result,
    tileUrl: `${result.tileUrl}${separator}access_token=${encodeURIComponent(accessToken)}`
  };
}

function readSession() {
  try {
    return JSON.parse(window.sessionStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

function writeSession(value) {
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(value));
  } catch {
    // sessionStorage قد يكون مقيدا في بعض المتصفحات؛ يبقى الاتصال في الذاكرة الحالية.
  }
}

function clearSession() {
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // لا يلزم إجراء إضافي.
  }
}

export const geeStatusLabel = {
  disconnected: 'غير متصل',
  checking: 'جاري التحقق',
  connected: 'متصل',
  failed: 'فشل الاتصال'
};
