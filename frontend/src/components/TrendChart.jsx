import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function TrendChart({ trend = [], forecast = [] }) {
  const merged = [...trend.map((t) => ({ ...t, series: "Observed" })), ...forecast.map((f) => ({ ...f, series: "Forecast" }))];

  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer>
        <AreaChart data={merged}>
          <defs>
            <linearGradient id="obs" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366F1" stopOpacity={0.9} />
              <stop offset="95%" stopColor="#6366F1" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="fc" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#22D3EE" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
          <XAxis dataKey="date" stroke="#94A3B8" />
          <YAxis domain={[0, 1]} stroke="#94A3B8" />
          <Tooltip />
          <Legend />
          <Area type="monotone" dataKey="risk_index" name="Risk Index" stroke="#6366F1" fill="url(#obs)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
