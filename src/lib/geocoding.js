import places from '../data/places.json';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
let lastRequestTime = 0;

export function searchLocalPlaces(query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  return places.filter((place) =>
    [place.name_ar, place.name_en].some((name) => name.toLowerCase().includes(normalized))
  );
}

export async function geocodePlace(query, language = 'ar') {
  const local = searchLocalPlaces(query);
  if (local.length > 0) {
    return local.map((place) => ({
      displayName: `${place.name_ar} / ${place.name_en}`,
      lat: place.lat,
      lon: place.lon,
      zoom: place.zoom,
      source: 'local'
    }));
  }

  const now = Date.now();
  const waitMs = Math.max(0, 1100 - (now - lastRequestTime));
  if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
  lastRequestTime = Date.now();

  const params = new URLSearchParams({
    format: 'jsonv2',
    q: query,
    limit: '5',
    addressdetails: '1',
    polygon_geojson: '1',
    'accept-language': language
  });

  const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
    headers: {
      Accept: 'application/json'
    }
  });
  if (!response.ok) {
    throw new Error('تعذر الاتصال بخدمة Nominatim. حاول لاحقا أو استخدم مكانا محفوظا.');
  }
  const data = await response.json();
  return data.map((item) => ({
    displayName: item.display_name,
    lat: Number(item.lat),
    lon: Number(item.lon),
    bbox: item.boundingbox?.map(Number),
    geojson: item.geojson,
    zoom: item.type === 'city' ? 11 : 13,
    source: 'nominatim'
  }));
}
