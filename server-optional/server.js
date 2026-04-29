import express from 'express';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 8787;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'GeoIndex Studio optional server' });
});

app.get('/api/reference-search', async (req, res) => {
  const query = String(req.query.q || '').trim();
  if (!query) {
    res.status(400).json({ error: 'q is required' });
    return;
  }

  const links = [
    {
      title: `OpenAlex search: ${query}`,
      url: `https://api.openalex.org/works?search=${encodeURIComponent(query)}`
    },
    {
      title: `Wikipedia search: ${query}`,
      url: `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(query)}`
    },
    {
      title: `NASA Earthdata search: ${query}`,
      url: `https://search.earthdata.nasa.gov/search?q=${encodeURIComponent(query)}`
    }
  ];

  res.json({
    query,
    note:
      'This optional endpoint returns helper reference links only. It does not mix web references with computed GIS results.',
    links
  });
});

app.post('/api/gee/analyze', async (req, res) => {
  await forwardGeeRequest(req, res, process.env.GEE_ANALYSIS_ENDPOINT, 'analyze');
});

app.post('/api/gee/map', async (req, res) => {
  await forwardGeeRequest(req, res, process.env.GEE_MAP_ENDPOINT || process.env.GEE_ANALYSIS_ENDPOINT, 'map');
});

async function forwardGeeRequest(req, res, endpoint, action) {
  if (!endpoint) {
    res.status(501).json({
      error:
        'GEE endpoint is not configured. Set GEE_ANALYSIS_ENDPOINT, and optionally GEE_MAP_ENDPOINT, on the server that owns the Earth Engine scripts.',
      expectedResponse:
        'Return JSON with result.stats and either result.tileUrl/map.tileUrl for map display, or result.geojson/rasterOverlay for direct rendering.'
    });
    return;
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: req.headers.authorization || ''
      },
      body: JSON.stringify({ ...req.body, action })
    });
    const text = await response.text();
    res.status(response.status).type(response.headers.get('content-type') || 'application/json').send(text);
  } catch (error) {
    res.status(502).json({ error: `Failed to call configured GEE endpoint: ${error.message}` });
  }
}

app.listen(port, () => {
  console.log(`GeoIndex optional server running at http://localhost:${port}`);
});
