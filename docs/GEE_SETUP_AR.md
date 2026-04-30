# إعداد Google Earth Engine

تكامل Google Earth Engine في GeoIndex Studio مباشر من المتصفح. لا يحتاج خادما خاصا، ولا Asset، ولا رسم مضلع من المستخدم.

## المطلوب مرة واحدة

1. حساب Google مفعل لـ Earth Engine.
2. مشروع Google Cloud مفعّل عليه Earth Engine API.
3. OAuth Web Client ID من Google Cloud Console.

## خطوات عامة

1. افتح Google Cloud Console.
2. أنشئ مشروعا أو اختر مشروعا موجودا.
3. فعّل Earth Engine API.
4. من Credentials أنشئ OAuth Client ID من نوع Web application.
5. أضف نطاق التطبيق في Authorized JavaScript origins، مثل:
   - `http://localhost:5173`
   - رابط GitHub Pages عند النشر.
6. انسخ Project ID وOAuth Client ID إلى لوحة “الربط بـ Google Earth Engine”.
7. اضغط “ربط Google Earth Engine”.

## طريقة الاستخدام للمبتدئ

1. ابحث عن المدينة أو العاصمة.
2. اختر السنة.
3. اختر المؤشر أو التحليل.
4. اضغط “تنفيذ التحليل من Google Earth Engine”.

سيحوّل التطبيق حدود المدينة تلقائيا إلى منطقة دراسة، ثم يحسب الخريطة والإحصاءات مباشرة من Google Earth Engine.

## ملاحظات مهمة

- البيانات المستقبلية ليست رصدا حقيقيا؛ بعض المنتجات مثل CAMS تكون توقعات أو قريبة من الزمن الحقيقي حسب مدى المنتج.
- بعض المؤشرات تعتمد على توفر صور صالحة في السنة والمنطقة المختارة.
- CO2 الحضري المباشر ليس منتجا عاما بسيطا لكل مدينة وسنة داخل الكتالوج مثل NO2؛ لذلك يعرض التطبيق أقرب غاز دفيئة متاح مع تنبيه واضح في التفسير.
- لا يتم تخزين OAuth tokens في ملفات المشروع.

## إذا فشل الاتصال

- تحقق من تفعيل Earth Engine API.
- تحقق من إضافة Origin الصحيح.
- تحقق من صلاحيات حساب Google.
- تحقق من صحة Project ID وOAuth Client ID.
