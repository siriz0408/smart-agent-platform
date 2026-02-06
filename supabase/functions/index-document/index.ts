import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logger } from "../_shared/logger.ts";
import { AI_CONFIG, getAIApiKey, getAnthropicHeaders, callAnthropicAPI, extractTextFromResponse } from "../_shared/ai-config.ts";
import { requireEnv } from "../_shared/validateEnv.ts";
import { checkRateLimit, rateLimitResponse, DOCUMENT_INDEX_LIMITS } from "../_shared/rateLimit.ts";
import {
  cleanExtractedText,
  detectColumns,
  reorderMultiColumnItems,
  buildSectionPattern,
} from "../_shared/text-processing.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GetDocumentFn = (options: { data: Uint8Array }) => { promise: Promise<any> };

async function initPdfJs(): Promise<GetDocumentFn> {
  const pdfjs = await import("https://esm.sh/pdfjs-serverless@0.5.0");
  // pdfjs-serverless exports resolvePDFJS which returns the module
  const module = await pdfjs.resolvePDFJS();
  return module.getDocument as GetDocumentFn;
}
import { getCorsHeaders } from "../_shared/cors.ts";

// Size limits
const SIZE_LIMIT_MAX = 20 * 1024 * 1024; // 20MB max file size

// Chunking configuration
const CHUNK_SIZE = 2000;
const CHUNK_OVERLAP = 200;
const MAX_CHUNKS = 100;

// Document type definitions
type DocumentType = "settlement" | "inspection" | "contract" | "appraisal" | "disclosure" | "general";

// ============================================================================
// PDF TEXT EXTRACTION (Using pdfjs-serverless)
// ============================================================================

/** Type for text items returned by pdfjs getTextContent() */
type PdfTextItem = { str: string; transform?: number[]; width?: number; height?: number };

/**
 * Extract text from a single PDF page, preserving structure.
 * Handles multi-column layouts by detecting column boundaries and reading
 * left-to-right, top-to-bottom within each column.
 */
function extractPageText(
  items: PdfTextItem[],
): string {
  if (items.length === 0) return "";

  // Check for multi-column layout
  const columns = detectColumns(items);

  // Reorder items if multi-column detected
  const orderedItems = columns
    ? reorderMultiColumnItems(items, columns)
    : items;

  // Group items by y-position to reconstruct lines
  // Use a tolerance bucket to group items on the same visual line
  const Y_TOLERANCE = 3;
  const lineMap: Map<number, { x: number; text: string }[]> = new Map();

  for (const item of orderedItems) {
    if (!item.str || !item.str.trim()) continue;
    const yRaw = item.transform ? item.transform[5] : 0;
    const xPos = item.transform ? item.transform[4] : 0;
    // Bucket y-positions so items within tolerance land on the same line
    const yBucket = Math.round(yRaw / Y_TOLERANCE) * Y_TOLERANCE;

    if (!lineMap.has(yBucket)) {
      lineMap.set(yBucket, []);
    }
    lineMap.get(yBucket)!.push({ x: xPos, text: item.str });
  }

  // Sort lines top-to-bottom (descending y in PDF coordinates)
  const sortedLines = Array.from(lineMap.entries())
    .sort((a, b) => b[0] - a[0]);

  const resultLines: string[] = [];

  for (const [_, lineItems] of sortedLines) {
    // Sort items within each line left-to-right
    lineItems.sort((a, b) => a.x - b.x);

    // Reconstruct line text, inserting tab separators for large gaps
    // (preserves table-like structures where columns are spaced apart)
    let lineText = "";
    let prevRight = -1;

    for (const item of lineItems) {
      if (prevRight >= 0) {
        const gap = item.x - prevRight;
        if (gap > 30) {
          // Large gap suggests a table column separator
          lineText += "\t";
        } else if (gap > 3) {
          lineText += " ";
        }
      }
      lineText += item.text;
      // Estimate right edge (rough: x + text-length-based width)
      prevRight = item.x + (item.text.length * 5);
    }

    const trimmed = lineText.trim();
    if (trimmed.length > 0) {
      resultLines.push(trimmed);
    }
  }

  return resultLines.join("\n");
}

/**
 * Extract text from a PDF file with improved handling:
 * - Multi-column layout detection and reordering
 * - Table structure preservation via tab separators
 * - Page-level error resilience (skips corrupted pages)
 * - Consistent page markers for downstream processing
 */
