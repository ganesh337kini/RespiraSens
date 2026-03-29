import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

function trendLabel(data) {
  if (data.length < 2) return "stable";
  const first = data[0].risk;
  const last = data[data.length - 1].risk;
  if (last > first + 0.04) return "increasing";
  if (last < first - 0.04) return "decreasing";
  return "stable";
}

export default function HealthTimeline({ entries = [] }) {
  const sorted = [...entries]
    .map((e) => ({
      t: e.recorded_at || e.ts,
      risk: typeof e.fused_score === "number" ? e.fused_score : e.risk,
      label: (e.recorded_at || e.ts || "").slice(0, 10),
    }))
    .filter((x) => x.t && typeof x.risk === "number")
    .sort((a, b) => new Date(a.t) - new Date(b.t));

  const data = sorted.map((row, i) => ({
    ...row,
    idx: i,
    label: row.label,
  }));

  const trend = trendLabel(data);

  return (
    <div className="health-timeline">
      <div className="health-timeline-meta">
        <span className="muted">Personal risk trajectory</span>
        <span className={`trend-pill trend-${trend === "increasing" ? "up" : trend === "decreasing" ? "down" : "flat"}`}>
          {trend}
        </span>
      </div>
      <div style={{ width: "100%", height: 260 }}>
        {data.length === 0 ? (
          <p className="explain-muted">Run analyses to populate your timeline.</p>
        ) : (
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.35} />
              <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 1]} stroke="#94a3b8" tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
              <Tooltip
                contentStyle={{
                  background: "rgba(15,23,42,0.95)",
                  border: "1px solid rgba(148,163,184,0.25)",
                  borderRadius: 10,
                }}
                formatter={(v) => [`${(Number(v) * 100).toFixed(1)}%`, "Risk"]}
              />
              <ReferenceLine y={0.35} stroke="#22c55e" strokeDasharray="4 4" opacity={0.5} />
              <ReferenceLine y={0.67} stroke="#f97316" strokeDasharray="4 4" opacity={0.5} />
              <Line
                type="monotone"
                dataKey="risk"
                stroke="url(#lineGrad)"
                strokeWidth={2.5}
                dot={{ fill: "#6366f1", r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
