import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

export default function IncidentMap({ incidents }: { incidents: any[] }) {
  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl,
      iconUrl,
      shadowUrl,
    });
  }, []);

  const defaultCenter: [number, number] = [36.8065, 10.1815];

  return (
    <MapContainer center={defaultCenter} zoom={12} className="h-full w-full rounded-xl">
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {incidents.map((inc) => (
        <Marker key={inc.id} position={[inc.latitude, inc.longitude]}>
          <Popup>
            <div className="font-sans">
              <p className="font-bold text-sm text-gray-900">{inc.title}</p>
              <p className="text-xs text-gray-600">{inc.raw_description}</p>
              <div className="mt-2 flex gap-2">
                <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold">{inc.priority}</span>
                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">{inc.status}</span>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
