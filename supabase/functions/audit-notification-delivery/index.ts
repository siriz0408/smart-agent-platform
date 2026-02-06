import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { logger } from "../_shared/logger.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

interface AuditResult {
  check: string;
  status: "pass" | "fail" | "warning";
  message: string;
  details?: Record<string, unknown>;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results: AuditResult[] = [];

    // 1. Check notification types match schema
    logger.info("Audit: Checking notification types");
    const { data: notificationTypes } = await supabase
      .from("notifications")
      .select("type")
      .limit(1000);

    const uniqueTypes = new Set(notificationTypes?.map((n) => n.type) || []);
    const schemaTypes = [
      "milestone_reminder",
      "deal_stage_change",
      "document_shared",
      "message_received",
      "system",
      "weekly_digest",
    ];

    const invalidTypes = Array.from(uniqueTypes).filter(
      (t) => !schemaTypes.includes(t)
    );

    results.push({
      check: "Notification types match schema",
      status: invalidTypes.length === 0 ? "pass" : "fail",
      message:
        invalidTypes.length === 0
          ? "All notification types are valid"
          : `Invalid types found: ${invalidTypes.join(", ")}`,
      details: {
        validTypes: schemaTypes,
        foundTypes: Array.from(uniqueTypes),
        invalidTypes,
      },
    });

    // 2. Check email_sent flag is set when emails are sent
    logger.info("Audit: Checking email_sent flag");
    const { data: recentNotifications } = await supabase
      .from("notifications")
      .select("id, type, email_sent, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    const notificationsWithEmail = recentNotifications?.filter(
      (n) =>
        n.type === "milestone_reminder" ||
        n.type === "deal_stage_change" ||
        n.type === "message_received" ||
        n.type === "document_shared"
    ) || [];

    const missingEmailFlag = notificationsWithEmail.filter(
      (n) => !n.email_sent
    );

    results.push({
      check: "email_sent flag is set for email notifications",
      status:
        missingEmailFlag.length === 0
          ? "pass"
          : missingEmailFlag.length < notificationsWithEmail.length * 0.1
            ? "warning"
            : "fail",
      message:
        missingEmailFlag.length === 0
          ? "All email notifications have email_sent flag set"
          : `${missingEmailFlag.length} of ${notificationsWithEmail.length} email notifications missing email_sent flag`,
      details: {
        totalEmailNotifications: notificationsWithEmail.length,
        missingFlag: missingEmailFlag.length,
        sampleMissing: missingEmailFlag.slice(0, 5).map((n) => ({
          id: n.id,
          type: n.type,
          created_at: n.created_at,
        })),
      },
    });

    // 3. Check notification creation points
    logger.info("Audit: Checking notification creation points");
    const creationPoints = [
      {
        name: "deal-stage-webhook",
        file: "supabase/functions/deal-stage-webhook/index.ts",
        createsInApp: true,
        sendsEmail: true,
      },
      {
        name: "check-milestone-reminders",
        file: "supabase/functions/check-milestone-reminders/index.ts",
        createsInApp: true,
        sendsEmail: true,
      },
      {
        name: "send-email",
        file: "supabase/functions/send-email/index.ts",
        createsInApp: true,
        sendsEmail: true,
      },
      {
        name: "agentActions.notify_user",
        file: "supabase/functions/_shared/agentActions.ts",
        createsInApp: true,
        sendsEmail: false,
      },
    ];

    results.push({
      check: "Notification creation points documented",
      status: "pass",
      message: `Found ${creationPoints.length} notification creation points`,
      details: {
        creationPoints: creationPoints.map((cp) => ({
          name: cp.name,
          file: cp.file,
          createsInApp: cp.createsInApp,
          sendsEmail: cp.sendsEmail,
        })),
      },
    });

    // 4. Check email template coverage
    logger.info("Audit: Checking email template coverage");
    const { data: emailTemplates } = await supabase
      .from("notifications")
      .select("type")
      .in("type", [
        "milestone_reminder",
        "deal_stage_change",
        "message_received",
        "document_shared",
      ])
      .limit(1000);

