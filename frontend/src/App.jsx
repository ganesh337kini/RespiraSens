import { Routes, Route, NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { Activity, BrainCircuit } from "lucide-react";

import LandingPage from "./pages/LandingPage";
import DashboardPage from "./pages/DashboardPage";
import AnalysisPage from "./pages/AnalysisPage";
import ResultsPage from "./pages/ResultsPage";
import HealthChatbot from "./components/HealthChatbot";

const navItems = [
  { path: "/", label: "Home" },
  { path: "/dashboard", label: "Dashboard" },
  { path: "/analysis", label: "Analysis" },
  { path: "/results", label: "Results" },
];

function AppInner() {
  const location = useLocation();
  const riskLevel = useMemo(() => {
    try {
      const raw = localStorage.getItem("respirasense:lastResult");
      if (!raw) return "Low";
      return JSON.parse(raw).prediction?.risk_level ?? "Low";
    } catch {
      return "Low";
    }
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <BrainCircuit size={20} />
          <span>RespiraSense </span>
          <Activity size={16} className="pulse-icon" />
        </div>
        <nav>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                isActive ? "nav-link nav-link-active" : "nav-link"
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/results" element={<ResultsPage />} />
        </Routes>
      </motion.main>
      <HealthChatbot riskLevel={riskLevel} />
    </div>
  );
}

export default function App() {
  return <AppInner />;
}
