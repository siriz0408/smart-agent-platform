import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logger } from "../_shared/logger.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createErrorResponse } from "../_shared/error-handler.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentId } = await req.json();
    
    if (!documentId) {
      return new Response(
        JSON.stringify({ error: "documentId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get document info to verify it exists and get file_path
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (docError || !document) {
      return new Response(
        JSON.stringify({ error: "Document not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Deleting document: ${document.name} (${documentId})`);

    // Step 1: Delete document chunks (must be first due to foreign key)
    const { error: chunksError } = await supabase
      .from("document_chunks")
      .delete()
      .eq("document_id", documentId);

    if (chunksError) {
      console.error("Error deleting chunks:", chunksError);
      // Continue anyway - chunks might not exist
    } else {
      console.log("Deleted document chunks");
    }

    // Step 2: Delete from documents table
    const { error: deleteError } = await supabase
      .from("documents")
      .delete()
      .eq("id", documentId);

    if (deleteError) {
      console.error("Error deleting document record:", deleteError);
      return new Response(
        JSON.stringify({ error: "Failed to delete document record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Deleted document record from database");

    // Step 3: Delete file from storage
    const { error: storageError } = await supabase
      .storage
      .from("documents")
      .remove([document.file_path]);

    if (storageError) {
      console.error("Error deleting from storage:", storageError);
      // Don't fail the request - document record is already deleted
      // This is a partial success scenario
    } else {
      console.log("Deleted file from storage");
    }

    return new Response(
      JSON.stringify({
        success: true,
        documentId,
        documentName: document.name,
        storageDeleted: !storageError,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return createErrorResponse(error, corsHeaders, {
      functionName: "delete-document",
      logContext: { endpoint: "delete-document" },
    });
  }
});
