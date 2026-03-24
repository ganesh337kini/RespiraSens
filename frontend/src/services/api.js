import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000/api/v1",
});

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
