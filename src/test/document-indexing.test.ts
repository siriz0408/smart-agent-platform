import { describe, it, expect } from "vitest";

// Test document indexing utilities from index-document function
// These are pure functions that can be tested without Deno

type DocumentType =
  | "settlement"
  | "inspection"
  | "contract"
  | "appraisal"
  | "disclosure"
  | "general";

// Inline implementation matching index-document function
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

describe("Document Type Detection", () => {
  describe("detectDocumentType", () => {
    it("detects settlement documents by content keywords", () => {
      const text = "ALTA Settlement Statement for property at 123 Main St";
      expect(detectDocumentType(text, "document.pdf")).toBe("settlement");
    });

    it("detects settlement documents by HUD-1 keyword", () => {
      const text = "This is a HUD-1 form for the real estate transaction";
      expect(detectDocumentType(text, "doc.pdf")).toBe("settlement");
    });

    it("detects settlement documents by closing disclosure keyword", () => {
      const text = "Closing Disclosure - This form is a statement of final loan terms";
      expect(detectDocumentType(text, "doc.pdf")).toBe("settlement");
    });

    it("detects settlement documents by filename", () => {
      const text = "Various financial information";
      expect(detectDocumentType(text, "closing_statement.pdf")).toBe("settlement");
    });

    it("detects inspection reports by content keywords", () => {
      const text = "Home Inspection Report - Inspector found issues with the roof";
      expect(detectDocumentType(text, "report.pdf")).toBe("inspection");
    });

    it("detects inspection reports by deficiency keyword", () => {
      const text = "Deficiency found in electrical panel. Condition report attached.";
      expect(detectDocumentType(text, "report.pdf")).toBe("inspection");
    });

    it("detects inspection reports by filename", () => {
      const text = "Detailed report of property condition";
      expect(detectDocumentType(text, "home_inspection_2024.pdf")).toBe(
        "inspection"
      );
    });

    it("detects contracts by purchase agreement keyword", () => {
      const text =
        "PURCHASE AGREEMENT between buyer and seller for the property";
      expect(detectDocumentType(text, "doc.pdf")).toBe("contract");
    });

    it("detects contracts by earnest money keyword", () => {
      const text = "Buyer agrees to pay earnest money deposit of $5,000";
      expect(detectDocumentType(text, "doc.pdf")).toBe("contract");
    });

    it("detects contracts by filename", () => {
      const text = "Standard form agreement";
      expect(detectDocumentType(text, "purchase_contract.pdf")).toBe("contract");
    });

    it("detects appraisals by content keywords", () => {
      const text =
        "Appraisal Report - Market Value: $450,000. Comparable sales analyzed.";
      expect(detectDocumentType(text, "doc.pdf")).toBe("appraisal");
    });

    it("detects appraisals by subject property keyword", () => {
      const text = "Subject Property analysis with comparable sales data";
      expect(detectDocumentType(text, "doc.pdf")).toBe("appraisal");
    });

    it("detects appraisals by filename", () => {
      const text = "Property valuation report";
      expect(detectDocumentType(text, "home_appraisal.pdf")).toBe("appraisal");
    });

    it("detects disclosures by seller's disclosure keyword", () => {
      const text = "Seller's Disclosure: Known defects in property include...";
      expect(detectDocumentType(text, "doc.pdf")).toBe("disclosure");
    });

    it("detects disclosures by lead-based paint keyword", () => {
      const text =
        "Lead-Based Paint Disclosure: This property was built before 1978";
      expect(detectDocumentType(text, "doc.pdf")).toBe("disclosure");
    });

    it("detects disclosures by filename", () => {
      const text = "Important property information";
      expect(detectDocumentType(text, "seller_disclosure_form.pdf")).toBe(
        "disclosure"
      );
    });

    it("returns general for unrecognized documents", () => {
      const text = "This is just a random document with no keywords";
      expect(detectDocumentType(text, "random.pdf")).toBe("general");
    });

    it("is case insensitive for text content", () => {
      const text = "CLOSING DISCLOSURE form for transaction";
      expect(detectDocumentType(text, "doc.pdf")).toBe("settlement");
    });

    it("is case insensitive for filename", () => {
      const text = "Document content";
      expect(detectDocumentType(text, "INSPECTION_Report.PDF")).toBe(
        "inspection"
      );
    });
  });
});

