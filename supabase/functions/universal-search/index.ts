/**
 * Universal Search Edge Function
 *
 * Provides unified semantic search across Documents, Contacts, Properties, and Deals
 * Uses RRF (Reciprocal Rank Fusion) hybrid search combining vector + keyword search
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { generateDeterministicEmbedding } from "../_shared/embedding-utils.ts";

// CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SearchRequest {
  query: string;
  entityTypes?: string[];
  matchThreshold?: number;
  matchCountPerType?: number;
}

interface SearchResult {
  entity_type: string;
  entity_id: string;
  name: string;
  subtitle: string;
  similarity: number;
  text_rank: number;
  rrf_score: number;
  metadata: Record<string, unknown>;
  updated_at: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ========================================================================
    // Authentication
    // ========================================================================

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ========================================================================
    // Parse request body
    // ========================================================================

    const requestBody: SearchRequest = await req.json();
    const {
      query,
      entityTypes = ["document", "contact", "property", "deal"],
      matchThreshold = 0.1,
      matchCountPerType = 5,
    } = requestBody;

    // ========================================================================
    // Input validation
    // ========================================================================

    if (!query || typeof query !== "string") {
      return new Response(
        JSON.stringify({ error: "Query is required and must be a string" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (query.length < 2) {
      return new Response(
        JSON.stringify({
          error: "Query must be at least 2 characters",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (query.length > 1000) {
      return new Response(
        JSON.stringify({
          error: "Query too long (max 1000 chars)",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate entity types
    const validEntityTypes = ["document", "contact", "property", "deal"];
    const invalidTypes = entityTypes.filter(
      (type) => !validEntityTypes.includes(type)
    );

    if (invalidTypes.length > 0) {
      return new Response(
        JSON.stringify({
          error: `Invalid entity types: ${invalidTypes.join(", ")}`,
          validTypes: validEntityTypes,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ========================================================================
    // Generate query embedding
    // ========================================================================

    const queryEmbedding = generateDeterministicEmbedding(query);

    // ========================================================================
    // Create Supabase client with user's auth token
    // ========================================================================

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // ========================================================================
    // Get tenant ID from authenticated user
    // ========================================================================

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const tenantId = user.id; // User ID is tenant ID in this schema

    // ========================================================================
    // Call unified search RPC function
    // ========================================================================

    const { data: results, error: searchError } = await supabase.rpc(
      "search_all_entities_hybrid",
      {
        p_query: query,
        p_query_embedding: queryEmbedding,
        p_tenant_id: tenantId,
        p_entity_types: entityTypes,
        p_match_threshold: matchThreshold,
        p_match_count_per_type: matchCountPerType,
      }
    );

    if (searchError) {
      console.error("Search error:", searchError);

      return new Response(
        JSON.stringify({
          error: "Search failed",
          details: searchError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ========================================================================
    // Return results
    // ========================================================================

    const response: { results: SearchResult[]; count: number } = {
      results: results || [],
      count: results?.length || 0,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error:", error);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
