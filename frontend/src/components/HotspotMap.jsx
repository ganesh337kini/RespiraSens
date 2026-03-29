import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, Circle, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER = [12.9716, 77.5946];

function intensityColor(intensity) {
  if (intensity < 0.34) return { stroke: "#22c55e", fill: "#22c55e" };
  if (intensity < 0.67) return { stroke: "#eab308", fill: "#facc15" };
  return { stroke: "#ef4444", fill: "#f97316" };
}

const FALLBACK_POINTS = [
  { id: 1, name: "North Cluster", lat: 12.9716, lng: 77.5946, intensity: 0.72 },
  { id: 2, name: "Industrial Belt", lat: 13.001, lng: 77.62, intensity: 0.83 },
  { id: 3, name: "Transit Hub", lat: 12.935, lng: 77.61, intensity: 0.57 },
];

function MapRecenter({ lat, lng, zoom = 11 }) {
  const map = useMap();
  useEffect(() => {
    if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
      map.flyTo([lat, lng], zoom, { duration: 0.75 });
    }
  }, [lat, lng, zoom, map]);
  return null;
}

export default function HotspotMap({
  center,
  points = null,
  clusters = null,
  showHeatmap = true,
  userLat = null,
  userLng = null,
  mapZoom = 11,
}) {
  const mapCenter =
    center?.lat != null && center?.lng != null ? [center.lat, center.lng] : DEFAULT_CENTER;
  const rawPoints =
    points && points.length
      ? points.map((p) => ({
          id: p.id,
          lat: p.lat,
          lng: p.lng,
          intensity: p.intensity ?? 0.5,
          label: p.label ?? "Hotspot",
        }))
      : FALLBACK_POINTS.map((p) => ({
          id: p.id,
          lat: p.lat,
          lng: p.lng,
          intensity: p.intensity ?? p.score ?? 0.5,
          label: p.name,
        }));

  const recenterLat = userLat != null ? userLat : center?.lat;
  const recenterLng = userLng != null ? userLng : center?.lng;

  return (
    <div className="map-wrap">
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        scrollWheelZoom={false}
        style={{ height: "300px", width: "100%" }}
      >
        <MapRecenter lat={recenterLat} lng={recenterLng} zoom={mapZoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {userLat != null && userLng != null && (
          <CircleMarker
            center={[userLat, userLng]}
            pathOptions={{ color: "#22d3ee", fillColor: "#6366f1", fillOpacity: 0.42 }}
            radius={11}
          >
            <Popup>You are here — location used for nearby risk context</Popup>
          </CircleMarker>
        )}
        {showHeatmap &&
          rawPoints.map((spot) => {
            const colors = intensityColor(spot.intensity);
            return (
              <CircleMarker
                key={spot.id}
                center={[spot.lat, spot.lng]}
                pathOptions={{
                  color: colors.stroke,
                  fillColor: colors.fill,
                  fillOpacity: 0.45 + spot.intensity * 0.35,
                  weight: 2,
                }}
                radius={8 + spot.intensity * 14}
              >
                <Popup>
                  {spot.label} — intensity {(spot.intensity * 100).toFixed(0)}%
                </Popup>
              </CircleMarker>
            );
          })}
        {showHeatmap &&
          clusters?.map((c, idx) => (
            <Circle
              key={`cl-${idx}`}
              center={[c.lat, c.lng]}
              pathOptions={{
                color: "#6366f1",
                fillColor: "#6366f1",
                fillOpacity: 0.08,
                weight: 1,
              }}
              radius={80 + c.count * 3}
            />
          ))}
      </MapContainer>
    </div>
  );
}
