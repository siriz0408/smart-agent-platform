/**
 * Index Entities Edge Function
 *
 * Batch indexing function for backfilling embeddings on existing entities
 * Used for initial migration and manual re-indexing
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { generateDeterministicEmbedding } from "../_shared/embedding-utils.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createErrorResponse } from "../_shared/error-handler.ts";

interface IndexRequest {
  entityType: "contact" | "property" | "deal" | "all";
  batchSize?: number;
  tenantId?: string; // Optional: Index specific tenant only
}

interface IndexResult {
  entityType: string;
  indexed: number;
  skipped: number;
  errors: number;
  duration_ms: number;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ========================================================================
    // Authentication - Require service role key for bulk operations
    // ========================================================================

    const authHeader = req.headers.get("Authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!authHeader || !authHeader.includes(serviceRoleKey || "")) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized - service role key required",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ========================================================================
    // Create admin Supabase client
    // ========================================================================

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      serviceRoleKey ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // ========================================================================
    // Parse request
    // ========================================================================

    const requestBody: IndexRequest = await req.json();
    const {
      entityType = "all",
      batchSize = 100,
      tenantId,
    } = requestBody;

    const results: IndexResult[] = [];

    // ========================================================================
    // Helper: Index contacts
    // ========================================================================

    const indexContacts = async (): Promise<IndexResult> => {
      const startTime = Date.now();
      let indexed = 0;
      let skipped = 0;
      let errors = 0;

      // Fetch contacts without embeddings
      const query = supabase
        .from("contacts")
        .select("id, search_text")
        .is("embedding", null)
        .limit(batchSize);

      if (tenantId) {
        query.eq("tenant_id", tenantId);
      }

      const { data: contacts, error: fetchError } = await query;

      if (fetchError) {
        console.error("Error fetching contacts:", fetchError);
        errors++;
        return {
          entityType: "contact",
          indexed,
          skipped,
          errors,
          duration_ms: Date.now() - startTime,
        };
      }

      // Generate and update embeddings
      for (const contact of contacts || []) {
        if (!contact.search_text) {
          skipped++;
          continue;
        }

        try {
          const embedding = generateDeterministicEmbedding(contact.search_text);

          const { error: updateError } = await supabase
            .from("contacts")
            .update({
              embedding,
              embedding_indexed_at: new Date().toISOString(),
            })
            .eq("id", contact.id);

          if (updateError) {
            console.error("Error updating contact:", updateError);
            errors++;
          } else {
            indexed++;
          }
        } catch (error) {
          console.error("Error processing contact:", error);
          errors++;
        }
      }

      return {
        entityType: "contact",
        indexed,
        skipped,
        errors,
        duration_ms: Date.now() - startTime,
      };
    };

    // ========================================================================
    // Helper: Index properties
    // ========================================================================

    const indexProperties = async (): Promise<IndexResult> => {
      const startTime = Date.now();
      let indexed = 0;
      let skipped = 0;
      let errors = 0;

      const query = supabase
        .from("properties")
        .select("id, search_text")
        .is("embedding", null)
        .limit(batchSize);

      if (tenantId) {
        query.eq("tenant_id", tenantId);
      }

      const { data: properties, error: fetchError } = await query;

      if (fetchError) {
        console.error("Error fetching properties:", fetchError);
        errors++;
        return {
          entityType: "property",
          indexed,
          skipped,
          errors,
          duration_ms: Date.now() - startTime,
        };
      }

      for (const property of properties || []) {
        if (!property.search_text) {
          skipped++;
          continue;
        }

        try {
          const embedding = generateDeterministicEmbedding(
            property.search_text
          );

          const { error: updateError } = await supabase
            .from("properties")
            .update({
              embedding,
              embedding_indexed_at: new Date().toISOString(),
            })
            .eq("id", property.id);

          if (updateError) {
            console.error("Error updating property:", updateError);
            errors++;
          } else {
            indexed++;
          }
        } catch (error) {
          console.error("Error processing property:", error);
          errors++;
        }
      }

      return {
        entityType: "property",
        indexed,
        skipped,
        errors,
        duration_ms: Date.now() - startTime,
      };
    };

    // ========================================================================
    // Helper: Index deals
    // ========================================================================

    const indexDeals = async (): Promise<IndexResult> => {
      const startTime = Date.now();
      let indexed = 0;
      let skipped = 0;
      let errors = 0;

      const query = supabase
        .from("deals")
        .select("id, search_text")
        .is("embedding", null)
        .limit(batchSize);

      if (tenantId) {
        query.eq("tenant_id", tenantId);
      }

      const { data: deals, error: fetchError } = await query;

      if (fetchError) {
        console.error("Error fetching deals:", fetchError);
        errors++;
        return {
          entityType: "deal",
          indexed,
          skipped,
          errors,
          duration_ms: Date.now() - startTime,
        };
      }

      for (const deal of deals || []) {
        if (!deal.search_text) {
          skipped++;
          continue;
        }

        try {
          const embedding = generateDeterministicEmbedding(deal.search_text);

          const { error: updateError } = await supabase
            .from("deals")
            .update({
              embedding,
              embedding_indexed_at: new Date().toISOString(),
            })
            .eq("id", deal.id);

          if (updateError) {
            console.error("Error updating deal:", updateError);
            errors++;
          } else {
            indexed++;
          }
        } catch (error) {
          console.error("Error processing deal:", error);
          errors++;
        }
      }

      return {
        entityType: "deal",
        indexed,
        skipped,
        errors,
        duration_ms: Date.now() - startTime,
      };
    };

    // ========================================================================
    // Execute indexing based on entity type
    // ========================================================================

    if (entityType === "all" || entityType === "contact") {
      results.push(await indexContacts());
    }

    if (entityType === "all" || entityType === "property") {
      results.push(await indexProperties());
    }

    if (entityType === "all" || entityType === "deal") {
      results.push(await indexDeals());
    }

    // ========================================================================
    // Return results
    // ========================================================================

    const totalIndexed = results.reduce((sum, r) => sum + r.indexed, 0);
    const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);
    const totalDuration = results.reduce((sum, r) => sum + r.duration_ms, 0);

    return new Response(
      JSON.stringify({
        success: totalErrors === 0,
        results,
        summary: {
          totalIndexed,
          totalSkipped,
          totalErrors,
          totalDuration_ms: totalDuration,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return createErrorResponse(error, corsHeaders, {
      functionName: "index-entities",
      logContext: { endpoint: "index-entities" },
    });
  }
});
