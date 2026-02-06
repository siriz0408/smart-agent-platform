import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logger } from "../_shared/logger.ts";
import { requireEnv } from "../_shared/validateEnv.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

interface WebhookPayload {
  test_run_id: string;
  status: "passed" | "failed" | "cancelled";
  total_tests?: number;
  passed_tests?: number;
  failed_tests?: number;
  skipped_tests?: number;
  test_duration_ms?: number;
  report_url?: string;
  video_urls?: string[];
  screenshot_urls?: string[];
  trace_urls?: string[];
  failed_test_names?: string[];
  error_message?: string;
  visual_diff_count?: number;
  visual_diff_urls?: string[];
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate required environment variables
    requireEnv(["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "PLAYWRIGHT_WEBHOOK_SECRET"]);

    const webhookSecret = Deno.env.get("PLAYWRIGHT_WEBHOOK_SECRET")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify webhook secret
    const providedSecret = req.headers.get("x-webhook-secret");
    if (providedSecret !== webhookSecret) {
      logger.warn("Invalid webhook secret");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service client
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Parse webhook payload
    const payload: WebhookPayload = await req.json();
    const { test_run_id, status } = payload;

    if (!test_run_id || !status) {
      return new Response(
        JSON.stringify({ error: "test_run_id and status are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    logger.info("Playwright webhook received", { test_run_id, status });

    // Fetch test run
    const { data: testRun, error: fetchError } = await serviceClient
      .from("test_runs")
      .select("*, triggered_by")
      .eq("id", test_run_id)
      .single();

    if (fetchError || !testRun) {
      logger.error("Test run not found", { test_run_id, error: fetchError?.message });
      return new Response(
        JSON.stringify({ error: "Test run not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Update test run with results
    const { error: updateError } = await serviceClient
      .from("test_runs")
      .update({
        status,
        total_tests: payload.total_tests,
        passed_tests: payload.passed_tests,
        failed_tests: payload.failed_tests,
        skipped_tests: payload.skipped_tests,
        test_duration_ms: payload.test_duration_ms,
        report_url: payload.report_url,
        video_urls: payload.video_urls || [],
        screenshot_urls: payload.screenshot_urls || [],
        trace_urls: payload.trace_urls || [],
        failed_test_names: payload.failed_test_names || [],
        error_message: payload.error_message,
        visual_diff_count: payload.visual_diff_count || 0,
        visual_diff_urls: payload.visual_diff_urls || [],
        completed_at: new Date().toISOString(),
      })
      .eq("id", test_run_id);

    if (updateError) {
      logger.error("Error updating test run", { test_run_id, error: updateError.message });
      return new Response(
        JSON.stringify({ error: "Failed to update test run" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create notification based on test result
    if (testRun.triggered_by) {
      await createTestResultNotification(
        serviceClient,
        testRun.triggered_by,
        testRun.tenant_id,
        testRun,
        payload
      );
    }

    logger.info("Test run updated successfully", { test_run_id, status });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Test results recorded successfully",
        test_run_id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    logger.error("Playwright webhook error", { error: error instanceof Error ? error.message : String(error) });
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// ============================================================================
// NOTIFICATION HELPER
// ============================================================================

async function createTestResultNotification(
  serviceClient: ReturnType<typeof createClient>,
  userId: string,
  tenantId: string,
  testRun: Record<string, unknown>,
  payload: WebhookPayload
) {
  const { status, total_tests, passed_tests, failed_tests } = payload;
  const testSuite = testRun.test_suite as string;
  const testFile = testRun.test_file as string | null;
  const project = testRun.project as string;

  let title: string;
  let body: string;
  let type: string;

  if (status === "passed") {
    title = "✅ Tests Passed";
    body = `${testSuite === "single_test" ? `Test "${testFile}"` : `Test suite "${testSuite}"`} passed on ${project}. ${passed_tests}/${total_tests} tests passed.`;
    type = "test_success";
  } else if (status === "failed") {
    title = "❌ Tests Failed";
    const failedCount = failed_tests || 0;
    const failedNames = payload.failed_test_names?.slice(0, 3) || [];
    const failedList = failedNames.length > 0 ? `\n\nFailed: ${failedNames.join(", ")}` : "";
    body = `${testSuite === "single_test" ? `Test "${testFile}"` : `Test suite "${testSuite}"`} failed on ${project}. ${failedCount} test(s) failed.${failedList}`;
    type = "test_failure";
  } else {
    title = "⚠️ Tests Cancelled";
    body = `${testSuite === "single_test" ? `Test "${testFile}"` : `Test suite "${testSuite}"`} was cancelled.`;
    type = "test_cancelled";
  }

  try {
    await serviceClient.from("notifications").insert({
      user_id: userId,
      tenant_id: tenantId,
      type,
      title,
      body,
      action_url: testRun.github_run_url as string,
      metadata: {
        test_run_id: testRun.id,
        status,
        total_tests,
        passed_tests,
        failed_tests,
        report_url: payload.report_url,
        github_run_url: testRun.github_run_url,
      },
    });

    logger.info("Test result notification created", { userId, test_run_id: testRun.id, status });
  } catch (notificationError) {
    logger.error("Error creating notification", {
      error: notificationError instanceof Error ? notificationError.message : String(notificationError),
    });
  }
}
