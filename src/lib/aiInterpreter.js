import interpretationLibrary from '../data/interpretation-library.json';
import { formatArea } from './geospatial';
import { formatNumber } from './rasterAnalysis';

function indicatorInfo(analysisId, result = {}) {
  const templateId = result.interpretationTemplateId || result.templateId;
  const pollutionIds = new Set(['air_quality', 'no2', 'co2', 'aod', 'pm25']);
  return (
    interpretationLibrary.indicators[templateId] ||
    interpretationLibrary.indicators[analysisId] ||
    (pollutionIds.has(analysisId) ? interpretationLibrary.indicators.pollution : null) ||
    interpretationLibrary.indicators.vector_summary ||
    interpretationLibrary.indicators.pollution
  );
}

function dominantClass(stats) {
  const classes = stats?.classes || [];
  if (!classes.length) return null;
  return [...classes].sort((a, b) => (b.percentage || 0) - (a.percentage || 0) || (b.areaM2 || 0) - (a.areaM2 || 0))[0];
}

export function buildPromptFromResults(result, context = {}) {
  const info = indicatorInfo(result.id, result);
  const stats = result.stats || {};
  const dominant = dominantClass(stats);
  const lines = [
    'اكتب تفسيرا أكاديميا عربيا واضحا يبدأ بعبارة: "يتضح من الخريطة الناتجة أن..."',
    'فسر المؤشر المختار فقط ولا تستبدله بمؤشر آخر مثل NDVI أو الغطاء النباتي ما لم يكن هو المؤشر المختار فعلا.',
    'لا تضف أي رقم غير موجود في JSON التالي. إذا لم تتوفر قيمة فاكتب "غير متاح بسبب نقص البيانات".',
    `معرف المؤشر المختار: ${result.id}`,
    `نوع التحليل: ${result.name}`,
    `منطقة الدراسة: ${context.areaName || 'منطقة مرسومة أو مرفوعة من المستخدم'}`,
    `المصدر: ${result.source || 'غير محدد'}`,
    `النطاق الزمني: ${formatDateRange(result.dateRange)}`,
    `الدقة: ${result.resolution || 'غير متاح'}`,
    `تعريف المؤشر: ${info.definition}`,
    `دلالة القيم المرتفعة: ${info.highValues}`,
    `دلالة القيم المنخفضة: ${info.lowValues}`,
    `حدود الدقة: ${info.accuracyLimits}`,
    `القيم المحسوبة JSON: ${JSON.stringify(
      {
        min: stats.min,
        max: stats.max,
        mean: stats.mean,
        median: stats.median,
        stdDev: stats.stdDev,
        unit: result.unit || stats.unit,
        area: stats.totalAreaM2 || stats.studyAreaM2,
        classes: stats.classes,
        dominantClass: dominant
      },
      null,
      2
    )}`,
    'يجب أن يتضمن التفسير: وصف النمط المكاني، القيم المرتفعة والمنخفضة، النسب، الدلالة البيئية أو العمرانية أو الجغرافية، حدود الموثوقية، والتنبيه إلى أن النتيجة أولية وليست بديلا عن المسح الميداني.'
  ];
  return lines.join('\n');
}

