import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send } from "lucide-react";

function replyFor(text, ctx) {
  const t = text.toLowerCase();
  const risk = ctx?.riskLevel || "Low";
  if (t.includes("what does") && t.includes("risk")) {
    return `${risk} risk means our fusion model estimates a probability of respiratory outbreak-relevant stress given your cough signal, symptoms, and environment. It supports decisions, not replaces clinicians.`;
  }
  if (t.includes("what should i do") || t.includes("what do i do")) {
    if (risk === "High") {
      return "Seek urgent in-person evaluation. Use Nearby Help for facilities, avoid self-medication, and keep emergency contacts ready.";
    }
    if (risk === "Medium") {
      return "Monitor symptoms, consider teleconsultation, avoid crowds, and track fever and breathing. Escalate if anything worsens.";
    }
    return "Stay hydrated, rest, avoid dust and cold exposure, and continue monitoring. Use Analysis again if symptoms change.";
  }
  if (t.includes("government") || t.includes("outbreak") || t.includes("public health")) {
    return "RespiraSense is designed to surface early spatial and temporal signals so agencies can prioritize testing and messaging — this demo uses synthetic aggregates.";
  }
  if (t.includes("risk") || t.includes("score")) {
    return `Your last assessed level is ${risk}. I combine cough audio, symptoms, and local context — not a diagnosis.`;
  }
  if (t.includes("fever") || t.includes("symptom")) {
    return "Persistent fever, worsening breathlessness, or chest pain warrant urgent in-person care.";
  }
  if (t.includes("mask") || t.includes("prevent")) {
    return "In medium/high risk windows, masks in crowded indoor spaces and ventilation help reduce exposure.";
  }
  if (t.includes("hospital") || t.includes("emergency")) {
    return "Use Nearby Help on the dashboard for the closest facilities. Call emergency services for severe distress.";
  }
  return `I am a demo assistant for RespiraSense. Your current profile suggests ${risk} risk. Ask what your risk means, what to do next, or about prevention.`;
}

export default function HealthChatbot({ riskLevel = "Low", symptomsSummary = "" }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "bot", text: "Hi — I can explain your risk context and general guidance. Not medical advice." },
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setMessages((m) => [...m, { role: "user", text: trimmed }]);
    setInput("");
    setTimeout(() => {
      const ans = replyFor(trimmed, { riskLevel, symptomsSummary });
      setMessages((m) => [...m, { role: "bot", text: ans }]);
    }, 280);
  };

  return (
    <>
      <motion.button
        type="button"
        className="chat-fab"
        onClick={() => setOpen(true)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.96 }}
        aria-label="Open health assistant"
      >
        <MessageCircle size={22} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="chat-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="chat-modal glass-card"
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="chat-head">
                <h3>AI Health Assistant</h3>
                <button type="button" className="chat-close" onClick={() => setOpen(false)} aria-label="Close">
                  <X size={20} />
                </button>
              </div>
              <div className="chat-messages">
                {messages.map((m, i) => (
                  <div key={i} className={`chat-bubble ${m.role === "user" ? "chat-user" : "chat-bot"}`}>
                    {m.text}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <div className="chat-input-row">
                <input
                  className="chat-input"
                  placeholder="Ask about symptoms, risk, or prevention…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                />
                <button type="button" className="btn btn-primary chat-send" onClick={send}>
                  <Send size={18} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
