# إعداد Google Earth Engine

تكامل Google Earth Engine في GeoIndex Studio اختياري. لا يعمل دون مصادقة حقيقية ولا يحتوي المشروع على مفاتيح مخفية.

## المطلوب

1. حساب Google مفعل لـ Earth Engine.
2. مشروع Google Cloud مفعّل عليه Earth Engine API.
3. OAuth Web Client ID من Google Cloud Console.
4. Asset ID اختياري إذا أردت اختبار فتح أصل محدد.
5. رابط خادم تحليلات GEE يحتوي سكربتات الخرائط والمؤشرات الخاصة بك.

## خطوات عامة

1. افتح Google Cloud Console.
2. أنشئ مشروعا أو اختر مشروعا موجودا.
3. فعّل Earth Engine API.
4. من Credentials أنشئ OAuth Client ID من نوع Web application.
5. أضف نطاق التطبيق المحلي في Authorized JavaScript origins، مثل:
   - `http://localhost:5173`
   - رابط GitHub Pages عند النشر.
6. انسخ Project ID وOAuth Client ID إلى لوحة “الربط بـ Google Earth Engine”.
7. ضع رابط خادم GEE في حقل “رابط خادم تحليلات GEE”.
8. اضغط “ربط وحفظ الجلسة”.

## السلوك داخل المشروع

- حالة الاتصال تعرض: غير متصل، جاري التحقق، متصل، فشل الاتصال.
- يتم طلب OAuth من المستخدم ولا يتم حفظ token داخل ملفات المشروع.
- تحفظ جلسة الربط في `sessionStorage` فقط، لذلك تبقى فعالة أثناء التنقل داخل التطبيق وتنتهي عند إغلاق الصفحة أو انتهاء صلاحية Google token.
- عند اختيار مدينة من البحث ينشئ التطبيق منطقة دراسة تلقائيا من حدود المدينة.
- عند اختيار مؤشر مدعوم من GEE يستدعي التطبيق خادمك مباشرة ويرسم الخريطة ويعرض الإحصاءات التي رجعت من الخادم.

## عقد خادم GEE

ترسل الواجهة طلب `POST` إلى:

- `{serverUrl}/api/gee/analyze`
- أو `{serverUrl}/analyze` كمسار بديل.

الجسم يحتوي `analysisId`, `studyArea`, `dateRange`, `resolution`, `areaName`, `assetId`, و`projectId`.

يفضل أن يرجع الخادم:

```json
{
  "result": {
    "analysisId": "co2",
    "name": "CO2 - ثاني أكسيد الكربون",
    "source": "Google Earth Engine",
    "tileUrl": "https://.../{z}/{x}/{y}.png",
    "bbox": [39.0, 21.0, 40.0, 22.0],
    "rampName": "pollution",
    "stats": {
      "min": 410.2,
      "max": 422.8,
      "mean": 416.4,
      "unit": "ppm",
      "classes": []
    }
  }
}
```

## ملاحظات

إذا فشل الاتصال، تحقق من:

- تفعيل Earth Engine API.
- إضافة Origin الصحيح.
- صلاحيات حساب Google.
- صحة Project ID وOAuth Client ID.
- صحة رابط خادم GEE وأنه يرجع `tileUrl` و`stats` للمؤشر المختار.
