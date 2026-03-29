const KEY = "respirasense:timeline";

export function pushTimelineEntry(entry) {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    arr.unshift({
      recorded_at: entry.recorded_at,
      fused_score: entry.fused_score,
      risk_level: entry.risk_level,
      region: entry.region,
    });
    localStorage.setItem(KEY, JSON.stringify(arr.slice(0, 45)));
  } catch {
    /* ignore */
  }
}

export function readLocalTimeline() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function mergeHistoryEntries(apiEntries, localEntries) {
  const rows = [];
  const seen = new Set();
  const push = (e) => {
    const t = e.recorded_at || e.ts;
    const fused = e.fused_score ?? e.fused;
    if (!t || typeof fused !== "number") return;
    if (seen.has(t)) return;
    seen.add(t);
    rows.push({
      recorded_at: t,
      fused_score: fused,
      risk_level: e.risk_level || e.risk,
      region: e.region,
      simulated: e.simulated,
    });
  };
  (apiEntries || []).forEach(push);
  (localEntries || []).forEach(push);
  rows.sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));
  return rows;
}
