import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Building2, HeartPulse, Globe2 } from "lucide-react";
import GlassCard from "../components/GlassCard";

const pillars = [
  {
    icon: Building2,
    title: "Governments & agencies",
    text: "Earlier spatial and temporal signals to target testing, messaging, and surge planning.",
  },
  {
    icon: HeartPulse,
    title: "Hospitals & triage",
    text: "Structured risk context alongside cough analytics to prioritize who needs in-person care first.",
  },
  {
    icon: Globe2,
    title: "Individuals & low-resource areas",
    text: "Works offline-friendly in the demo flow — symptom + environment + optional audio without heavy hardware.",
  },
];

const stack = [
  "Audio intelligence — spectrogram-style features + cough risk head",
  "Context intelligence — symptoms, AQI, weather, geography (tree-based ensemble)",
  "Fusion engine — multimodal score + calibrated confidence",
  "Predictive layer — trend & hotspot projection",
  "Explainability — factor narratives + importance weights",
];

export default function LandingPage() {
  return (
    <div className="page page-landing">
      <section className="hero">
        <motion.p className="hero-tag" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          RespiraSense · Health Intelligence Platform
        </motion.p>
        <h1>RespiraSense — multimodal respiratory outbreak intelligence</h1>
        <p>
          A production-style stack that fuses cough acoustics, structured symptoms, environmental context, and
          time-series signals into a single risk narrative — built for the same clarity as modern SaaS health
          products.
        </p>
        <div className="hero-actions">
          <Link to="/analysis" className="btn btn-primary">
            Run analysis
          </Link>
          <Link to="/dashboard" className="btn btn-ghost">
            Command center
          </Link>
        </div>
      </section>

      <section className="impact-section">
        <h2 className="section-title">Built for real-world deployment narratives</h2>
        <div className="impact-grid">
          {pillars.map((p) => {
            const Icon = p.icon;
            return (
              <GlassCard key={p.title}>
                <div className="impact-card-head">
                  <Icon size={22} className="impact-icon" />
                  <h3>{p.title}</h3>
                </div>
                <p className="impact-body">{p.text}</p>
              </GlassCard>
            );
          })}
        </div>
      </section>

      <section className="stack-section">
        <h2 className="section-title">Multi-layer AI architecture</h2>
        <GlassCard>
          <ul className="stack-list">
            {stack.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </GlassCard>
      </section>

      <section className="feature-grid">
        <GlassCard>
          <p>Live heatmaps + community risk index with trend direction</p>
        </GlassCard>
        <GlassCard>
          <p>Personal timeline, smart alerts, and PDF-ready health reports</p>
        </GlassCard>
        <GlassCard>
          <p>Risk simulation, explainable AI, and privacy-first aggregate sharing (opt-in)</p>
        </GlassCard>
      </section>
    </div>
  );
}
