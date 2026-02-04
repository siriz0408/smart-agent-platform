/**
 * Diagnostic script to check user profile and tenant_id
 */
import { createClient } from "npm:@supabase/supabase-js@2";

// Type for search results
interface SearchResult {
  entity_type: string;
  name: string;
}

const supabaseUrl = "https://sthnezuadfbmbqlxiwtq.supabase.co";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

const userId = "e71b2c84-7cea-433d-b9db-459cd6e91d50";

console.log("🔍 Checking profile record for user:", userId);
console.log("");

// Check profiles table
const { data: profile, error: profileError } = await supabase
  .from("profiles")
  .select("user_id, tenant_id, full_name")
  .eq("user_id", userId)
  .single();

if (profileError) {
  console.error("❌ Error fetching profile:", profileError);
} else if (!profile) {
  console.error("❌ No profile found for user");
} else {
  console.log("✅ Profile found:");
  console.log("   User ID:", profile.user_id);
  console.log("   Tenant ID:", profile.tenant_id);
  console.log("   Name:", profile.full_name);
  console.log("");

  // Check if test data exists for this tenant
  console.log("🔍 Checking test data for tenant:", profile.tenant_id);

  const { data: contacts, error: contactsError } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, tenant_id, embedding")
    .eq("tenant_id", profile.tenant_id)
    .not("embedding", "is", null);

  if (contactsError) {
    console.error("❌ Error fetching contacts:", contactsError);
  } else {
    console.log(`✅ Found ${contacts?.length || 0} contacts with embeddings`);
    if (contacts && contacts.length > 0) {
      console.log("   Sample:");
      contacts.slice(0, 3).forEach(c => {
        console.log(`   - ${c.first_name} ${c.last_name}`);
      });
    }
  }

  console.log("");

  // Test the RPC function with correct tenant_id
  console.log("🔍 Testing RPC function with tenant:", profile.tenant_id);

  const { data: searchResults, error: searchError } = await supabase.rpc(
    "search_all_entities_hybrid",
    {
      p_query: "sarah",
      p_query_embedding: Array(1536).fill(0.001),
      p_tenant_id: profile.tenant_id,
      p_entity_types: ["contact"],
      p_match_threshold: 0.1,
      p_match_count_per_type: 10,
    }
  );

  if (searchError) {
    console.error("❌ RPC function error:", searchError);
  } else {
    console.log(`✅ RPC returned ${searchResults?.length || 0} results`);
    if (searchResults && searchResults.length > 0) {
      console.log("   Sample results:");
      searchResults.slice(0, 3).forEach((r: SearchResult) => {
        console.log(`   - ${r.name} (${r.entity_type})`);
      });
    }
  }
}

console.log("");
console.log("🔍 Diagnostic complete");
