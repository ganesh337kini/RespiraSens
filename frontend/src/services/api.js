import axios from "axios";

/**
 * In dev, use same-origin `/api/v1` (Vite proxy → FastAPI) to avoid browser CORS issues.
 * Override with VITE_API_BASE_URL e.g. `https://api.example.com/api/v1` for production.
 */
function getApiBaseURL() {
  const env = import.meta.env.VITE_API_BASE_URL;
  if (env) return env.replace(/\/$/, "");
  if (import.meta.env.DEV) return "/api/v1";
  return "http://127.0.0.1:8000/api/v1";
}

const api = axios.create({
  baseURL: getApiBaseURL(),
  timeout: 60000,
});

/** Browser-side fallback (Photon) when our API geocode route is unreachable. */
async function reverseGeocodeDirectPhoton(latitude, longitude) {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
  });
  const res = await fetch(`https://photon.komoot.io/reverse?${params}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`photon ${res.status}`);
  const json = await res.json();
  const props = json.features?.[0]?.properties || {};
  const region =
    props.city ||
    props.town ||
    props.village ||
    props.district ||
    props.county ||
    props.state ||
    props.name;
  if (!region) {
    const ns = latitude >= 0 ? "N" : "S";
    const ew = longitude >= 0 ? "E" : "W";
    const label = `${Math.abs(latitude).toFixed(2)}°${ns}, ${Math.abs(longitude).toFixed(2)}°${ew}`;
    return {
      region: label,
      display_name: label,
      latitude,
      longitude,
      country: props.country || null,
    };
  }
  const display = [props.name, props.city || props.town, props.country].filter(Boolean).join(", ");
  return {
    region,
    display_name: display || region,
    latitude,
    longitude,
    country: props.country || null,
  };
}

function coordinateOnlyLabel(latitude, longitude) {
  const ns = latitude >= 0 ? "N" : "S";
  const ew = longitude >= 0 ? "E" : "W";
  const region = `${Math.abs(latitude).toFixed(2)}°${ns}, ${Math.abs(longitude).toFixed(2)}°${ew}`;
  return {
    region,
    display_name: `${region} (offline — edit city name if needed)`,
    latitude,
    longitude,
    country: null,
  };
}

export async function reverseGeocode(latitude, longitude) {
  try {
    const { data } = await api.get("/reverse-geocode", {
      params: { latitude, longitude },
      timeout: 20000,
    });
    if (data?.region) return data;
  } catch {
    /* try fallbacks below */
  }
  try {
    return await reverseGeocodeDirectPhoton(latitude, longitude);
  } catch {
    return coordinateOnlyLabel(latitude, longitude);
  }
}

export async function analyzeAudio(file) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post("/analyze-audio", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function predictRisk(payload) {
  const { data } = await api.post("/predict-risk", payload);
  return data;
}

export async function getTrends(region, historicalRiskIndex) {
  const { data } = await api.get("/get-trends", {
    params: {
      region,
      historical_risk_index: historicalRiskIndex,
    },
  });
  return data;
}

export async function getHeatmapData(region, latitude, longitude) {
  const { data } = await api.get("/get-heatmap-data", {
    params: { region, latitude, longitude },
  });
  return data;
}

export async function getUserHistory(params) {
  const { data } = await api.get("/get-user-history", { params });
  return data;
}

export async function getAlerts(params) {
  const { data } = await api.get("/get-alerts", { params });
  return data;
}

export async function getNearbyHospitals(latitude, longitude, limit = 6) {
  const { data } = await api.get("/nearby-hospitals", {
    params: { latitude, longitude, limit },
  });
  return data;
}

export async function getCommunityRiskIndex(region, latitude = null, longitude = null) {
  const params = { region };
  if (latitude != null && longitude != null) {
    params.latitude = latitude;
    params.longitude = longitude;
  }
  const { data } = await api.get("/community-risk-index", { params });
  return data;
}

export async function contributeAnonymous(payload) {
  const { data } = await api.post("/contribute-anonymous", payload);
  return data;
}
