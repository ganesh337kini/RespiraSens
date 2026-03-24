import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import GlassCard from "../components/GlassCard";
import { analyzeAudio, predictRisk, getTrends } from "../services/api";

export default function AnalysisPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
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

  const onToggle = (key) => setForm((s) => ({ ...s, [key]: !s[key] }));

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

      const payload = {
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

      const [prediction, trends] = await Promise.all([
        predictRisk(payload),
        getTrends(form.region, Number(form.historical_risk_index)),
      ]);

      const merged = {
        form,
        audio,
        prediction,
        trends,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem("respirasense:lastResult", JSON.stringify(merged));
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
        <form className="analysis-form" onSubmit={handleSubmit}>
          <label>
            Upload Cough Audio
            <input type="file" accept="audio/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>

          <div className="checkbox-group">
            <label><input type="checkbox" checked={form.fever} onChange={() => onToggle("fever")} />Fever</label>
            <label><input type="checkbox" checked={form.breathlessness} onChange={() => onToggle("breathlessness")} />Breathlessness</label>
            <label><input type="checkbox" checked={form.fatigue} onChange={() => onToggle("fatigue")} />Fatigue</label>
          </div>

          <label>
            Cough Duration (days)
            <input type="number" min="0" max="30" value={form.cough_duration_days} onChange={(e) => setForm((s) => ({ ...s, cough_duration_days: e.target.value }))} />
          </label>

          <div className="grid-2">
            <label>Latitude<input type="number" step="0.0001" value={form.latitude} onChange={(e) => setForm((s) => ({ ...s, latitude: e.target.value }))} /></label>
            <label>Longitude<input type="number" step="0.0001" value={form.longitude} onChange={(e) => setForm((s) => ({ ...s, longitude: e.target.value }))} /></label>
          </div>

          <div className="grid-2">
            <label>Region<input value={form.region} onChange={(e) => setForm((s) => ({ ...s, region: e.target.value }))} /></label>
            <label>Historical Risk Index<input type="number" min="0" max="1" step="0.01" value={form.historical_risk_index} onChange={(e) => setForm((s) => ({ ...s, historical_risk_index: e.target.value }))} /></label>
          </div>

          <div className="grid-3">
            <label>AQI<input type="number" value={form.aqi} onChange={(e) => setForm((s) => ({ ...s, aqi: e.target.value }))} /></label>
            <label>Temperature (C)<input type="number" value={form.temperature_c} onChange={(e) => setForm((s) => ({ ...s, temperature_c: e.target.value }))} /></label>
            <label>Humidity (%)<input type="number" value={form.humidity} onChange={(e) => setForm((s) => ({ ...s, humidity: e.target.value }))} /></label>
          </div>

          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="btn btn-primary" disabled={loading}>
            {loading ? "Analyzing..." : "Run AI Prediction"}
          </motion.button>
        </form>
      </GlassCard>
    </div>
  );
}
