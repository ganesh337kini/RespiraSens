import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import GlassCard from "../components/GlassCard";

const features = [
  "Multi-modal AI: audio + symptoms + location + time",
  "Outbreak trend forecasting with hotspot visibility",
  "Actionable recommendations for preventive response",
];

export default function LandingPage() {
  return (
    <div className="page page-landing">
      <section className="hero">
        <motion.p className="hero-tag" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          AI Respiratory Intelligence Platform
        </motion.p>
        <h1>Predicting respiratory outbreaks using AI-powered early signals</h1>
        <p>
          RespiraSense 2.0 detects respiratory risk from cough acoustics, symptom patterns,
          and environmental context to surface region-level outbreak alerts before escalation.
        </p>
        <div className="hero-actions">
          <Link to="/analysis" className="btn btn-primary">Start Analysis</Link>
          <Link to="/dashboard" className="btn btn-ghost">View Dashboard</Link>
        </div>
      </section>

      <section className="feature-grid">
        {features.map((feature) => (
          <GlassCard key={feature}>
            <p>{feature}</p>
          </GlassCard>
        ))}
      </section>
    </div>
  );
}
