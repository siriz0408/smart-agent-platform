import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logger } from "../_shared/logger.ts";
import { requireEnv } from "../_shared/validateEnv.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

interface AuditResult {
  timestamp: string;
  summary: {
    totalDocuments: number;
    indexedDocuments: number;
    unindexedDocuments: number;
    failedJobs: number;
    stuckJobs: number;
    incompleteChunks: number;
    missingMetadata: number;
    successRate: number;
  };
  issues: Array<{
    type: string;
    severity: "critical" | "high" | "medium" | "low";
    documentId: string;
    documentName: string;
    message: string;
    details?: Record<string, unknown>;
  }>;
  recommendations: string[];
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    requireEnv(["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    logger.info("Starting document indexing audit");

    const issues: AuditResult["issues"] = [];
    const recommendations: string[] = [];

    // ========================================================================
    // 1. Get all documents
    // ========================================================================
    const { data: allDocuments, error: docsError } = await supabase
      .from("documents")
      .select("id, name, indexed_at, file_type, file_size, category, tenant_id, created_at")
      .order("created_at", { ascending: false });

    if (docsError) {
      throw new Error(`Failed to fetch documents: ${docsError.message}`);
    }

    const totalDocuments = allDocuments?.length || 0;
    logger.info("Fetched documents", { count: totalDocuments });

    // ========================================================================
    // 2. Check for unindexed documents (no indexed_at timestamp)
    // ========================================================================
    const unindexedDocuments = allDocuments?.filter(doc => !doc.indexed_at) || [];
    
    for (const doc of unindexedDocuments) {
      // Check if there's a failed job
      const { data: job } = await supabase
        .from("document_indexing_jobs")
        .select("status, error_message, started_at")
        .eq("document_id", doc.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (job?.status === "failed") {
        issues.push({
          type: "failed_indexing",
          severity: "high",
          documentId: doc.id,
          documentName: doc.name || "Unknown",
          message: `Document indexing failed: ${job.error_message || "Unknown error"}`,
          details: {
            errorMessage: job.error_message,
            startedAt: job.started_at,
          },
        });
      } else {
        issues.push({
          type: "unindexed",
          severity: doc.created_at ? 
            (Date.now() - new Date(doc.created_at).getTime() > 24 * 60 * 60 * 1000 ? "high" : "medium") :
            "medium",
          documentId: doc.id,
          documentName: doc.name || "Unknown",
          message: "Document has not been indexed",
          details: {
            fileType: doc.file_type,
            fileSize: doc.file_size,
            createdAt: doc.created_at,
          },
        });
      }
    }

    // ========================================================================
    // 3. Check for stuck jobs (processing for more than 30 minutes)
    // ========================================================================
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    const { data: stuckJobs, error: stuckError } = await supabase
      .from("document_indexing_jobs")
      .select(`
        id,
        document_id,
        status,
        started_at,
        progress,
        documents!inner(name)
      `)
      .eq("status", "processing")
      .lt("started_at", thirtyMinutesAgo);

    if (stuckError) {
      logger.error("Failed to fetch stuck jobs", { error: stuckError.message });
    } else {
      for (const job of stuckJobs || []) {
        const doc = job.documents as { name: string };
        issues.push({
          type: "stuck_job",
          severity: "high",
          documentId: job.document_id,
          documentName: doc?.name || "Unknown",
          message: `Indexing job stuck in processing state for over 30 minutes`,
          details: {
            jobId: job.id,
            progress: job.progress,
            startedAt: job.started_at,
          },
        });
      }
    }

    // ========================================================================
    // 4. Check for documents with incomplete chunks
    // ========================================================================
    const { data: allCompletedJobs, error: incompleteError } = await supabase
      .from("document_indexing_jobs")
      .select("document_id, total_chunks, indexed_chunks, status, documents!inner(name)")
      .eq("status", "completed");

    if (incompleteError) {
      logger.error("Failed to fetch completed jobs", { error: incompleteError.message });
    } else {
      for (const job of allCompletedJobs || []) {
        if (job.total_chunks > 0 && job.indexed_chunks < job.total_chunks) {
          const doc = job.documents as { name: string };
          issues.push({
            type: "incomplete_chunks",
            severity: "medium",
            documentId: job.document_id,
            documentName: doc?.name || "Unknown",
            message: `Only ${job.indexed_chunks} of ${job.total_chunks} chunks were indexed`,
            details: {
              indexedChunks: job.indexed_chunks,
              totalChunks: job.total_chunks,
              missingChunks: job.total_chunks - job.indexed_chunks,
            },
          });
        }
      }
    }

    // ========================================================================
    // 5. Check for documents with indexed_at but no chunks
    // ========================================================================
    const indexedDocuments = allDocuments?.filter(doc => doc.indexed_at) || [];
    
    for (const doc of indexedDocuments.slice(0, 100)) { // Sample first 100 to avoid timeout
      const { count: chunkCount, error: chunkError } = await supabase
        .from("document_chunks")
        .select("*", { count: "exact", head: true })
        .eq("document_id", doc.id);

      if (chunkError) {
        logger.error("Failed to count chunks", { documentId: doc.id, error: chunkError.message });
        continue;
      }

      if (chunkCount === 0) {
        issues.push({
          type: "no_chunks",
          severity: "critical",
          documentId: doc.id,
          documentName: doc.name || "Unknown",
          message: "Document marked as indexed but has no chunks",
          details: {
            indexedAt: doc.indexed_at,
          },
        });
      }
    }

    // ========================================================================
    // 6. Check for documents that should have metadata but don't
    // ========================================================================
    const documentsNeedingMetadata = indexedDocuments.filter(doc => 
      doc.category && ["contract", "inspection", "closing"].includes(doc.category)
    );

    for (const doc of documentsNeedingMetadata.slice(0, 50)) { // Sample to avoid timeout
      const { data: metadata, error: metaError } = await supabase
        .from("document_metadata")
        .select("id")
        .eq("document_id", doc.id)
        .maybeSingle();

      if (metaError) {
        logger.error("Failed to check metadata", { documentId: doc.id, error: metaError.message });
        continue;
      }

      if (!metadata) {
        issues.push({
          type: "missing_metadata",
          severity: "low",
          documentId: doc.id,
          documentName: doc.name || "Unknown",
          message: `Document of type '${doc.category}' should have structured metadata but doesn't`,
          details: {
            category: doc.category,
          },
        });
      }
    }

    // ========================================================================
    // 7. Check for failed jobs
    // ========================================================================
    const { data: failedJobs, error: failedError } = await supabase
      .from("document_indexing_jobs")
      .select(`
        document_id,
        error_message,
        started_at,
        documents!inner(name)
      `)
      .eq("status", "failed")
      .order("started_at", { ascending: false })
      .limit(50);

    if (failedError) {
      logger.error("Failed to fetch failed jobs", { error: failedError.message });
    } else {
      for (const job of failedJobs || []) {
        const doc = job.documents as { name: string };
        // Only add if not already in issues (from step 2)
        if (!issues.some(issue => issue.documentId === job.document_id && issue.type === "failed_indexing")) {
          issues.push({
            type: "failed_indexing",
            severity: "high",
            documentId: job.document_id,
            documentName: doc?.name || "Unknown",
            message: `Indexing failed: ${job.error_message || "Unknown error"}`,
            details: {
              errorMessage: job.error_message,
              startedAt: job.started_at,
            },
          });
        }
      }
    }

    // ========================================================================
    // 8. Calculate summary statistics
    // ========================================================================
    const indexedCount = indexedDocuments.length;
    const unindexedCount = unindexedDocuments.length;
    const failedCount = issues.filter(i => i.type === "failed_indexing").length;
    const stuckCount = issues.filter(i => i.type === "stuck_job").length;
    const incompleteCount = issues.filter(i => i.type === "incomplete_chunks").length;
    const missingMetadataCount = issues.filter(i => i.type === "missing_metadata").length;
    const noChunksCount = issues.filter(i => i.type === "no_chunks").length;

    const successRate = totalDocuments > 0 
      ? ((indexedCount - failedCount - noChunksCount) / totalDocuments) * 100 
      : 100;

    // ========================================================================
    // 9. Generate recommendations
    // ========================================================================
    if (failedCount > 0) {
      recommendations.push(`Review ${failedCount} failed indexing jobs and investigate root causes`);
    }
    if (stuckCount > 0) {
      recommendations.push(`Clean up ${stuckCount} stuck jobs - they may need manual intervention or retry`);
    }
    if (noChunksCount > 0) {
      recommendations.push(`CRITICAL: ${noChunksCount} documents marked as indexed have no chunks - re-index these documents`);
    }
    if (incompleteCount > 0) {
      recommendations.push(`Review ${incompleteCount} documents with incomplete chunk indexing`);
    }
    if (unindexedCount > 0) {
      recommendations.push(`Index ${unindexedCount} unindexed documents`);
    }
    if (successRate < 95) {
      recommendations.push(`Indexing success rate (${successRate.toFixed(1)}%) is below target (95%)`);
    }
    if (missingMetadataCount > 0) {
      recommendations.push(`Consider re-indexing ${missingMetadataCount} documents missing structured metadata`);
    }

    const auditResult: AuditResult = {
      timestamp: new Date().toISOString(),
      summary: {
        totalDocuments,
        indexedDocuments: indexedCount,
        unindexedDocuments: unindexedCount,
        failedJobs: failedCount,
        stuckJobs: stuckCount,
        incompleteChunks: incompleteCount,
        missingMetadata: missingMetadataCount,
        successRate: Math.round(successRate * 10) / 10,
      },
      issues,
      recommendations,
    };

    logger.info("Audit complete", { 
      totalIssues: issues.length,
      successRate: auditResult.summary.successRate,
    });

    return new Response(
      JSON.stringify(auditResult, null, 2),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    logger.error("Audit error", { error: error instanceof Error ? error.message : String(error) });
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