// Chunking configuration matching index-document
const CHUNK_SIZE = 2000;
const CHUNK_OVERLAP = 200;
const MAX_CHUNKS = 100;

function chunkByParagraphs(text: string): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = "";

  for (const para of paragraphs) {
    const trimmedPara = para.trim();
    if (!trimmedPara) continue;

    if (currentChunk.length + trimmedPara.length + 2 <= CHUNK_SIZE) {
      currentChunk += (currentChunk ? "\n\n" : "") + trimmedPara;
    } else {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }

      if (trimmedPara.length > CHUNK_SIZE) {
        const sentences = trimmedPara.split(/(?<=[.!?])\s+/);
        let sentenceChunk = "";

        for (const sentence of sentences) {
          if (sentenceChunk.length + sentence.length + 1 <= CHUNK_SIZE) {
            sentenceChunk += (sentenceChunk ? " " : "") + sentence;
          } else {
            if (sentenceChunk.trim()) chunks.push(sentenceChunk.trim());

            if (sentence.length > CHUNK_SIZE) {
              const step = CHUNK_SIZE - CHUNK_OVERLAP;
              for (let i = 0; i < sentence.length; i += step) {
                chunks.push(sentence.slice(i, i + CHUNK_SIZE).trim());
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
    chunks.push(currentChunk.trim());
  }

  return chunks.filter((c) => c.length > 50).slice(0, MAX_CHUNKS);
}

describe("Document Chunking", () => {
  describe("chunkByParagraphs", () => {
    it("returns empty array for empty text", () => {
      expect(chunkByParagraphs("")).toEqual([]);
    });

    it("returns single chunk for short text", () => {
      const text = "This is a short paragraph with enough content to pass the minimum length filter of fifty characters.";
      const chunks = chunkByParagraphs(text);

      expect(chunks.length).toBe(1);
      expect(chunks[0]).toBe(text);
    });

    it("combines small paragraphs into single chunk", () => {
      const text = `First paragraph with some content that is meaningful.

Second paragraph continues the document content.

Third paragraph adds more information here.`;

      const chunks = chunkByParagraphs(text);

      expect(chunks.length).toBe(1);
      expect(chunks[0]).toContain("First paragraph");
      expect(chunks[0]).toContain("Second paragraph");
      expect(chunks[0]).toContain("Third paragraph");
    });

    it("splits text when it exceeds chunk size", () => {
      // Create text that exceeds CHUNK_SIZE (2000)
      const paragraph1 = "A".repeat(1200) + " first content.";
      const paragraph2 = "B".repeat(1200) + " second content.";
      const text = `${paragraph1}\n\n${paragraph2}`;

      const chunks = chunkByParagraphs(text);

      expect(chunks.length).toBeGreaterThan(1);
    });

    it("filters out chunks shorter than 50 characters", () => {
      const text = `Short.

This is a longer paragraph that definitely exceeds fifty characters and should be included.`;

      const chunks = chunkByParagraphs(text);

      expect(chunks.length).toBe(1);
      expect(chunks[0]).toContain("longer paragraph");
    });

    it("respects MAX_CHUNKS limit", () => {
      // Create many small paragraphs
      const paragraphs = Array(150)
        .fill(0)
        .map(
          (_, i) =>
            `Paragraph ${i}: This content is long enough to be included as a chunk with over fifty chars.`
        );
      const text = paragraphs.join("\n\n");

      const chunks = chunkByParagraphs(text);

      expect(chunks.length).toBeLessThanOrEqual(MAX_CHUNKS);
    });

    it("handles text with multiple newlines", () => {
      const text = `First paragraph here.\n\n\n\nSecond paragraph with triple newlines.\n\n\n\n\nThird paragraph with more.`;

      const chunks = chunkByParagraphs(text);

      // Should treat multiple newlines as single paragraph break
      expect(chunks.length).toBe(1);
    });

    it("preserves content when splitting large paragraphs by sentences", () => {
      const longParagraph =
        "This is sentence one. ".repeat(50) +
        "This is sentence two. ".repeat(50);

      const chunks = chunkByParagraphs(longParagraph);

      // Should have split into multiple chunks
      expect(chunks.length).toBeGreaterThan(1);

      // All content should be preserved across chunks
      const combinedContent = chunks.join(" ");
      expect(combinedContent).toContain("sentence one");
      expect(combinedContent).toContain("sentence two");
    });
  });
});

// Embedding generation matching index-document
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
      const trigramCode =
        charCode * 65536 +
        textLower.charCodeAt(i + 1) * 256 +
        textLower.charCodeAt(i + 2);
      const trigramPos = (trigramCode * 13) % dimensions;
      embedding[trigramPos] += 0.25;
    }
  }

  // Word-level features
  const words = textLower.split(/\s+/).filter((w) => w.length > 2);
  for (const word of words.slice(0, 500)) {
    let wordHash = 0;
    for (let i = 0; i < word.length; i++) {
      wordHash = (wordHash << 5) - wordHash + word.charCodeAt(i);
      wordHash = wordHash & wordHash;
    }
    const wordPos = Math.abs(wordHash) % dimensions;
    embedding[wordPos] += 2;
  }

  // Normalize
  const magnitude = Math.sqrt(
    embedding.reduce((sum, val) => sum + val * val, 0)
  );
  if (magnitude > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] = embedding[i] / magnitude;
    }
  }

  return embedding;
}

