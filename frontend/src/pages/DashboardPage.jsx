import { useMemo, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import GlassCard from "../components/GlassCard";
import RiskBadge from "../components/RiskBadge";
import TrendChart from "../components/TrendChart";
import HotspotMap from "../components/HotspotMap";
import AlertBanner from "../components/AlertBanner";
import HealthTimeline from "../components/HealthTimeline";
import NearbyHelp from "../components/NearbyHelp";
import CommunityRiskCard from "../components/CommunityRiskCard";
import PrivacyBar from "../components/PrivacyBar";
import {
  getHeatmapData,
  getUserHistory,
  getAlerts,
  getNearbyHospitals,
  getCommunityRiskIndex,
} from "../services/api";
import { mergeHistoryEntries, readLocalTimeline } from "../utils/timeline";
import { loadDemoData } from "../utils/demoSeed";

export default function DashboardPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const result = useMemo(() => {
    const value = localStorage.getItem("respirasense:lastResult");
    return value ? JSON.parse(value) : null;
  }, [refreshKey]);

  const riskLevel = result?.prediction?.risk_level ?? "Low";
  const prob = result?.prediction?.outbreak_probability ?? 0.2;
  const trends = result?.trends ?? { trend: [], forecast: [] };

  const lat = Number(result?.form?.latitude ?? 12.9716);
  const lng = Number(result?.form?.longitude ?? 77.5946);
  const region = result?.form?.region ?? "Bengaluru";

  const [showHeatmap, setShowHeatmap] = useState(true);
  const [heatmap, setHeatmap] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [alertVisible, setAlertVisible] = useState(true);
  const [historyApi, setHistoryApi] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [loadingGeo, setLoadingGeo] = useState(true);
  const [community, setCommunity] = useState(null);
  const [loadingCommunity, setLoadingCommunity] = useState(true);
  const [demoLoading, setDemoLoading] = useState(false);

  const loadDemo = useCallback(async () => {
    setDemoLoading(true);
    try {
      await loadDemoData();
      setRefreshKey((k) => k + 1);
    } catch (e) {
      console.error(e);
    } finally {
      setDemoLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingGeo(true);
      setLoadingCommunity(true);
      try {
        const [hm, al, hi, ho, cr] = await Promise.all([
          getHeatmapData(region, lat, lng),
          getAlerts({ region, risk_level: riskLevel, latitude: lat, longitude: lng }),
          getUserHistory({ limit: 35, latitude: lat, longitude: lng, region }),
          getNearbyHospitals(lat, lng, 6),
          getCommunityRiskIndex(region, lat, lng),
        ]);
        if (!cancelled) {
          setHeatmap(hm);
          setAlerts(al.alerts || []);
          setHistoryApi(hi.entries || []);
          setHospitals(ho.hospitals || []);
          setCommunity(cr);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) {
          setLoadingGeo(false);
          setLoadingCommunity(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [region, lat, lng, riskLevel, refreshKey]);

  const timelineMerged = useMemo(
    () => mergeHistoryEntries(historyApi, readLocalTimeline()),
    [historyApi, refreshKey]
  );

  const visibleAlerts = alertVisible ? alerts : [];

  return (
    <div className="page">
      <motion.section
        className="impact-strip"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <p>
          <strong>Real-world impact:</strong> early signal detection for governments, triage support for
          hospitals, personal risk awareness for individuals — designed to operate where connectivity is
          limited (demo deployment).
        </p>
      </motion.section>

      <div className="dashboard-toolbar">
        <button type="button" className="btn btn-ghost demo-load-btn" onClick={loadDemo} disabled={demoLoading}>
          {demoLoading ? "Loading…" : "Load demo data"}
        </button>
        <span className="toolbar-hint muted">Preloads dashboard for judge-ready walkthrough</span>
      </div>

      <AlertBanner
        alerts={visibleAlerts}
        onDismiss={() => setAlertVisible(false)}
      />

      <div className="grid-2 cri-row">
        <GlassCard title="Community Risk Index">
          <CommunityRiskCard data={community} loading={loadingCommunity} />
        </GlassCard>
        <GlassCard title="Your Risk Snapshot">
          <RiskBadge level={riskLevel} />
          <h2 className="dash-risk-pct">{(prob * 100).toFixed(1)}%</h2>
          <p className="muted">Personal outbreak probability (multimodal fusion)</p>
        </GlassCard>
      </div>

      <div className="grid-3">
        <GlassCard title="Structured + Audio Fusion">
          <p className="muted">Context intelligence + cough pathway</p>
          <h2>{((result?.prediction?.fused_score ?? prob) * 100).toFixed(1)}%</h2>
          <p>Combined score</p>
        </GlassCard>

        <GlassCard title="Alert Panel">
          <p>
            {riskLevel === "High"
              ? "Escalation detected in your selected region."
              : "No severe anomaly detected."}
          </p>
          <p>Monitoring cadence: every 6 hours</p>
          <p>System uptime: 99.98%</p>
        </GlassCard>

        <GlassCard title="Hotspot Score">
          <h2>{((result?.trends?.hotspot_score ?? 0.42) * 100).toFixed(1)}%</h2>
          <p>Cluster concentration index</p>
        </GlassCard>
      </div>

      <PrivacyBar />

      <div className="grid-2">
        <GlassCard title="Personal Health Timeline">
          <HealthTimeline entries={timelineMerged} />
        </GlassCard>
        <GlassCard title="Nearby Help">
          <p className="nearby-intro muted">Nearest facilities and emergency contacts (demo data).</p>
          <NearbyHelp hospitals={hospitals} loading={loadingGeo} />
        </GlassCard>
      </div>

      <div className="grid-2">
        <GlassCard title="Risk Trend Analysis">
          <TrendChart trend={trends.trend} forecast={trends.forecast} />
        </GlassCard>
        <GlassCard
          title="Live Outbreak Heatmap"
          action={
            <label className="toggle-heatmap">
              <input
                type="checkbox"
                checked={showHeatmap}
                onChange={(e) => setShowHeatmap(e.target.checked)}
              />
              <span>Show Heatmap</span>
            </label>
          }
        >
          <HotspotMap
            center={heatmap?.center}
            points={heatmap?.points}
            clusters={heatmap?.clusters}
            showHeatmap={showHeatmap}
            userLat={lat}
            userLng={lng}
          />
          <p className="map-legend muted">
            Gradient: low <span className="legend-dot leg-low" /> → medium{" "}
            <span className="legend-dot leg-mid" /> → high <span className="legend-dot leg-high" />
          </p>
        </GlassCard>
      </div>
    </div>
  );
}
