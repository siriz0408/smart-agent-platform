/**
 * Hook for fetching data health metrics
 * Used by PM-Context for monitoring data layer health - document indexing, CRM records, search performance
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface DataHealthMetrics {
  // Document metrics
  total_documents: number;
  indexed_documents: number;
  indexing_success_rate: number;
  documents_with_embeddings: number;
  embedding_coverage_rate: number;
  last_indexing_timestamp: string | null;
  
  // CRM metrics
  total_contacts: number;
  total_properties: number;
  total_deals: number;
  
  // Chunk metrics
  total_chunks: number;
  chunks_with_embeddings: number;
  
  // Data freshness
  oldest_document_created_at: string | null;
  newest_document_created_at: string | null;
  oldest_contact_created_at: string | null;
  newest_contact_created_at: string | null;
  oldest_property_created_at: string | null;
  newest_property_created_at: string | null;
  oldest_deal_created_at: string | null;
  newest_deal_created_at: string | null;
}

/**
 * Hook to fetch data health metrics for the current tenant
 */
export function useDataHealthMetrics() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["data-health-metrics", tenantId],
    queryFn: async (): Promise<DataHealthMetrics | null> => {
      if (!tenantId) {
        return null;
      }

      // Fetch document metrics
      const { data: documents, error: documentsError } = await supabase
        .from("documents")
        .select("id, indexed_at, created_at")
        .eq("tenant_id", tenantId);

      if (documentsError) throw documentsError;

      const totalDocuments = documents?.length || 0;
      const indexedDocuments = documents?.filter(d => d.indexed_at !== null).length || 0;
      const indexingSuccessRate = totalDocuments > 0 
        ? (indexedDocuments / totalDocuments) * 100 
        : 0;

      // Get documents with embeddings (documents that have chunks with embeddings)
      // Use tenant_id directly for better performance (denormalized column)
      const documentIds = documents?.map(d => d.id) || [];
      let documentsWithEmbeddings = 0;
      
      if (documentIds.length > 0) {
        const { data: documentsWithChunks, error: chunksError } = await supabase
          .from("document_chunks")
          .select("document_id, embedding")
          .in("document_id", documentIds);

        if (chunksError) throw chunksError;

        documentsWithEmbeddings = new Set(
          documentsWithChunks
            ?.filter(chunk => chunk.embedding !== null)
            .map(chunk => chunk.document_id) || []
        ).size;
      }

      const embeddingCoverageRate = totalDocuments > 0
        ? (documentsWithEmbeddings / totalDocuments) * 100
        : 0;

      // Get last indexing timestamp
      const indexedDocs = documents?.filter(d => d.indexed_at !== null) || [];
      const lastIndexingTimestamp = indexedDocs.length > 0
        ? indexedDocs.reduce((latest, doc) => {
            const docTime = new Date(doc.indexed_at!).getTime();
            const latestTime = latest ? new Date(latest).getTime() : 0;
            return docTime > latestTime ? doc.indexed_at! : latest;
          }, null as string | null)
        : null;

      // Fetch CRM metrics
      const [contactsResult, propertiesResult, dealsResult] = await Promise.all([
        supabase
          .from("contacts")
          .select("id, created_at, updated_at")
          .eq("tenant_id", tenantId),
        supabase
          .from("properties")
          .select("id, created_at, updated_at")
          .eq("tenant_id", tenantId),
        supabase
          .from("deals")
          .select("id, created_at, updated_at")
          .eq("tenant_id", tenantId),
      ]);

      if (contactsResult.error) throw contactsResult.error;
      if (propertiesResult.error) throw propertiesResult.error;
      if (dealsResult.error) throw dealsResult.error;

      const totalContacts = contactsResult.data?.length || 0;
      const totalProperties = propertiesResult.data?.length || 0;
      const totalDeals = dealsResult.data?.length || 0;

      // Fetch chunk metrics
      const { data: allChunks, error: allChunksError } = await supabase
        .from("document_chunks")
        .select("id, embedding")
        .in("document_id", documents?.map(d => d.id) || []);

      if (allChunksError) throw allChunksError;

      const totalChunks = allChunks?.length || 0;
      const chunksWithEmbeddings = allChunks?.filter(chunk => chunk.embedding !== null).length || 0;

      // Calculate data freshness timestamps
      const getOldestNewest = (items: Array<{ created_at: string }>) => {
        if (!items || items.length === 0) {
          return { oldest: null, newest: null };
        }
        const timestamps = items.map(item => new Date(item.created_at).getTime());
        const oldest = items.find(item => 
          new Date(item.created_at).getTime() === Math.min(...timestamps)
        )?.created_at || null;
        const newest = items.find(item => 
          new Date(item.created_at).getTime() === Math.max(...timestamps)
        )?.created_at || null;
        return { oldest, newest };
      };

      const documentTimestamps = getOldestNewest(documents || []);
      const contactTimestamps = getOldestNewest(contactsResult.data || []);
      const propertyTimestamps = getOldestNewest(propertiesResult.data || []);
      const dealTimestamps = getOldestNewest(dealsResult.data || []);

      return {
        total_documents: totalDocuments,
        indexed_documents: indexedDocuments,
        indexing_success_rate: indexingSuccessRate,
        documents_with_embeddings: documentsWithEmbeddings,
        embedding_coverage_rate: embeddingCoverageRate,
        last_indexing_timestamp: lastIndexingTimestamp,
        total_contacts: totalContacts,
        total_properties: totalProperties,
        total_deals: totalDeals,
        total_chunks: totalChunks,
        chunks_with_embeddings: chunksWithEmbeddings,
        oldest_document_created_at: documentTimestamps.oldest,
        newest_document_created_at: documentTimestamps.newest,
        oldest_contact_created_at: contactTimestamps.oldest,
        newest_contact_created_at: contactTimestamps.newest,
        oldest_property_created_at: propertyTimestamps.oldest,
        newest_property_created_at: propertyTimestamps.newest,
        oldest_deal_created_at: dealTimestamps.oldest,
        newest_deal_created_at: dealTimestamps.newest,
      };
    },
    enabled: !!tenantId,
    refetchInterval: 60000, // Refetch every minute
  });
}

/**
 * Format percentage with color indicator
 */
export function formatHealthPercent(
  percent: number | null
): { value: string; status: "good" | "warning" | "critical" } {
  if (percent === null || percent === undefined) {
    return { value: "N/A", status: "warning" };
  }

  if (percent >= 90) {
    return { value: `${percent.toFixed(1)}%`, status: "good" };
  } else if (percent >= 70) {
    return { value: `${percent.toFixed(1)}%`, status: "warning" };
  } else {
    return { value: `${percent.toFixed(1)}%`, status: "critical" };
  }
}

/**
 * Format timestamp to relative time or date
 */
export function formatTimestamp(timestamp: string | null): string {
  if (!timestamp) return "Never";
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}
