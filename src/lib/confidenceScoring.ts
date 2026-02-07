/**
 * Confidence scoring system for AI responses.
 *
 * Determines how confident the AI's answer is based on:
 *  1. Whether RAG (document search) was used
 *  2. Number of unique document sources cited in the response
 *  3. Whether the user provided specific entity mentions or document context
 */

export type ConfidenceLevel = "high" | "medium" | "low";

export interface ConfidenceMetadata {
  /** Overall confidence level */
  level: ConfidenceLevel;
  /** Number of unique document sources cited in the response */
  sourceCount: number;
  /** Names of cited documents (de-duplicated) */
  sourceNames: string[];
  /** Whether the response was informed by RAG (document search) */
  ragUsed: boolean;
  /** Whether entity mentions were provided for context */
  hadMentions: boolean;
  /** Short description for display */
  label: string;
}

/**
 * Citation patterns the AI uses when referencing documents:
 *   [Source: filename, page X]
 *   [Source: filename]
 *   (Source: filename, page X)
 */
const CITATION_PATTERNS = [
  /\[Source:\s*([^\],]+?)(?:,\s*page\s*\d+)?\]/gi,
  /\(Source:\s*([^),]+?)(?:,\s*page\s*\d+)?\)/gi,
  // Also match markdown-style doc references
  /\*\*Document\s+\d+:\s*([^*]+)\*\*/gi,
];

/**
 * Extract unique document source names from an AI response.
 */
export function extractSources(content: string): string[] {
  const sources = new Set<string>();

  for (const pattern of CITATION_PATTERNS) {
    // Reset lastIndex for global regex
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      const name = match[1].trim();
      if (name) {
        sources.add(name);
      }
    }
  }

  return Array.from(sources);
}

/**
 * Compute the confidence metadata for an AI response.
 *
 * @param content     - The full text of the AI response
 * @param ragUsed     - Whether document search was performed (tracked via status updates)
 * @param hadMentions - Whether the user included @-mentions or document references
 */
export function computeConfidence(
  content: string,
  ragUsed: boolean,
  hadMentions: boolean,
): ConfidenceMetadata {
  const sourceNames = extractSources(content);
  const sourceCount = sourceNames.length;

  let level: ConfidenceLevel;
  let label: string;

  if (ragUsed && sourceCount >= 2) {
    // Multiple documents cited → high confidence
    level = "high";
    label = `Based on ${sourceCount} documents`;
  } else if (ragUsed && sourceCount === 1) {
    // Single document cited → high confidence
    level = "high";
    label = "Based on 1 document";
  } else if (ragUsed && sourceCount === 0) {
    // RAG was used but no citations found in the response text.
    // The AI may have summarised without explicit citations.
    level = "medium";
    label = "Based on your documents";
  } else if (hadMentions) {
    // User provided mentions but no RAG search was triggered
    level = "medium";
    label = "Based on provided context";
  } else {
    // Pure general knowledge
    level = "low";
    label = "General knowledge";
  }

  return {
    level,
    sourceCount,
    sourceNames,
    ragUsed,
    hadMentions,
    label,
  };
}
