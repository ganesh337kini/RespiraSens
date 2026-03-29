import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Info, ShieldCheck } from "lucide-react";

function severityIcon(sev) {
  if (sev === "high") return AlertTriangle;
  if (sev === "medium") return Info;
  return ShieldCheck;
}

export default function AlertBanner({ alerts = [], onDismiss }) {
  const top = alerts[0];
  return (
    <AnimatePresence>
      {top && (
        <motion.div
          className={`alert-banner alert-${top.severity || "low"}`}
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
        >
          {(() => {
            const Icon = severityIcon(top.severity);
            return (
              <>
                <Icon size={20} className="alert-banner-icon" />
                <div className="alert-banner-text">
                  <strong>{top.title}</strong>
                  <span>{top.message}</span>
                </div>
                {onDismiss && (
                  <button type="button" className="alert-dismiss btn-ghost-tiny" onClick={onDismiss}>
                    Dismiss
                  </button>
                )}
              </>
            );
          })()}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
