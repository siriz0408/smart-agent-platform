import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logger } from "../_shared/logger.ts";
import { requireEnv } from "../_shared/validateEnv.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PlaywrightMcpRequest {
  tool_name: "playwright_run_test" | "playwright_run_suite" | "playwright_compare_visual";
  params: Record<string, unknown>;
  tenant_id: string;
  user_id: string;
  agent_run_id?: string;
}

interface PlaywrightMcpResponse {
  success: boolean;
  test_run_id?: string;
  github_run_id?: string;
  github_run_url?: string;
  message?: string;
  error?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate required environment variables
    requireEnv([
      "SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "GITHUB_TOKEN",
      "GITHUB_REPO_OWNER",
      "GITHUB_REPO_NAME",
    ]);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const githubToken = Deno.env.get("GITHUB_TOKEN")!;
    const githubOwner = Deno.env.get("GITHUB_REPO_OWNER")!;
    const githubRepo = Deno.env.get("GITHUB_REPO_NAME")!;

    // Service client (MCP calls use service role)
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request
    const requestBody: PlaywrightMcpRequest = await req.json();
    const { tool_name, params, tenant_id, user_id, agent_run_id } = requestBody;

    if (!tool_name || !tenant_id || !user_id) {
      return new Response(
        JSON.stringify({ error: "tool_name, tenant_id, and user_id are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    logger.info("Playwright MCP request", { tool_name, tenant_id, user_id });

    // Route to appropriate handler
    let result: PlaywrightMcpResponse;

    switch (tool_name) {
      case "playwright_run_test":
        result = await handleRunTest(params, tenant_id, user_id, agent_run_id, serviceClient, {
          githubToken,
          githubOwner,
          githubRepo,
          supabaseUrl,
        });
        break;

      case "playwright_run_suite":
        result = await handleRunSuite(params, tenant_id, user_id, agent_run_id, serviceClient, {
          githubToken,
          githubOwner,
          githubRepo,
          supabaseUrl,
        });
        break;

      case "playwright_compare_visual":
        result = await handleCompareVisual(params, tenant_id, user_id, serviceClient);
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Unknown tool: ${tool_name}` }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
    }

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    logger.error("Playwright MCP error", { error: error instanceof Error ? error.message : String(error) });
    return new Response(
      JSON.stringify({
        success: false,
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
// TOOL HANDLERS
// ============================================================================

/**
 * Run a specific Playwright test file
 */
async function handleRunTest(
  params: Record<string, unknown>,
  tenantId: string,
  userId: string,
  agentRunId: string | undefined,
  serviceClient: ReturnType<typeof createClient>,
  config: { githubToken: string; githubOwner: string; githubRepo: string; supabaseUrl: string }
): Promise<PlaywrightMcpResponse> {
  const testFile = params.test_file as string;
  const project = (params.project as string) || "chromium";

  if (!testFile) {
    return {
      success: false,
      error: "test_file parameter is required",
    };
  }

  // Validate project
  const validProjects = ["chromium", "firefox", "webkit", "mobile", "mobile-chrome"];
  if (!validProjects.includes(project)) {
    return {
      success: false,
      error: `Invalid project. Must be one of: ${validProjects.join(", ")}`,
    };
  }

  // Create test run record
  const { data: testRun, error: testRunError } = await serviceClient
    .from("test_runs")
    .insert({
      tenant_id: tenantId,
      test_suite: "single_test",
      test_file: testFile,
      project,
      triggered_by: userId,
      agent_run_id: agentRunId,
      status: "queued",
    })
    .select()
    .single();

  if (testRunError) {
    logger.error("Error creating test run", { error: testRunError.message });
    return {
      success: false,
      error: "Failed to create test run record",
    };
  }

  // Trigger GitHub Actions workflow
  try {
    const workflowResult = await triggerGitHubWorkflow(
      config.githubToken,
      config.githubOwner,
      config.githubRepo,
      {
        test_run_id: testRun.id,
        spec_file: testFile,
        project,
        callback_url: `${config.supabaseUrl}/functions/v1/playwright-webhook`,
      }
    );

    // Update test run with GitHub run ID
    await serviceClient
      .from("test_runs")
      .update({
        github_run_id: workflowResult.run_id,
        github_run_url: workflowResult.run_url,
        status: "running",
        started_at: new Date().toISOString(),
      })
      .eq("id", testRun.id);

    return {
      success: true,
      test_run_id: testRun.id,
      github_run_id: workflowResult.run_id,
      github_run_url: workflowResult.run_url,
      message: `Test "${testFile}" queued on GitHub Actions (project: ${project})`,
    };

  } catch (workflowError) {
    // Update test run as failed
    await serviceClient
      .from("test_runs")
      .update({
        status: "failed",
        error_message: workflowError instanceof Error ? workflowError.message : String(workflowError),
        completed_at: new Date().toISOString(),
      })
      .eq("id", testRun.id);

    return {
      success: false,
      test_run_id: testRun.id,
      error: `Failed to trigger GitHub workflow: ${workflowError instanceof Error ? workflowError.message : String(workflowError)}`,
    };
  }
}

/**
 * Run a full test suite
 */
async function handleRunSuite(
  params: Record<string, unknown>,
  tenantId: string,
  userId: string,
  agentRunId: string | undefined,
  serviceClient: ReturnType<typeof createClient>,
  config: { githubToken: string; githubOwner: string; githubRepo: string; supabaseUrl: string }
): Promise<PlaywrightMcpResponse> {
  const testSuite = (params.test_suite as string) || "e2e";
  const project = (params.project as string) || "chromium";

  // Validate test suite
  const validSuites = ["e2e", "smoke", "visual", "all"];
  if (!validSuites.includes(testSuite)) {
    return {
      success: false,
      error: `Invalid test_suite. Must be one of: ${validSuites.join(", ")}`,
    };
  }

  // Create test run record
  const { data: testRun, error: testRunError } = await serviceClient
    .from("test_runs")
    .insert({
      tenant_id: tenantId,
      test_suite: testSuite,
      project,
      triggered_by: userId,
      agent_run_id: agentRunId,
      status: "queued",
    })
    .select()
    .single();

  if (testRunError) {
    logger.error("Error creating test run", { error: testRunError.message });
    return {
      success: false,
      error: "Failed to create test run record",
    };
  }

  // Trigger GitHub Actions workflow
  try {
    const workflowResult = await triggerGitHubWorkflow(
      config.githubToken,
      config.githubOwner,
      config.githubRepo,
      {
        test_run_id: testRun.id,
        test_suite: testSuite,
        project,
        callback_url: `${config.supabaseUrl}/functions/v1/playwright-webhook`,
      }
    );

    // Update test run with GitHub run ID
    await serviceClient
      .from("test_runs")
      .update({
        github_run_id: workflowResult.run_id,
        github_run_url: workflowResult.run_url,
        status: "running",
        started_at: new Date().toISOString(),
      })
      .eq("id", testRun.id);

    return {
      success: true,
      test_run_id: testRun.id,
      github_run_id: workflowResult.run_id,
      github_run_url: workflowResult.run_url,
      message: `Test suite "${testSuite}" queued on GitHub Actions (project: ${project})`,
    };

  } catch (workflowError) {
    // Update test run as failed
    await serviceClient
      .from("test_runs")
      .update({
        status: "failed",
        error_message: workflowError instanceof Error ? workflowError.message : String(workflowError),
        completed_at: new Date().toISOString(),
      })
      .eq("id", testRun.id);

    return {
      success: false,
      test_run_id: testRun.id,
      error: `Failed to trigger GitHub workflow: ${workflowError instanceof Error ? workflowError.message : String(workflowError)}`,
    };
  }
}

/**
 * Compare screenshot against visual baseline
 */
async function handleCompareVisual(
  params: Record<string, unknown>,
  tenantId: string,
  userId: string,
  serviceClient: ReturnType<typeof createClient>
): Promise<PlaywrightMcpResponse> {
  const testName = params.test_name as string;
  const pageUrl = params.page_url as string;
  const viewportWidth = (params.viewport_width as number) || 1280;
  const viewportHeight = (params.viewport_height as number) || 720;
  const browser = (params.browser as string) || "chromium";

  if (!testName || !pageUrl) {
    return {
      success: false,
      error: "test_name and page_url are required",
    };
  }

  // Check if baseline exists
  const { data: baseline, error: baselineError } = await serviceClient
    .from("visual_baselines")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("test_name", testName)
    .eq("page_url", pageUrl)
    .eq("viewport_width", viewportWidth)
    .eq("viewport_height", viewportHeight)
    .eq("browser", browser)
    .eq("is_active", true)
    .maybeSingle();

  if (baselineError) {
    logger.error("Error fetching baseline", { error: baselineError.message });
    return {
      success: false,
      error: "Failed to fetch visual baseline",
    };
  }

  if (!baseline) {
    return {
      success: false,
      error: `No active baseline found for test "${testName}" at ${pageUrl} (${viewportWidth}x${viewportHeight}, ${browser})`,
      message: "Create a baseline first by capturing a screenshot and approving it",
    };
  }

  // Future: Implement actual screenshot comparison
  // For now, return baseline info
  return {
    success: true,
    message: `Visual baseline found for "${testName}". Screenshot comparison not yet implemented.`,
    // @ts-expect-error - additional fields for context
    baseline_id: baseline.id,
    baseline_image_url: baseline.image_url,
  };
}

// ============================================================================
// GITHUB ACTIONS INTEGRATION
// ============================================================================

interface WorkflowInputs {
  test_run_id: string;
  spec_file?: string;
  test_suite?: string;
  project: string;
  callback_url: string;
}

interface WorkflowResult {
  run_id: string;
  run_url: string;
}

/**
 * Trigger GitHub Actions workflow via workflow_dispatch
 */
async function triggerGitHubWorkflow(
  githubToken: string,
  owner: string,
  repo: string,
  inputs: WorkflowInputs
): Promise<WorkflowResult> {
  const workflowFileName = "playwright.yml";
  const ref = "main"; // or "master" depending on your default branch

  // Trigger workflow_dispatch
  const dispatchUrl = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowFileName}/dispatches`;

  const response = await fetch(dispatchUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${githubToken}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ref,
      inputs: {
        test_run_id: inputs.test_run_id,
        spec_file: inputs.spec_file || "",
        test_suite: inputs.test_suite || "",
        project: inputs.project,
        callback_url: inputs.callback_url,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub API error (${response.status}): ${errorText}`);
  }

  // GitHub workflow_dispatch returns 204 No Content on success
  // We need to fetch the latest run to get the run ID
  await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2s for run to start

  const runsUrl = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowFileName}/runs?per_page=1`;
  const runsResponse = await fetch(runsUrl, {
    headers: {
      "Authorization": `Bearer ${githubToken}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!runsResponse.ok) {
    throw new Error(`Failed to fetch workflow runs: ${runsResponse.status}`);
  }

  const runsData = await runsResponse.json();
  const latestRun = runsData.workflow_runs?.[0];

  if (!latestRun) {
    throw new Error("No workflow runs found. Check if the workflow file exists and is enabled.");
  }

  return {
    run_id: String(latestRun.id),
    run_url: latestRun.html_url,
  };
}