describe("Embedding Generation", () => {
  describe("generateEmbedding", () => {
    it("returns array of correct dimension (1536)", () => {
      const embedding = generateEmbedding("Test document content");

      expect(embedding.length).toBe(1536);
    });

    it("returns normalized vector (magnitude ~1)", () => {
      const embedding = generateEmbedding("Sample text for embedding test");

      const magnitude = Math.sqrt(
        embedding.reduce((sum, val) => sum + val * val, 0)
      );

      expect(magnitude).toBeCloseTo(1.0, 5);
    });

    it("is deterministic - same input produces same output", () => {
      const text = "This is a test document about real estate";

      const embedding1 = generateEmbedding(text);
      const embedding2 = generateEmbedding(text);

      expect(embedding1).toEqual(embedding2);
    });

    it("produces different embeddings for different texts", () => {
      const embedding1 = generateEmbedding("Real estate contract for sale");
      const embedding2 = generateEmbedding("Home inspection report findings");

      // Should not be equal
      expect(embedding1).not.toEqual(embedding2);

      // Calculate cosine similarity (should be < 1)
      const dotProduct = embedding1.reduce(
        (sum, val, i) => sum + val * embedding2[i],
        0
      );
      expect(dotProduct).toBeLessThan(1);
    });

    it("is case insensitive", () => {
      const embedding1 = generateEmbedding("Real Estate Contract");
      const embedding2 = generateEmbedding("real estate contract");

      expect(embedding1).toEqual(embedding2);
    });

    it("handles empty string", () => {
      const embedding = generateEmbedding("");

      expect(embedding.length).toBe(1536);
      // All zeros normalized is still zeros
      expect(embedding.every((v) => v === 0)).toBe(true);
    });

    it("handles very long text (truncates to 8000 chars)", () => {
      const longText = "a".repeat(10000);

      // Should not throw
      const embedding = generateEmbedding(longText);

      expect(embedding.length).toBe(1536);
    });

    it("produces similar embeddings for similar content", () => {
      const embedding1 = generateEmbedding("Sale price is $500,000");
      const embedding2 = generateEmbedding("Sale price is $500,001");

      // Calculate cosine similarity
      const dotProduct = embedding1.reduce(
        (sum, val, i) => sum + val * embedding2[i],
        0
      );

      // Similar texts should have high similarity (> 0.8)
      expect(dotProduct).toBeGreaterThan(0.8);
    });
  });
});

