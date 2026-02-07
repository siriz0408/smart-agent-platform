/**
 * Search Query Expansion & Suggestion Engine
 *
 * Provides client-side query suggestions when search returns zero results:
 * - Typo correction via Levenshtein distance
 * - Synonym expansion for real estate terminology
 * - Partial match suggestions (split multi-word queries)
 * - Popular recent queries from localStorage
 *
 * All logic is client-side for speed — no API calls.
 */

// ─── Real Estate Synonym Map ────────────────────────────────────────────────
// Bidirectional: each term maps to its alternatives

const REAL_ESTATE_SYNONYMS: Record<string, string[]> = {
  // Property types
  house: ["property", "home", "residence", "dwelling"],
  home: ["house", "property", "residence", "dwelling"],
  property: ["house", "home", "residence", "listing"],
  residence: ["house", "home", "property", "dwelling"],
  dwelling: ["house", "home", "residence", "property"],
  condo: ["condominium", "apartment", "unit", "flat"],
  condominium: ["condo", "apartment", "unit", "flat"],
  apartment: ["condo", "unit", "flat", "rental"],
  townhouse: ["townhome", "row house", "attached home"],
  townhome: ["townhouse", "row house", "attached home"],
  lot: ["land", "parcel", "plot", "acreage"],
  land: ["lot", "parcel", "plot", "acreage"],
  parcel: ["lot", "land", "plot"],

  // Transaction terms
  listing: ["property", "for sale", "active listing"],
  sale: ["purchase", "transaction", "closing"],
  purchase: ["sale", "buy", "acquisition"],
  buy: ["purchase", "acquire"],
  sell: ["list", "market"],
  lease: ["rent", "rental", "tenant"],
  rent: ["lease", "rental", "tenant"],
  rental: ["lease", "rent", "tenant"],

  // People roles
  buyer: ["purchaser", "client", "prospect"],
  seller: ["vendor", "owner", "client"],
  agent: ["realtor", "broker", "representative"],
  realtor: ["agent", "broker", "representative"],
  broker: ["agent", "realtor"],
  tenant: ["renter", "lessee", "occupant"],
  landlord: ["owner", "lessor", "property manager"],
  client: ["buyer", "seller", "customer", "lead"],
  lead: ["prospect", "client", "inquiry"],
  prospect: ["lead", "client", "inquiry"],

  // Document types
  contract: ["agreement", "purchase agreement", "deal"],
  agreement: ["contract", "deal", "terms"],
  inspection: ["report", "assessment", "evaluation"],
  appraisal: ["valuation", "assessment", "estimate"],
  disclosure: ["statement", "declaration", "report"],
  settlement: ["closing", "HUD", "closing statement"],
  closing: ["settlement", "escrow", "finalization"],
  deed: ["title", "conveyance"],
  title: ["deed", "ownership"],
  mortgage: ["loan", "financing", "lien"],
  loan: ["mortgage", "financing"],
  escrow: ["closing", "settlement", "trust"],

  // Deal stages
  offer: ["bid", "proposal"],
  pending: ["under contract", "contingent"],
  contingent: ["pending", "conditional"],
  active: ["available", "on market", "listed"],
  closed: ["sold", "completed", "settled"],
  sold: ["closed", "completed"],

  // Property features
  bedroom: ["bed", "br", "room"],
  bathroom: ["bath", "ba"],
  garage: ["parking", "carport"],
  pool: ["swimming pool", "spa"],
  yard: ["garden", "outdoor", "backyard"],
  kitchen: ["galley", "kitchenette"],
  basement: ["cellar", "lower level"],

  // Location terms
  neighborhood: ["area", "community", "district", "zone"],
  downtown: ["city center", "urban", "central"],
  suburban: ["suburbs", "residential area"],
  mls: ["multiple listing service", "listing number"],
};

// ─── Common Typo Dictionary (real estate specific) ──────────────────────────

