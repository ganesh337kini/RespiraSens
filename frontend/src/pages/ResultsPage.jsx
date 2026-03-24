import { useMemo } from "react";
import GlassCard from "../components/GlassCard";
import RiskBadge from "../components/RiskBadge";
import TrendChart from "../components/TrendChart";

export default function ResultsPage() {
  const result = useMemo(() => {
    const value = localStorage.getItem("respirasense:lastResult");
    return value ? JSON.parse(value) : null;
  }, []);

  if (!result) {
    return <p className="empty-state">No analysis data yet. Go to Analysis and submit a prediction.</p>;
  }

  const { prediction, audio, trends } = result;

  return (
    <div className="page page-results">
      <GlassCard title="Prediction Outcome">
        <div className="result-head">
          <RiskBadge level={prediction.risk_level} />
          <h2>{(prediction.outbreak_probability * 100).toFixed(1)}% outbreak probability</h2>
          <p>Confidence: {(prediction.confidence * 100).toFixed(1)}%</p>
        </div>
      </GlassCard>

      <div className="grid-2">
        <GlassCard title="Model Insights">
          <p>Audio score: {(prediction.audio_score * 100).toFixed(1)}%</p>
          <p>Structured score: {(prediction.structured_score * 100).toFixed(1)}%</p>
          <p>Fused score: {(prediction.fused_score * 100).toFixed(1)}%</p>
          <p>MFCC mean: {(audio.mfcc_mean ?? 0).toFixed(4)}</p>
        </GlassCard>

        <GlassCard title="Recommendations">
          <ul>
            {prediction.recommendations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </GlassCard>
      </div>

      <GlassCard title="Trend + Forecast">
        <TrendChart trend={trends.trend} forecast={trends.forecast} />
      </GlassCard>
    </div>
  );
}