async function extractTextFromPDF(fileData: Blob): Promise<string> {
  let getDocument: GetDocumentFn;
  try {
    getDocument = await initPdfJs();
  } catch (initError) {
    logger.error("Failed to initialize pdfjs", {
      error: initError instanceof Error ? initError.message : String(initError),
    });
    throw new Error("PDF processing library failed to initialize");
  }

  let arrayBuffer: ArrayBuffer;
  try {
    arrayBuffer = await fileData.arrayBuffer();
  } catch (bufferError) {
    logger.error("Failed to read PDF file data", {
      error: bufferError instanceof Error ? bufferError.message : String(bufferError),
    });
    throw new Error("Failed to read PDF file data");
  }

  // Validate that we have actual PDF data
  const header = new Uint8Array(arrayBuffer.slice(0, 5));
  const headerStr = String.fromCharCode(...header);
  if (headerStr !== "%PDF-" && arrayBuffer.byteLength > 0) {
    logger.warn("File does not appear to be a valid PDF", { header: headerStr });
    // Continue anyway - pdfjs may still handle it
  }

  let pdfDocument;
  try {
    pdfDocument = await getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  } catch (parseError) {
    logger.error("Failed to parse PDF structure", {
      error: parseError instanceof Error ? parseError.message : String(parseError),
    });
    throw new Error(
      `Failed to parse PDF: ${parseError instanceof Error ? parseError.message : "File may be corrupted or password-protected"}`
    );
  }

  const pages: string[] = [];
  const numPages = pdfDocument.numPages;
  let pagesWithErrors = 0;

  logger.debug("PDF page count", { numPages });

  for (let i = 1; i <= numPages; i++) {
    try {
      const page = await pdfDocument.getPage(i);
      const textContent = await page.getTextContent();
      const items = textContent.items as PdfTextItem[];

      const pageText = extractPageText(items);

      if (pageText.trim()) {
        pages.push(`[Page ${i}]\n${pageText}`);
      }
    } catch (pageError) {
      pagesWithErrors++;
      logger.error("Error extracting page", {
        page: i,
        totalPages: numPages,
        error: pageError instanceof Error ? pageError.message : String(pageError),
      });
      // Add a placeholder so page numbering stays consistent
      pages.push(`[Page ${i}]\n[Error: Could not extract text from this page]`);
    }
  }

  // If all pages failed, throw
  if (pagesWithErrors === numPages && numPages > 0) {
    throw new Error(
      `Failed to extract text from all ${numPages} pages. The PDF may be scanned images or encrypted.`
    );
  }

  if (pagesWithErrors > 0) {
    logger.warn("Some pages had extraction errors", {
      pagesWithErrors,
      totalPages: numPages,
      successRate: `${(((numPages - pagesWithErrors) / numPages) * 100).toFixed(1)}%`,
    });
  }

  return pages.join("\n\n--- Page Break ---\n\n");
}

// ============================================================================
// TEXT EXTRACTION FOR OTHER FORMATS
// ============================================================================

