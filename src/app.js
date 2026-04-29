import Chart from 'chart.js/auto';
import shp from 'shpjs';
import { gpx, kml } from '@tmcw/togeojson';
import analysisCatalog from './data/analysis-catalog.json';
import openDataCatalog from './data/open-data-catalog.json';
import sampleAoiRaw from '../sample-data/sample_aoi.geojson?raw';
import samplePointsRaw from '../sample-data/sample_points.geojson?raw';
import sampleNdvi from '../sample-data/sample_ndvi_result.json';
import { MapView } from './components/MapView';
import { renderSourceSelector } from './components/SourceSelector';
import { renderAnalysisSelector } from './components/AnalysisSelector';
import { renderStudyAreaControls, renderTabs } from './components/SidebarControls';
import { renderResultsPanel } from './components/ResultsPanel';
import { renderAIInterpretationPanel } from './components/AIInterpretationPanel';
import { renderExportPanel } from './components/ExportPanel';
import { renderPosterPreviewNotice } from './components/PosterBuilder';
import { renderAuthPanel } from './components/AuthPanel';
import { renderHelpPanel } from './components/HelpPanel';
import { geocodePlace } from './lib/geocoding';
import { GeeClient, geeStatusLabel } from './lib/geeClient';
import { clearLocalData, readLocalSetting, removeLocalSetting, saveLocalSetting } from './lib/privacy';
import { buildRasterResult, computeRasterIndex, readGeoTiff } from './lib/rasterAnalysis';
import { ensureFeatureCollection, makeResultObject, parseCsvPoints, summarizeGeoJSON, turf } from './lib/geospatial';
import { runVectorAnalysis } from './lib/vectorAnalysis';
import { callAIProvider, exportInterpretation, ruleBasedInterpretation } from './lib/aiInterpreter';
import {
  exportElementAsPdf,
  exportElementAsPng,
  exportGeoJSON,
  exportKML,
  exportShapefile
} from './lib/exportUtils';
import { exportPoster, getPosterTemplates } from './lib/posterTemplates';

const rasterAnalyses = new Set([
  'ndvi',
  'evi',
  'savi',
  'gndvi',
  'ndmi',
  'ndwi',
  'mndwi',
  'ndbi',
  'built_up',
  'vegetation_health',
  'water_detection',
  'lst',
  'thermal_gradient',
  'dem'
]);

const vectorAnalyses = new Set([
  'vector_summary',
  'buffer',
  'influence_zones',
  'services_proximity',
  'proximity_roads_industrial',
  'overlay',
  'point_in_polygon',
  'urban_density'
]);

export class GeoIndexApp {
  constructor(root) {
    this.root = root;
    this.state = {
      activeTab: 'analysis',
      currentSource: 'osm',
      selectedAnalysis: 'vector_summary',
      drawnGeoJSON: turf.featureCollection([]),
      uploadedGeoJSON: turf.featureCollection([]),
      studyArea: null,
      raster: null,
      currentResult: null,
      interpretation: '',
      areaName: 'منطقة الدراسة',
      geeStatus: 'disconnected',
      aiSettings: { provider: 'rule-based' },
      progress: 'جاهز',
      resultOpacity: 0.72
    };
    this.chart = null;
    this.geeClient = new GeeClient(({ status, message }) => {
      this.state.geeStatus = status;
      this.updateGeeStatus(message);
    });
  }

  async init() {
    await this.loadLocalSettings();
    this.renderShell();
    this.mapView = new MapView({
      elementId: 'map',
      onDrawingChange: (geojson) => {
        this.state.drawnGeoJSON = ensureFeatureCollection(geojson);
        this.setProgress('تم تحديث الرسومات.');
      },
      onStudyAreaChange: (geojson) => {
        this.state.studyArea = geojson;
        this.updateMapTitle();
      },
      onStatus: (message) => this.setProgress(message)
    }).init();
    this.bindGlobalEvents();
    this.renderCurrentTab();
    this.updateAnalysisMeta();
    this.updateMapTitle();
    this.setProgress('GeoIndex Studio جاهز. ابدأ بالبحث أو الرسم أو رفع ملف.');
  }

