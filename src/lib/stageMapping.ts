/**
 * Stage Mapping Utility
 * 
 * Converts CRM pipeline stages to journey UI stages.
 * The CRM uses simplified stages (lead, showing, offer, etc.)
 * while the journey UI uses more descriptive stages (browsing, touring, offer_submitted, etc.)
 */

// Maps CRM pipeline stages to buyer journey UI stages
const BUYER_PIPELINE_TO_JOURNEY: Record<string, string> = {
  lead: "browsing",
  contacted: "interested",
  showing: "touring",
  offer: "offer_submitted",
  under_contract: "under_contract",
  closed: "closed",
};

// Maps CRM pipeline stages to seller journey UI stages
const SELLER_PIPELINE_TO_JOURNEY: Record<string, string> = {
  lead: "preparing",
  contacted: "listed",
  listing: "listed",
  active: "showing",
  showing: "showing",
  offer: "offer_received",
  under_contract: "under_contract",
  closed: "closed",
};

/**
 * Converts a CRM pipeline stage to the corresponding journey UI stage
 * @param pipelineStage - The stage from the deals table
 * @param dealType - "buyer" or "seller"
 * @returns The mapped journey stage key, or the original if no mapping exists
 */
export function mapPipelineToJourneyStage(
  pipelineStage: string | null | undefined,
  dealType: "buyer" | "seller"
): string | null {
  if (!pipelineStage) return null;
  
  const mapping = dealType === "buyer" 
    ? BUYER_PIPELINE_TO_JOURNEY 
    : SELLER_PIPELINE_TO_JOURNEY;
  
  return mapping[pipelineStage] ?? pipelineStage;
}
