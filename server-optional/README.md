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

الغرض من endpoint البحث هو إرجاع روابط مساعدة فقط. لا يخلط الخادم المعلومات العامة من الإنترنت مع القيم المحسوبة في التحليل.

## الخصوصية

لا تحفظ هذه النسخة مفاتيح API ولا OAuth tokens. إذا أضفت proxy لاحقا، اجعل المفاتيح في متغيرات بيئة ولا ترفعها إلى GitHub.
