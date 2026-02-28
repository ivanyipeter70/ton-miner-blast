import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MIN_WITHDRAWAL = 0.01;
const MAX_WITHDRAWAL = 1000;
const TON_WALLET_REGEX = /^(UQ|EQ)[A-Za-z0-9_-]{46}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: jsonHeaders,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: jsonHeaders,
      });
    }

    const userId = user.id;
    const { action, amount, wallet_address } = await req.json();

    if (action === "withdraw") {
      // Validate inputs
      if (typeof amount !== "number" || amount < MIN_WITHDRAWAL || amount > MAX_WITHDRAWAL) {
        return new Response(
          JSON.stringify({ error: `Amount must be between ${MIN_WITHDRAWAL} and ${MAX_WITHDRAWAL} TON` }),
          { status: 400, headers: jsonHeaders }
        );
      }

      if (!wallet_address || typeof wallet_address !== "string") {
        return new Response(
          JSON.stringify({ error: "Valid TON wallet address is required" }),
          { status: 400, headers: jsonHeaders }
        );
      }

      const trimmedWallet = wallet_address.trim();
      if (trimmedWallet.length < 10 || trimmedWallet.length > 70) {
        return new Response(
          JSON.stringify({ error: "Invalid wallet address format" }),
          { status: 400, headers: jsonHeaders }
        );
      }

      // Check for pending withdrawals
      const { data: pendingWithdrawals } = await supabaseAdmin
        .from("withdrawals")
        .select("id")
        .eq("user_id", userId)
        .in("status", ["pending", "processing"])
        .limit(1);

      if (pendingWithdrawals && pendingWithdrawals.length > 0) {
        return new Response(
          JSON.stringify({ error: "You already have a pending withdrawal. Please wait for it to complete." }),
          { status: 400, headers: jsonHeaders }
        );
      }

      // Fetch balance server-side
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("total_mined")
        .eq("user_id", userId)
        .single();

      if (profileError || !profile) {
        return new Response(
          JSON.stringify({ error: "Profile not found" }),
          { status: 404, headers: jsonHeaders }
        );
      }

      const balance = Number(profile.total_mined);
      if (amount > balance) {
        return new Response(
          JSON.stringify({ error: "Insufficient balance" }),
          { status: 400, headers: jsonHeaders }
        );
      }

      // Deduct balance and create withdrawal atomically
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ total_mined: balance - amount })
        .eq("user_id", userId);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: "Failed to process withdrawal" }),
          { status: 500, headers: jsonHeaders }
        );
      }

      const { data: withdrawal, error: insertError } = await supabaseAdmin
        .from("withdrawals")
        .insert({
          user_id: userId,
          amount,
          wallet_address: trimmedWallet,
          status: "pending",
        })
        .select()
        .single();

      if (insertError) {
        // Rollback balance
        await supabaseAdmin
          .from("profiles")
          .update({ total_mined: balance })
          .eq("user_id", userId);

        return new Response(
          JSON.stringify({ error: "Failed to create withdrawal" }),
          { status: 500, headers: jsonHeaders }
        );
      }

      return new Response(
        JSON.stringify({ success: true, withdrawal, new_balance: balance - amount }),
        { status: 200, headers: jsonHeaders }
      );
    } else if (action === "history") {
      const { data: withdrawals, error } = await supabaseAdmin
        .from("withdrawals")
        .select("id, amount, wallet_address, status, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch history" }),
          { status: 500, headers: jsonHeaders }
        );
      }

      return new Response(
        JSON.stringify({ withdrawals: withdrawals || [] }),
        { status: 200, headers: jsonHeaders }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: jsonHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