  async loadLocalSettings() {
    const saved = await readLocalSetting('aiSettings', null);
    if (saved) this.state.aiSettings = saved;
  }

  renderShell() {
    this.root.innerHTML = `
      <header class="topbar">
        <div class="brand">
          <span class="brand-mark">GI</span>
          <div>
            <strong>GeoIndex Studio</strong>
            <small>kamel3lom · GIS & Remote Sensing</small>
          </div>
        </div>
        <div class="status-strip">
          <span id="connection-pill">GEE: ${geeStatusLabel[this.state.geeStatus]}</span>
          <span id="progress-text">${this.state.progress}</span>
        </div>
      </header>
      <main class="app-shell">
        <aside class="side-panel glass-panel">
          ${renderTabs(this.state.activeTab)}
          <div id="sidebar-content" class="sidebar-content"></div>
        </aside>
        <section class="map-stage" id="map-stage">
          <div class="map-title-card">
            <span>GeoIndex Studio</span>
            <strong id="map-title">خريطة تحليل جغرافي</strong>
            <small id="map-subtitle">kamel3lom · Open GIS Learning</small>
          </div>
          <div id="map" class="map"></div>
          <div class="analysis-progress">
            <span id="analysis-state">جاهز</span>
            <input id="result-opacity" type="range" min="0.2" max="1" step="0.05" value="${this.state.resultOpacity}" aria-label="شفافية النتيجة" />
          </div>
          ${renderAIInterpretationPanel(this.state.interpretation)}
        </section>
      </main>
    `;
  }

  renderCurrentTab() {
    const content = document.getElementById('sidebar-content');
    if (!content) return;
    if (this.state.activeTab === 'analysis') {
      content.innerHTML = `
        ${renderSourceSelector(this.state.currentSource)}
        ${renderStudyAreaControls()}
        ${renderAnalysisSelector(analysisCatalog, this.state.selectedAnalysis)}
      `;
    } else if (this.state.activeTab === 'results') {
      content.innerHTML = renderResultsPanel(this.state.currentResult);
      this.renderChart();
    } else if (this.state.activeTab === 'export') {
      content.innerHTML = `${renderExportPanel(getPosterTemplates())}${renderPosterPreviewNotice()}`;
    } else if (this.state.activeTab === 'data') {
      content.innerHTML = `${renderAuthPanel(this.state.geeStatus)}${this.renderOpenDataCatalog()}`;
      this.populateAuthInputs();
    } else {
      content.innerHTML = renderHelpPanel();
    }
    this.bindTabEvents();
  }

  renderOpenDataCatalog() {
    return `
      <section class="control-section">
        <div class="section-heading">
          <h2>مصادر البيانات المفتوحة</h2>
          <span>توضيح ما يعمل مباشرة وما يحتاج مفتاحا</span>
        </div>
        <div class="catalog-list">
          ${openDataCatalog
            .map(
              (source) => `
              <article>
                <strong>${source.name}</strong>
                <span>${source.dataType}</span>
                <small>الدقة: ${source.resolution} · مباشر بالمتصفح: ${source.browserDirect ? 'نعم' : 'لا'} · يحتاج مفتاح: ${source.requiresApiKey ? 'نعم' : 'لا'}</small>
                <a href="${source.accessUrl}" target="_blank" rel="noreferrer">رابط المصدر</a>
              </article>`
            )
            .join('')}
        </div>
      </section>
    `;
  }

