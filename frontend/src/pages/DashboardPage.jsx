import { useMemo } from "react";
import GlassCard from "../components/GlassCard";
import RiskBadge from "../components/RiskBadge";
import TrendChart from "../components/TrendChart";
import HotspotMap from "../components/HotspotMap";

export default function DashboardPage() {
  const result = useMemo(() => {
    const value = localStorage.getItem("respirasense:lastResult");
    return value ? JSON.parse(value) : null;
  }, []);

  const riskLevel = result?.prediction?.risk_level ?? "Low";
  const prob = result?.prediction?.outbreak_probability ?? 0.2;
  const trends = result?.trends ?? { trend: [], forecast: [] };

  return (
    <div className="page">
      <div className="grid-3">
        <GlassCard title="Current Risk Status">
          <RiskBadge level={riskLevel} />
          <h2>{(prob * 100).toFixed(1)}%</h2>
          <p>Predicted outbreak probability</p>
        </GlassCard>

        <GlassCard title="Alert Panel">
          <p>{riskLevel === "High" ? "Escalation detected in your selected region." : "No severe anomaly detected."}</p>
          <p>Monitoring cadence: every 6 hours</p>
          <p>System uptime: 99.98%</p>
        </GlassCard>

        <GlassCard title="Hotspot Score">
          <h2>{((result?.trends?.hotspot_score ?? 0.42) * 100).toFixed(1)}%</h2>
          <p>Cluster concentration index</p>
        </GlassCard>
      </div>

      <div className="grid-2">
        <GlassCard title="Risk Trend Analysis">
          <TrendChart trend={trends.trend} forecast={trends.forecast} />
        </GlassCard>
        <GlassCard title="Region Hotspots">
          <HotspotMap />
        </GlassCard>
      </div>
    </div>
  );
}
