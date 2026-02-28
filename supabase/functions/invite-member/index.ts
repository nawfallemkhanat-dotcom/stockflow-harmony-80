import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { email, workspace_id, role } = await req.json();

    // Check caller is owner/admin
    const { data: callerRole } = await supabaseAdmin.rpc("get_workspace_role", { _user_id: caller.id, _workspace_id: workspace_id });
    if (!callerRole || !["owner", "admin"].includes(callerRole)) {
      return new Response(JSON.stringify({ error: "Only owners/admins can invite members" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Find user by email
    const { data: { users }, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    if (listErr) throw listErr;
    const targetUser = users.find((u: any) => u.email === email);
    if (!targetUser) {
      return new Response(JSON.stringify({ error: "No user found with that email. They must sign up first." }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check if already a member
    const { data: existing } = await supabaseAdmin
      .from("memberships")
      .select("id")
      .eq("user_id", targetUser.id)
      .eq("workspace_id", workspace_id)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: "User is already a member of this workspace" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Insert membership
    const { error: insertErr } = await supabaseAdmin
      .from("memberships")
      .insert({ user_id: targetUser.id, workspace_id, role: role || "staff" });

    if (insertErr) throw insertErr;

    return new Response(JSON.stringify({ success: true, user_id: targetUser.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
