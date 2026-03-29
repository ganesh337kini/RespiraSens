import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import GlassCard from "../components/GlassCard";
import RiskBadge from "../components/RiskBadge";
import HotspotMap from "../components/HotspotMap";
import {
  analyzeAudio,
  predictRisk,
  getTrends,
  contributeAnonymous,
  reverseGeocode,
  getHeatmapData,
} from "../services/api";
import { pushTimelineEntry } from "../utils/timeline";
import { getShareAggregateEnabled } from "../utils/privacySettings";

function buildPayload(form, audio, audioFeatures) {
  return {
    symptoms: {
      fever: form.fever,
      breathlessness: form.breathlessness,
      fatigue: form.fatigue,
      cough_duration_days: Number(form.cough_duration_days),
    },
    latitude: Number(form.latitude),
    longitude: Number(form.longitude),
    region: form.region,
    timestamp: new Date().toISOString(),
    historical_risk_index: Number(form.historical_risk_index),
    aqi: Number(form.aqi),
    temperature_c: Number(form.temperature_c),
    humidity: Number(form.humidity),
    audio_risk_score: Number(audio.audio_risk_score ?? 0.35),
    audio_features: audioFeatures,
  };
}

export default function AnalysisPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [simulateMode, setSimulateMode] = useState(false);
  const [simPreview, setSimPreview] = useState(null);
  const [simLoading, setSimLoading] = useState(false);
  const [form, setForm] = useState({
    fever: false,
    breathlessness: false,
    fatigue: false,
    cough_duration_days: 3,
    latitude: 12.9716,
    longitude: 77.5946,
    region: "Bengaluru",
    historical_risk_index: 0.46,
    aqi: 92,
    temperature_c: 28,
    humidity: 62,
  });

  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState(null);
  const [locationHint, setLocationHint] = useState("");
  const [heatmapPreview, setHeatmapPreview] = useState(null);
  const [heatmapLoading, setHeatmapLoading] = useState(false);

  const refreshHeatmap = useCallback(async (region, lat, lng) => {
    setHeatmapLoading(true);
    try {
      const hm = await getHeatmapData(region, Number(lat), Number(lng));
      setHeatmapPreview(hm);
    } catch {
      setHeatmapPreview(null);
    } finally {
      setHeatmapLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      refreshHeatmap(form.region, form.latitude, form.longitude);
    }, 400);
    return () => clearTimeout(t);
  }, [form.region, form.latitude, form.longitude, refreshHeatmap]);

  const applyGeolocationCoords = useCallback(async (lat, lng, silent = false) => {
    if (!silent) {
      setGeoError(null);
      setLocationHint("");
    }

    const geo = await reverseGeocode(lat, lng);
    setLocationHint(
      geo.display_name?.includes("offline")
        ? "Coordinates saved; edit region label if the auto name is unclear."
        : "Location detected automatically for this session."
    );

    setForm((s) => ({
      ...s,
      latitude: lat,
      longitude: lng,
      region: geo.region || s.region,
    }));
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return undefined;
    const id = window.setTimeout(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          applyGeolocationCoords(pos.coords.latitude, pos.coords.longitude, true);
        },
        () => {},
        { enableHighAccuracy: false, maximumAge: 300000, timeout: 12000 }
      );
    }, 600);
    return () => clearTimeout(id);
  }, [applyGeolocationCoords]);

  const useCurrentLocation = () => {
    setGeoError(null);
    setLocationHint("");
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported in this browser.");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await applyGeolocationCoords(pos.coords.latitude, pos.coords.longitude, false);
        } finally {
          setGeoLoading(false);
        }
      },
      (err) => {
        setGeoLoading(false);
        if (err?.code === 1)
          setGeoError("Permission denied — allow location or enter coordinates manually.");
        else setGeoError("Location unavailable. Try again or enter manually.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const onToggle = (key) => setForm((s) => ({ ...s, [key]: !s[key] }));

  const runSimulation = useCallback(async () => {
    if (!simulateMode) return;
    setSimLoading(true);
    try {
      const audio = { audio_risk_score: 0.35 };
      const payload = buildPayload(form, audio, null);
      const p = await predictRisk(payload);
      setSimPreview(p);
    } catch {
      setSimPreview(null);
    } finally {
      setSimLoading(false);
    }
  }, [simulateMode, form]);

  useEffect(() => {
    if (!simulateMode) {
      setSimPreview(null);
      return;
    }
    const t = setTimeout(runSimulation, 480);
    return () => clearTimeout(t);
  }, [simulateMode, form, runSimulation]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let audio = { audio_risk_score: 0.35 };
      if (file) {
        audio = await analyzeAudio(file);
      }

      const audioFeatures =
        file &&
        audio.mfcc_mean != null &&
        audio.zcr != null &&
        audio.spectral_centroid != null &&
        audio.energy != null
          ? {
              mfcc_mean: Number(audio.mfcc_mean),
              zcr: Number(audio.zcr),
              spectral_centroid: Number(audio.spectral_centroid),
              energy: Number(audio.energy),
              roughness:
                audio.roughness != null
                  ? Number(audio.roughness)
                  : Math.abs(Number(audio.zcr) - Number(audio.energy)),
            }
          : null;

      const payload = buildPayload(form, audio, audioFeatures);

      const [prediction, trends] = await Promise.all([
        predictRisk(payload),
        getTrends(form.region, Number(form.historical_risk_index)),
      ]);

      const ts = new Date().toISOString();
      const merged = {
        form,
        audio,
        prediction,
        trends,
        timestamp: ts,
      };
      localStorage.setItem("respirasense:lastResult", JSON.stringify(merged));
      pushTimelineEntry({
        recorded_at: ts,
        fused_score: prediction.fused_score,
        risk_level: prediction.risk_level,
        region: form.region,
      });
      if (getShareAggregateEnabled()) {
        const band = prediction.risk_level.toLowerCase();
        contributeAnonymous({
          region: form.region,
          risk_band: band,
          latitude: Number(form.latitude),
          longitude: Number(form.longitude),
        }).catch(() => {});
      }
      navigate("/results");
    } catch (error) {
      console.error(error);
      alert("Analysis failed. Ensure backend is running and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <GlassCard title="Multimodal Analysis">
        <p className="geo-privacy-note muted">
          Location is used only for risk prediction and regional context; coordinates are rounded when
          anonymized for aggregates.
        </p>

        <div className="geo-actions">
          <motion.button
            type="button"
            className="btn btn-ghost geo-locate-btn"
            onClick={useCurrentLocation}
            disabled={geoLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {geoLoading ? "Locating…" : "📍 Use current location"}
          </motion.button>
          {locationHint && (
            <span className="geo-hint muted" title="Location detected automatically">
              {locationHint}
            </span>
          )}
        </div>
        {geoError && <p className="geo-error">{geoError}</p>}

        <div className="simulate-bar">
          <label className="toggle-simulate">
            <input
              type="checkbox"
              checked={simulateMode}
              onChange={(e) => setSimulateMode(e.target.checked)}
            />
            <span>Simulate Risk</span>
          </label>
          <p className="simulate-hint muted">
            Adjust AQI and symptoms — preview updates live while enabled (no navigation).
          </p>
        </div>

        {simulateMode && (
          <motion.div
            className="sim-preview glass-card-inner"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
          >
            <div className="sim-preview-row">
              {simLoading ? (
                <span className="muted">Updating prediction…</span>
              ) : simPreview ? (
                <>
                  <RiskBadge level={simPreview.risk_level} />
                  <span className="sim-prob">
                    {(simPreview.outbreak_probability * 100).toFixed(1)}% outbreak probability
                  </span>
                </>
              ) : (
                <span className="muted">Could not simulate — check API.</span>
              )}
            </div>
          </motion.div>
        )}

        <form className="analysis-form" onSubmit={handleSubmit}>
          <label>
            Upload Cough Audio
            <input type="file" accept="audio/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>

          <div className="checkbox-group">
            <label>
              <input type="checkbox" checked={form.fever} onChange={() => onToggle("fever")} />
              Fever
            </label>
            <label>
              <input type="checkbox" checked={form.breathlessness} onChange={() => onToggle("breathlessness")} />
              Breathlessness
            </label>
            <label>
              <input type="checkbox" checked={form.fatigue} onChange={() => onToggle("fatigue")} />
              Fatigue
            </label>
          </div>

          <label>
            Cough Duration (days)
            <input
              type="number"
              min="0"
              max="30"
              value={form.cough_duration_days}
              onChange={(e) => setForm((s) => ({ ...s, cough_duration_days: e.target.value }))}
            />
          </label>

          <div className="grid-2">
            <label title="Auto-filled from your device when you allow location">
              Latitude
              <input
                type="number"
                step="0.0001"
                value={form.latitude}
                onChange={(e) => setForm((s) => ({ ...s, latitude: e.target.value }))}
              />
            </label>
            <label title="Auto-filled from your device when you allow location">
              Longitude
              <input
                type="number"
                step="0.0001"
                value={form.longitude}
                onChange={(e) => setForm((s) => ({ ...s, longitude: e.target.value }))}
              />
            </label>
          </div>

          <div className="grid-2">
            <label title="Resolved from coordinates or editable">
              Region
              <input value={form.region} onChange={(e) => setForm((s) => ({ ...s, region: e.target.value }))} />
            </label>
            <label>
              Historical Risk Index
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={form.historical_risk_index}
                onChange={(e) => setForm((s) => ({ ...s, historical_risk_index: e.target.value }))}
              />
            </label>
          </div>

          <div className="grid-3">
            <label>
              AQI
              <input type="number" value={form.aqi} onChange={(e) => setForm((s) => ({ ...s, aqi: e.target.value }))} />
            </label>
            <label>
              Temperature (C)
              <input
                type="number"
                value={form.temperature_c}
                onChange={(e) => setForm((s) => ({ ...s, temperature_c: e.target.value }))}
              />
            </label>
            <label>
              Humidity (%)
              <input type="number" value={form.humidity} onChange={(e) => setForm((s) => ({ ...s, humidity: e.target.value }))} />
            </label>
          </div>

          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="btn btn-primary" disabled={loading}>
            {loading ? "Analyzing..." : "Run AI Prediction"}
          </motion.button>
        </form>
      </GlassCard>

      <motion.div
        key={heatmapPreview?.generated_at ?? "map"}
        initial={{ opacity: 0.85 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35 }}
      >
        <GlassCard
          title="Nearby risk (live)"
          action={heatmapLoading ? <span className="muted map-loading">Updating map…</span> : null}
        >
          <p className="muted map-context-line">
            Heatmap centers on your coordinates and refreshes when location or region changes.
          </p>
          <HotspotMap
            center={heatmapPreview?.center}
            points={heatmapPreview?.points}
            clusters={heatmapPreview?.clusters}
            showHeatmap
            userLat={Number.isFinite(Number(form.latitude)) ? Number(form.latitude) : null}
            userLng={Number.isFinite(Number(form.longitude)) ? Number(form.longitude) : null}
            mapZoom={12}
          />
        </GlassCard>
      </motion.div>
    </div>
  );
}
