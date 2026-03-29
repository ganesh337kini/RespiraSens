const DEMO_KEY = "respirasense:lastResult";

export async function loadDemoData() {
  const res = await fetch("/demo-last-result.json");
  if (!res.ok) throw new Error("Demo load failed");
  const data = await res.json();
  localStorage.setItem(DEMO_KEY, JSON.stringify(data));
  localStorage.setItem("respirasense:demoLoaded", "1");
  return data;
}

export function hasDemoLoaded() {
  return localStorage.getItem("respirasense:demoLoaded") === "1";
}