export function ruleBasedInterpretation(result, context = {}) {
  const stats = result.stats || {};
  const info = indicatorInfo(result.id, result);
  const dominant = dominantClass(stats);
  const areaName = context.areaName || 'منطقة الدراسة';
  const min = formatNullable(stats.min);
  const max = formatNullable(stats.max);
  const mean = formatNullable(stats.mean);
  const median = formatNullable(stats.median);
  const stdDev = formatNullable(stats.stdDev);
  const unit = result.unit || stats.unit || '';
  const rangeText = unit ? `${min} ${unit} و${max} ${unit}` : `${min} و${max}`;
  const meanText = unit ? `${mean} ${unit}` : mean;
  const classText = dominant
    ? `وتظهر الفئة "${dominant.label}" بوصفها الفئة الأكبر ضمن التوزيع بنسبة ${
        dominant.percentage == null ? 'غير متاح بسبب نقص البيانات' : `${dominant.percentage.toFixed(2)}%`
      }${
        dominant.areaM2 == null ? '' : `، وبمساحة تقديرية ${formatArea(dominant.areaM2)}`
      }.`
    : 'ولا تتوفر فئات كافية لحساب الفئة الأكبر، لذلك تبقى نسب الفئات غير متاحة بسبب نقص البيانات.';

  const sourceText = result.source ? `اعتمدت النتيجة على مصدر: ${result.source}.` : 'مصدر البيانات غير محدد.';
  const reliability = info.accuracyLimits
    ? `حدود موثوقية القراءة: ${info.accuracyLimits}`
    : 'حدود موثوقية القراءة مرتبطة بدقة المصدر وجودة البيانات.';

  if (result.id === 'vector_summary' || result.resolution === 'Vector') {
    const area = stats.human?.studyArea || stats.human?.totalArea || 'غير متاح بسبب نقص البيانات';
    return [
      `يتضح من الخريطة الناتجة أن التحليل المكاني في ${areaName} اعتمد على هندسات مرسومة أو مرفوعة من المستخدم.`,
      `بلغت مساحة منطقة الدراسة أو مجموع المساحات المحسوبة ${area}، وبلغ عدد العناصر ${stats.featureCount ?? 'غير متاح بسبب نقص البيانات'}.`,
      `يساعد هذا النمط على قراءة التوزيع المكاني للعناصر وعلاقتها بمنطقة الدراسة، خاصة عند استخدام أدوات Buffer أو Overlay أو عد النقاط داخل المضلع.`,
      reliability,
      'ينبغي التعامل مع هذه النتيجة بوصفها قراءة مكانية أولية مرتبطة بدقة الرسم والطبقات المدخلة، ولا تغني عن التحقق الميداني أو الرجوع إلى البيانات الرسمية.'
    ].join(' ');
  }

  return [
    `يتضح من الخريطة الناتجة أن ${info.title_ar || result.name} في ${areaName} يتراوح بين ${rangeText}، بمتوسط قدره ${meanText}.`,
    `كما أن الوسيط يساوي ${median} والانحراف المعياري يساوي ${stdDev} عند توفر قيم صالحة للحساب.`,
    `تشير القيم الأعلى إلى ${info.highValues} بينما تعكس القيم الأدنى ${info.lowValues}`,
    classText,
    `من الناحية الجغرافية، يفسر هذا النص المؤشر المختار نفسه (${info.title_ar || result.name}) اعتمادا على القيم الظاهرة في الخريطة والنتائج فقط. ${sourceText}`,
    reliability,
    'هذه النتيجة تحليلية أولية وليست بديلا عن المسح الميداني أو البيانات الرسمية، ويجب مراجعة تاريخ الالتقاط ودقة المصدر وحالة السحب أو جودة الحزم قبل استخدامها في قرارات حساسة.'
  ].join(' ');
}

export async function callAIProvider(settings, result, context = {}) {
  if (!settings || settings.provider === 'rule-based') {
    return ruleBasedInterpretation(result, context);
  }
  const prompt = buildPromptFromResults(result, context);
  let rawText = '';
  if (settings.provider === 'gemini') {
    rawText = await callGemini(settings, prompt);
  } else if (settings.provider === 'openai') {
    rawText = await callOpenAI(settings, prompt);
  } else if (settings.provider === 'openrouter') {
    rawText = await callOpenRouter(settings, prompt);
  } else if (settings.provider === 'ollama') {
    rawText = await callOllama(settings, prompt);
  } else {
    rawText = ruleBasedInterpretation(result, context);
  }
  return formatAcademicArabic(validateNoFakeNumbers(rawText, result, context));
}

async function callGemini(settings, prompt) {
  if (!settings.apiKey) throw new Error('أدخل Gemini API Key أولا.');
  const model = settings.model || 'gemini-1.5-flash';
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(settings.apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2 }
      })
    }
  );
  if (!response.ok) throw new Error('فشل اتصال Gemini. تحقق من المفتاح وقيود API.');
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.map((part) => part.text).join('\n') || '';
}

