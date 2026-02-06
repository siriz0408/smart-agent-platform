import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logger } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get JWT token from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
      },
    });

    // Verify JWT and get user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      logger.error("Invalid JWT token", { error: authError });
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    logger.info("Starting GDPR account deletion", { userId, email: user.email });

    // Use service role client for deletion operations
    const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const deletionSteps: Array<{ name: string; execute: () => Promise<void> }> = [];

    // Step 1: Delete document chunks (for user's documents)
    deletionSteps.push({
      name: "document_chunks",
      execute: async () => {
        const { data: userDocs } = await adminSupabase
          .from("documents")
          .select("id")
          .eq("created_by", userId);
        
        if (userDocs && userDocs.length > 0) {
          const docIds = userDocs.map(d => d.id);
          const { error } = await adminSupabase
            .from("document_chunks")
            .delete()
            .in("document_id", docIds);
          if (error) logger.warn("Error deleting document chunks", { error, userId });
        }
      },
    });

    // Step 2: Delete documents (and storage files)
    deletionSteps.push({
      name: "documents",
      execute: async () => {
        const { data: userDocs } = await adminSupabase
          .from("documents")
          .select("id, file_path")
          .eq("created_by", userId);
        
        if (userDocs && userDocs.length > 0) {
          // Delete storage files
          const filePaths = userDocs.filter(d => d.file_path).map(d => d.file_path);
          if (filePaths.length > 0) {
            const { error: storageError } = await adminSupabase.storage
              .from("documents")
              .remove(filePaths);
            if (storageError) logger.warn("Error deleting storage files", { error: storageError, userId });
          }

          // Delete document records
          const { error } = await adminSupabase
            .from("documents")
            .delete()
            .eq("created_by", userId);
          if (error) logger.warn("Error deleting documents", { error, userId });
        }
      },
    });

    // Step 3: Delete AI messages
    deletionSteps.push({
      name: "ai_messages",
      execute: async () => {
        const { error } = await adminSupabase
          .from("ai_messages")
          .delete()
          .eq("user_id", userId);
        if (error) logger.warn("Error deleting AI messages", { error, userId });
      },
    });

    // Step 4: Delete AI conversations
    deletionSteps.push({
      name: "ai_conversations",
      execute: async () => {
        const { error } = await adminSupabase
          .from("ai_conversations")
          .delete()
          .eq("user_id", userId);
        if (error) logger.warn("Error deleting AI conversations", { error, userId });
      },
    });

    // Step 5: Delete messages (messaging system)
    deletionSteps.push({
      name: "messages",
      execute: async () => {
        const { error } = await adminSupabase
          .from("messages")
          .delete()
          .eq("sender_id", userId);
        if (error) logger.warn("Error deleting messages", { error, userId });
      },
    });

    // Step 6: Delete message attachments
    deletionSteps.push({
      name: "message_attachments",
      execute: async () => {
        // Get conversation IDs where user is participant
        const { data: conversations } = await adminSupabase
          .from("conversation_participants")
          .select("conversation_id")
          .eq("user_id", userId);
        
        if (conversations && conversations.length > 0) {
          const convIds = conversations.map(c => c.conversation_id);
          const { data: messages } = await adminSupabase
            .from("messages")
            .select("id")
            .in("conversation_id", convIds);
          
          if (messages && messages.length > 0) {
            const msgIds = messages.map(m => m.id);
            const { error } = await adminSupabase
              .from("message_attachments")
              .delete()
              .in("message_id", msgIds);
            if (error) logger.warn("Error deleting message attachments", { error, userId });
          }
        }
      },
    });

    // Step 7: Delete conversation participants
    deletionSteps.push({
      name: "conversation_participants",
      execute: async () => {
        const { error } = await adminSupabase
          .from("conversation_participants")
          .delete()
          .eq("user_id", userId);
        if (error) logger.warn("Error deleting conversation participants", { error, userId });
      },
    });

    // Step 8: Delete conversations created by user
    deletionSteps.push({
      name: "conversations",
      execute: async () => {
        const { error } = await adminSupabase
          .from("conversations")
          .delete()
          .eq("created_by", userId);
        if (error) logger.warn("Error deleting conversations", { error, userId });
      },
    });

    // Step 9: Delete deal milestones
    deletionSteps.push({
      name: "deal_milestones",
      execute: async () => {
        const { data: userDeals } = await adminSupabase
          .from("deals")
          .select("id")
          .eq("created_by", userId);
        
        if (userDeals && userDeals.length > 0) {
          const dealIds = userDeals.map(d => d.id);
          const { error } = await adminSupabase
            .from("deal_milestones")
            .delete()
            .in("deal_id", dealIds);
          if (error) logger.warn("Error deleting deal milestones", { error, userId });
        }
      },
    });

    // Step 10: Delete deals
    deletionSteps.push({
      name: "deals",
      execute: async () => {
        const { error } = await adminSupabase
          .from("deals")
          .delete()
          .eq("created_by", userId);
        if (error) logger.warn("Error deleting deals", { error, userId });
      },
    });

    // Step 11: Delete contact agents (junction table)
    deletionSteps.push({
      name: "contact_agents",
      execute: async () => {
        const { error } = await adminSupabase
          .from("contact_agents")
          .delete()
          .eq("agent_user_id", userId);
        if (error) logger.warn("Error deleting contact agents", { error, userId });
      },
    });

    // Step 12: Delete contacts created by user
    deletionSteps.push({
      name: "contacts",
      execute: async () => {
        const { error } = await adminSupabase
          .from("contacts")
          .delete()
          .eq("created_by", userId);
        if (error) logger.warn("Error deleting contacts", { error, userId });
      },
    });

    // Step 13: Delete properties created by user
    deletionSteps.push({
      name: "properties",
      execute: async () => {
        const { error } = await adminSupabase
          .from("properties")
          .delete()
          .eq("created_by", userId);
        if (error) logger.warn("Error deleting properties", { error, userId });
      },
    });

    // Step 14: Delete saved properties
    deletionSteps.push({
      name: "saved_properties",
      execute: async () => {
        const { error } = await adminSupabase
          .from("saved_properties")
          .delete()
          .eq("user_id", userId);
        if (error) logger.warn("Error deleting saved properties", { error, userId });
      },
    });

    // Step 15: Delete user agents (AI agent favorites)
    deletionSteps.push({
      name: "user_agents",
      execute: async () => {
        const { error } = await adminSupabase
          .from("user_agents")
          .delete()
          .eq("user_id", userId);
        if (error) logger.warn("Error deleting user agents", { error, userId });
      },
    });

    // Step 16: Delete usage records
    deletionSteps.push({
      name: "usage_records",
      execute: async () => {
        const { error } = await adminSupabase
          .from("usage_records")
          .delete()
          .eq("user_id", userId);
        if (error) logger.warn("Error deleting usage records", { error, userId });
      },
    });

    // Step 17: Delete user preferences
    deletionSteps.push({
      name: "user_preferences",
      execute: async () => {
        const { error } = await adminSupabase
          .from("user_preferences")
          .delete()
          .eq("user_id", userId);
        if (error) logger.warn("Error deleting user preferences", { error, userId });
      },
    });

    // Step 18: Delete profile privacy settings
    deletionSteps.push({
      name: "profile_privacy_settings",
      execute: async () => {
        const { error } = await adminSupabase
          .from("profile_privacy_settings")
          .delete()
          .eq("user_id", userId);
        if (error) logger.warn("Error deleting profile privacy settings", { error, userId });
      },
    });

    // Step 19: Delete workspace memberships
    deletionSteps.push({
      name: "workspace_memberships",
      execute: async () => {
        const { error } = await adminSupabase
          .from("workspace_memberships")
          .delete()
          .eq("user_id", userId);
        if (error) logger.warn("Error deleting workspace memberships", { error, userId });
      },
    });

    // Step 20: Delete profile
    deletionSteps.push({
      name: "profiles",
      execute: async () => {
        const { error } = await adminSupabase
          .from("profiles")
          .delete()
          .eq("user_id", userId);
        if (error) logger.warn("Error deleting profile", { error, userId });
      },
    });

    // Execute all deletion steps
    const errors: string[] = [];
    for (const step of deletionSteps) {
      try {
        await step.execute();
        logger.info(`Completed deletion step: ${step.name}`, { userId });
      } catch (error) {
        const errorMsg = `Failed to delete ${step.name}: ${error instanceof Error ? error.message : "Unknown error"}`;
        errors.push(errorMsg);
        logger.error(errorMsg, { userId, step: step.name, error });
      }
    }

    // Step 21: Delete auth user (final step)
    const { error: deleteUserError } = await adminSupabase.auth.admin.deleteUser(userId);
    if (deleteUserError) {
      errors.push(`Failed to delete auth user: ${deleteUserError.message}`);
      logger.error("Failed to delete auth user", { userId, error: deleteUserError });
    } else {
      logger.info("Deleted auth user", { userId });
    }

    if (errors.length > 0) {
      logger.warn("Account deletion completed with errors", { userId, errors });
      return new Response(
        JSON.stringify({
          success: true,
          warnings: errors,
          message: "Account deletion completed with some warnings. Please contact support if issues persist.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logger.info("Account deletion completed successfully", { userId, email: user.email });
    return new Response(
      JSON.stringify({
        success: true,
        message: "Your account and all associated data have been permanently deleted.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    logger.error("delete-user-account error", { error: error instanceof Error ? error.message : "Unknown error" });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
