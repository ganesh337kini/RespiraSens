/**
 * Opens a print-friendly report (user can Save as PDF from the print dialog).
 */
export function openHealthReportPdf(result) {
  if (!result?.prediction) return;
  const p = result.prediction;
  const region = result.form?.region ?? "—";
  const ts = result.timestamp ?? new Date().toISOString();
  const recs = (p.recommendations || []).map((r) => `<li>${escapeHtml(r)}</li>`).join("");
  const explain = (p.explainability || [])
    .map(
      (e) =>
        `<tr><td>${escapeHtml(e.label)}</td><td>${escapeHtml(e.impact)}</td><td>${escapeHtml(
          e.message
        )}</td></tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>RespiraSense Health Report</title>
<style>
  body{font-family:system-ui,-apple-system,sans-serif;padding:32px;color:#0f172a;background:#f8fafc;}
  h1{font-size:22px;margin:0 0 8px;}
  .meta{color:#64748b;font-size:13px;margin-bottom:24px;}
  .card{border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:16px;background:#fff;}
  .row{display:flex;gap:24px;flex-wrap:wrap;}
  .tag{display:inline-block;padding:4px 12px;border-radius:999px;font-weight:700;font-size:12px;}
  .low{background:#dcfce7;color:#166534;}
  .medium{background:#fef3c7;color:#92400e;}
  .high{background:#fee2e2;color:#991b1b;}
  ul{margin:8px 0 0 18px;}
  table{width:100%;border-collapse:collapse;font-size:13px;}
  th,td{border:1px solid #e2e8f0;padding:8px;text-align:left;}
  th{background:#f1f5f9;}
  .foot{margin-top:32px;font-size:11px;color:#94a3b8;}
</style></head><body>
  <h1>RespiraSense — Health Intelligence Report</h1>
  <p class="meta">Generated ${escapeHtml(ts)} · Region: ${escapeHtml(region)} · Demo / educational use only — not a medical diagnosis.</p>
  <div class="card">
    <span class="tag ${(p.risk_level || "").toLowerCase()}">${escapeHtml(p.risk_level)} RISK</span>
    <div class="row" style="margin-top:16px;">
      <div><strong>Outbreak probability</strong><br/>${((p.outbreak_probability || 0) * 100).toFixed(1)}%</div>
      <div><strong>Confidence</strong><br/>${((p.confidence || 0) * 100).toFixed(1)}%</div>
      <div><strong>Fused score</strong><br/>${((p.fused_score || 0) * 100).toFixed(1)}%</div>
    </div>
  </div>
  <div class="card"><h2 style="margin:0 0 12px;font-size:16px;">Recommendations</h2><ul>${recs}</ul></div>
  <div class="card"><h2 style="margin:0 0 12px;font-size:16px;">Explainability summary</h2>
    <table><thead><tr><th>Factor</th><th>Impact</th><th>Detail</th></tr></thead><tbody>${explain}</tbody></table>
  </div>
  <p class="foot">RespiraSense · Multimodal respiratory risk estimation · Not FDA-cleared / not for emergency use.</p>
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.onload = () => {
    w.focus();
    w.print();
  };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