  bindGlobalEvents() {
    this.root.addEventListener('click', (event) => {
      const tabButton = event.target.closest('[data-tab]');
      if (tabButton) {
        this.state.activeTab = tabButton.dataset.tab;
        document.querySelectorAll('.tab-button').forEach((button) => {
          button.classList.toggle('is-active', button.dataset.tab === this.state.activeTab);
        });
        this.renderCurrentTab();
        this.mapView.invalidateSize();
      }
    });

    document.getElementById('interpret-result')?.addEventListener('click', () => this.generateInterpretation());
    document.getElementById('copy-interpretation')?.addEventListener('click', () => this.copyInterpretation());
    document.getElementById('export-interpretation-map')?.addEventListener('click', () => this.exportInterpretationWithMap());
    document.getElementById('result-opacity')?.addEventListener('input', (event) => {
      this.state.resultOpacity = Number(event.target.value);
      this.mapView.setResultOpacity(this.state.resultOpacity);
    });
  }

  bindTabEvents() {
    document.querySelectorAll('[data-source-id]').forEach((button) => {
      button.addEventListener('click', () => this.handleSourceSelection(button.dataset.sourceId));
    });
    document.querySelectorAll('[data-draw]').forEach((button) => {
      button.addEventListener('click', () => this.mapView.startDraw(button.dataset.draw));
    });
    document.getElementById('clear-drawings')?.addEventListener('click', () => this.mapView.clearDrawings());
    document.getElementById('file-upload')?.addEventListener('change', (event) => this.handleFileUpload(event));
    document.getElementById('load-sample')?.addEventListener('click', () => this.loadSampleData());
    document.getElementById('search-form')?.addEventListener('submit', (event) => this.handleSearch(event));
    document.getElementById('analysis-select')?.addEventListener('change', (event) => {
      this.state.selectedAnalysis = event.target.value;
      this.updateAnalysisMeta();
    });
    document.getElementById('run-analysis')?.addEventListener('click', () => this.runAnalysis());
    document.getElementById('gee-connect')?.addEventListener('click', () => this.connectGee());
    document.getElementById('gee-load-asset')?.addEventListener('click', () => this.loadGeeAsset());
    document.getElementById('save-ai-settings')?.addEventListener('click', () => this.saveAiSettings());
    document.getElementById('delete-ai-keys')?.addEventListener('click', () => this.deleteAiKeys());
    document.getElementById('clear-local-data')?.addEventListener('click', () => this.clearAllLocalData());
    document.getElementById('export-png')?.addEventListener('click', () => this.exportPng());
    document.getElementById('export-poster-vertical')?.addEventListener('click', () => this.exportPoster('vertical'));
    document.getElementById('export-poster-horizontal')?.addEventListener('click', () => this.exportPoster('horizontal'));
    document.getElementById('export-pdf')?.addEventListener('click', () => this.exportPdf());
    document.getElementById('export-geojson')?.addEventListener('click', () => this.exportGeoJson());
    document.getElementById('export-shapefile')?.addEventListener('click', () => this.exportShape());
    document.getElementById('export-kml')?.addEventListener('click', () => this.exportKml());
    document.getElementById('reference-search-form')?.addEventListener('submit', (event) => this.searchReferences(event));
    this.populateAnalysisInputs();
  }

  populateAnalysisInputs() {
    const today = new Date().toISOString().slice(0, 10);
    const lastMonth = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const start = document.getElementById('date-start');
    const end = document.getElementById('date-end');
    if (start && !start.value) start.value = lastMonth;
    if (end && !end.value) end.value = today;
    this.updateAnalysisMeta();
  }

  populateAuthInputs() {
    const settings = this.state.aiSettings || {};
    const provider = document.getElementById('ai-provider');
    const apiKey = document.getElementById('ai-api-key');
    const model = document.getElementById('ai-model-endpoint');
    if (provider) provider.value = settings.provider || 'rule-based';
    if (apiKey) apiKey.value = settings.apiKey || '';
    if (model) model.value = settings.endpoint || settings.model || '';
  }

