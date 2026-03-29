import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

function trendArrow(dir) {
  if (dir === "rising") return { icon: TrendingUp, label: "Rising", sym: "🔺", cls: "cri-rise" };
  if (dir === "falling") return { icon: TrendingDown, label: "Falling", sym: "🔻", cls: "cri-fall" };
  return { icon: Minus, label: "Stable", sym: "▪", cls: "cri-flat" };
}

export default function CommunityRiskCard({ data, loading }) {
  if (loading || !data) {
    return <p className="muted">Loading community index…</p>;
  }

  const t = trendArrow(data.trend_direction);
  const Icon = t.icon;

  return (
    <motion.div
      className="cri-card"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="cri-main">
        <strong className="cri-region">{data.focus_region}</strong>
        <span className="cri-arrow">→</span>
        <span className="cri-index">{data.community_index.toFixed(2)}</span>
        <span className={`cri-trend ${t.cls}`}>
          <Icon size={16} />
          {t.label} {t.sym}
        </span>
      </div>
      <p className="cri-meta muted">
        7d Δ {data.delta_7d >= 0 ? "+" : ""}
        {data.delta_7d.toFixed(3)} · ~{data.sample_size_anonymous.toLocaleString()} anonymized signals (demo)
      </p>
      {data.peer_regions?.length > 0 && (
        <ul className="cri-peers">
          {data.peer_regions.slice(0, 3).map((p) => (
            <li key={p.region}>
              {p.region}: <strong>{p.index.toFixed(2)}</strong>{" "}
              <span className="muted">({p.trend})</span>
            </li>
          ))}
        </ul>
      )}
      <p className="cri-note muted">{data.method_note}</p>
    </motion.div>
  );
}
