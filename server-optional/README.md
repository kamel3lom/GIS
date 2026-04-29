# GeoIndex Studio Optional Server

الخادم اختياري تماما ولا تحتاجه نسخة GitHub Pages الأساسية.

## التشغيل

```bash
cd server-optional
npm install
npm start
```

## المتاح

- `GET /health`
- `GET /api/reference-search?q=NDVI`
- `POST /api/gee/analyze`
- `POST /api/gee/map`

الغرض من endpoint البحث هو إرجاع روابط مساعدة فقط. لا يخلط الخادم المعلومات العامة من الإنترنت مع القيم المحسوبة في التحليل.

## ربط خادم Google Earth Engine

إذا كانت تحليلات Earth Engine موجودة على خادمك، عرّف المتغيرات:

```bash
GEE_ANALYSIS_ENDPOINT=https://your-gee-server.example/analyze
GEE_MAP_ENDPOINT=https://your-gee-server.example/map
```

الواجهة ترسل `analysisId`, `studyArea`, `dateRange`, `resolution`, `assetId`, و`projectId`.
يفضل أن يرجع الخادم JSON يحتوي:

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

## الخصوصية

لا تحفظ هذه النسخة مفاتيح API ولا OAuth tokens. إذا أضفت proxy لاحقا، اجعل المفاتيح في متغيرات بيئة ولا ترفعها إلى GitHub.
