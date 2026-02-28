import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Server-side mining constants
const MINING_RATE = 0.1;
const TAP_MULTIPLIER = 5;
const ENERGY_COST_TAP = 1;
const ENERGY_COST_AUTO_PER_SEC = 0.1;
const ENERGY_REGEN_PER_SEC = 0.5;
const MAX_ENERGY = 100;
const MAX_AUTO_MINE_SECONDS = 60; // Max claimable auto-mine window

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const { action } = await req.json();

    // Fetch current profile using admin client (bypasses RLS for atomic updates)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const now = new Date();
    const lastUpdate = new Date(profile.last_energy_update);
    const elapsedSec = Math.max(
      0,
      (now.getTime() - lastUpdate.getTime()) / 1000
    );

    // Regenerate energy based on elapsed time
    let currentEnergy = Math.min(
      MAX_ENERGY,
      Number(profile.energy_level) + elapsedSec * ENERGY_REGEN_PER_SEC
    );

    let reward = 0;
    let energyCost = 0;
    const multiplier = Number(profile.multiplier);
    const miningRate = Number(profile.mining_rate);

    if (action === "tap") {
      if (currentEnergy < ENERGY_COST_TAP) {
        return new Response(
          JSON.stringify({
            error: "Not enough energy",
            profile: {
              total_mined: Number(profile.total_mined),
              mining_rate: miningRate,
              energy_level: currentEnergy,
              multiplier,
              tap_count: Number(profile.tap_count),
            },
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      reward = miningRate * multiplier * TAP_MULTIPLIER;
      energyCost = ENERGY_COST_TAP;
      currentEnergy -= energyCost;

      // Update profile atomically
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({
          total_mined: Number(profile.total_mined) + reward,
          energy_level: currentEnergy,
          tap_count: Number(profile.tap_count) + 1,
          last_energy_update: now.toISOString(),
        })
        .eq("user_id", userId);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: "Failed to update profile" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Log the action
      await supabaseAdmin.from("mining_actions").insert({
        user_id: userId,
        action_type: "tap",
        amount: reward,
        energy_cost: energyCost,
      });
    } else if (action === "get_stats") {
      // Just return current stats with regenerated energy
      await supabaseAdmin
        .from("profiles")
        .update({
          energy_level: currentEnergy,
          last_energy_update: now.toISOString(),
        })
        .eq("user_id", userId);
    } else {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        profile: {
          total_mined: Number(profile.total_mined) + reward,
          mining_rate: miningRate,
          energy_level: currentEnergy,
          multiplier,
          tap_count:
            action === "tap"
              ? Number(profile.tap_count) + 1
              : Number(profile.tap_count),
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
