import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { GeoIndexApp } from './app';
import './styles.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
});

const root = document.getElementById('app');
const app = new GeoIndexApp(root);
app.init().catch((error) => {
  console.error(error);
  root.innerHTML = `<main class="fatal-error"><h1>تعذر تشغيل GeoIndex Studio</h1><p>${error.message}</p></main>`;
});
