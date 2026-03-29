import { useState, useEffect } from "react";
import { Shield } from "lucide-react";
import { getShareAggregateEnabled, setShareAggregateEnabled } from "../utils/privacySettings";

const KEY_ACK = "respirasense:privacyAck";

export default function PrivacyBar({ className = "" }) {
  const [share, setShare] = useState(false);
  const [ack, setAck] = useState(true);

  useEffect(() => {
    setShare(getShareAggregateEnabled());
    setAck(localStorage.getItem(KEY_ACK) !== "0");
  }, []);

  const toggleShare = (e) => {
    const v = e.target.checked;
    setShare(v);
    setShareAggregateEnabled(v);
  };

  const dismissAck = () => {
    setAck(false);
    localStorage.setItem(KEY_ACK, "0");
  };

  return (
    <div className={`privacy-bar ${className}`}>
      <div className="privacy-row">
        <Shield size={18} className="privacy-icon" />
        <div className="privacy-copy">
          <strong>Privacy &amp; transparency</strong>
          <p>
            Your assessments are processed for this demo without persistent identity. Enable optional
            aggregate sharing to improve regional community index (region + risk band only).
          </p>
        </div>
      </div>
      <label className="privacy-toggle">
        <input type="checkbox" checked={share} onChange={toggleShare} />
        <span>Share anonymized risk band with community model</span>
      </label>
      {ack && (
        <p className="privacy-foot muted">
          By using RespiraSense you acknowledge this is a demonstration and not a regulated medical device.{" "}
          <button type="button" className="link-dismiss" onClick={dismissAck}>
            Dismiss
          </button>
        </p>
      )}
    </div>
  );
}
