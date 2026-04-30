import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const checks = [];

function check(name, condition, detail = '') {
  checks.push({ name, ok: Boolean(condition), detail });
}

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), 'utf8'));
}

check('public/index.html exists', existsSync(join(root, 'public/index.html')));
check('root index.html exists for Vite dev server', existsSync(join(root, 'index.html')));
check('main app exists', existsSync(join(root, 'src/app.js')));
check('map component exists', existsSync(join(root, 'src/components/MapView.js')));
check('sample AOI exists', existsSync(join(root, 'sample-data/sample_aoi.geojson')));
check('sample NDVI exists', existsSync(join(root, 'sample-data/sample_ndvi_result.json')));

const pkg = readJson('package.json');
check('npm scripts present', Boolean(pkg.scripts?.dev && pkg.scripts?.build && pkg.scripts?.test));

const index = readFileSync(join(root, 'index.html'), 'utf8');
check('page bootstraps module', index.includes('./src/main.js'));

const app = readFileSync(join(root, 'src/app.js'), 'utf8');
const selector = readFileSync(join(root, 'src/components/AnalysisSelector.js'), 'utf8');
const mapView = readFileSync(join(root, 'src/components/MapView.js'), 'utf8');
check('Leaflet map container referenced', app.includes('id="map"'));
check('direct GEE selector filters simple options', selector.includes('directGeeAnalysisIds'));
check('draw toolbar hidden by default', !mapView.includes('this.addDrawToolbar();'));
check(
  'leaflet draw plugin not imported',
  !mapView.includes('leaflet-draw') && !readFileSync(join(root, 'src/main.js'), 'utf8').includes('leaflet.draw.css')
);
check('exports wired', app.includes('export-poster-vertical') && app.includes('export-geojson'));

const analysisCatalog = readJson('src/data/analysis-catalog.json');
const requiredAnalyses = ['ndvi', 'ndwi', 'mndwi', 'ndbi', 'lst', 'precipitation', 'no2', 'co2', 'landcover'];
check(
  'required analyses in catalog',
  requiredAnalyses.every((id) => analysisCatalog.some((item) => item.id === id))
);

const sourceCatalog = readJson('src/data/open-data-catalog.json');
check('open data catalog includes OSM', sourceCatalog.some((item) => item.name === 'OpenStreetMap'));
check('open data catalog marks keys honestly', sourceCatalog.some((item) => item.requiresApiKey === true));

const sample = readJson('sample-data/sample_ndvi_result.json');
const valid = sample.values.filter((value) => Number.isFinite(value));
const mean = valid.reduce((sum, value) => sum + value, 0) / valid.length;
check('sample NDVI computes real mean', Number.isFinite(mean) && mean > 0.2 && mean < 0.5, `mean=${mean.toFixed(4)}`);

const allSourceText = [
  readFileSync(join(root, 'src/lib/geeClient.js'), 'utf8'),
  readFileSync(join(root, 'src/lib/aiInterpreter.js'), 'utf8'),
  readFileSync(join(root, 'README.md'), 'utf8')
].join('\n');
check('no obvious secret keys committed', !/(sk-[A-Za-z0-9]{20,}|AIza[A-Za-z0-9_-]{20,})/.test(allSourceText));
check(
  'GEE analysis runs direct without configured server',
  allSourceText.includes('earthengine-api.min.js') &&
    allSourceText.includes('Google Earth Engine') &&
    !allSourceText.includes('GEE_ANALYSIS_ENDPOINT')
);

const failed = checks.filter((item) => !item.ok);
for (const item of checks) {
  console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.name}${item.detail ? ` (${item.detail})` : ''}`);
}

if (failed.length) {
  console.error(`\n${failed.length} smoke check(s) failed.`);
  process.exit(1);
}

console.log('\nSmoke checks passed. For visual QA, run npm run dev and test city/year/GEE analysis in the browser.');
