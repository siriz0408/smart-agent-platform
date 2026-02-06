/**
 * Text Processing Utilities for Document Indexing Pipeline
 *
 * Provides comprehensive text cleaning, normalization, and formatting
 * for PDF-extracted text. Specifically tuned for real estate documents
 * (settlements, inspections, contracts, appraisals, disclosures).
 *
 * Created: 2026-02-06 (CTX-004)
 */

// ============================================================================
// TYPES
// ============================================================================

export interface CleaningOptions {
  removeHeaders?: boolean;
  removeFooters?: boolean;
  removePageNumbers?: boolean;
  normalizeTables?: boolean;
  normalizeWhitespace?: boolean;
  normalizeLists?: boolean;
  fixHyphenation?: boolean;
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

/**
 * Clean and normalize extracted text from PDFs and other documents.
 * Applies all cleaning steps in the correct order.
 */
export function cleanExtractedText(
  text: string,
  options?: CleaningOptions,
): string {
  if (!text || text.trim().length === 0) return "";

  const opts: Required<CleaningOptions> = {
    removeHeaders: options?.removeHeaders ?? true,
    removeFooters: options?.removeFooters ?? true,
    removePageNumbers: options?.removePageNumbers ?? true,
    normalizeTables: options?.normalizeTables ?? true,
    normalizeWhitespace: options?.normalizeWhitespace ?? true,
    normalizeLists: options?.normalizeLists ?? true,
    fixHyphenation: options?.fixHyphenation ?? true,
  };

  let cleaned = text;

  // Step 1: Fix hyphenated words split across lines
  if (opts.fixHyphenation) {
    cleaned = fixLineBreakHyphenation(cleaned);
  }

  // Step 2: Remove repeated headers/footers across pages
  if (opts.removeHeaders || opts.removeFooters) {
    cleaned = removeRepeatedHeadersFooters(
      cleaned,
      opts.removeHeaders,
      opts.removeFooters,
    );
  }

  // Step 3: Remove page numbers
  if (opts.removePageNumbers) {
    cleaned = removePageNumbers(cleaned);
  }

  // Step 4: Normalize table-like content
  if (opts.normalizeTables) {
    cleaned = normalizeTableFormatting(cleaned);
  }

  // Step 5: Normalize bullet points and numbered lists
  if (opts.normalizeLists) {
    cleaned = normalizeLists(cleaned);
  }

  // Step 6: Normalize whitespace (always last)
  if (opts.normalizeWhitespace) {
    cleaned = normalizeWhitespace(cleaned);
  }

  return cleaned.trim();
}

// ============================================================================
// HYPHENATION FIX
// ============================================================================

/**
 * Rejoin words that were split across lines with a hyphen.
 * E.g., "inspec-\ntion" becomes "inspection"
 * Only rejoins when the second part starts with a lowercase letter.
 */
export function fixLineBreakHyphenation(text: string): string {
  return text.replace(/(\w+)-\s*\n\s*([a-z])/g, "$1$2");
}

// ============================================================================
// HEADER / FOOTER REMOVAL
// ============================================================================

/**
 * Normalize a line for comparison purposes.
 */
function normalizeLine(line: string): string {
  return line
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/page\s*\d+\s*(of\s*\d+)?/gi, "")
    .replace(/\d+/g, "#")
    .trim();
}

/**
 * Detect and remove repeated headers/footers across pages.
 *
 * Strategy: Split by page markers, find lines that appear on most pages
 * (within the first/last N lines of each page), and remove them.
 */