function extractTextFromBytes(buffer: ArrayBuffer, fileType: string): string {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  } catch {
    text = "";
  }
  
  // For DOCX/DOC files, clean up XML-like content
  if (fileType?.includes("word") || fileType?.includes("document")) {
    // Extract text between tags
    const cleanText = text
      .replace(/<[^>]+>/g, " ")
      .replace(/[^\x20-\x7E\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return cleanText;
  }
  
  // For plain text, return as-is
  return text;
}

// ============================================================================
// DOCUMENT TYPE DETECTION
// ============================================================================

function detectDocumentType(text: string, filename: string): DocumentType {
  const lowerText = text.toLowerCase();
  const lowerName = filename.toLowerCase();
  
  // Settlement/Closing documents
  if (
    lowerText.includes("alta") ||
    lowerText.includes("settlement statement") ||
    lowerText.includes("hud-1") ||
    lowerText.includes("closing disclosure") ||
    lowerText.includes("disbursement") ||
    lowerText.includes("net proceeds") ||
    lowerName.includes("settlement") ||
    lowerName.includes("closing")
  ) {
    return "settlement";
  }
  
  // Inspection reports
  if (
    lowerText.includes("home inspection") ||
    lowerText.includes("property inspection") ||
    lowerText.includes("inspector") ||
    lowerText.includes("condition report") ||
    lowerText.includes("deficiency") ||
    lowerName.includes("inspection")
  ) {
    return "inspection";
  }
  
  // Purchase contracts
  if (
    lowerText.includes("purchase agreement") ||
    lowerText.includes("purchase contract") ||
    lowerText.includes("real estate contract") ||
    lowerText.includes("earnest money") ||
    lowerText.includes("buyer agrees") ||
    lowerText.includes("seller agrees") ||
    lowerName.includes("contract") ||
    lowerName.includes("purchase")
  ) {
    return "contract";
  }
  
  // Appraisals
  if (
    lowerText.includes("appraisal") ||
    lowerText.includes("market value") ||
    lowerText.includes("comparable sales") ||
    lowerText.includes("subject property") ||
    lowerName.includes("appraisal")
  ) {
    return "appraisal";
  }
  
  // Disclosures
  if (
    lowerText.includes("seller's disclosure") ||
    lowerText.includes("property disclosure") ||
    lowerText.includes("lead-based paint") ||
    lowerText.includes("known defects") ||
    lowerName.includes("disclosure")
  ) {
    return "disclosure";
  }
  
  return "general";
}

// ============================================================================
// PAGE NUMBER EXTRACTION FOR CHUNK METADATA
// ============================================================================

/**
 * Determine which page(s) a chunk of text comes from based on [Page N] markers.
 * Returns { startPage, endPage } or null if no page markers found.
 */
function getChunkPageRange(chunkText: string): { startPage: number; endPage: number } | null {
  const pageMatches = Array.from(chunkText.matchAll(/\[Page\s+(\d+)\]/g));
  if (pageMatches.length === 0) return null;

  const pages = pageMatches.map((m) => parseInt(m[1], 10));
  return {
    startPage: Math.min(...pages),
    endPage: Math.max(...pages),
  };
}

// ============================================================================
// SMART CHUNKING (Semantic boundaries with page metadata)
// ============================================================================

/** Chunk with associated metadata */
interface ChunkWithMeta {
  content: string;
  pageStart: number | null;
  pageEnd: number | null;
  sectionHeader: string | null;
}

/**
 * Smart chunk text based on document type.
 * Uses domain-specific section headers from REAL_ESTATE_SECTIONS when available.
 * Preserves page number metadata for each chunk.
 */
function smartChunkText(text: string, documentType: DocumentType): ChunkWithMeta[] {
  if (!text || text.length === 0) {
    return [];
  }

  // Use the domain-specific section pattern from text-processing if available
  const sectionPattern = buildSectionPattern(documentType);

  // For document types with known section patterns, use section-aware chunking
  if (sectionPattern && (documentType === "settlement" || documentType === "contract" || documentType === "appraisal" || documentType === "disclosure")) {
    return chunkBySectionHeaders(text, sectionPattern);
  }

  // For inspection reports, use dedicated inspection chunker (more patterns)
  if (documentType === "inspection") {
    const inspectionPattern = buildSectionPattern("inspection");
    return chunkByInspectionSections(text, inspectionPattern);
  }

  // Default: paragraph-aware chunking
  return chunkByParagraphs(text);
}

/**
 * Chunk by known real estate section headers.
 * Falls back to page-break boundaries, then paragraph chunking.
 */
function chunkBySectionHeaders(text: string, sectionPattern: RegExp): ChunkWithMeta[] {
  const chunks: ChunkWithMeta[] = [];

  // First split by page breaks
  const pages = text.split(/\n*---\s*Page\s*Break\s*---\n*/i);

  for (const page of pages) {
    if (page.trim().length < 50) continue;

    // If page is small enough, keep as one chunk
    if (page.length <= CHUNK_SIZE) {
      const pageRange = getChunkPageRange(page);
      chunks.push({
        content: page.trim(),
        pageStart: pageRange?.startPage ?? null,
        pageEnd: pageRange?.endPage ?? null,
        sectionHeader: null,
      });
      continue;
    }

    // Split by domain-specific section headers
    const sections = page.split(sectionPattern);

    let currentChunk = "";
    let currentHeader: string | null = null;

    for (const section of sections) {
      // Detect if section starts with a header
      const headerMatch = section.trim().match(/^([A-Z][A-Z\s']{3,})/);
      const header = headerMatch ? headerMatch[1].trim() : null;

      if ((currentChunk.length + section.length) <= CHUNK_SIZE) {
        if (!currentHeader && header) currentHeader = header;
        currentChunk += (currentChunk ? "\n\n" : "") + section;
      } else {
        if (currentChunk.trim()) {
          const pageRange = getChunkPageRange(currentChunk);
          chunks.push({
            content: currentChunk.trim(),
            pageStart: pageRange?.startPage ?? null,
            pageEnd: pageRange?.endPage ?? null,
            sectionHeader: currentHeader,
          });
        }

        if (section.length > CHUNK_SIZE) {
          const subChunks = chunkByParagraphs(section);
          // Inherit section header for sub-chunks
          for (const sub of subChunks) {
            sub.sectionHeader = sub.sectionHeader || header;
          }
          chunks.push(...subChunks);
          currentChunk = "";
          currentHeader = null;
        } else {
          currentChunk = section;
          currentHeader = header;
        }
      }
    }
    if (currentChunk.trim()) {
      const pageRange = getChunkPageRange(currentChunk);
      chunks.push({
        content: currentChunk.trim(),
        pageStart: pageRange?.startPage ?? null,
        pageEnd: pageRange?.endPage ?? null,
        sectionHeader: currentHeader,
      });
    }
  }

  return chunks.filter((c) => c.content.length > 50).slice(0, MAX_CHUNKS);
}

/**
 * Chunk inspection reports by system/area sections.
 * Uses both pattern-based and keyword-based section detection.
 */
function chunkByInspectionSections(text: string, sectionPattern: RegExp | null): ChunkWithMeta[] {
  const chunks: ChunkWithMeta[] = [];

  // Use the section pattern from text-processing, plus numbered sections
  const patterns: RegExp[] = [];
  if (sectionPattern) patterns.push(sectionPattern);
  patterns.push(/\n(?=\d+\.\d*\s+[A-Z])/g);

  let sections = [text];

  for (const pattern of patterns) {
    const newSections: string[] = [];
    for (const section of sections) {
      const splits = section.split(pattern);
      newSections.push(...splits);
    }
    sections = newSections;
  }

  for (const section of sections) {
    if (section.trim().length < 50) continue;

    if (section.length <= CHUNK_SIZE) {
      const pageRange = getChunkPageRange(section);
      const headerMatch = section.trim().match(/^([A-Z][A-Z\s]{3,})/);
      chunks.push({
        content: section.trim(),
        pageStart: pageRange?.startPage ?? null,
        pageEnd: pageRange?.endPage ?? null,
        sectionHeader: headerMatch ? headerMatch[1].trim() : null,
      });
    } else {
      const subChunks = chunkByParagraphs(section);
      chunks.push(...subChunks);
    }
  }

  return chunks.filter((c) => c.content.length > 50).slice(0, MAX_CHUNKS);
}

/**
 * Default paragraph-aware chunking.
 * Splits by paragraphs, then sentences, preserving page metadata.
 */
function chunkByParagraphs(text: string): ChunkWithMeta[] {
  const chunks: ChunkWithMeta[] = [];

  const paragraphs = text.split(/\n\n+/);
  let currentChunk = "";

  for (const para of paragraphs) {
    const trimmedPara = para.trim();
    if (!trimmedPara) continue;

    if ((currentChunk.length + trimmedPara.length + 2) <= CHUNK_SIZE) {
      currentChunk += (currentChunk ? "\n\n" : "") + trimmedPara;
    } else {
      if (currentChunk.trim()) {
        const pageRange = getChunkPageRange(currentChunk);
        chunks.push({
          content: currentChunk.trim(),
          pageStart: pageRange?.startPage ?? null,
          pageEnd: pageRange?.endPage ?? null,
          sectionHeader: null,
        });
      }

      if (trimmedPara.length > CHUNK_SIZE) {
        // Split by sentences
        const sentences = trimmedPara.split(/(?<=[.!?])\s+/);
        let sentenceChunk = "";

        for (const sentence of sentences) {
          if ((sentenceChunk.length + sentence.length + 1) <= CHUNK_SIZE) {
            sentenceChunk += (sentenceChunk ? " " : "") + sentence;
          } else {
            if (sentenceChunk.trim()) {
              const pr = getChunkPageRange(sentenceChunk);
              chunks.push({
                content: sentenceChunk.trim(),
                pageStart: pr?.startPage ?? null,
                pageEnd: pr?.endPage ?? null,
                sectionHeader: null,
              });
            }

            // If single sentence is too long, force split
            if (sentence.length > CHUNK_SIZE) {
              const step = CHUNK_SIZE - CHUNK_OVERLAP;
              for (let i = 0; i < sentence.length; i += step) {
                const slice = sentence.slice(i, i + CHUNK_SIZE).trim();
                if (slice.length > 50) {
                  chunks.push({
                    content: slice,
                    pageStart: null,
                    pageEnd: null,
                    sectionHeader: null,
                  });
                }
              }
              sentenceChunk = "";
            } else {
              sentenceChunk = sentence;
            }
          }
        }
        if (sentenceChunk.trim()) currentChunk = sentenceChunk;
        else currentChunk = "";
      } else {
        currentChunk = trimmedPara;
      }
    }
  }

  if (currentChunk.trim()) {
    const pageRange = getChunkPageRange(currentChunk);
    chunks.push({
      content: currentChunk.trim(),
      pageStart: pageRange?.startPage ?? null,
      pageEnd: pageRange?.endPage ?? null,
      sectionHeader: null,
    });
  }

  return chunks.filter((c) => c.content.length > 50).slice(0, MAX_CHUNKS);
}

// ============================================================================
// EMBEDDING GENERATION (Deterministic hash-based for consistency)
// ============================================================================

function generateEmbedding(text: string): number[] {
  const dimensions = 1536;
  const embedding: number[] = new Array(dimensions).fill(0);
  const textLower = text.toLowerCase();
  
  // Character-level features
  for (let i = 0; i < textLower.length && i < 8000; i++) {
    const charCode = textLower.charCodeAt(i);
    const position = (charCode * (i + 1)) % dimensions;
    embedding[position] += 1;
    
    // Bigrams
    if (i < textLower.length - 1) {
      const bigramCode = charCode * 256 + textLower.charCodeAt(i + 1);
      const bigramPos = (bigramCode * 7) % dimensions;
      embedding[bigramPos] += 0.5;
    }
    
    // Trigrams
    if (i < textLower.length - 2) {
      const trigramCode = charCode * 65536 + textLower.charCodeAt(i + 1) * 256 + textLower.charCodeAt(i + 2);
      const trigramPos = (trigramCode * 13) % dimensions;
      embedding[trigramPos] += 0.25;
    }
  }
  
  // Word-level features
  const words = textLower.split(/\s+/).filter(w => w.length > 2);
  for (const word of words.slice(0, 500)) {
    let wordHash = 0;
    for (let i = 0; i < word.length; i++) {
      wordHash = ((wordHash << 5) - wordHash) + word.charCodeAt(i);
      wordHash = wordHash & wordHash;
    }
    const wordPos = Math.abs(wordHash) % dimensions;
    embedding[wordPos] += 2;
  }
  
  // Normalize
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] = embedding[i] / magnitude;
    }
  }
  
  return embedding;
}

// ============================================================================
// STRUCTURED DATA EXTRACTION PROMPTS
// ============================================================================

function getExtractionPrompt(documentType: DocumentType): string | null {
  switch (documentType) {
    case "settlement":
      return `Extract the following structured data from this settlement/closing statement. Return ONLY valid JSON, no other text:
{
  "property_address": "full address",
  "sale_price": "dollar amount",
  "settlement_date": "date if found",
  "seller": {
    "name": "seller name",
    "gross_proceeds": "amount before deductions",
    "net_proceeds": "final amount to seller"
  },
  "buyer": {
    "name": "buyer name if found",
    "cash_from_buyer": "amount if found"
  },
  "deductions": [
    {"description": "item description", "amount": "dollar amount", "payee": "who receives payment"}
  ],
  "credits": [
    {"description": "credit description", "amount": "dollar amount"}
  ],
  "key_figures": {
    "commission_total": "real estate commission amount",
    "mortgage_payoff": "existing loan payoff if any",
    "prorations": "tax/insurance prorations if any"
  }
}`;

    case "inspection":
      return `Extract the following structured data from this inspection report. Return ONLY valid JSON, no other text:
{
  "property_address": "full address",
  "inspection_date": "date of inspection",
  "inspector_name": "inspector's name if found",
  "overall_condition": "general assessment (good/fair/poor)",
  "major_issues": [
    {"system": "HVAC/Plumbing/Electrical/Roof/etc", "issue": "description", "severity": "high/medium/low", "recommendation": "action needed"}
  ],
  "systems_inspected": ["list of systems/areas inspected"],
  "safety_concerns": ["list of immediate safety issues if any"],
  "recommended_repairs": [
    {"item": "what needs repair", "priority": "immediate/soon/routine", "estimated_cost": "if mentioned"}
  ]
}`;

    case "contract":
      return `Extract the following structured data from this real estate contract. Return ONLY valid JSON, no other text:
{
  "property_address": "full address",
  "purchase_price": "agreed price",
  "earnest_money": "deposit amount",
  "buyer_name": "buyer's name",
  "seller_name": "seller's name",
  "closing_date": "expected closing date",
  "contingencies": [
    {"type": "financing/inspection/appraisal/sale of home/etc", "deadline": "date if specified", "details": "key terms"}
  ],
  "included_items": ["appliances, fixtures, etc included in sale"],
  "excluded_items": ["items excluded from sale"],
  "key_dates": {
    "effective_date": "contract date",
    "inspection_deadline": "date",
    "financing_deadline": "date",
    "closing_date": "date"
  },
  "special_provisions": ["any special terms or conditions"]
}`;

    default:
      return null;
  }
}

function getSummaryPrompt(documentType: DocumentType): string {
  switch (documentType) {
    case "settlement":
      return `Summarize this ALTA/Settlement Statement in 3-4 sentences:
1. Property address and sale price
2. Net proceeds to seller (or amount due from buyer)
3. Major deductions (mortgage payoff, commissions, fees)
4. Settlement/closing date

Focus on the financial outcomes. Be specific with dollar amounts.`;

    case "inspection":
      return `Summarize this home inspection report in 3-4 sentences:
1. Property address and inspection date
2. Overall condition assessment
3. Most significant issues found (prioritize safety and major systems)
4. Key recommendations

Focus on actionable findings that affect the transaction.`;

    case "contract":
      return `Summarize this real estate contract in 3-4 sentences:
1. Property address and purchase price
2. Key parties (buyer/seller names)
3. Important dates (closing, contingency deadlines)
4. Notable contingencies or special terms

Focus on deal-critical information.`;

    default:
      return `Summarize this document in 2-3 sentences:
1. Document type and main subject
2. Key information or findings
3. Any important dates, amounts, or action items

Be concise and focus on the most important points.`;
  }
}

// ============================================================================
// AI HELPER FUNCTIONS
// ============================================================================

async function callAI(prompt: string, content: string, maxTokens: number = 1000): Promise<string | null> {
  try {
    // Use the Anthropic API helper from ai-config.ts
    const response = await callAnthropicAPI(
      [{ role: "user", content: content.slice(0, 30000) }], // Limit content size
      {
        system: prompt,
        maxTokens,
      }
    );

    return extractTextFromResponse(response);
  } catch (error) {
    logger.error("AI call failed", { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

async function extractStructuredData(
  text: string, 
  documentType: DocumentType
): Promise<Record<string, unknown> | null> {
  const prompt = getExtractionPrompt(documentType);
  if (!prompt) return null;
  
  const result = await callAI(prompt, text, 2000);
  if (!result) return null;
  
  try {
    // Try to extract JSON from the response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (parseError) {
    logger.error("Failed to parse structured data", { error: parseError instanceof Error ? parseError.message : String(parseError) });
  }
  
  return null;
}

async function generateDocumentSummary(
  text: string, 
  documentType: DocumentType, 
  filename: string
): Promise<string | null> {
  const prompt = getSummaryPrompt(documentType);
  const fullPrompt = `${prompt}\n\nDocument: "${filename}"`;
  
  return await callAI(fullPrompt, text, 500);
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate required environment variables
    requireEnv(["ANTHROPIC_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);

    const { documentId, batch, startJob } = await req.json();

    if (!documentId) {
      return new Response(
        JSON.stringify({ error: "documentId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get document info
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (docError || !document) {
      return new Response(
        JSON.stringify({ error: "Document not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Apply rate limiting per tenant
    if (document.tenant_id) {
      const rateLimitResult = checkRateLimit(document.tenant_id, DOCUMENT_INDEX_LIMITS);
      if (!rateLimitResult.allowed) {
        return rateLimitResponse(rateLimitResult);
      }
    }

    const fileSize = document.file_size || 0;
    
    // Check for unsupported file types
    if (document.file_type?.startsWith("image/")) {
      return new Response(
        JSON.stringify({ error: "Image files cannot be indexed. Please upload a PDF, DOCX, or text file." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Size check
    if (fileSize > SIZE_LIMIT_MAX) {
      return new Response(
        JSON.stringify({ 
          error: `File too large for indexing (${(fileSize / 1024 / 1024).toFixed(1)}MB). Maximum size is 20MB.` 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========================================================================
    // START JOB MODE: Initialize indexing
    // ========================================================================
    if (startJob === true) {
      logger.info("Starting indexing job", { documentName: document.name });
      
      // Delete existing chunks and metadata for this document
      await supabase
        .from("document_chunks")
        .delete()
        .eq("document_id", documentId);
      
      await supabase
        .from("document_metadata")
        .delete()
        .eq("document_id", documentId);
      
      // Create or update job record (only 1 batch for new approach)
      const { data: existingJob } = await supabase
        .from("document_indexing_jobs")
        .select("id")
        .eq("document_id", documentId)
        .maybeSingle();
      
      if (existingJob) {
        await supabase
          .from("document_indexing_jobs")
          .update({
            status: "processing",
            progress: 0,
            total_chunks: 0,
            indexed_chunks: 0,
            current_batch: 0,
            total_batches: 1, // Single batch for new extraction approach
            error_message: null,
            started_at: new Date().toISOString(),
            completed_at: null,
          })
          .eq("id", existingJob.id);
      } else {
        await supabase
          .from("document_indexing_jobs")
          .insert({
            document_id: documentId,
            tenant_id: document.tenant_id,
            status: "processing",
            progress: 0,
            total_batches: 1,
            started_at: new Date().toISOString(),
          });
      }
      
      // Clear indexed_at
      await supabase
        .from("documents")
        .update({ indexed_at: null })
        .eq("id", documentId);
      
      return new Response(
        JSON.stringify({
          success: true,
          mode: "start",
          documentId,
          totalBatches: 1,
          fileSize,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========================================================================
    // BATCH PROCESSING MODE: Extract, chunk, embed, and generate metadata
    // ========================================================================
    logger.info("Processing document", { documentName: document.name });

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from("documents")
      .download(document.file_path);

    if (downloadError || !fileData) {
      await supabase
        .from("document_indexing_jobs")
        .update({ status: "failed", error_message: "Failed to download document" })
        .eq("document_id", documentId);
      
      return new Response(
        JSON.stringify({ error: "Failed to download document" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========================================================================
    // STEP 1: Extract text based on file type
    // ========================================================================
    let extractedText = "";
    const isPDF = document.file_type === "application/pdf";
    
    if (isPDF) {
      logger.debug("Extracting text from PDF using pdfjs-serverless");
      try {
        extractedText = await extractTextFromPDF(fileData);
      } catch (pdfError) {
        logger.error("PDF extraction failed", { error: pdfError instanceof Error ? pdfError.message : String(pdfError) });
        
        // Update job with error
        await supabase
          .from("document_indexing_jobs")
          .update({ 
            status: "failed", 
            error_message: `PDF extraction failed: ${pdfError instanceof Error ? pdfError.message : "Unknown error"}` 
          })
          .eq("document_id", documentId);
        
        return new Response(
          JSON.stringify({ error: "Failed to extract text from PDF" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // Non-PDF: extract from bytes
      const buffer = await fileData.arrayBuffer();
      extractedText = extractTextFromBytes(buffer, document.file_type || "");
    }
    
    logger.debug("Extracted characters from document", { charCount: extractedText.length });
    
    if (extractedText.length < 50) {
      await supabase
        .from("document_indexing_jobs")
        .update({ 
          status: "failed", 
          error_message: "Could not extract meaningful text from document" 
        })
        .eq("document_id", documentId);
      
      return new Response(
        JSON.stringify({ error: "Could not extract meaningful text from document. The file may be scanned images or encrypted." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========================================================================
    // STEP 1b: Clean and normalize extracted text
    // ========================================================================
    const rawTextLength = extractedText.length;
    extractedText = cleanExtractedText(extractedText, {
      removeHeaders: true,
      removeFooters: true,
      removePageNumbers: false, // Keep page markers for chunk page tracking
      normalizeTables: true,
      normalizeWhitespace: true,
      normalizeLists: true,
      fixHyphenation: true,
    });
    logger.debug("Text cleaned", {
      rawLength: rawTextLength,
      cleanedLength: extractedText.length,
      reductionPct: rawTextLength > 0
        ? `${(((rawTextLength - extractedText.length) / rawTextLength) * 100).toFixed(1)}%`
        : "0%",
    });

    // ========================================================================
    // STEP 2: Detect document type
    // ========================================================================
    const documentType = detectDocumentType(extractedText, document.name);
    logger.debug("Detected document type", { documentType });
    
    // Update document category based on detection
    const categoryMap: Record<DocumentType, string> = {
      settlement: "closing",
      inspection: "inspection",
      contract: "contract",
      appraisal: "appraisal",
      disclosure: "disclosure",
      general: document.category || "other",
    };
    
    await supabase
      .from("documents")
      .update({ category: categoryMap[documentType] })
      .eq("id", documentId);

    // ========================================================================
    // STEP 3: Smart chunking based on document type
    // ========================================================================
    const chunksWithMeta = smartChunkText(extractedText, documentType);
    logger.debug("Created chunks using smart chunking", {
      chunkCount: chunksWithMeta.length,
      documentType,
      chunksWithPages: chunksWithMeta.filter((c) => c.pageStart !== null).length,
      chunksWithSections: chunksWithMeta.filter((c) => c.sectionHeader !== null).length,
    });

    // Update job with total chunks
    await supabase
      .from("document_indexing_jobs")
      .update({ total_chunks: chunksWithMeta.length, progress: 20 })
      .eq("document_id", documentId);

    // ========================================================================
    // STEP 4: Generate embeddings and store chunks (with page metadata)
    // ========================================================================
    let successCount = 0;

    for (let i = 0; i < chunksWithMeta.length; i++) {
      const chunkMeta = chunksWithMeta[i];

      try {
        const embedding = generateEmbedding(chunkMeta.content);

        // Build metadata object for the chunk
        const chunkMetadata: Record<string, unknown> = {};
        if (chunkMeta.pageStart !== null) chunkMetadata.page_start = chunkMeta.pageStart;
        if (chunkMeta.pageEnd !== null) chunkMetadata.page_end = chunkMeta.pageEnd;
        if (chunkMeta.sectionHeader) chunkMetadata.section = chunkMeta.sectionHeader;

        const insertData: Record<string, unknown> = {
          document_id: documentId,
          tenant_id: document.tenant_id,
          chunk_index: i,
          content: chunkMeta.content,
          embedding: JSON.stringify(embedding),
        };

        // Only add metadata if we have any (avoid overwriting with empty object)
        if (Object.keys(chunkMetadata).length > 0) {
          insertData.metadata = chunkMetadata;
        }

        const { error: insertError } = await supabase
          .from("document_chunks")
          .insert(insertData);

        if (!insertError) {
          successCount++;
        } else {
          logger.error("Error inserting chunk", { chunkIndex: i, error: insertError.message });
        }
      } catch (embeddingError) {
        logger.error("Error processing chunk", {
          chunkIndex: i,
          error: embeddingError instanceof Error ? embeddingError.message : String(embeddingError),
        });
      }

      // Update progress periodically
      if (i % 10 === 0 || i === chunksWithMeta.length - 1) {
        const chunkProgress = 20 + Math.round((i / chunksWithMeta.length) * 40);
        await supabase
          .from("document_indexing_jobs")
          .update({ indexed_chunks: successCount, progress: chunkProgress })
          .eq("document_id", documentId);
      }
    }

    logger.info("Indexed chunks", { successCount, totalChunks: chunksWithMeta.length });

    // ========================================================================
    // STEP 5: Extract structured data for supported document types
    // ========================================================================
    let structuredData: Record<string, unknown> | null = null;
    
    if (documentType !== "general") {
      logger.debug("Extracting structured data for document", { documentType });
      
      await supabase
        .from("document_indexing_jobs")
        .update({ progress: 70 })
        .eq("document_id", documentId);
      
      structuredData = await extractStructuredData(extractedText, documentType);
      
      if (structuredData) {
        logger.debug("Structured data extracted successfully");
        
        // Generate key facts from structured data
        const keyFacts: string[] = [];
        
        if (documentType === "settlement") {
          const sd = structuredData as Record<string, unknown>;
          if (sd.sale_price) keyFacts.push(`Sale price: ${sd.sale_price}`);
          if ((sd.seller as Record<string, unknown>)?.net_proceeds) {
            keyFacts.push(`Net proceeds to seller: ${(sd.seller as Record<string, unknown>).net_proceeds}`);
          }
          if (sd.property_address) keyFacts.push(`Property: ${sd.property_address}`);
        } else if (documentType === "inspection") {
          const sd = structuredData as Record<string, unknown>;
          if (sd.overall_condition) keyFacts.push(`Overall condition: ${sd.overall_condition}`);
          const issues = sd.major_issues as Array<Record<string, unknown>>;
          if (issues?.length) {
            keyFacts.push(`Major issues found: ${issues.length}`);
          }
        } else if (documentType === "contract") {
          const sd = structuredData as Record<string, unknown>;
          if (sd.purchase_price) keyFacts.push(`Purchase price: ${sd.purchase_price}`);
          if (sd.closing_date) keyFacts.push(`Closing date: ${sd.closing_date}`);
        }
        
        // Store in document_metadata table
        await supabase
          .from("document_metadata")
          .upsert({
            document_id: documentId,
            tenant_id: document.tenant_id,
            document_type: documentType,
            extracted_data: structuredData,
            key_facts: keyFacts,
            extraction_model: AI_CONFIG.DEFAULT_MODEL,
          }, { onConflict: "document_id" });
      }
    }

    // ========================================================================
    // STEP 6: Generate document summary
    // ========================================================================
    await supabase
      .from("document_indexing_jobs")
      .update({ progress: 85 })
      .eq("document_id", documentId);
    
    logger.debug("Generating document summary");
    const summary = await generateDocumentSummary(extractedText, documentType, document.name);
    
    if (summary) {
      await supabase
        .from("documents")
        .update({ 
          ai_summary: summary,
          indexed_at: new Date().toISOString()
        })
        .eq("id", documentId);
      
      logger.debug("Summary generated and saved");
    } else {
      // Still mark as indexed even if summary fails
      await supabase
        .from("documents")
        .update({ indexed_at: new Date().toISOString() })
        .eq("id", documentId);
    }

    // ========================================================================
    // STEP 7: Mark job as complete
    // ========================================================================
    await supabase
      .from("document_indexing_jobs")
      .update({
        status: "completed",
        progress: 100,
        indexed_chunks: successCount,
        completed_at: new Date().toISOString(),
      })
      .eq("document_id", documentId);
    
    logger.info("Indexing complete", { documentName: document.name });

    return new Response(
      JSON.stringify({
        success: true,
        mode: "batch",
        batchNumber: 0,
        totalBatches: 1,
        chunksIndexed: successCount,
        totalChunks: chunksWithMeta.length,
        documentType,
        hasStructuredData: !!structuredData,
        progress: 100,
        isComplete: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    logger.error("index-document error", { error: error instanceof Error ? error.message : String(error) });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
