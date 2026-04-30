import interpretationLibrary from '../data/interpretation-library.json';
import { formatArea } from './geospatial';
import { formatNumber } from './rasterAnalysis';

const indicatorAliases = {
  vegetation_health: 'ndvi',
  water_detection: 'mndwi',
  water_occurrence: 'mndwi',
  built_up: 'ndbi',
  thermal_gradient: 'lst',
  air_quality: 'pollution',
  co: 'pollution',
  so2: 'pollution',
  ch4: 'pollution',
  o3: 'pollution',
  pm25: 'pollution',
  aod: 'pollution',
  viirs_lights: 'pollution',
  slope: 'dem',
  hillshade: 'dem'
};

const extraIndicators = {
  water_detection: {
    title_ar: 'كشف المسطحات المائية',
    definition: 'تصنيف مائي مبني غالبا على NDWI أو MNDWI لإظهار المياه أو الرطوبة السطحية المحتملة.',
    highValues: 'مياها أو رطوبة سطحية أعلى ضمن حدود المؤشر المستخدم',
    lowValues: 'أسطحا جافة أو عمرانية أو غير مائية غالبا',
    classes: [
      { label: 'غير مائي غالبا', min: -1, max: 0, meaning: 'أسطح غير مائية أو جافة.' },
      { label: 'انتقالي', min: 0, max: 0.2, meaning: 'مياه محتملة أو اختلاط طيفي.' },
      { label: 'مائي غالبا', min: 0.2, max: 1, meaning: 'مياه أو رطوبة مرتفعة نسبيا.' }
    ],
    accuracyLimits: 'تتأثر القراءة بالظلال والعكارة ودقة المصدر والعتبة المحلية.'
  },
  built_up: {
    title_ar: 'مؤشر المناطق المبنية',
    definition: 'قراءة طيفية للأسطح المبنية أو المكشوفة اعتمادا على علاقة SWIR وNIR غالبا.',
    highValues: 'عمرانا أو تربة جافة أو أسطحا مكشوفة عالية الانعكاس',
    lowValues: 'نباتا أو مياها أو أسطحا أقل ارتباطا بالعمران',
    classes: [
      { label: 'غير عمراني غالبا', min: -1, max: 0, meaning: 'نبات أو مياه أو أسطح غير مبنية.' },
      { label: 'عمراني/مكشوف محتمل', min: 0, max: 0.2, meaning: 'اختلاط بين عمران وتربة.' },
      { label: 'عمراني أو جاف واضح', min: 0.2, max: 1, meaning: 'أسطح مبنية أو مكشوفة قوية.' }
    ],
    accuracyLimits: 'قد يخلط المؤشر بين العمران والتربة الجافة لذلك يحتاج تحقق بصري أو طبقة مرجعية.'
  },
  precipitation: {
    title_ar: 'الأمطار السنوية',
    definition: 'مجموع الهطول خلال الفترة المختارة من منتج مطري شبكي.',
    highValues: 'هطولا أكبر نسبيا خلال الفترة المختارة',
    lowValues: 'جفافا أو هطولا أقل نسبيا',
    classes: [],
    accuracyLimits: 'الدقة مكانية وزمانية شبكية ولا تمثل قياس محطة مطرية واحدة بدقة كاملة.'
  },
  landcover: {
    title_ar: 'تصنيف الغطاء الأرضي',
    definition: 'خريطة فئات أرضية جاهزة مثل العمران والمياه والزراعة والأراضي العارية.',
    highValues: 'كود الفئة الأعلى في المنتج وليس قيمة كمية متدرجة',
    lowValues: 'كود الفئة الأدنى في المنتج وليس قيمة جودة أو انخفاض',
    classes: [],
    accuracyLimits: 'التصنيف عالمي وقد يخطئ محليا، خاصة عند الحواف والمناطق المختلطة.'
  },
  viirs_lights: {
    title_ar: 'مؤشرات التلوث الضوئي VIIRS',
    definition: 'قراءة شدة الإضاءة الليلية كبديل تقريبي للنشاط الحضري أو الضوئي.',
    highValues: 'إضاءة ليلية أو نشاطا حضريا/صناعيا أعلى نسبيا',
    lowValues: 'إضاءة أقل أو مناطق غير مضاءة نسبيا',
    classes: [],
    accuracyLimits: 'تتأثر القيم بالإضاءة المؤقتة والسحب والمعالجة الشهرية ولا تمثل قياسا أرضيا مباشرا.'
  }
};