export function removeRepeatedHeadersFooters(
  text: string,
  removeHeaders: boolean,
  removeFooters: boolean,
): string {
  const pageBreakPattern = /\n*---\s*Page\s*Break\s*---\n*/i;
  const pageHeaderPattern = /^\[Page \d+\]\n?/;

  const rawPages = text.split(pageBreakPattern);

  if (rawPages.length < 3) {
    return text;
  }

  const pages: string[][] = [];
  for (const rawPage of rawPages) {
    const page = rawPage.replace(pageHeaderPattern, "").trim();
    if (page.length < 10) continue;
    const lines = page
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length > 0) {
      pages.push(lines);
    }
  }

  if (pages.length < 3) return text;

  const HEADER_LINES = 3;
  const FOOTER_LINES = 3;
  const MIN_OCCURRENCE_RATIO = 0.6;

  const repeatedHeaders: Set<string> = new Set();
  const repeatedFooters: Set<string> = new Set();

  if (removeHeaders) {
    const headerCandidates: Map<string, number> = new Map();
    for (const pageLines of pages) {
      const headerSlice = pageLines.slice(
        0,
        Math.min(HEADER_LINES, pageLines.length),
      );
      for (const line of headerSlice) {
        const normalized = normalizeLine(line);
        if (normalized.length < 5) continue;
        headerCandidates.set(
          normalized,
          (headerCandidates.get(normalized) || 0) + 1,
        );
      }
    }

    for (const [line, count] of headerCandidates) {
      if (count / pages.length >= MIN_OCCURRENCE_RATIO) {
        repeatedHeaders.add(line);
      }
    }
  }

  if (removeFooters) {
    const footerCandidates: Map<string, number> = new Map();
    for (const pageLines of pages) {
      const footerSlice = pageLines.slice(
        -Math.min(FOOTER_LINES, pageLines.length),
      );
      for (const line of footerSlice) {
        const normalized = normalizeLine(line);
        if (normalized.length < 5) continue;
        footerCandidates.set(
          normalized,
          (footerCandidates.get(normalized) || 0) + 1,
        );
      }
    }

    for (const [line, count] of footerCandidates) {
      if (count / pages.length >= MIN_OCCURRENCE_RATIO) {
        repeatedFooters.add(line);
      }
    }
  }

  if (repeatedHeaders.size === 0 && repeatedFooters.size === 0) {
    return text;
  }

  const lines = text.split("\n");
  const filtered = lines.filter((line) => {
    const normalized = normalizeLine(line.trim());
    if (repeatedHeaders.has(normalized)) return false;
    if (repeatedFooters.has(normalized)) return false;
    return true;
  });

  return filtered.join("\n");
}

// ============================================================================
// PAGE NUMBER REMOVAL
// ============================================================================

/**
 * Remove common page number patterns from text.
 * Handles: "Page 1 of 10", "- 1 -", "1", "Page 1", "[Page 1]", "(1)"
 */
export function removePageNumbers(text: string): string {
  const lines = text.split("\n");
  const cleaned = lines.map((line) => {
    const trimmed = line.trim();

    // Skip lines with substantial content
    if (trimmed.length > 20) return line;

    // Pattern: "[Page N]"
    if (/^\[Page\s+\d+\]$/.test(trimmed)) return "";

    // Pattern: "Page N of M" or "Page N"
    if (/^page\s+\d+(\s+of\s+\d+)?\.?$/i.test(trimmed)) return "";

    // Pattern: "- N -"
    if (/^-\s*\d+\s*-$/.test(trimmed)) return "";

    // Pattern: standalone number
    if (/^\d{1,4}$/.test(trimmed)) return "";

    // Pattern: "(N)"
    if (/^\(\s*\d{1,4}\s*\)$/.test(trimmed)) return "";

    return line;
  });

  return cleaned.join("\n");
}

// ============================================================================
// TABLE FORMATTING
// ============================================================================

/**
 * Detect and normalize table-like content in extracted text.
 *
 * PDF tables often lose their structure. This attempts to:
 * 1. Detect rows with dot leaders (common in settlement statements)
 * 2. Normalize label-value pairs separated by wide spaces
 * 3. Clean up table divider rows
 */