  handleSourceSelection(sourceId) {
    const sourceDate = document.getElementById('source-date')?.value;
    const ok = this.mapView.setBaseSource(sourceId, sourceDate);
    if (ok) this.state.currentSource = sourceId;
    document.getElementById('resolution-hint')?.replaceChildren(
      document.createTextNode(`الدقات المتاحة: ${this.resolutionHint(sourceId)}`)
    );
    document.querySelectorAll('[data-source-id]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.sourceId === this.state.currentSource);
    });
  }

  resolutionHint(sourceId) {
    const lookup = {
      osm: 'متغيرة - خريطة أساس فقط',
      esri_imagery: 'متغيرة - عرض فقط',
      nasa_gibs_viirs: '375m إلى 1km تقريبا للعرض',
      sentinel_copernicus: '10m/20m عند استخدام GEE أو GeoTIFF',
      landsat: '30m عند استخدام GEE أو GeoTIFF',
      modis: '250m/500m/1km عند استخدام مصدر مناسب',
      gee: 'حسب المجموعة المختارة'
    };
    return lookup[sourceId] || 'غير محدد';
  }

  async handleSearch(event) {
    event.preventDefault();
    const input = document.getElementById('place-search');
    const resultsBox = document.getElementById('search-results');
    const query = input?.value?.trim();
    if (!query) return;
    this.setProgress('جاري البحث عبر Nominatim مع احترام حدود الاستخدام...');
    try {
      const results = await geocodePlace(query, 'ar');
      resultsBox.innerHTML = results
        .map(
          (item, index) => `
          <button type="button" data-result-index="${index}">
            <strong>${item.displayName}</strong>
            <small>${item.source === 'local' ? 'محلي' : 'Nominatim / OSM'}</small>
          </button>`
        )
        .join('');
      resultsBox.querySelectorAll('[data-result-index]').forEach((button) => {
        button.addEventListener('click', () => {
          const item = results[Number(button.dataset.resultIndex)];
          this.state.areaName = item.displayName.split(',')[0];
          this.mapView.flyTo(item.lat, item.lon, item.zoom || 12);
          this.updateMapTitle();
          this.setProgress(`تم الانتقال إلى: ${item.displayName}`);
        });
      });
      if (!results.length) this.setProgress('لم يتم العثور على نتائج. جرّب اسما آخر أو ارسم المنطقة يدويا.');
    } catch (error) {
      this.showError(error);
    }
  }

  async handleFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    this.setProgress(`جاري قراءة الملف: ${file.name}`);
    try {
      const extension = file.name.split('.').pop().toLowerCase();
      if (['tif', 'tiff'].includes(extension)) {
        this.state.raster = await readGeoTiff(file);
        this.setProgress(`تمت قراءة GeoTIFF: ${file.name} (${this.state.raster.bandCount} حزم).`);
        return;
      }
      const geojson = await this.readVectorFile(file, extension);
      const fc = ensureFeatureCollection(geojson);
      this.state.uploadedGeoJSON = turf.featureCollection([
        ...this.state.uploadedGeoJSON.features,
        ...fc.features
      ]);
      this.mapView.addGeoJSONLayer(fc, file.name);
      const firstPolygon = fc.features.find((feature) => feature.geometry?.type?.includes('Polygon'));
      if (firstPolygon && !this.state.studyArea) this.mapView.setStudyArea(firstPolygon);
      this.setProgress(`تم رفع ${fc.features.length} عنصر/عناصر من ${file.name}.`);
    } catch (error) {
      this.showError(error);
    } finally {
      event.target.value = '';
    }
  }

  async readVectorFile(file, extension) {
    if (['geojson', 'json'].includes(extension)) {
      return JSON.parse(await file.text());
    }
    if (extension === 'kml') {
      return kml(new DOMParser().parseFromString(await file.text(), 'text/xml'));
    }
    if (extension === 'gpx') {
      return gpx(new DOMParser().parseFromString(await file.text(), 'text/xml'));
    }
    if (extension === 'csv') {
      return parseCsvPoints(await file.text());
    }
    if (extension === 'zip') {
      return shp(await file.arrayBuffer());
    }
    throw new Error('صيغة الملف غير مدعومة في هذه النسخة.');
  }

  loadSampleData() {
    try {
      const aoi = JSON.parse(sampleAoiRaw);
      const points = JSON.parse(samplePointsRaw);
      this.state.uploadedGeoJSON = ensureFeatureCollection(points);
      this.mapView.addGeoJSONLayer(points, 'sample_points.geojson');
      this.mapView.setStudyArea(aoi.features[0] || aoi);
      const result = buildRasterResult({
        analysisId: sampleNdvi.analysisId,
        name: sampleNdvi.name_ar,
        source: sampleNdvi.source,
        values: sampleNdvi.values,
        width: sampleNdvi.width,
        height: sampleNdvi.height,
        bbox: sampleNdvi.bbox,
        dateRange: sampleNdvi.dateRange,
        resolution: sampleNdvi.resolution
      });
      this.state.currentResult = result;
      this.state.selectedAnalysis = 'ndvi';
      this.mapView.addRasterOverlay(result.rasterOverlay, this.state.resultOpacity);
      this.state.interpretation = ruleBasedInterpretation(result, { areaName: 'منطقة تجريبية تعليمية' });
      this.updateInterpretationText();
      this.updateMapTitle();
      this.setProgress('تم تحميل عينة AOI ونقاط ونتيجة NDVI محسوبة من مصفوفة تجريبية صغيرة.');
      if (this.state.activeTab === 'results') this.renderCurrentTab();
    } catch (error) {
      this.showError(error);
    }
  }

  updateAnalysisMeta() {
    const meta = document.getElementById('analysis-meta');
    const analysis = analysisCatalog.find((item) => item.id === this.state.selectedAnalysis);
    if (!meta || !analysis) return;
    meta.innerHTML = `
      <strong>${analysis.name_ar}</strong>
      <span>المعادلة: ${analysis.formula}</span>
      <span>المطلوب: ${analysis.requiredInputs.join('، ')}</span>
      <span class="${analysis.browserSupported ? 'ok-text' : 'warn-text'}">
        ${analysis.browserSupported ? 'يدعم مسارا داخل المتصفح عند توفر البيانات.' : analysis.limitations}
      </span>
    `;
  }

  async runAnalysis() {
    const analysis = analysisCatalog.find((item) => item.id === this.state.selectedAnalysis);
    if (!analysis) return;
    this.setProgress('جاري التحقق من المدخلات...');
    try {
      const dateRange = this.getDateRange();
      const resolution = `${document.getElementById('resolution-select')?.value || '30'} متر`;
      if (!this.state.studyArea && analysis.requiredInputs.includes('studyArea')) {
        throw new Error('حدد منطقة دراسة أولا بالرسم أو رفع مضلع.');
      }

      if (!analysis.browserSupported) {
        if (this.state.geeStatus === 'connected' && analysis.geeSupported) {
          await this.geeClient.runAnalysis(analysis.id, this.state.studyArea, dateRange, resolution);
        }
        throw new Error(analysis.limitations || 'هذا التحليل غير مفعّل بعد في الوضع المجاني.');
      }

      let result;
      if (rasterAnalyses.has(analysis.id)) {
        if (!this.state.raster) {
          if (analysis.id === 'ndvi' && this.state.currentResult?.id === 'ndvi') {
            result = this.state.currentResult;
          } else {
            throw new Error('هذا التحليل يحتاج GeoTIFF مرفوعا أو نتيجة عينة. لا يمكن حساب مؤشر Raster من خريطة أساس فقط.');
          }
        } else {
          result = computeRasterIndex(this.state.raster, analysis.id, this.getBandMap(), {
            analysisName: analysis.name_ar,
            dateRange,
            resolution
          });
        }
        this.mapView.addRasterOverlay(result.rasterOverlay, this.state.resultOpacity);
      } else if (vectorAnalyses.has(analysis.id)) {
        result = runVectorAnalysis(analysis.id, {
          drawnGeoJSON: this.state.drawnGeoJSON,
          uploadedGeoJSON: this.state.uploadedGeoJSON,
          studyArea: this.state.studyArea,
          distanceMeters: Number(document.getElementById('buffer-distance')?.value || 1000),
          context: { dateRange, resolution }
        });
        if (result.geojson?.features?.length) this.mapView.addResultGeoJSON(result.geojson, result.name);
      } else {
        throw new Error('هذا التحليل يحتاج بيانات أو تكاملا غير مفعّل بعد.');
      }

      this.state.currentResult = result;
      this.state.interpretation = '';
      this.updateInterpretationText();
      this.updateMapTitle();
      this.setProgress('اكتمل التحليل بقيم محسوبة فعليا.');
      if (this.state.activeTab === 'results') this.renderCurrentTab();
    } catch (error) {
      this.showError(error);
    }
  }

  getDateRange() {
    return {
      start: document.getElementById('date-start')?.value || null,
      end: document.getElementById('date-end')?.value || null
    };
  }

  getBandMap() {
    return {
      blue: Number(document.getElementById('band-blue')?.value || 1),
      green: Number(document.getElementById('band-green')?.value || 2),
      red: Number(document.getElementById('band-red')?.value || 3),
      nir: Number(document.getElementById('band-nir')?.value || 4),
      swir1: Number(document.getElementById('band-swir1')?.value || 5),
      thermal: Number(document.getElementById('band-thermal')?.value || 6),
      dem: Number(document.getElementById('band-thermal')?.value || 1)
    };
  }

  renderChart() {
    const canvas = document.getElementById('results-chart');
    if (!canvas || !this.state.currentResult?.stats?.classes?.length) return;
    if (this.chart) this.chart.destroy();
    const classes = this.state.currentResult.stats.classes;
    this.chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: classes.map((item) => item.label),
        datasets: [
          {
            label: 'النسبة %',
            data: classes.map((item) => item.percentage || 0),
            backgroundColor: ['#61d7ff', '#d8b45d', '#63d471', '#ff725e', '#b99cff']
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { labels: { color: '#eef8ff' } }
        },
        scales: {
          x: { ticks: { color: '#eef8ff' }, grid: { color: 'rgba(255,255,255,0.08)' } },
          y: { ticks: { color: '#eef8ff' }, grid: { color: 'rgba(255,255,255,0.08)' } }
        }
      }
    });
  }

  async generateInterpretation() {
    if (!this.state.currentResult) {
      this.showError(new Error('نفذ تحليلا أولا قبل تفسير النتيجة.'));
      return;
    }
    this.setProgress('جاري توليد التفسير من القيم المحسوبة...');
    try {
      const settings = this.getAiSettingsFromUi();
      const safeSettings =
        settings.provider !== 'rule-based' && !settings.apiKey && settings.provider !== 'ollama'
          ? { provider: 'rule-based' }
          : settings;
      this.state.interpretation = await callAIProvider(safeSettings, this.state.currentResult, {
        areaName: this.state.areaName
      });
      this.updateInterpretationText();
      this.setProgress('تم توليد التفسير. لم تتم إضافة أرقام غير موجودة في النتائج.');
    } catch (error) {
      this.showError(error);
    }
  }

  getAiSettingsFromUi() {
    const provider = document.getElementById('ai-provider')?.value || this.state.aiSettings.provider || 'rule-based';
    const apiKey = document.getElementById('ai-api-key')?.value || this.state.aiSettings.apiKey || '';
    const modelOrEndpoint =
      document.getElementById('ai-model-endpoint')?.value || this.state.aiSettings.model || this.state.aiSettings.endpoint || '';
    return {
      provider,
      apiKey,
      model: provider === 'ollama' ? '' : modelOrEndpoint,
      endpoint: provider === 'ollama' ? modelOrEndpoint : ''
    };
  }

  updateInterpretationText() {
    const textarea = document.getElementById('interpretation-text');
    if (textarea) textarea.value = this.state.interpretation || '';
  }

  async copyInterpretation() {
    if (!this.state.interpretation) {
      this.showError(new Error('لا يوجد تفسير لنسخه بعد.'));
      return;
    }
    await navigator.clipboard.writeText(this.state.interpretation);
    this.setProgress('تم نسخ التفسير.');
  }

  async exportInterpretationWithMap() {
    if (!this.state.currentResult) {
      this.showError(new Error('نفذ تحليلا أولا.'));
      return;
    }
    await this.exportPng();
    const payload = exportInterpretation(this.state.currentResult, this.state.interpretation);
    console.info('GeoIndex interpretation export payload', payload);
  }

  async saveAiSettings() {
    try {
      const settings = this.getAiSettingsFromUi();
      const consent = document.getElementById('ai-save-local')?.checked;
      if (!consent && settings.apiKey) {
        throw new Error('حدد موافقة الحفظ المحلي إذا أردت تخزين المفتاح في المتصفح.');
      }
      this.state.aiSettings = settings;
      if (consent) await saveLocalSetting('aiSettings', settings);
      this.setProgress('تم حفظ إعدادات AI محليا داخل المتصفح.');
    } catch (error) {
      this.showError(error);
    }
  }

  async deleteAiKeys() {
    this.state.aiSettings = { provider: 'rule-based' };
    await removeLocalSetting('aiSettings');
    this.populateAuthInputs();
    this.setProgress('تم حذف مفاتيح AI المحلية.');
  }

  async clearAllLocalData() {
    await clearLocalData();
    this.state.aiSettings = { provider: 'rule-based' };
    this.setProgress('تم مسح البيانات المحلية المخزنة في المتصفح.');
  }

  async connectGee() {
    try {
      const projectId = document.getElementById('gee-project-id')?.value;
      const oauthClientId = document.getElementById('gee-client-id')?.value;
      await this.geeClient.authenticate({ projectId, oauthClientId });
    } catch (error) {
      this.state.geeStatus = 'failed';
      this.updateGeeStatus(error.message);
      this.showError(error);
    }
  }

  async loadGeeAsset() {
    try {
      const assetId = document.getElementById('gee-asset-id')?.value;
      const asset = await this.geeClient.loadAsset(assetId);
      this.setProgress(`تم التحقق من Asset: ${asset.name || assetId}`);
    } catch (error) {
      this.showError(error);
    }
  }

  updateGeeStatus(message = '') {
    const pill = document.getElementById('connection-pill');
    const status = document.getElementById('gee-status');
    if (pill) pill.textContent = `GEE: ${geeStatusLabel[this.state.geeStatus]}`;
    if (status) status.textContent = geeStatusLabel[this.state.geeStatus];
    if (message) this.setProgress(message);
  }

  async exportPng() {
    try {
      await exportElementAsPng(document.getElementById('map-stage'), this.state.currentResult?.name || 'GeoIndex-Studio');
      this.setProgress('تم تصدير PNG.');
    } catch (error) {
      this.showError(new Error(`${error.message} قد يكون السبب رفض مزود البلاطات التقاط الصور عبر CORS.`));
    }
  }

  async exportPoster(orientation) {
    try {
      await exportPoster({
        mapElement: document.getElementById('map-stage'),
        result: this.state.currentResult,
        interpretation: this.state.interpretation,
        templateId: document.getElementById('poster-template')?.value || 'luxury_dark',
        orientation
      });
      this.setProgress(`تم تصدير بوستر ${orientation === 'vertical' ? 'عمودي' : 'أفقي'}.`);
    } catch (error) {
      this.showError(error);
    }
  }

  async exportPdf() {
    try {
      await exportElementAsPdf(document.getElementById('map-stage'), this.state.currentResult?.name || 'GeoIndex-Studio');
      this.setProgress('تم تصدير PDF.');
    } catch (error) {
      this.showError(error);
    }
  }

  exportGeoJson() {
    try {
      exportGeoJSON(this.collectVectorExport(), 'GeoIndex-vector');
      this.setProgress('تم تصدير GeoJSON.');
    } catch (error) {
      this.showError(error);
    }
  }

  exportShape() {
    try {
      exportShapefile(this.collectVectorExport(), 'GeoIndex-shapefile');
      this.setProgress('تم تصدير Shapefile ZIP.');
    } catch (error) {
      this.showError(error);
    }
  }

  exportKml() {
    try {
      exportKML(this.collectVectorExport(), 'GeoIndex-kml');
      this.setProgress('تم تصدير KML.');
    } catch (error) {
      this.showError(error);
    }
  }

  async searchReferences(event) {
    event.preventDefault();
    const query = document.getElementById('reference-query')?.value?.trim();
    const box = document.getElementById('reference-results');
    if (!query || !box) return;
    const fallbackLinks = [
      {
        title: `NASA Earthdata: ${query}`,
        url: `https://search.earthdata.nasa.gov/search?q=${encodeURIComponent(query)}`
      },
      {
        title: `Copernicus Data Space: ${query}`,
        url: `https://dataspace.copernicus.eu/search?query=${encodeURIComponent(query)}`
      },
      {
        title: `OpenStreetMap Wiki: ${query}`,
        url: `https://wiki.openstreetmap.org/w/index.php?search=${encodeURIComponent(query)}`
      }
    ];
    try {
      const response = await fetch(`http://localhost:8787/api/reference-search?q=${encodeURIComponent(query)}`);
      const data = response.ok ? await response.json() : { links: fallbackLinks };
      this.renderReferenceLinks(box, data.links || fallbackLinks, data.note);
      this.setProgress('تم عرض روابط مراجع مساعدة منفصلة عن النتائج المحسوبة.');
    } catch {
      this.renderReferenceLinks(
        box,
        fallbackLinks,
        'الخادم الاختياري غير متاح، لذلك عُرضت روابط مفتوحة مباشرة بدلا من البحث الخلفي.'
      );
    }
  }

  renderReferenceLinks(box, links, note = '') {
    box.innerHTML = `
      ${note ? `<article><span>${note}</span></article>` : ''}
      ${links
        .map(
          (link) => `
          <article>
            <strong>${link.title}</strong>
            <a href="${link.url}" target="_blank" rel="noreferrer">${link.url}</a>
          </article>`
        )
        .join('')}
    `;
  }

  collectVectorExport() {
    const features = [
      ...(this.state.currentResult?.geojson?.features || []),
      ...(this.state.studyArea?.features || []),
      ...(this.state.drawnGeoJSON?.features || [])
    ];
    const fc = turf.featureCollection(features);
    if (!fc.features.length) throw new Error('لا توجد بيانات Vector للتصدير. Raster لا يحول إلى Shapefile دون تحويل حقيقي.');
    return fc;
  }

  updateMapTitle() {
    const title = document.getElementById('map-title');
    const subtitle = document.getElementById('map-subtitle');
    if (title) title.textContent = this.state.currentResult?.name || 'خريطة تحليل جغرافي';
    if (subtitle) {
      subtitle.textContent = `${this.state.areaName || 'منطقة الدراسة'} · ${this.state.currentResult?.source || 'kamel3lom'}`;
    }
  }

  setProgress(message) {
    this.state.progress = message;
    document.getElementById('progress-text')?.replaceChildren(document.createTextNode(message));
    document.getElementById('analysis-state')?.replaceChildren(document.createTextNode(message));
  }

  showError(error) {
    const message = error?.message || String(error);
    this.setProgress(message);
    const root = document.getElementById('toast-root');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    root.appendChild(toast);
    window.setTimeout(() => toast.remove(), 6500);
  }
}
