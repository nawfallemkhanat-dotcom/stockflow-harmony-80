import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { credit_note_id } = await req.json();

    const { data: cn, error: cnErr } = await supabaseAdmin
      .from("credit_notes")
      .select("*, customers(name, address, ice, email, phone), credit_note_lines(*, products(name, sku))")
      .eq("id", credit_note_id)
      .single();

    if (cnErr || !cn) {
      return new Response(JSON.stringify({ error: "Credit note not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: ws } = await supabaseAdmin
      .from("workspaces")
      .select("name, currency, tax_label")
      .eq("id", cn.workspace_id)
      .single();

    const currency = ws?.currency || "MAD";
    const taxLabel = ws?.tax_label || "TVA";
    const companyName = ws?.name || "Company";
    const customer = cn.customers;

    const linesHtml = (cn.credit_note_lines || []).map((l: any) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${l.description || l.products?.name || "—"}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${l.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${Number(l.unit_price).toFixed(2)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${l.tax_rate}%</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:600;">${Number(l.line_total).toFixed(2)}</td>
      </tr>
    `).join("");

    const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>${cn.credit_note_number}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#1a1a1a; padding:40px; max-width:800px; margin:auto; }
  .header { display:flex; justify-content:space-between; margin-bottom:40px; }
  .company { font-size:24px; font-weight:700; }
  .cn-title { font-size:28px; font-weight:700; color:#dc2626; text-align:right; }
  .cn-meta { text-align:right; font-size:13px; color:#666; margin-top:4px; }
  .parties { display:flex; justify-content:space-between; margin-bottom:30px; }
  .party-label { font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#999; margin-bottom:6px; }
  .party-name { font-size:16px; font-weight:600; }
  .party-detail { font-size:13px; color:#666; }
  table { width:100%; border-collapse:collapse; margin-bottom:24px; }
  th { background:#f8f9fa; padding:10px 12px; text-align:left; font-size:12px; text-transform:uppercase; letter-spacing:0.5px; color:#666; border-bottom:2px solid #e5e7eb; }
  th:nth-child(n+2) { text-align:right; }
  .totals { display:flex; justify-content:flex-end; }
  .totals-table { width:280px; }
  .totals-row { display:flex; justify-content:space-between; padding:6px 0; font-size:14px; }
  .totals-row.total { border-top:2px solid #111; padding-top:10px; margin-top:6px; font-size:18px; font-weight:700; color:#dc2626; }
  .reason { margin-top:30px; padding:16px; background:#fef2f2; border-radius:8px; font-size:13px; color:#991b1b; }
  .footer { margin-top:40px; text-align:center; font-size:11px; color:#999; }
  @media print { body { padding:20px; } }
</style>
</head><body>

<div class="header">
  <div class="company">${companyName}</div>
  <div>
    <div class="cn-title">CREDIT NOTE</div>
    <div class="cn-meta">
      ${cn.credit_note_number}<br>
      Date: ${new Date(cn.created_at).toLocaleDateString()}
    </div>
  </div>
</div>

<div class="parties">
  <div>
    <div class="party-label">Customer</div>
    <div class="party-name">${customer?.name || "—"}</div>
    ${customer?.ice ? `<div class="party-detail">ICE: ${customer.ice}</div>` : ""}
    ${customer?.address ? `<div class="party-detail">${customer.address}</div>` : ""}
    ${customer?.email ? `<div class="party-detail">${customer.email}</div>` : ""}
  </div>
</div>

<table>
  <thead><tr>
    <th>Description</th><th>Qty</th><th>Unit Price</th><th>${taxLabel} %</th><th>Total</th>
  </tr></thead>
  <tbody>${linesHtml}</tbody>
</table>

<div class="totals">
  <div class="totals-table">
    <div class="totals-row"><span>Subtotal</span><span>${Number(cn.subtotal).toFixed(2)} ${currency}</span></div>
    <div class="totals-row"><span>${taxLabel}</span><span>${Number(cn.tax_total).toFixed(2)} ${currency}</span></div>
    <div class="totals-row total"><span>Total Credit</span><span>${Number(cn.total).toFixed(2)} ${currency}</span></div>
  </div>
</div>

${cn.reason ? `<div class="reason"><strong>Reason:</strong> ${cn.reason}</div>` : ""}

<div class="footer">Generated on ${new Date().toLocaleDateString()} • ${companyName}</div>

</body></html>`;

    return new Response(JSON.stringify({ html }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