function indicatorInfo(analysisId, result = {}) {
  const templateId = result.interpretationTemplateId || result.templateId;
  const pollutionIds = new Set(['air_quality', 'no2', 'co2', 'aod', 'pm25']);
  const candidates = [
    analysisId,
    templateId,
    indicatorAliases[templateId],
    indicatorAliases[analysisId],
    pollutionIds.has(analysisId) ? 'pollution' : null
  ].filter(Boolean);
  for (const key of candidates) {
    const info = interpretationLibrary.indicators[key] || extraIndicators[key];
    if (info) return info;
  }
  return (
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
    `القراءة الرقمية: الوسيط ${median}، والانحراف المعياري ${stdDev}، والوحدة ${unit || 'غير محددة في المصدر'}. ${sourceText}`,
    `معنى الألوان والقيم: المناطق ذات القيم الأعلى تمثل ${info.highValues}، بينما تمثل القيم الأدنى ${info.lowValues}.`,
    distributionText(stats, info, dominant),
    numericPositionText(stats, info),
    `حدود الموثوقية: ${reliability}`,
    'الخلاصة: هذا تفسير داخلي مبني على أرقام النتيجة الحالية فقط، وليس نصا محفوظا لمؤشر آخر. تبقى النتيجة أولية ويجب مراجعة تاريخ البيانات ودقة المصدر والتحقق الميداني عند استخدامها في قرارات مهمة.'
  ].join('\n\n');
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
  const cleaned = formatAcademicArabic(validateNoFakeNumbers(rawText, result, context));
  if (hasWrongIndicatorFocus(cleaned, result)) {
    return ruleBasedInterpretation(result, context);
  }
  return cleaned;
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

function distributionText(stats, info, dominant) {
  const classes = stats?.classes || [];
  if (classes.length) {
    const topClasses = [...classes]
      .sort((a, b) => (b.percentage || 0) - (a.percentage || 0) || (b.areaM2 || 0) - (a.areaM2 || 0))
      .slice(0, 3)
      .map((item) => {
        const percentage = item.percentage == null ? 'نسبة غير متاحة' : `${item.percentage.toFixed(2)}%`;
        const area = item.areaM2 == null ? '' : `، بمساحة ${formatArea(item.areaM2)}`;
        return `${item.label}: ${percentage}${area}`;
      })
      .join('؛ ');
    const dominantText = dominant ? `الفئة الأكبر هي "${dominant.label}".` : '';
    return `توزيع الفئات: ${topClasses}. ${dominantText}`;
  }

  const meanClass = classForValue(stats?.mean, info);
  if (meanClass) {
    return `توزيع الفئات التفصيلي غير متاح في هذه النتيجة، لكن المتوسط يقع ضمن فئة "${meanClass.label}"، ودلالتها: ${meanClass.meaning}`;
  }
  return 'توزيع الفئات التفصيلي غير متاح في هذه النتيجة، لذلك يعتمد التفسير على الحد الأدنى والأعلى والمتوسط والوسيط فقط.';
}

function numericPositionText(stats, info) {
  const mean = Number(stats?.mean);
  const min = Number(stats?.min);
  const max = Number(stats?.max);
  if (!Number.isFinite(mean) || !Number.isFinite(min) || !Number.isFinite(max) || max === min) {
    return `تعريف المؤشر المستخدم: ${info.definition}`;
  }
  const position = (mean - min) / (max - min);
  const level = position >= 0.67 ? 'قريب من الطرف الأعلى للنطاق' : position <= 0.33 ? 'قريب من الطرف الأدنى للنطاق' : 'في منتصف النطاق تقريبا';
  return `موضع المتوسط داخل نطاق الخريطة ${level}، وهذا يساعد على قراءة الصورة العامة دون افتراض مواقع أو أرقام غير محسوبة. تعريف المؤشر: ${info.definition}`;
}

function classForValue(value, info) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return (info.classes || []).find((item) => numeric >= item.min && numeric < item.max) || null;
}

function hasWrongIndicatorFocus(text, result) {
  const id = result?.id || '';
  const name = `${result?.name || ''} ${indicatorInfo(id, result).title_ar || ''}`;
  const context = `${id} ${name}`.toLowerCase();
  const content = String(text || '');
  const ownsVegetation = /(ndvi|evi|savi|gndvi|ndmi|vegetation|نبات|غطاء نباتي)/i.test(context);
  const ownsWater = /(ndwi|mndwi|water|مياه|مائي)/i.test(context);
  const ownsThermal = /(lst|thermal|حرار|temperature)/i.test(context);
  if (!ownsVegetation && /\bNDVI\b|مؤشر الغطاء النباتي/i.test(content)) return true;
  if (!ownsWater && /\bM?NDWI\b|مؤشر المياه|المسطحات المائية/i.test(content)) return true;
  if (!ownsThermal && /\bLST\b|درجة حرارة سطح الأرض|الجزيرة الحرارية/i.test(content)) return true;
  return false;
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
