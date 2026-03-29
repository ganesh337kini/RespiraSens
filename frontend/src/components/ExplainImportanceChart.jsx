import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

function colorFor(impact) {
  if (impact === "increase") return "#f97316";
  if (impact === "decrease") return "#22c55e";
  return "#94a3b8";
}

export default function ExplainImportanceChart({ factors = [] }) {
  const data = factors
    .map((f) => ({
      name: f.label.length > 22 ? `${f.label.slice(0, 20)}…` : f.label,
      fullLabel: f.label,
      weight: Math.min(1, Number(f.contribution) || 0),
      impact: f.impact,
    }))
    .sort((a, b) => b.weight - a.weight);

  if (!data.length) return null;

  return (
    <div className="explain-chart-wrap">
      <h4 className="explain-chart-title">Feature importance (relative)</h4>
      <div style={{ width: "100%", height: Math.min(48 + data.length * 36, 280) }}>
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
            <XAxis type="number" domain={[0, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} stroke="#94a3b8" />
            <YAxis
              type="category"
              dataKey="name"
              width={108}
              tick={{ fill: "#cbd5e1", fontSize: 11 }}
              stroke="#475569"
            />
            <Tooltip
              contentStyle={{
                background: "rgba(15,23,42,0.95)",
                border: "1px solid rgba(148,163,184,0.25)",
                borderRadius: 10,
              }}
              formatter={(v) => [`${(Number(v) * 100).toFixed(1)}%`, "Weight"]}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.fullLabel ?? ""}
            />
            <Bar dataKey="weight" radius={[0, 6, 6, 0]} maxBarSize={22}>
              {data.map((entry, i) => (
                <Cell key={i} fill={colorFor(entry.impact)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