async function callOpenAI(settings, prompt) {
  if (!settings.apiKey) throw new Error('أدخل OpenAI API Key أولا.');
  const model = settings.model || 'gpt-4o-mini';
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'أنت مفسر GIS أكاديمي. فسر المؤشر المختار فقط ولا تضف أرقاما غير موجودة في بيانات المستخدم.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2
    })
  });
  if (!response.ok) throw new Error('فشل اتصال OpenAI API. تحقق من المفتاح والنموذج.');
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callOpenRouter(settings, prompt) {
  if (!settings.apiKey) throw new Error('أدخل OpenRouter API Key أولا.');
  const model = settings.model || 'openai/gpt-4o-mini';
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'GeoIndex Studio'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'فسر نتائج GIS باللغة العربية للمؤشر المختار فقط دون اختراع أرقام.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2
    })
  });
  if (!response.ok) throw new Error('فشل اتصال OpenRouter. تحقق من المفتاح والنموذج.');
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callOllama(settings, prompt) {
  const endpoint = settings.endpoint || 'http://localhost:11434';
  const model = settings.model || 'llama3.1';
  const response = await fetch(`${endpoint.replace(/\/$/, '')}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      options: { temperature: 0.2 }
    })
  });
  if (!response.ok) throw new Error('فشل اتصال Ollama المحلي. تحقق من تشغيل الخدمة والسماح CORS.');
  const data = await response.json();
  return data.response || '';
}

export function validateNoFakeNumbers(text, result, context = {}) {
  const allowed = new Set();
  collectNumbers(result.stats, allowed);
  collectNumbers(result.dateRange, allowed);
  collectNumbers({ resolution: result.resolution, areaName: context.areaName }, allowed);
  allowed.add('0');
  allowed.add('1');
  allowed.add('2');
  allowed.add('3');
  allowed.add('4');
  allowed.add('5');
  allowed.add('10');
  allowed.add('20');
  allowed.add('30');
  allowed.add('100');
  allowed.add('250');
  allowed.add('500');

  return String(text || '').replace(/-?\d+(?:\.\d+)?/g, (match) => {
    const numeric = Number(match);
    const normalized = normalizeNumber(numeric);
    if (allowed.has(match) || allowed.has(normalized)) return match;
    for (const item of allowed) {
      if (Math.abs(Number(item) - numeric) < 0.015) return match;
    }
    return 'قيمة غير محسوبة';
  });
}

function collectNumbers(value, set) {
  if (value == null) return;
  if (typeof value === 'number' && Number.isFinite(value)) {
    set.add(normalizeNumber(value));
    set.add(value.toFixed(2));
    set.add(value.toFixed(3));
    return;
  }
  if (typeof value === 'string') {
    const matches = value.match(/-?\d+(?:\.\d+)?/g) || [];
    matches.forEach((match) => set.add(normalizeNumber(Number(match))));
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectNumbers(item, set));
    return;
  }
  if (typeof value === 'object') {
    Object.values(value).forEach((item) => collectNumbers(item, set));
  }
}

function normalizeNumber(value) {
  if (!Number.isFinite(value)) return '';
  return Number(value).toFixed(Math.abs(value) < 10 ? 3 : 2).replace(/0+$/, '').replace(/\.$/, '');
}

export function formatAcademicArabic(text) {
  const cleaned = String(text || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  if (cleaned.startsWith('يتضح من الخريطة الناتجة أن')) return cleaned;
  return `يتضح من الخريطة الناتجة أن ${cleaned}`;
}

function formatNullable(value) {
  if (value == null || !Number.isFinite(value)) return 'غير متاح بسبب نقص البيانات';
  return formatNumber(value);
}

function formatDateRange(dateRange) {
  if (!dateRange) return 'غير متاح';
  if (typeof dateRange === 'string') return dateRange;
  const start = dateRange.start || 'غير محدد';
  const end = dateRange.end || 'غير محدد';
  return `${start} إلى ${end}`;
}

export function exportInterpretation(result, interpretation) {
  return {
    analysisId: result.id,
    analysisName: result.name,
    source: result.source,
    stats: result.stats,
    interpretation,
    generatedAt: new Date().toISOString()
  };
}
