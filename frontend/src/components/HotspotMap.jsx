import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const hotspots = [
  { id: 1, name: "North Cluster", lat: 12.9716, lng: 77.5946, score: 0.72 },
  { id: 2, name: "Industrial Belt", lat: 13.001, lng: 77.62, score: 0.83 },
  { id: 3, name: "Transit Hub", lat: 12.935, lng: 77.61, score: 0.57 },
];

export default function HotspotMap() {
  return (
    <div className="map-wrap">
      <MapContainer center={[12.9716, 77.5946]} zoom={11} scrollWheelZoom={false} style={{ height: "300px", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {hotspots.map((spot) => (
          <CircleMarker
            key={spot.id}
            center={[spot.lat, spot.lng]}
            pathOptions={{
              color: spot.score > 0.75 ? "#f97316" : "#22D3EE",
              fillColor: spot.score > 0.75 ? "#ef4444" : "#6366F1",
              fillOpacity: 0.6,
            }}
            radius={10 + spot.score * 8}
          >
            <Popup>
              {spot.name} - Hotspot score: {(spot.score * 100).toFixed(1)}%
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
