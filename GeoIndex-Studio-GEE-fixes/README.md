# GeoIndex Studio

GeoIndex Studio هي أداة ويب تعليمية مجانية ومفتوحة المصدر لتحليلات GIS وRemote Sensing داخل المتصفح قدر الإمكان، بعلامة kamel3lom. الهدف أن يستطيع المبتدئ رسم منطقة دراسة، رفع بيانات جغرافية، حساب مؤشرات حقيقية من بيانات متاحة، ثم تصدير الخريطة والتفسير دون مفاتيح مخفية أو وعود غير واقعية.

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
4. إعداد Vite يستخدم `base: './'` حتى تعمل الأصول عند النشر داخل مسار فرعي مثل `https://kamel3lom.github.io/GeoIndex-Studio/`.

## ما يعمل دون مفاتيح

- خريطة Leaflet مع OpenStreetMap كافتراضي.
- Esri World Imagery كطبقة عرض اختيارية.
- بحث أماكن عبر Nominatim/OpenStreetMap مع استخدام معتدل.
- رسم نقاط وخطوط ومضلعات ومستطيلات، مع تعديل وحذف عبر Leaflet Draw.
- قياس المسافة والمساحة والمحيط بواسطة Turf.js.
- رفع GeoJSON وKML وGPX وCSV وShapefile ZIP.
- رفع GeoTIFF وقراءة الحزم بواسطة geotiff.js.
- حساب NDVI وNDWI وMNDWI وNDBI وSAVI وEVI وGNDVI وNDMI وLST/DEM عند توفر Raster مناسب.
- تحليلات Vector مثل Buffer وOverlay وعد النقاط داخل مضلع وملخص القياسات.
- عينة تعليمية جاهزة `sample-data` لتجربة NDVI دون GEE.
- تفسير داخلي مجاني rule-based مبني على النتائج المحسوبة.
- تصدير PNG وPDF وبوسترات GIS وGeoJSON وKML وShapefile للبيانات Vector.

## ما يحتاج Google Earth Engine

يوجد تبويب واضح باسم “الربط بـ Google Earth Engine”. يحتاج المستخدم:

- Google Cloud / Earth Engine Project ID.
- OAuth Web Client ID.
- Asset ID اختياري لاختبار الوصول.
- رابط خادم تحليلات GEE إذا كانت الخرائط والمؤشرات موجودة على خادمك.

بعد الربط تحفظ الجلسة في `sessionStorage` حتى إغلاق الصفحة أو انتهاء صلاحية Google token. عند اختيار مدينة من البحث، ينشئ التطبيق منطقة دراسة تلقائيا من حدود المدينة، ثم يستدعي المؤشر المختار من خادم GEE عند توفره دون مطالبة المستخدم المبتدئ برسم نقطة أو مضلع.

خادم GEE يجب أن يرجع JSON يحتوي القيم المحسوبة الفعلية و`tileUrl` أو `geojson`/`rasterOverlay`. راجع `server-optional/README.md` لعقد الطلب والاستجابة.

## ما يحتاج API Key

- Gemini API Key، OpenAI API Key، OpenRouter API Key: اختيارية للتفسير الخارجي.
- Ollama local endpoint: اختياري إذا كان المستخدم يشغل نموذجا محليا.
- Google Maps: غير مفعّل افتراضيا لأنه يحتاج API Key وقد يتطلب فوترة.
- OpenTopography أو CAMS وبعض مصادر البيانات: قد تحتاج مفاتيح أو حسابات حسب الخدمة.

لا يحتوي المشروع على أي مفاتيح سرية. عند موافقة المستخدم، تحفظ مفاتيح AI محليا في IndexedDB/localForage داخل المتصفح فقط.

## حدود الأداة

هذه أداة تعليمية وليست بديلا كاملا عن ArcGIS أو QGIS. دقة النتائج تعتمد على المصدر، ترتيب الحزم، تاريخ الالتقاط، السحب، وحجم البيانات. التحليل البيئي والتلوث وجودة الهواء يعتمد على توفر مصادر مناسبة. الذكاء الاصطناعي يفسر القيم المحسوبة ولا يخترعها.

راجع [docs/LIMITATIONS.md](docs/LIMITATIONS.md) و[docs/PRIVACY.md](docs/PRIVACY.md).

## تحذير مهم

نتائج GeoIndex Studio تحليلية أولية لأغراض التعلم والاستكشاف، وليست بديلا عن المسح الميداني أو البيانات الرسمية أو قرارات التخطيط والبيئة والسلامة.

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
