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

app.listen(port, () => {
  console.log(`GeoIndex optional server running at http://localhost:${port}`);
});
