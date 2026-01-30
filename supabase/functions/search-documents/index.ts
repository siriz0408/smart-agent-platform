import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logger } from "../_shared/logger.ts";
import { requireEnv } from "../_shared/validateEnv.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Generate embedding using local algorithm (matches index-document)
// Since dedicated embedding models aren't available via Lovable AI, we use a
// deterministic hash-based embedding that creates consistent vectors for similar text
// Uses 1536 dimensions to match the database schema (vector(1536))
function generateEmbedding(text: string): number[] {
  const dimensions = 1536;
  const embedding: number[] = new Array(dimensions).fill(0);
  const textLower = text.toLowerCase();
  
  // Create a deterministic embedding based on text content
  // Uses character n-grams and word frequencies to create a semantic fingerprint
  for (let i = 0; i < textLower.length && i < 8000; i++) {
    const charCode = textLower.charCodeAt(i);
    const position = (charCode * (i + 1)) % dimensions;
    embedding[position] += 1;
    
    // Add bigram features
    if (i < textLower.length - 1) {
      const bigramCode = charCode * 256 + textLower.charCodeAt(i + 1);
      const bigramPos = (bigramCode * 7) % dimensions;
      embedding[bigramPos] += 0.5;
    }
    
    // Add trigram features for better semantic matching
    if (i < textLower.length - 2) {
      const trigramCode = charCode * 65536 + textLower.charCodeAt(i + 1) * 256 + textLower.charCodeAt(i + 2);
      const trigramPos = (trigramCode * 13) % dimensions;
      embedding[trigramPos] += 0.25;
    }
  }
  
  // Add word-level features
  const words = textLower.split(/\s+/).filter(w => w.length > 2);
  for (const word of words.slice(0, 500)) {
    let wordHash = 0;
    for (let i = 0; i < word.length; i++) {
      wordHash = ((wordHash << 5) - wordHash) + word.charCodeAt(i);
      wordHash = wordHash & wordHash;
    }
    const wordPos = Math.abs(wordHash) % dimensions;
    embedding[wordPos] += 2;
    
    // Also add word length and first char features
    const lengthPos = (word.length * 127) % dimensions;
    embedding[lengthPos] += 0.1;
  }
  
  // Normalize the embedding vector
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] = embedding[i] / magnitude;
    }
  }
  
  return embedding;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate required environment variables
    requireEnv(["SUPABASE_URL", "SUPABASE_ANON_KEY"]);

    const { query, documentIds, matchThreshold = 0.1, matchCount = 5 } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: "query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Get user from auth header to enforce RLS
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user and get tenant
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;

    // Get tenant_id from profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile?.tenant_id) {
      return new Response(
        JSON.stringify({ error: "User profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Searching documents for query: "${query}" in tenant: ${profile.tenant_id}`);

    // Generate query embedding using local algorithm
    const queryEmbedding = generateEmbedding(query);

    // Use the match_documents RPC function
    const { data: matches, error: searchError } = await supabase.rpc("match_documents", {
      query_embedding: JSON.stringify(queryEmbedding),
      match_threshold: matchThreshold,
      match_count: matchCount,
      p_tenant_id: profile.tenant_id,
    });

    if (searchError) {
      console.error("Search error:", searchError);
      return new Response(
        JSON.stringify({ error: "Search failed", details: searchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Optionally filter by specific document IDs
    let results = matches || [];
    if (documentIds && documentIds.length > 0) {
      results = results.filter((m: { document_id: string }) => 
        documentIds.includes(m.document_id)
      );
    }

    console.log(`Found ${results.length} matching chunks`);

    return new Response(
      JSON.stringify({
        query,
        results,
        count: results.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("search-documents error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
