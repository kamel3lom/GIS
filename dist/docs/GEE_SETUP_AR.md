# إعداد Google Earth Engine

تكامل Google Earth Engine في GeoIndex Studio اختياري. لا يعمل دون مصادقة حقيقية ولا يحتوي المشروع على مفاتيح مخفية.

## المطلوب

1. حساب Google مفعل لـ Earth Engine.
2. مشروع Google Cloud مفعّل عليه Earth Engine API.
3. OAuth Web Client ID من Google Cloud Console.
4. Asset ID اختياري إذا أردت اختبار فتح أصل محدد.

## خطوات عامة

1. افتح Google Cloud Console.
2. أنشئ مشروعا أو اختر مشروعا موجودا.
3. فعّل Earth Engine API.
4. من Credentials أنشئ OAuth Client ID من نوع Web application.
5. أضف نطاق التطبيق المحلي في Authorized JavaScript origins، مثل:
   - `http://localhost:5173`
   - رابط GitHub Pages عند النشر.
6. انسخ Project ID وOAuth Client ID إلى لوحة “الربط بـ Google Earth Engine”.
7. اضغط “اختبار الاتصال”.

## الحالة الحالية داخل المشروع

- حالة الاتصال تعرض: غير متصل، جاري التحقق، متصل، فشل الاتصال.
- يتم طلب OAuth من المستخدم ولا يتم حفظ token داخل ملفات المشروع.
- اختبار المشروع وفتح Asset اختياريان.
- تشغيل تحليلات GEE الكاملة وعرض البلاطات غير مفعّل بعد ومعلن صراحة داخل الواجهة.

## ملاحظات

إذا فشل الاتصال، تحقق من:

- تفعيل Earth Engine API.
- إضافة Origin الصحيح.
- صلاحيات حساب Google.
- صحة Project ID وOAuth Client ID.
