export default function RiskBadge({ level }) {
  const cls =
    level === "High"
      ? "risk-badge risk-high"
      : level === "Medium"
      ? "risk-badge risk-medium"
      : "risk-badge risk-low";

  return <span className={cls}>{level} Risk</span>;
}