const COMMON_TYPOS: Record<string, string> = {
  proprety: "property",
  proeprty: "property",
  properyt: "property",
  porperty: "property",
  propety: "property",
  proprty: "property",
  prperty: "property",
  contarct: "contract",
  contrcat: "contract",
  contrcct: "contract",
  conract: "contract",
  closign: "closing",
  clsoing: "closing",
  closnig: "closing",
  insepction: "inspection",
  inpsection: "inspection",
  inspeciton: "inspection",
  inspction: "inspection",
  appraisel: "appraisal",
  apprasial: "appraisal",
  appriasal: "appraisal",
  apprasiel: "appraisal",
  morgage: "mortgage",
  mortage: "mortgage",
  mortgae: "mortgage",
  mortagge: "mortgage",
  settlment: "settlement",
  settlemnt: "settlement",
  settelment: "settlement",
  disclosrue: "disclosure",
  disclsoure: "disclosure",
  discloure: "disclosure",
  agreeement: "agreement",
  agreemnt: "agreement",
  agreemnet: "agreement",
  lisitng: "listing",
  lsiting: "listing",
  listign: "listing",
  neighbrohood: "neighborhood",
  neighbhorhood: "neighborhood",
  neigborhood: "neighborhood",
  neighbourhod: "neighborhood",
  condominim: "condominium",
  condominuim: "condominium",
  townhosue: "townhouse",
  twonhouse: "townhouse",
  escrwo: "escrow",
  escorw: "escrow",
  docuemnt: "document",
  documnet: "document",
  dcument: "document",
  dcoument: "document",
  contcat: "contact",
  conact: "contact",
  contac: "contact",
  cotact: "contact",
};

// ─── Levenshtein Distance ───────────────────────────────────────────────────

/**
 * Calculate Levenshtein distance between two strings.
 * Used for fuzzy typo detection.
 */
function levenshteinDistance(a: string, b: string): number {
  const la = a.length;
  const lb = b.length;

  // Quick exits
  if (la === 0) return lb;
  if (lb === 0) return la;

  // Single row DP
  const row = Array.from({ length: lb + 1 }, (_, i) => i);

  for (let i = 1; i <= la; i++) {
    let prev = i;
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const val = Math.min(
        row[j] + 1, // deletion
        prev + 1, // insertion
        row[j - 1] + cost // substitution
      );
      row[j - 1] = prev;
      prev = val;
    }
    row[lb] = prev;
  }

  return row[lb];
}

// ─── Public API ─────────────────────────────────────────────────────────────

export interface QuerySuggestion {
  /** The suggested query text */
  text: string;
  /** Reason for the suggestion */
  reason: "typo" | "synonym" | "partial" | "recent";
  /** Human-readable label (e.g. "Did you mean...") */
  label: string;
}

export interface QueryExpansionResult {
  /** "Did you mean?" typo corrections */
  typoCorrections: QuerySuggestion[];
  /** Alternative queries via synonyms */
  synonymSuggestions: QuerySuggestion[];
  /** Partial match suggestions (split words) */
  partialSuggestions: QuerySuggestion[];
  /** Matching recent searches */
  recentSuggestions: QuerySuggestion[];
  /** Entity types the user might want to search in */
  entityTypeSuggestions: string[];
}

const RECENT_SEARCHES_KEY = "smart-agent-recent-searches";

/**
 * Retrieve recent searches from localStorage.
 */
function getRecentSearches(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {
    // Ignore parse errors
  }
  return [];
}

/**
 * Generate query expansion suggestions for a zero-results search.
 *
 * All logic is client-side — no API calls — for instant feedback.
 */