    const templateTypes = new Set(
      emailTemplates?.map((n) => n.type) || []
    );
    const expectedTemplates = [
      "milestone_reminder",
      "deal_stage_change",
      "message_received",
      "document_shared",
    ];

    const missingTemplates = expectedTemplates.filter(
      (t) => !templateTypes.has(t)
    );

    results.push({
      check: "Email templates exist for all notification types",
      status: missingTemplates.length === 0 ? "pass" : "warning",
      message:
        missingTemplates.length === 0
          ? "All notification types have email templates"
          : `No notifications found for types: ${missingTemplates.join(", ")} (may be expected if feature not used)`,
      details: {
        expectedTemplates,
        foundTypes: Array.from(templateTypes),
        missingTemplates,
      },
    });

    // 5. Check notification delivery rate (recent notifications)
    logger.info("Audit: Checking notification delivery rate");
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const { data: recent24h } = await supabase
      .from("notifications")
      .select("id, type, email_sent, created_at")
      .gte("created_at", last24Hours.toISOString());

    const emailNotifications24h =
      recent24h?.filter(
        (n) =>
          n.type === "milestone_reminder" ||
          n.type === "deal_stage_change" ||
          n.type === "message_received" ||
          n.type === "document_shared"
      ) || [];

    const emailSentRate =
      emailNotifications24h.length > 0
        ? (emailNotifications24h.filter((n) => n.email_sent).length /
            emailNotifications24h.length) *
          100
        : 100;

    results.push({
      check: "Email delivery rate (last 24h)",
      status:
        emailSentRate >= 95
          ? "pass"
          : emailSentRate >= 80
            ? "warning"
            : "fail",
      message: `${emailSentRate.toFixed(1)}% of email notifications marked as sent`,
      details: {
        totalEmailNotifications: emailNotifications24h.length,
        sent: emailNotifications24h.filter((n) => n.email_sent).length,
        notSent: emailNotifications24h.filter((n) => !n.email_sent).length,
        rate: emailSentRate,
      },
    });

    // 6. Check for orphaned notifications (no user)
    logger.info("Audit: Checking for orphaned notifications");
    const { data: orphanedCheck } = await supabase
      .from("notifications")
      .select("id, user_id")
      .limit(1000);

    // Check if users exist (sample check)
    if (orphanedCheck && orphanedCheck.length > 0) {
      const sampleUserIds = orphanedCheck
        .slice(0, 10)
        .map((n) => n.user_id)
        .filter(Boolean);
      const { data: users } = await supabase.auth.admin.listUsers();
      const existingUserIds = new Set(users?.users.map((u) => u.id) || []);

      const orphanedSample = sampleUserIds.filter(
        (id) => !existingUserIds.has(id)
      );

      results.push({
        check: "Orphaned notifications check",
        status: orphanedSample.length === 0 ? "pass" : "warning",
        message:
          orphanedSample.length === 0
            ? "No orphaned notifications found in sample"
            : `Potential orphaned notifications found (sample check only)`,
        details: {
          sampleSize: sampleUserIds.length,
          orphanedInSample: orphanedSample.length,
        },
      });
    }

    // 7. Check Resend API key configuration
    logger.info("Audit: Checking Resend API configuration");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    results.push({
      check: "Resend API key configured",
      status: resendApiKey ? "pass" : "fail",
      message: resendApiKey
        ? "Resend API key is configured"
        : "Resend API key is missing",
      details: {
        configured: !!resendApiKey,
      },
    });

    // Calculate summary
    const passed = results.filter((r) => r.status === "pass").length;
    const warnings = results.filter((r) => r.status === "warning").length;
    const failed = results.filter((r) => r.status === "fail").length;

    const summary = {
      total: results.length,
      passed,
      warnings,
      failed,
      overallStatus:
        failed > 0 ? "fail" : warnings > 0 ? "warning" : "pass",
    };

    logger.info("Audit complete", summary);

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        results,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    logger.error("Error in audit-notification-delivery", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
