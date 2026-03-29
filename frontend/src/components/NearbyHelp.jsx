import { MapPin, Phone, Siren } from "lucide-react";

export default function NearbyHelp({ hospitals = [], loading }) {
  if (loading) {
    return <p className="explain-muted">Loading nearby resources…</p>;
  }
  if (!hospitals.length) {
    return <p className="explain-muted">Enable location context on the Analysis page to see facilities.</p>;
  }

  return (
    <ul className="nearby-list">
      {hospitals.map((h) => (
        <li key={h.id} className="nearby-item">
          <div className="nearby-main">
            <MapPin size={16} className="nearby-pin" />
            <div>
              <strong>{h.name}</strong>
              <span className="nearby-dist">{h.distance_km} km</span>
            </div>
          </div>
          <div className="nearby-actions">
            {h.emergency && (
              <span className="nearby-badge">
                <Siren size={12} /> ER
              </span>
            )}
            <a className="nearby-phone" href={`tel:${h.phone.replace(/\s/g, "")}`}>
              <Phone size={14} /> {h.phone}
            </a>
          </div>
        </li>
      ))}
    </ul>
  );
}