export function expandQuery(query: string): QueryExpansionResult {
  const normalizedQuery = query.trim().toLowerCase();
  const words = normalizedQuery.split(/\s+/).filter(Boolean);

  const result: QueryExpansionResult = {
    typoCorrections: [],
    synonymSuggestions: [],
    partialSuggestions: [],
    recentSuggestions: [],
    entityTypeSuggestions: [],
  };

  if (!normalizedQuery || words.length === 0) return result;

  // ─── 1. Typo Corrections ─────────────────────────────────────────────
  // Check against common typo dictionary first (fast)
  const correctedWords = words.map((word) => {
    if (COMMON_TYPOS[word]) return COMMON_TYPOS[word];
    return word;
  });

  const correctedQuery = correctedWords.join(" ");
  if (correctedQuery !== normalizedQuery) {
    result.typoCorrections.push({
      text: correctedQuery,
      reason: "typo",
      label: correctedQuery,
    });
  }

  // Levenshtein-based correction against known terms
  const allKnownTerms = [
    ...Object.keys(REAL_ESTATE_SYNONYMS),
    ...Object.values(COMMON_TYPOS),
  ];
  const uniqueTerms = [...new Set(allKnownTerms)];

  for (const word of words) {
    // Skip short words and already-known words
    if (word.length < 3) continue;
    if (REAL_ESTATE_SYNONYMS[word]) continue;
    if (Object.values(COMMON_TYPOS).includes(word)) continue;

    for (const term of uniqueTerms) {
      // Only consider terms of similar length
      if (Math.abs(term.length - word.length) > 2) continue;

      const distance = levenshteinDistance(word, term);
      const threshold = word.length <= 4 ? 1 : 2;

      if (distance > 0 && distance <= threshold) {
        const suggestion = normalizedQuery.replace(word, term);
        // Deduplicate
        if (
          suggestion !== normalizedQuery &&
          !result.typoCorrections.some((s) => s.text === suggestion)
        ) {
          result.typoCorrections.push({
            text: suggestion,
            reason: "typo",
            label: suggestion,
          });
        }
      }
    }
  }

  // Limit typo corrections
  result.typoCorrections = result.typoCorrections.slice(0, 3);

  // ─── 2. Synonym Expansion ────────────────────────────────────────────
  const seenSynonyms = new Set<string>();

  for (const word of words) {
    const synonyms = REAL_ESTATE_SYNONYMS[word];
    if (!synonyms) continue;

    for (const syn of synonyms.slice(0, 3)) {
      // Skip multi-word synonyms for simple replacement
      if (syn.includes(" ")) continue;

      const suggestion = normalizedQuery.replace(word, syn);
      if (suggestion !== normalizedQuery && !seenSynonyms.has(suggestion)) {
        seenSynonyms.add(suggestion);
        result.synonymSuggestions.push({
          text: suggestion,
          reason: "synonym",
          label: suggestion,
        });
      }
    }
  }

  // Limit synonym suggestions
  result.synonymSuggestions = result.synonymSuggestions.slice(0, 4);

  // ─── 3. Partial Match Suggestions ────────────────────────────────────
  if (words.length >= 2) {
    // Suggest individual words from multi-word queries
    for (const word of words) {
      if (word.length >= 3) {
        result.partialSuggestions.push({
          text: word,
          reason: "partial",
          label: word,
        });
      }
    }

    // Also try removing one word at a time for longer queries
    if (words.length >= 3) {
      for (let i = 0; i < words.length; i++) {
        const subset = [...words.slice(0, i), ...words.slice(i + 1)].join(" ");
        if (
          subset.length >= 3 &&
          !result.partialSuggestions.some((s) => s.text === subset)
        ) {
          result.partialSuggestions.push({
            text: subset,
            reason: "partial",
            label: subset,
          });
        }
      }
    }

    result.partialSuggestions = result.partialSuggestions.slice(0, 4);
  }

  // ─── 4. Recent Searches ──────────────────────────────────────────────
  const recentSearches = getRecentSearches();
  for (const recent of recentSearches) {
    const recentLower = recent.toLowerCase();

    // Check if any word overlaps or the recent search is related
    const hasOverlap = words.some(
      (w) =>
        recentLower.includes(w) ||
        w.includes(recentLower) ||
        levenshteinDistance(w, recentLower) <= 2
    );

    if (hasOverlap && recentLower !== normalizedQuery) {
      result.recentSuggestions.push({
        text: recent,
        reason: "recent",
        label: recent,
      });
    }
  }

  result.recentSuggestions = result.recentSuggestions.slice(0, 3);

  // ─── 5. Entity Type Suggestions ──────────────────────────────────────
  // Heuristically suggest entity types based on query keywords
  const entityKeywords: Record<string, string[]> = {
    Contacts: [
      "person", "name", "agent", "client", "buyer", "seller",
      "realtor", "broker", "tenant", "landlord", "lead", "prospect",
      "email", "phone",
    ],
    Properties: [
      "house", "home", "property", "address", "condo", "townhouse",
      "apartment", "lot", "land", "listing", "mls", "bedroom",
      "bathroom", "garage", "pool", "price",
    ],
    Documents: [
      "contract", "agreement", "inspection", "appraisal", "disclosure",
      "settlement", "closing", "deed", "title", "mortgage", "loan",
      "report", "document", "file", "pdf",
    ],
    Deals: [
      "deal", "transaction", "offer", "pending", "sale", "purchase",
      "pipeline", "stage", "closing", "escrow", "closed", "active",
    ],
  };

  for (const [entityType, keywords] of Object.entries(entityKeywords)) {
    const matches = words.some(
      (w) =>
        keywords.includes(w) ||
        keywords.some((kw) => levenshteinDistance(w, kw) <= 1)
    );
    if (matches) {
      result.entityTypeSuggestions.push(entityType);
    }
  }

  // If no specific entity type detected, suggest all
  if (result.entityTypeSuggestions.length === 0) {
    result.entityTypeSuggestions = [
      "Contacts",
      "Properties",
      "Documents",
      "Deals",
    ];
  }

  return result;
}