export function normalizeTableFormatting(text: string): string {
  const lines = text.split("\n");
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect dot leaders: "Settlement Charges ......... $1,234.56"
    if (/\.{3,}\s*\$?[\d,]+\.?\d*$/.test(line)) {
      const cleaned = line
        .replace(/\s*\.{3,}\s*/g, " ... ")
        .replace(/\s+/g, " ")
        .trim();
      result.push(cleaned);
      continue;
    }

    // Detect label-value pairs: "Description   $Amount"
    const labelValueMatch = line
      .trim()
      .match(/^(.+?)\s{3,}(\$?\s*[\d,]+\.?\d*)\s*$/);
    if (labelValueMatch) {
      const label = labelValueMatch[1].trim();
      const value = labelValueMatch[2].trim();
      result.push(`${label}: ${value}`);
      continue;
    }

    // Detect table divider rows
    if (/^[\s\-=_]{10,}$/.test(line)) {
      result.push("---");
      continue;
    }

    result.push(line);
  }

  return result.join("\n");
}

// ============================================================================
// BULLET & LIST NORMALIZATION
// ============================================================================

/**
 * Normalize bullet points and numbered lists to a consistent format.
 */
export function normalizeLists(text: string): string {
  const lines = text.split("\n");
  const result: string[] = [];

  for (const line of lines) {
    let processed = line;

    // Normalize Unicode bullet characters to standard "- "
    processed = processed.replace(
      /^(\s*)[^\w\s\-#()[\]"'.,:;!?@&$/\\<>{}=+~`|^%*]\s*/,
      (match, indent) => {
        // Only replace if the character looks like a bullet
        const bulletChars =
          "\u2022\u25CB\u25A0\u25AA\u25BA\u2023\u25E6\u25CF\u25C6\u25C7\u2605\u2606\u2192\u2B9E";
        const firstNonSpace = match.trim()[0];
        if (bulletChars.includes(firstNonSpace)) {
          return indent + "- ";
        }
        return match;
      },
    );

    // Normalize double-dash bullets "-- item" to "- item"
    processed = processed.replace(/^(\s*)--\s+/, "$1- ");

    // Normalize "* " bullets (when used as list items)
    processed = processed.replace(/^(\s*)\*\s+(?!\*)/, "$1- ");

    result.push(processed);
  }

  return result.join("\n");
}

// ============================================================================
// WHITESPACE NORMALIZATION
// ============================================================================

/**
 * Normalize whitespace in extracted text:
 * - Collapse multiple consecutive blank lines to max 2
 * - Remove trailing whitespace from each line
 * - Collapse multiple spaces within a line (preserve indentation and tables)
 * - Clean up around page break markers
 */
export function normalizeWhitespace(text: string): string {
  let cleaned = text;

  // Remove trailing whitespace on each line
  cleaned = cleaned.replace(/[^\S\n]+$/gm, "");

  // Collapse multiple spaces mid-line (preserve leading indentation)
  cleaned = cleaned.replace(
    /^(\s*)(.*)$/gm,
    (_match: string, indent: string, content: string) => {
      // Don't collapse spaces in table-like rows
      if (/\$\s*[\d,]+/.test(content) || /\.{3,}/.test(content)) {
        return indent + content;
      }
      const normalized = content.replace(/ {2,}/g, " ");
      return indent + normalized;
    },
  );

  // Collapse 3+ consecutive newlines into 2
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  // Clean up around page break markers
  cleaned = cleaned.replace(
    /\n*---\s*Page\s*Break\s*---\n*/gi,
    "\n\n--- Page Break ---\n\n",
  );

  return cleaned;
}

// ============================================================================
// REAL ESTATE SECTION DETECTION
// ============================================================================

/**
 * Common section headers found in real estate documents.
 * Used by both text cleaning and smart chunking.
 */
export const REAL_ESTATE_SECTIONS: Record<string, readonly string[]> = {
  settlement: [
    "SETTLEMENT CHARGES",
    "CLOSING COSTS",
    "SUMMARY OF BORROWER'S TRANSACTION",
    "SUMMARY OF SELLER'S TRANSACTION",
    "LOAN CHARGES",
    "IMPOUNDS",
    "TITLE CHARGES",
    "GOVERNMENT RECORDING",
    "ADDITIONAL CHARGES",
    "TOTAL SETTLEMENT CHARGES",
    "ADJUSTMENTS",
    "PRORATIONS",
    "COMMISSION",
    "REAL ESTATE COMMISSION",
    "PAYOFF STATEMENT",
    "DISBURSEMENT",
    "NET PROCEEDS",
    "CASH FROM BORROWER",
    "CASH TO SELLER",
  ],
  inspection: [
    "ROOF",
    "ROOFING",
    "EXTERIOR",
    "EXTERIOR WALLS",
    "INTERIOR",
    "INTERIOR WALLS",
    "PLUMBING",
    "PLUMBING SYSTEM",
    "ELECTRICAL",
    "ELECTRICAL SYSTEM",
    "HVAC",
    "HEATING AND COOLING",
    "HEATING",
    "AIR CONDITIONING",
    "FOUNDATION",
    "STRUCTURAL",
    "STRUCTURAL COMPONENTS",
    "ATTIC",
    "ATTIC AND INSULATION",
    "BASEMENT",
    "CRAWL SPACE",
    "KITCHEN",
    "BATHROOMS",
    "BATHROOM",
    "GARAGE",
    "FIREPLACE",
    "WINDOWS AND DOORS",
    "WATER HEATER",
    "APPLIANCES",
    "GRADING AND DRAINAGE",
    "PEST AND DRY ROT",
    "POOL AND SPA",
    "SAFETY CONCERNS",
    "SUMMARY OF FINDINGS",
    "RECOMMENDATIONS",
    "INSPECTION RESULTS",
    "DEFICIENCIES",
  ],
  contract: [
    "PURCHASE PRICE",
    "EARNEST MONEY",
    "FINANCING",
    "FINANCING CONTINGENCY",
    "INSPECTION CONTINGENCY",
    "APPRAISAL CONTINGENCY",
    "TITLE AND SURVEY",
    "CLOSING",
    "CLOSING DATE",
    "POSSESSION",
    "PROPERTY CONDITION",
    "CONTINGENCIES",
    "SPECIAL PROVISIONS",
    "ADDITIONAL TERMS",
    "DEFAULT",
    "MEDIATION",
    "ARBITRATION",
    "DISCLOSURES",
    "INCLUDED ITEMS",
    "EXCLUDED ITEMS",
    "WARRANTIES",
    "RISK OF LOSS",
    "SELLER'S OBLIGATIONS",
    "BUYER'S OBLIGATIONS",
    "SIGNATURES",
  ],
  appraisal: [
    "SUBJECT PROPERTY",
    "PROPERTY DESCRIPTION",
    "NEIGHBORHOOD",
    "NEIGHBORHOOD ANALYSIS",
    "SITE DESCRIPTION",
    "IMPROVEMENTS",
    "IMPROVEMENT DESCRIPTION",
    "COST APPROACH",
    "SALES COMPARISON APPROACH",
    "INCOME APPROACH",
    "COMPARABLE SALES",
    "COMPARABLE SALE",
    "RECONCILIATION",
    "MARKET VALUE",
    "ESTIMATED VALUE",
    "APPRAISED VALUE",
    "SCOPE OF WORK",
    "INTENDED USE",
    "HIGHEST AND BEST USE",
    "ZONING",
    "ASSUMPTIONS AND LIMITING CONDITIONS",
    "CERTIFICATION",
    "ADDENDA",
  ],
  disclosure: [
    "PROPERTY CONDITION",
    "STRUCTURAL",
    "ROOF",
    "PLUMBING",
    "ELECTRICAL",
    "WATER AND SEWER",
    "HEATING AND COOLING",
    "ENVIRONMENTAL",
    "LEAD-BASED PAINT",
    "ASBESTOS",
    "MOLD",
    "RADON",
    "FLOOD ZONE",
    "HOMEOWNERS ASSOCIATION",
    "HOA",
    "KNOWN DEFECTS",
    "MATERIAL FACTS",
    "PREVIOUS REPAIRS",
    "INSURANCE CLAIMS",
    "BOUNDARY AND ACCESS",
    "ZONING VIOLATIONS",
    "SELLER DISCLOSURE",
    "PROPERTY DISCLOSURE",
    "SELLER'S DISCLOSURE",
  ],
};

/**
 * Build a regex pattern to split text by real estate section headers.
 * Returns a pattern that matches lines consisting of known section headers.
 */
export function buildSectionPattern(documentType: string): RegExp | null {
  const sections = REAL_ESTATE_SECTIONS[documentType];
  if (!sections) return null;

  const escaped = sections.map((s) =>
    s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );

  // Match section header lines with optional numbering prefix
  const pattern = new RegExp(
    `\\n(?=(?:\\d+\\.?\\s+|[A-Z]\\.?\\s+|[IVXLC]+\\.?\\s+)?(?:${escaped.join("|")})\\s*(?::|$))`,
    "gi",
  );

  return pattern;
}

// ============================================================================
// MULTI-COLUMN LAYOUT DETECTION
// ============================================================================

/**
 * Detect if text items from a PDF page are arranged in multiple columns.
 *
 * @param items Array of text items with transform data
 * @param pageWidth Approximate page width (default 612 for letter size)
 * @returns Array of column boundary x-positions, or null if single column
 */
export function detectColumns(
  items: Array<{ str: string; transform?: number[] }>,
  pageWidth = 612,
): number[] | null {
  if (items.length < 10) return null;

  const xPositions: number[] = [];
  for (const item of items) {
    if (item.str?.trim() && item.transform) {
      xPositions.push(Math.round(item.transform[4]));
    }
  }

  if (xPositions.length < 10) return null;

  // Build histogram of x-positions
  const bucketSize = 10;
  const histogram: Map<number, number> = new Map();
  for (const x of xPositions) {
    const bucket = Math.round(x / bucketSize) * bucketSize;
    histogram.set(bucket, (histogram.get(bucket) || 0) + 1);
  }

  // Find peaks
  const avgCount = xPositions.length / histogram.size;
  const significantBuckets = Array.from(histogram.entries())
    .filter(([_, count]) => count > avgCount * 1.5)
    .map(([bucket]) => bucket)
    .sort((a, b) => a - b);

  if (significantBuckets.length >= 2) {
    const midPoint = pageWidth / 2;
    const leftBuckets = significantBuckets.filter((b) => b < midPoint - 20);
    const rightBuckets = significantBuckets.filter((b) => b > midPoint - 20);

    if (leftBuckets.length > 0 && rightBuckets.length > 0) {
      const leftMost = leftBuckets[0];
      const splitX = Math.round(
        (leftBuckets[leftBuckets.length - 1] + rightBuckets[0]) / 2,
      );
      return [leftMost, splitX];
    }
  }

  return null;
}

/**
 * Reorder text items from a multi-column layout into reading order.
 * Reads left column top-to-bottom first, then right column top-to-bottom.
 */
export function reorderMultiColumnItems(
  items: Array<{ str: string; transform?: number[] }>,
  columnBoundaries: number[],
): Array<{ str: string; transform?: number[] }> {
  const splitX = columnBoundaries[1];

  const leftColumn: typeof items = [];
  const rightColumn: typeof items = [];

  for (const item of items) {
    if (!item.str?.trim() || !item.transform) continue;
    const x = item.transform[4];
    if (x < splitX) {
      leftColumn.push(item);
    } else {
      rightColumn.push(item);
    }
  }

  const sortByY = (
    a: (typeof items)[0],
    b: (typeof items)[0],
  ) => {
    const ay = a.transform ? a.transform[5] : 0;
    const by = b.transform ? b.transform[5] : 0;
    return by - ay;
  };

  leftColumn.sort(sortByY);
  rightColumn.sort(sortByY);

  return [...leftColumn, ...rightColumn];
}
