import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logger } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TestUser {
  email: string;
  password: string;
  full_name: string;
  role: "admin" | "agent" | "buyer" | "seller";
}

const testUsers: TestUser[] = [
  { email: "agent1@test.com", password: "test1234!", full_name: "Maria Garcia", role: "agent" },
  { email: "agent2@test.com", password: "test1234!", full_name: "James Wilson", role: "agent" },
  { email: "broker@test.com", password: "test1234!", full_name: "Robert Chen", role: "admin" },
  { email: "buyer1@test.com", password: "test1234!", full_name: "Ashley Thompson", role: "buyer" },
  { email: "buyer2@test.com", password: "test1234!", full_name: "Marcus Johnson", role: "buyer" },
  { email: "seller1@test.com", password: "test1234!", full_name: "Patricia Williams", role: "seller" },
];

// Password resets to perform
const passwordResets = [
  { email: "siriz0408@gmail.com", newPassword: "Test1234!" }
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const results: { email: string; success: boolean; userId?: string; error?: string }[] = [];
    const resetResults: { email: string; success: boolean; error?: string }[] = [];

    // Handle password resets first
    for (const reset of passwordResets) {
      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      const user = users?.users?.find((u) => u.email === reset.email);

      if (user) {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
          password: reset.newPassword,
        });
        if (error) {
          resetResults.push({ email: reset.email, success: false, error: error.message });
        } else {
          resetResults.push({ email: reset.email, success: true });
        }
      } else {
        resetResults.push({ email: reset.email, success: false, error: "User not found" });
      }
    }

    for (const user of testUsers) {
      // Check if user already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const exists = existingUsers?.users?.some((u) => u.email === user.email);

      if (exists) {
        results.push({ email: user.email, success: false, error: "User already exists" });
        continue;
      }

      // Create the auth user
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: { full_name: user.full_name },
      });

      if (error) {
        results.push({ email: user.email, success: false, error: error.message });
        continue;
      }

      // The handle_new_user trigger creates tenant, profile, user_role, subscription
      // We need to update the role if it's not admin (default)
      if (data.user && user.role !== "admin") {
        // Get the tenant_id from the profile that was just created
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("tenant_id")
          .eq("user_id", data.user.id)
          .single();

        if (profile?.tenant_id) {
          // Update the user_role to the correct role
          await supabaseAdmin
            .from("user_roles")
            .update({ role: user.role })
            .eq("user_id", data.user.id)
            .eq("tenant_id", profile.tenant_id);
        }
      }

      results.push({ email: user.email, success: true, userId: data.user?.id });
    }

    return new Response(JSON.stringify({ results, resetResults }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error creating test users", { error: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});