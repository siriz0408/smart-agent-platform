import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logger } from "../_shared/logger.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

interface CloneDocumentRequest {
  // Either provide document_id directly or attachment_id
  document_id?: string;
  attachment_id?: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: CloneDocumentRequest = await req.json();

    if (!body.document_id && !body.attachment_id) {
      return new Response(
        JSON.stringify({ error: "Either document_id or attachment_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // User client for authentication and user-specific operations
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user and get profile
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's profile for tenant_id
    const { data: profile, error: profileError } = await userClient
      .from("profiles")
      .select("tenant_id")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile?.tenant_id) {
      return new Response(
        JSON.stringify({ error: "User profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Service client for cross-tenant operations
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let sourceFilePath: string;
    let fileName: string;
    let fileType: string;
    let fileSize: number;
    let sourceBucket: string;

    if (body.attachment_id) {
      // Clone from message attachment
      const { data: attachment, error: attachmentError } = await userClient
        .from("message_attachments")
        .select("file_name, file_type, file_size, storage_path")
        .eq("id", body.attachment_id)
        .single();

      if (attachmentError || !attachment) {
        return new Response(
          JSON.stringify({ error: "Attachment not found or access denied" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      sourceFilePath = attachment.storage_path;
      fileName = attachment.file_name;
      fileType = attachment.file_type;
      fileSize = attachment.file_size;
      sourceBucket = "message-attachments";
    } else {
      // Clone from existing document
      const { data: document, error: documentError } = await serviceClient
        .from("documents")
        .select("name, file_type, file_size, file_path")
        .eq("id", body.document_id)
        .single();

      if (documentError || !document) {
        return new Response(
          JSON.stringify({ error: "Document not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      sourceFilePath = document.file_path;
      fileName = document.name;
      fileType = document.file_type || "application/octet-stream";
      fileSize = document.file_size || 0;
      sourceBucket = "documents";
    }

    // Download the source file
    const { data: fileData, error: downloadError } = await serviceClient.storage
      .from(sourceBucket)
      .download(sourceFilePath);

    if (downloadError || !fileData) {
      logger.error("Download error", { error: downloadError?.message });
      return new Response(
        JSON.stringify({ error: "Failed to download source file" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate new file path for recipient
    const timestamp = Date.now();
    const newFilePath = `${profile.tenant_id}/${user.id}/${timestamp}-${fileName}`;

    // Upload to recipient's documents folder
    const { error: uploadError } = await serviceClient.storage
      .from("documents")
      .upload(newFilePath, fileData, {
        contentType: fileType,
        upsert: false,
      });

    if (uploadError) {
      logger.error("Upload error", { error: uploadError.message });
      return new Response(
        JSON.stringify({ error: "Failed to upload cloned file" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create new document record for recipient
    const { data: newDocument, error: insertError } = await userClient
      .from("documents")
      .insert({
        tenant_id: profile.tenant_id,
        name: fileName,
        file_path: newFilePath,
        file_type: fileType,
        file_size: fileSize,
        uploaded_by: user.id,
        category: "shared",
      })
      .select()
      .single();

    if (insertError) {
      logger.error("Document insert error", { error: insertError.message });
      // Clean up uploaded file on failure
      await serviceClient.storage.from("documents").remove([newFilePath]);
      return new Response(
        JSON.stringify({ error: "Failed to create document record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Optionally trigger indexing for AI search
    // This is done asynchronously - we don't wait for it
    try {
      fetch(`${SUPABASE_URL}/functions/v1/index-document`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ documentId: newDocument.id }),
      }).catch(err => logger.error("Indexing trigger failed", { error: err instanceof Error ? err.message : String(err) }));
    } catch {
      // Non-fatal - indexing can happen later
      logger.debug("Could not trigger document indexing");
    }

    return new Response(
      JSON.stringify({
        success: true,
        document: newDocument,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    logger.error("clone-shared-document error", { error: error instanceof Error ? error.message : String(error) });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
