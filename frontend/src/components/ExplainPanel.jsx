import {
  Wind,
  Thermometer,
  Activity,
  Mic,
  Clock,
  MapPin,
  AlertTriangle,
} from "lucide-react";

const iconFor = (key) => {
  const k = (key || "").toLowerCase();
  if (k.includes("aqi") || k === "aqi") return Wind;
  if (k.includes("fever") || k.includes("temp")) return Thermometer;
  if (k.includes("audio") || k.includes("cough")) return Mic;
  if (k.includes("duration")) return Clock;
  if (k.includes("historical") || k.includes("region")) return MapPin;
  if (k.includes("breath") || k.includes("fatigue")) return Activity;
  return AlertTriangle;
};

export default function ExplainPanel({ factors = [] }) {
  if (!factors.length) {
    return (
      <div className="explain-panel">
        <p className="explain-muted">No factor breakdown available for this run.</p>
      </div>
    );
  }

  return (
    <div className="explain-panel">
      <h4 className="explain-title">Why this result?</h4>
      <ul className="explain-list">
        {factors.map((f, idx) => {
          const Icon = iconFor(f.key);
          const impactClass =
            f.impact === "increase"
              ? "explain-impact-up"
              : f.impact === "decrease"
              ? "explain-impact-down"
              : "explain-impact-neutral";
          return (
            <li key={`${f.key}-${idx}`} className="explain-item">
              <span className={`explain-icon ${impactClass}`}>
                <Icon size={18} />
              </span>
              <div>
                <span className="explain-label">{f.label}</span>
                <p className="explain-msg">{f.message}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
