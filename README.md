# GeoIndex Studio

GeoIndex Studio أداة ويب تعليمية لتحليلات GIS وRemote Sensing بعلامة kamel3lom. هذه النسخة مبنية لتجربة بسيطة للمبتدئين: يربط المستخدم Google Earth Engine، يختار مدينة أو عاصمة، يختار السنة والمؤشر، ثم تظهر الخريطة والإحصاءات والتفسير دون رسم مضلع أو رفع ملفات أو إعداد خادم خاص.

## التشغيل المحلي

```bash
npm install
npm run dev
npm run build
```

بعد `npm run dev` افتح الرابط الذي يظهر من Vite، غالبا:

```text
http://localhost:5173
```

## النشر على GitHub Pages

1. شغّل `npm run build` محليا عند الاختبار.
2. عند الدفع إلى فرع `main`، يشغّل GitHub Actions ملف `.github/workflows/deploy-pages.yml`.
3. workflow ينفذ `npm ci` ثم `npm test` ثم `npm run build` ويرفع مجلد `dist` إلى GitHub Pages.
4. إعداد Vite يستخدم `base: './'` حتى تعمل الأصول داخل أي مسار GitHub Pages.

## تجربة المستخدم

- ربط مباشر مع Google Earth Engine من المتصفح باستخدام Project ID وOAuth Web Client ID.
- حفظ جلسة الربط في `sessionStorage` حتى إغلاق الصفحة أو انتهاء صلاحية Google.
- بحث المدينة عبر Nominatim/OpenStreetMap مع جلب حدود المدينة تلقائيا عند توفرها.
- اختيار سنة واحدة بدل حقول تقنية للتواريخ.
- قائمة مؤشرات GEE مباشرة فقط، حتى لا تظهر للمستخدم خيارات تحتاج رسما أو ملفات.
- عرض طبقة GEE على الخريطة مع الإحصاءات المحسوبة من نفس النتيجة.
- تفسير داخلي مبني على المؤشر الحالي والقيم المحسوبة، مع دعم مزودي AI اختياريين عند إدخال API Key.
- تصدير الخريطة والبوستر والتقارير المتاحة من داخل المتصفح.

## مؤشرات Google Earth Engine المفعلة

تشمل النسخة المباشرة:

- مؤشرات الغطاء النباتي: NDVI وEVI وSAVI وGNDVI وNDMI.
- مؤشرات المياه والعمران: NDWI وMNDWI وNDBI وBuilt-up وWater Occurrence.
- الحرارة والتضاريس: LST وDEM وSlope وHillshade.
- المناخ والليل: CHIRPS Precipitation وVIIRS Night Lights.
- الغازات وجودة الهواء حسب توفر بيانات CAMS: NO2 وCO وSO2 وCH4 وO3 وPM2.5 وAOD.
- التصنيف الجاهز: ESA WorldCover.

## ملاحظة مهمة عن GEE

Google Earth Engine يوفر كتالوج بيانات عالمي وخوارزميات حساب ضخمة، لكنه ليس خدمة تعطي كل تحليل جاهزا لكل مدينة وكل سنة بضغطة واحدة دون وصفة حساب. لذلك يعرّف التطبيق وصفات جاهزة داخل الكود: عند اختيار المدينة والمؤشر والسنة، ينشئ التطبيق منطقة الدراسة ويطلب من GEE حساب المنتج المناسب.

البيانات المستقبلية ليست قياسات حقيقية إلا إذا كان المنتج نفسه Forecast أو Projection. كذلك CO2 الحضري المباشر لكل مدينة وسنة ليس متاحا ببساطة مثل NO2؛ لذلك تعرض بطاقة CO2 تنبيها واضحا وتستخدم أقرب غاز دفيئة متاح من CAMS عند الحاجة.

## الخصوصية والمفاتيح

- لا يحتوي المشروع على مفاتيح سرية.
- Project ID وOAuth Client ID لربط GEE يكتبان من المستخدم ويحفظان في جلسة الصفحة فقط.
- مفاتيح مزودي AI اختيارية ولا تحفظ محليا إلا بموافقة المستخدم.
- لا يوجد خادم GEE خاص ولا Asset ID مطلوب في هذه النسخة.

## حدود الأداة

هذه أداة تعليمية وليست بديلا عن ArcGIS أو QGIS أو البيانات الرسمية. دقة النتائج تعتمد على المصدر، السنة، جودة المشاهد، السحب، ودقة المنتج. الذكاء الاصطناعي يفسر القيم المحسوبة ولا يخترع قيما غير موجودة.

راجع [docs/GEE_SETUP_AR.md](docs/GEE_SETUP_AR.md) و[docs/LIMITATIONS.md](docs/LIMITATIONS.md) و[docs/PRIVACY.md](docs/PRIVACY.md).

## البنية

```text
GeoIndex-Studio/
  public/
  src/
    components/
    lib/
    data/
  sample-data/
  server-optional/
  docs/
```

## الترخيص

MIT License.