// Text extraction from bytes
function extractTextFromBytes(buffer: ArrayBuffer, fileType: string): string {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  } catch {
    text = "";
  }

  // For DOCX/DOC files, clean up XML-like content
  if (fileType?.includes("word") || fileType?.includes("document")) {
    const cleanText = text
      .replace(/<[^>]+>/g, " ")
      .replace(/[^\x20-\x7E\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return cleanText;
  }

  return text;
}

describe("Text Extraction", () => {
  describe("extractTextFromBytes", () => {
    it("extracts plain text from buffer", () => {
      const text = "This is plain text content";
      const buffer = new TextEncoder().encode(text).buffer;

      const result = extractTextFromBytes(buffer, "text/plain");

      expect(result).toBe(text);
    });

    it("strips XML tags from Word document content", () => {
      const xmlContent = "<w:t>Hello</w:t><w:t> World</w:t>";
      const buffer = new TextEncoder().encode(xmlContent).buffer;

      const result = extractTextFromBytes(
        buffer,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );

      expect(result).not.toContain("<w:t>");
      expect(result).toContain("Hello");
      expect(result).toContain("World");
    });

    it("normalizes whitespace in Word documents", () => {
      const content = "<tag>Text</tag>   <tag>More</tag>\n\n<tag>Content</tag>";
      const buffer = new TextEncoder().encode(content).buffer;

      const result = extractTextFromBytes(buffer, "application/msword");

      expect(result).not.toContain("  "); // No double spaces
      expect(result).toBe("Text More Content");
    });

    it("handles empty buffer", () => {
      const buffer = new ArrayBuffer(0);

      const result = extractTextFromBytes(buffer, "text/plain");

      expect(result).toBe("");
    });

    it("preserves text for non-Word file types", () => {
      const text = "Plain <text> with <tags>";
      const buffer = new TextEncoder().encode(text).buffer;

      const result = extractTextFromBytes(buffer, "text/plain");

      // Should NOT strip tags for non-Word files
      expect(result).toBe(text);
    });
  });
});

// Prompt generation tests
function getExtractionPrompt(documentType: DocumentType): string | null {
  switch (documentType) {
    case "settlement":
      return `Extract the following structured data from this settlement/closing statement.`;
    case "inspection":
      return `Extract the following structured data from this inspection report.`;
    case "contract":
      return `Extract the following structured data from this real estate contract.`;
    default:
      return null;
  }
}

function getSummaryPrompt(documentType: DocumentType): string {
  switch (documentType) {
    case "settlement":
      return `Summarize this ALTA/Settlement Statement in 3-4 sentences`;
    case "inspection":
      return `Summarize this home inspection report in 3-4 sentences`;
    case "contract":
      return `Summarize this real estate contract in 3-4 sentences`;
    default:
      return `Summarize this document in 2-3 sentences`;
  }
}

describe("Prompt Generation", () => {
  describe("getExtractionPrompt", () => {
    it("returns prompt for settlement documents", () => {
      const prompt = getExtractionPrompt("settlement");

      expect(prompt).not.toBeNull();
      expect(prompt).toContain("settlement");
    });

    it("returns prompt for inspection documents", () => {
      const prompt = getExtractionPrompt("inspection");

      expect(prompt).not.toBeNull();
      expect(prompt).toContain("inspection");
    });

    it("returns prompt for contract documents", () => {
      const prompt = getExtractionPrompt("contract");

      expect(prompt).not.toBeNull();
      expect(prompt).toContain("contract");
    });

    it("returns null for general documents", () => {
      const prompt = getExtractionPrompt("general");

      expect(prompt).toBeNull();
    });

    it("returns null for appraisal documents (not supported)", () => {
      // Based on the implementation, appraisal extraction is not supported
      const prompt = getExtractionPrompt("appraisal");

      expect(prompt).toBeNull();
    });
  });

  describe("getSummaryPrompt", () => {
    it("returns specific prompt for settlement documents", () => {
      const prompt = getSummaryPrompt("settlement");

      expect(prompt).toContain("ALTA");
      expect(prompt).toContain("Settlement Statement");
    });

    it("returns specific prompt for inspection documents", () => {
      const prompt = getSummaryPrompt("inspection");

      expect(prompt).toContain("inspection report");
    });

    it("returns specific prompt for contract documents", () => {
      const prompt = getSummaryPrompt("contract");

      expect(prompt).toContain("real estate contract");
    });

    it("returns generic prompt for general documents", () => {
      const prompt = getSummaryPrompt("general");

      expect(prompt).toContain("document");
      expect(prompt).toContain("2-3 sentences");
    });
  });
});

describe("Document Indexing Constants", () => {
  it("has correct chunk size (2000)", () => {
    expect(CHUNK_SIZE).toBe(2000);
  });

  it("has correct chunk overlap (200)", () => {
    expect(CHUNK_OVERLAP).toBe(200);
  });

  it("has correct max chunks limit (100)", () => {
    expect(MAX_CHUNKS).toBe(100);
  });

  it("overlap is less than chunk size", () => {
    expect(CHUNK_OVERLAP).toBeLessThan(CHUNK_SIZE);
  });
});
