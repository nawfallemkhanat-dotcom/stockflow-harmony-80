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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { quote_id } = await req.json();

    const { data: quote, error: qErr } = await supabaseAdmin
      .from("quotes")
      .select("*, customers(name, address, ice, email, phone), quote_lines(*, products(name, sku))")
      .eq("id", quote_id)
      .single();

    if (qErr || !quote) {
      return new Response(JSON.stringify({ error: "Quote not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: ws } = await supabaseAdmin
      .from("workspaces")
      .select("name, currency, tax_label, country_code")
      .eq("id", quote.workspace_id)
      .single();

    const currency = ws?.currency || "MAD";
    const taxLabel = ws?.tax_label || "TVA";
    const companyName = ws?.name || "Company";

    const linesHtml = (quote.quote_lines || []).map((l: any) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${l.description || l.products?.name || "—"}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${Number(l.quantity)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${Number(l.unit_price).toFixed(2)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${Number(l.discount_pct)}%</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${Number(l.tax_rate)}%</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:600;">${Number(l.line_total).toFixed(2)}</td>
      </tr>
    `).join("");

    const customer = quote.customers;

    const discountTotal = (quote.quote_lines || []).reduce((s: number, l: any) => {
      const gross = Number(l.quantity) * Number(l.unit_price);
      return s + gross * (Number(l.discount_pct) / 100);
    }, 0);

    const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>${quote.quote_number}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#1a1a1a; padding:40px; max-width:800px; margin:auto; }
  .header { display:flex; justify-content:space-between; margin-bottom:40px; }
  .company { font-size:24px; font-weight:700; color:#111; }
  .doc-title { font-size:28px; font-weight:700; color:#0d9488; text-align:right; }
  .doc-meta { text-align:right; font-size:13px; color:#666; margin-top:4px; }
  .parties { display:flex; justify-content:space-between; margin-bottom:30px; }
  .party { flex:1; }
  .party-label { font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#999; margin-bottom:6px; }
  .party-name { font-size:16px; font-weight:600; }
  .party-detail { font-size:13px; color:#666; }
  table { width:100%; border-collapse:collapse; margin-bottom:24px; }
  th { background:#f0fdfa; padding:10px 12px; text-align:left; font-size:12px; text-transform:uppercase; letter-spacing:0.5px; color:#0d9488; border-bottom:2px solid #ccfbf1; }
  th:nth-child(n+2) { text-align:right; }
  .totals { display:flex; justify-content:flex-end; }
  .totals-table { width:280px; }
  .totals-row { display:flex; justify-content:space-between; padding:6px 0; font-size:14px; }
  .totals-row.total { border-top:2px solid #111; padding-top:10px; margin-top:6px; font-size:18px; font-weight:700; color:#0d9488; }
  .validity { margin-top:24px; padding:16px; background:#f0fdfa; border-radius:8px; font-size:13px; color:#0d9488; border:1px solid #ccfbf1; }
  .notes { margin-top:16px; padding:16px; background:#f8f9fa; border-radius:8px; font-size:13px; color:#666; }
  .footer { margin-top:40px; text-align:center; font-size:11px; color:#999; }
  @media print { body { padding:20px; } }
</style>
</head><body>

<div class="header">
  <div>
    <div class="company">${companyName}</div>
  </div>
  <div>
    <div class="doc-title">QUOTE</div>
    <div class="doc-meta">
      ${quote.quote_number}<br>
      Date: ${new Date(quote.created_at).toLocaleDateString()}<br>
      Status: ${(quote.status || "draft").toUpperCase()}
    </div>
  </div>
</div>

<div class="parties">
  <div class="party">
    <div class="party-label">Prepared For</div>
    <div class="party-name">${customer?.name || "—"}</div>
    ${customer?.ice ? `<div class="party-detail">ICE: ${customer.ice}</div>` : ""}
    ${customer?.address ? `<div class="party-detail">${customer.address}</div>` : ""}
    ${customer?.email ? `<div class="party-detail">${customer.email}</div>` : ""}
    ${customer?.phone ? `<div class="party-detail">${customer.phone}</div>` : ""}
  </div>
  <div class="party" style="text-align:right;">
    <div class="party-label">From</div>
    <div class="party-name">${companyName}</div>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th>Description</th>
      <th>Qty</th>
      <th>Unit Price</th>
      <th>Disc %</th>
      <th>${taxLabel} %</th>
      <th>Total</th>
    </tr>
  </thead>
  <tbody>
    ${linesHtml}
  </tbody>
</table>

<div class="totals">
  <div class="totals-table">
    <div class="totals-row"><span>Subtotal</span><span>${Number(quote.subtotal).toFixed(2)} ${currency}</span></div>
    ${discountTotal > 0 ? `<div class="totals-row"><span>Discount</span><span>-${discountTotal.toFixed(2)} ${currency}</span></div>` : ""}
    <div class="totals-row"><span>${taxLabel}</span><span>${Number(quote.tax_total).toFixed(2)} ${currency}</span></div>
    <div class="totals-row total"><span>Total</span><span>${Number(quote.total).toFixed(2)} ${currency}</span></div>
  </div>
</div>

${quote.valid_until ? `<div class="validity"><strong>Valid Until:</strong> ${new Date(quote.valid_until).toLocaleDateString()}</div>` : ""}
${quote.notes ? `<div class="notes"><strong>Notes:</strong> ${quote.notes}</div>` : ""}

<div class="footer">
  Generated on ${new Date().toLocaleDateString()} • ${companyName}
</div>

</body></html>`;

    return new Response(JSON.stringify({ html }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
