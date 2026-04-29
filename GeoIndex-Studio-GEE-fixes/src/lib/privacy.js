import localforage from 'localforage';

const store = localforage.createInstance({
  name: 'GeoIndexStudio',
  storeName: 'local_settings'
});

const KEY_PREFIX = 'geoindex:';

export async function saveLocalSetting(key, value) {
  return store.setItem(`${KEY_PREFIX}${key}`, value);
}

export async function readLocalSetting(key, fallback = null) {
  const value = await store.getItem(`${KEY_PREFIX}${key}`);
  return value ?? fallback;
}

export async function removeLocalSetting(key) {
  return store.removeItem(`${KEY_PREFIX}${key}`);
}

export async function clearLocalData() {
  await store.clear();
}

export function privacyNotice() {
  return [
    'لا ترسل GeoIndex Studio بياناتك أو مفاتيحك لأي طرف ثالث إلا عند اختيارك مزودا خارجيا صراحة.',
    'مفاتيح AI تحفظ محليا عند موافقتك فقط، أما جلسة GEE فتخزن في sessionStorage حتى إغلاق الصفحة.',
    'لا توجد مفاتيح API مخفية داخل المستودع ولا يتم تخزين OAuth tokens في ملفات المشروع.'
  ];
}
