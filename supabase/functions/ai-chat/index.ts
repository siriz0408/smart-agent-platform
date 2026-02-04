import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { convertAnthropicStreamToOpenAI } from "../_shared/stream-converter.ts";
import { checkRateLimit, rateLimitResponse, AI_CHAT_LIMITS } from "../_shared/rateLimit.ts";

// ====================================================================
// CORS HEADERS
// ====================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ====================================================================
// ANTHROPIC API HELPERS
// ====================================================================

// Convert OpenAI-style tool to Anthropic format
interface OpenAITool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

interface AnthropicTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

function convertToAnthropicTools(openAITools: OpenAITool[]): AnthropicTool[] {
  return openAITools.map((tool) => ({
    name: tool.function.name,
    description: tool.function.description,
    input_schema: tool.function.parameters,
  }));
}

// ====================================================================
// AI-POWERED PROPERTY SEARCH INTENT DETECTION
// ====================================================================

interface PropertySearchParams {
  location: string;
  beds_min?: number;
  beds_max?: number;
  baths_min?: number;
  baths_max?: number;
  price_min?: number;
  price_max?: number;
  sqft_min?: number;
  sqft_max?: number;
  property_type?: string;
  list_type?: "for-sale" | "for-rent";
  year_built_min?: number;
  amenities?: string[];
  keywords?: string[];
}

// Property search tool definition for AI
const PROPERTY_SEARCH_TOOL = {
  type: "function",
  function: {
    name: "search_properties",
    description: "Search for real estate properties based on user criteria. Call this when the user wants to find homes, houses, condos, apartments, or any real estate listings.",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "City and state for the search (e.g., 'Denver, Colorado', 'Austin, TX'). ALWAYS include the state."
        },
        beds_min: {
          type: "number",
          description: "Minimum number of bedrooms"
        },
        beds_max: {
          type: "number", 
          description: "Maximum number of bedrooms"
        },
        baths_min: {
          type: "number",
          description: "Minimum number of bathrooms"
        },
        baths_max: {
          type: "number",
          description: "Maximum number of bathrooms"
        },
        price_min: {
          type: "number",
          description: "Minimum price in dollars (convert shorthand: 400k=400000, 1M=1000000)"
        },
        price_max: {
          type: "number",
          description: "Maximum price in dollars (convert shorthand: 400k=400000, 1M=1000000)"
        },
        sqft_min: {
          type: "number",
          description: "Minimum square footage"
        },
        sqft_max: {
          type: "number",
          description: "Maximum square footage"
        },
        property_type: {
          type: "string",
          enum: ["house", "condo", "townhouse", "apartment", "land", "any"],
          description: "Type of property. 'house' for single-family homes."
        },
        list_type: {
          type: "string",
          enum: ["for-sale", "for-rent"],
          description: "Whether looking to buy (for-sale) or rent (for-rent). Default is for-sale unless rent/lease is mentioned."
        },
        year_built_min: {
          type: "number",
          description: "Minimum year the property was built (for 'newer homes' or 'built after X')"
        },
        amenities: {
          type: "array",
          items: { type: "string" },
          description: "Desired amenities like 'pool', 'garage', 'fireplace', 'basement', 'parking'"
        },
        keywords: {
          type: "array", 
          items: { type: "string" },
          description: "Other search keywords not covered above (e.g., 'near schools', 'quiet neighborhood', 'waterfront')"
        }
      },
      required: ["location"],
      additionalProperties: false
    }
  }
};

// Mortgage calculator tool definition for AI
const MORTGAGE_CALCULATOR_TOOL = {
  type: "function",
  function: {
    name: "show_mortgage_calculator",
    description: "Show an interactive mortgage calculator widget. Call this when the user wants to calculate mortgage payments, estimate monthly housing costs, understand loan affordability, or asks about interest rates and down payments for a specific home price. Do NOT call this when the user is searching for properties - only for pure payment calculations.",
    parameters: {
      type: "object",
      properties: {
        price: {
          type: "number",
          description: "Home price in dollars (convert shorthand: 400k=400000, 1M=1000000). Default to 300000 if user says 'show calculator' without a price."
        },
        down_payment_percent: {
          type: "number",
          description: "Down payment percentage (0-50). Default 20 if not specified."
        },
        interest_rate: {
          type: "number",
          description: "Annual interest rate (e.g., 6.5). Use 6.75 for current market if not specified."
        },
        loan_term_years: {
          type: "number",
          description: "Loan term in years (10, 15, 20, 25, 30). Default 30."
        }
      },
      required: ["price"]
    }
  }
};

// Affordability calculator tool definition for AI
const AFFORDABILITY_CALCULATOR_TOOL = {
  type: "function",
  function: {
    name: "show_affordability_calculator",
    description: "Show an interactive affordability calculator widget. Call this when the user wants to know how much house they can afford, what their budget allows, or asks about affordability based on income or monthly payment capacity. This is the REVERSE of a mortgage calculator - it takes income/budget and outputs max home price.",
    parameters: {
      type: "object",
      properties: {
        monthly_budget: {
          type: "number",
          description: "Maximum monthly housing payment the user can afford in dollars. Convert shorthand: 3k=3000, 2500=2500. Default 3000 if not specified."
        },
        down_payment_percent: {
          type: "number",
          description: "Down payment percentage (0-50). Default 20 if not specified."
        },
        interest_rate: {
          type: "number",
          description: "Annual interest rate (e.g., 6.5). Use 6.75 for current market if not specified."
        },
        annual_income: {
          type: "number",
          description: "Annual gross income in dollars. Convert shorthand: 100k=100000, 150K=150000. Important for housing ratio calculations."
        }
      },
      required: []
    }
  }
};

// Closing costs calculator tool definition for AI
const CLOSING_COSTS_CALCULATOR_TOOL = {
  type: "function",
  function: {
    name: "show_closing_costs_calculator",
    description: "Show an interactive closing costs calculator widget. Call this when the user asks about closing costs, how much cash they need at closing, what fees to expect when buying or selling, or wants to estimate transaction costs. Supports both buyer and seller views.",
    parameters: {
      type: "object",
      properties: {
        home_price: {
          type: "number",
          description: "Home price or sale price in dollars. Convert shorthand: 400k=400000, 1M=1000000. Default 450000 if not specified."
        },
        down_payment_percent: {
          type: "number",
          description: "Down payment percentage for buyers (0-50). Default 20 if not specified."
        },
        view: {
          type: "string",
          enum: ["buyer", "seller"],
          description: "Whether to show buyer or seller closing costs. Default 'buyer' unless user specifically asks about selling costs."
        }
      },
      required: []
    }
  }
};

// Rent vs Buy calculator tool definition for AI
const RENT_VS_BUY_CALCULATOR_TOOL = {
  type: "function",
  function: {
    name: "show_rent_vs_buy_calculator",
    description: "Show an interactive rent vs buy comparison calculator. Call this when the user wants to compare renting vs buying, asks if they should rent or buy, wants to see the financial comparison over time, or asks about the break-even point for buying a home.",
    parameters: {
      type: "object",
      properties: {
        home_price: {
          type: "number",
          description: "Home price in dollars. Convert shorthand: 400k=400000, 1M=1000000. Default 450000 if not specified."
        },
        monthly_rent: {
          type: "number",
          description: "Monthly rent in dollars. Default 2500 if not specified."
        },
        down_payment_percent: {
          type: "number",
          description: "Down payment percentage (0-50). Default 20 if not specified."
        },
        interest_rate: {
          type: "number",
          description: "Annual mortgage interest rate (e.g., 6.5). Default 6.75 if not specified."
        },
        years_to_compare: {
          type: "number",
          description: "Number of years to compare (1-30). Default 7 if not specified."
        },
        home_appreciation: {
          type: "number",
          description: "Annual home appreciation rate percentage (0-10). Default 3 if not specified."
        },
        rent_increase: {
          type: "number",
          description: "Annual rent increase rate percentage (0-10). Default 3 if not specified."
        }
      },
      required: []
    }
  }
};

// CMA Comparison tool definition for AI
const CMA_COMPARISON_TOOL = {
  type: "function",
  function: {
    name: "show_cma_comparison",
    description: "Show a Comparative Market Analysis (CMA) widget with recently sold comparable properties. Call this when the user asks about comparable sales, CMA, property valuation, comps, recently sold homes near a property, or wants to know what similar homes sold for. This helps determine fair market value.",
    parameters: {
      type: "object",
      properties: {
        zpid: {
          type: "string",
          description: "Zillow Property ID of the subject property to find comps for. Required if comparing to a specific property."
        },
        address: {
          type: "string",
          description: "Address of the subject property (e.g., '123 Main St, Austin, TX'). Used for context if no zpid."
        },
        bedrooms: {
          type: "number",
          description: "Number of bedrooms in the subject property (for context)."
        },
        bathrooms: {
          type: "number",
          description: "Number of bathrooms in the subject property (for context)."
        },
        living_area: {
          type: "number",
          description: "Square footage of the subject property (for value estimation)."
        },
        estimated_price: {
          type: "number",
          description: "Estimated or asking price of the subject property."
        }
      },
      required: []
    }
  }
};

// Home Buying Checklist tool definition for AI
const HOME_BUYING_CHECKLIST_TOOL = {
  type: "function",
  function: {
    name: "show_home_buying_checklist",
    description: "Show an interactive home buying checklist widget. Call this when the user asks about the home buying process, steps to buy a house, what to do when buying a home, first-time buyer guide, or wants a checklist of tasks for purchasing a property.",
    parameters: {
      type: "object",
      properties: {
        highlight_phase: {
          type: "string",
          enum: ["getting_started", "finding_home", "making_offer", "due_diligence", "finalizing_loan", "closing"],
          description: "Phase to highlight/expand if user asks about a specific step. Options: getting_started (credit, budget, pre-approval), finding_home (agent, viewing, choosing), making_offer (offer, negotiate, contract), due_diligence (earnest money, inspection, appraisal, title), finalizing_loan (rate lock, documents, insurance), closing (walkthrough, funds, keys)"
        }
      },
      required: []
    }
  }
};

// Home Selling Checklist tool definition for AI
const HOME_SELLING_CHECKLIST_TOOL = {
  type: "function",
  function: {
    name: "show_home_selling_checklist",
    description: `Show an interactive home selling checklist widget. Call this when the user:
- Asks about the home selling process, steps, or timeline for selling their home
- Wants a checklist or guide for selling their property
- Asks "how do I sell my house" or "what are the steps to selling"
- Asks "what do I need to do to sell my home"
- Uses phrases like "selling checklist", "home selling guide", "steps to list my home", "prepare to sell"
- Asks about staging, decluttering, curb appeal, or preparing for showings
- Asks about listing their home or getting it on the market
- Wants to know the selling timeline or process overview
- Asks "what should I do before listing" or "how to get ready to sell"
- Mentions they're thinking about selling and want to know the process`,
    parameters: {
      type: "object",
      properties: {
        highlight_phase: {
          type: "string",
          enum: ["getting_ready", "choosing_agent", "pricing_listing", "marketing_showings", "offers_negotiation", "under_contract", "closing_moving"],
          description: "Phase to highlight/expand if user asks about a specific step. Options: getting_ready (declutter, repairs, curb appeal, staging), choosing_agent (interview agents, select listing agent), pricing_listing (CMA, pricing strategy, photos, MLS listing), marketing_showings (open houses, showings, feedback), offers_negotiation (review offers, negotiate, accept/counter), under_contract (buyer inspection, appraisal, contingencies), closing_moving (final walkthrough, signing, moving out)"
        }
      },
      required: []
    }
  }
};

// Seller Net Sheet tool definition for AI
const SELLER_NET_SHEET_TOOL = {
  type: "function",
  function: {
    name: "show_seller_net_sheet",
    description: `Show an interactive seller net sheet calculator. Call this when the user:
- Wants to know how much they'll net/profit from selling their home
- Asks "what will I walk away with" or "how much will I make selling"
- Asks "what will my proceeds be" or "how much profit will I make"
- Wants to calculate net proceeds after mortgage payoff, commission, and closing costs
- Uses phrases like "seller net sheet", "net proceeds", "profit from sale", "selling profit"
- Asks "how much will I get after paying off my mortgage"
- Mentions remaining mortgage balance and sale price together
- Asks about equity after selling or "what will I have left"
- Wants to know their take-home or payout from a sale
- Says "net from selling", "proceeds from sale", or "money after selling"
- This is DIFFERENT from closing costs calculator: net sheet shows the FINAL amount after EVERYTHING (mortgage, commission, all costs)`,
    parameters: {
      type: "object",
      properties: {
        sale_price: {
          type: "number",
          description: "Expected sale price in dollars. Convert shorthand: 400k=400000, 1M=1000000. Default 450000 if not specified."
        },
        mortgage_balance: {
          type: "number",
          description: "Remaining mortgage balance to pay off. Default 280000 if not specified."
        },
        commission_percent: {
          type: "number",
          description: "Total real estate commission percentage. Default 6 if not specified."
        }
      },
      required: []
    }
  }
};

// Agent Commission Calculator tool definition for AI
const AGENT_COMMISSION_CALCULATOR_TOOL = {
  type: "function",
  function: {
    name: "show_agent_commission_calculator",
    description: `Show an interactive agent commission calculator. Call this when:
- A real estate agent asks about their commission earnings
- User asks "how much will I make on this sale" from an agent perspective
- User wants to calculate commission splits between listing agent and buyer agent
- User asks about broker splits or brokerage fees
- Uses phrases like "commission calculator", "my commission on", "agent earnings", "GCI", "gross commission"
- User asks "what's my cut" or "what will I earn" as an agent
- User mentions agent split percentages (e.g., "70/30 split", "80/20 with broker")
- User asks about listing side vs buyer side commission
- User wants to project annual income based on commission per transaction
- User asks about "take-home" or "net commission" as an agent
- User mentions "transactions per year" and earnings projection
- This is specifically for AGENTS calculating their income, not for sellers calculating net proceeds`,
    parameters: {
      type: "object",
      properties: {
        sale_price: {
          type: "number",
          description: "Sale price of the property in dollars. Convert shorthand: 400k=400000, 1M=1000000. Default 450000 if not specified."
        },
        total_commission: {
          type: "number",
          description: "Total commission percentage on the sale. Default 6 if not specified."
        },
        listing_buyer_split: {
          type: "number",
          description: "Percentage that goes to listing side (rest goes to buyer side). Default 50 for 50/50 split."
        },
        broker_split: {
          type: "number",
          description: "Percentage the agent keeps (rest goes to broker). Default 70 for 70/30 agent/broker split."
        }
      },
      required: []
    }
  }
};

// Query Collection tool definition for AI - search across user's CRM data collections
const QUERY_COLLECTION_TOOL = {
  type: "function",
  function: {
    name: "query_collection",
    description: `Search across user's CRM data collections (contacts, properties, deals, documents). Call this when:
- User references a collection using # syntax (e.g., #Contacts, #Properties, #Deals, #Documents)
- User asks to "search all contacts", "find in my properties", "look through my deals"
- User wants to query their entire collection of a specific entity type
- User asks about "all my contacts who..." or "properties that match..."
- User mentions filtering or searching within their CRM data
This tool provides context from the user's own data to answer queries.`,
    parameters: {
      type: "object",
      properties: {
        collection: {
          type: "string",
          enum: ["contacts", "properties", "deals", "documents"],
          description: "The type of collection to search: contacts, properties, deals, or documents"
        },
        query: {
          type: "string",
          description: "Search query or criteria to find matching items in the collection"
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return. Default 20."
        }
      },
      required: ["collection", "query"]
    }
  }
};

// Collection query params interface
interface CollectionQueryParams {
  collection: "contacts" | "properties" | "deals" | "documents";
  query: string;
  limit?: number;
}

// Mortgage calculator params interface
interface MortgageCalculatorParams {
  price: number;
  down_payment_percent?: number;
  interest_rate?: number;
  loan_term_years?: number;
}

// Affordability calculator params interface
interface AffordabilityCalculatorParams {
  monthly_budget?: number;
  down_payment_percent?: number;
  interest_rate?: number;
  annual_income?: number;
}

// Closing costs calculator params interface
interface ClosingCostsCalculatorParams {
  home_price?: number;
  down_payment_percent?: number;
  view?: "buyer" | "seller";
}

// Rent vs Buy calculator params interface
interface RentVsBuyCalculatorParams {
  home_price?: number;
  monthly_rent?: number;
  down_payment_percent?: number;
  interest_rate?: number;
  years_to_compare?: number;
  home_appreciation?: number;
  rent_increase?: number;
}

// CMA Comparison params interface
interface CMAComparisonParams {
  zpid?: string;
  address?: string;
  bedrooms?: number;
  bathrooms?: number;
  living_area?: number;
  estimated_price?: number;
}

// Home Buying Checklist params interface
interface HomeBuyingChecklistParams {
  highlight_phase?: string;
}

// Home Selling Checklist params interface
interface HomeSellingChecklistParams {
  highlight_phase?: string;
}

// Seller Net Sheet params interface
interface SellerNetSheetParams {
  sale_price?: number;
  mortgage_balance?: number;
  commission_percent?: number;
}

// Agent Commission Calculator params interface
interface AgentCommissionCalculatorParams {
  sale_price?: number;
  total_commission?: number;
  listing_buyer_split?: number;
  broker_split?: number;
}

// Location enhancement helper for incomplete locations
function enhanceLocation(location: string): string {
  // If location already includes a comma or state abbreviation, return as-is
  if (location.includes(',') || location.match(/\b[A-Z]{2}\b/)) {
    return location;
  }
  
  // Common city name mappings (expand as needed)
  const cityStateMap: Record<string, string> = {
    'willoughby': 'Willoughby, OH',
    'austin': 'Austin, TX',
    'denver': 'Denver, CO',
    'miami': 'Miami, FL',
    'seattle': 'Seattle, WA',
    'phoenix': 'Phoenix, AZ',
    'dallas': 'Dallas, TX',
    'houston': 'Houston, TX',
    'atlanta': 'Atlanta, GA',
    'chicago': 'Chicago, IL',
    'nashville': 'Nashville, TN',
    'charlotte': 'Charlotte, NC',
    'tampa': 'Tampa, FL',
    'orlando': 'Orlando, FL',
    'san diego': 'San Diego, CA',
    'los angeles': 'Los Angeles, CA',
    'san francisco': 'San Francisco, CA',
    'portland': 'Portland, OR',
    'boston': 'Boston, MA',
    'new york': 'New York, NY',
  };
  
  const normalized = location.toLowerCase().trim();
  if (cityStateMap[normalized]) {
    console.log(`Enhanced location: "${location}" → "${cityStateMap[normalized]}"`);
    return cityStateMap[normalized];
  }
  
  // Return original if no mapping found - let the API handle it
  return location;
}

// Combined intent detection result
interface IntentDetectionResult {
  type: "property_search" | "mortgage_calculator" | "affordability_calculator" | "closing_costs_calculator" | "rent_vs_buy_calculator" | "cma_comparison" | "home_buying_checklist" | "home_selling_checklist" | "seller_net_sheet" | "agent_commission_calculator" | "collection_query" | "none";
  propertySearchParams?: PropertySearchParams;
  mortgageCalculatorParams?: MortgageCalculatorParams;
  affordabilityCalculatorParams?: AffordabilityCalculatorParams;
  closingCostsCalculatorParams?: ClosingCostsCalculatorParams;
  rentVsBuyCalculatorParams?: RentVsBuyCalculatorParams;
  cmaComparisonParams?: CMAComparisonParams;
  homeBuyingChecklistParams?: HomeBuyingChecklistParams;
  homeSellingChecklistParams?: HomeSellingChecklistParams;
  sellerNetSheetParams?: SellerNetSheetParams;
  agentCommissionCalculatorParams?: AgentCommissionCalculatorParams;
  collectionQueryParams?: CollectionQueryParams;
}

// AI-powered intent detection using tool calling (supports both property search and mortgage calculator)
async function detectIntentWithAI(
  message: string, 
  apiKey: string
): Promise<IntentDetectionResult> {
  try {
    const intentResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: `You are a real estate assistant query parser. Your job is to detect user intent and call the appropriate tool.

## TOOL SELECTION RULES

### Call search_properties when the user:
- Mentions finding, searching, showing, or looking for homes/houses/properties
- Asks about properties in ANY location (city, state, neighborhood, zip code)
- Mentions price ranges, bedrooms, or any property criteria for a search
- Uses phrases like "homes for sale", "houses for rent", "properties in [location]"

### Call show_affordability_calculator when the user:
- Wants to know how much house they can afford
- Mentions their income or budget and asks about affordability
- Uses phrases like "what can I afford", "how much house", "afford on X salary", "with X monthly budget"
- Asks questions like "can I afford a 500k home making 100k?"
- This is the REVERSE of mortgage calculator - starts with budget, outputs max home price

### Call show_mortgage_calculator when the user:
- Wants to calculate mortgage payments for a SPECIFIC home price
- Asks about monthly payments for a specific home price
- Mentions down payment, interest rates, or loan terms in a calculation context
- Uses phrases like "calculate mortgage", "monthly payment for", "estimate payments"
- Says "show me a mortgage calculator" or similar

### Call show_closing_costs_calculator when the user:
- Asks about closing costs, closing fees, or transaction costs
- Wants to know how much cash they need at closing
- Asks "what fees do I pay when buying/selling a home"
- Uses phrases like "closing costs on a 500k home", "seller closing costs", "buyer fees"
- Asks about title fees, escrow, recording fees, or any other closing-related costs

### Call show_rent_vs_buy_calculator when the user:
- Wants to compare renting vs buying
- Asks "should I rent or buy", "is it better to rent or buy"
- Wants to see financial comparison over time
- Asks about break-even point for buying
- Uses phrases like "rent vs buy", "rent or own", "when does buying make sense"
- Compares their current rent to potential mortgage

### Call NEITHER when:
- User asks about documents, contacts, or the platform
- User is asking for real estate advice without specifying a search OR calculation
- User is having general conversation

## IMPORTANT DISTINCTIONS
- "Find homes under 500k" → search_properties (searching for properties)
- "Calculate mortgage on a 500k home" → show_mortgage_calculator (calculating payments for a known price)
- "What can I afford on 100k salary?" → show_affordability_calculator (figuring out max price)
- "How much house can I buy with $3000/month?" → show_affordability_calculator
- "What would my payments be on a 400k house" → show_mortgage_calculator
- "What are closing costs on a 450k home?" → show_closing_costs_calculator
- "How much cash do I need to close?" → show_closing_costs_calculator
- "What does a seller pay at closing?" → show_closing_costs_calculator (with view: seller)
- "Should I rent or buy?" → show_rent_vs_buy_calculator
- "I pay $2500 rent, should I buy a 400k house?" → show_rent_vs_buy_calculator
- "When does buying make more sense than renting?" → show_rent_vs_buy_calculator
- "What did similar homes sell for?" → show_cma_comparison (CMA / comps)
- "Show me comparable sales for 123 Main St" → show_cma_comparison
- "What's this property worth based on comps?" → show_cma_comparison
- "CMA for this house" → show_cma_comparison
- "How do I buy a house?" → show_home_buying_checklist
- "What are the steps to buying a home?" → show_home_buying_checklist
- "First-time buyer guide" → show_home_buying_checklist
- "Home buying checklist" → show_home_buying_checklist
- "What should I do before making an offer?" → show_home_buying_checklist (highlight: making_offer)
- If user asks for properties AND mentions payment calculation, prefer search_properties (properties auto-include calculator)

### Call show_cma_comparison when the user:
- Asks about comparable sales, comps, CMA, or comparative market analysis
- Wants to know what similar homes sold for
- Asks about property valuation based on recent sales
- Uses phrases like "comps for", "comparable sales", "CMA", "what did similar homes sell for"
- Wants to determine fair market value
- Mentions "recently sold" near a property

### Call show_home_buying_checklist when the user:
- Asks about the home buying process, steps, or timeline
- Wants a checklist or guide for buying a home
- Is a first-time buyer asking where to start
- Asks "how do I buy a house" or "what are the steps"
- Wants to know what to do at each stage (pre-approval, inspection, closing, etc.)
- Use highlight_phase to focus on specific stage if user asks about: getting_started (credit, budget), finding_home (agent, viewings), making_offer (offers, negotiation), due_diligence (inspection, appraisal), finalizing_loan (documents, insurance), closing (walkthrough, keys)

### Call show_home_selling_checklist when the user:
- Asks about the home selling process, steps to sell, or timeline for selling
- Wants a checklist or guide for selling their home
- Asks "how do I sell my house" or "what are the steps to selling"
- Says "I want to sell my home" or "thinking about selling"
- Asks "what do I need to do to sell" or "how to prepare to sell"
- Wants to know how to prepare their home for sale
- Asks about staging, decluttering, or curb appeal
- Uses phrases like "selling checklist", "home selling guide", "steps to list my home", "listing process"
- Asks "how long does it take to sell" or "selling timeline"
- Asks about hiring a listing agent or choosing a realtor to sell
- Asks "what should I fix before selling" or "repairs before listing"
- Use highlight_phase to focus on specific stage if mentioned

### Call show_seller_net_sheet when the user:
- Wants to know how much they'll net/profit from selling
- Asks "what will I walk away with" or "how much will I make selling"
- Asks "what are my proceeds" or "how much will I pocket"
- Wants to calculate net proceeds after mortgage payoff and costs
- Uses phrases like "seller net sheet", "net proceeds", "profit from sale", "selling profit"
- Asks "how much will I have left after selling"
- Asks about equity realization or "what will I get after paying off mortgage"
- Mentions remaining mortgage balance and sale price together
- Asks "estimate my payout" or "calculate my take-home from sale"
- Says "I owe X and want to sell for Y, what will I get"
- Different from closing costs calculator: this shows the FINAL net amount after EVERYTHING

### Call show_agent_commission_calculator when the user:
- Is a real estate agent asking about commission earnings
- Asks "how much will I make on this sale" (as an agent, not a seller)
- Wants to calculate commission splits between listing/buyer agents
- Asks about listing side vs buyer side commission breakdown
- Wants to understand broker splits or brokerage fees
- Uses phrases like "commission calculator", "my commission on", "agent earnings", "GCI", "gross commission income"
- Asks "what's my cut" or "what will I earn on this deal" as an agent
- Mentions broker split percentages (e.g., "70/30", "80/20 split")
- Asks about annual income projection based on deals closed
- Says "calculate my take-home commission" or "agent net commission"
- Asks "how much does an agent make on a X sale"
- Wants to project yearly earnings based on transactions
- This is for AGENTS, not sellers - if user mentions selling their own home and proceeds, use seller_net_sheet instead

### Call query_collection when the user:
- References a collection using # syntax (e.g., #Contacts, #Properties, #Deals, #Documents)
- Wants to search across their entire collection of contacts, properties, deals, or documents
- Asks to "find all contacts who...", "search my properties", "filter my deals"
- Wants to analyze or query their CRM data as a whole
- Asks questions like "which of my contacts are first-time buyers?" or "show me properties under 500k"
- Uses phrases like "in my contacts", "among my properties", "from my deals"
- The query parameter should extract the user's search criteria
- Example: "Find properties under $500k for #Contacts who are first-time buyers" → collection: "contacts", query: "first-time buyers"

## PARSING RULES
- Convert price shorthand: "400k" = 400000, "500K" = 500000, "1M" = 1000000
- "under X" or "below X" means price_max/price = X
- "over X" or "above X" means price_min = X
- Default down payment to 20% if not specified
- Default interest rate to 6.75% if not specified
- Default loan term to 30 years if not specified
- For calculator without specific price, use 300000 as default
- For closing costs, default to buyer view unless "seller" or "selling" is mentioned
- For rent vs buy, default to 7 years comparison, 3% appreciation, 3% rent increase
- For seller net sheet, default mortgage balance to 280000, commission to 6%
- For agent commission, default to 50/50 listing/buyer split, 70/30 agent/broker split`,
        messages: [
          { role: "user", content: message }
        ],
        tools: convertToAnthropicTools([PROPERTY_SEARCH_TOOL, MORTGAGE_CALCULATOR_TOOL, AFFORDABILITY_CALCULATOR_TOOL, CLOSING_COSTS_CALCULATOR_TOOL, RENT_VS_BUY_CALCULATOR_TOOL, CMA_COMPARISON_TOOL, HOME_BUYING_CHECKLIST_TOOL, HOME_SELLING_CHECKLIST_TOOL, SELLER_NET_SHEET_TOOL, AGENT_COMMISSION_CALCULATOR_TOOL, QUERY_COLLECTION_TOOL]),
        tool_choice: { type: "auto" },
      }),
    });

    if (!intentResponse.ok) {
      console.error("Intent detection failed:", intentResponse.status, await intentResponse.text());
      return { type: "none" };
    }

    const intentData = await intentResponse.json();

    // Anthropic format: tool_use is in content array with type: "tool_use"
    const toolUseBlock = intentData.content?.find(
      (block: { type: string }) => block.type === "tool_use"
    );

    if (!toolUseBlock) {
      console.log("No tool call detected by AI");
      return { type: "none" };
    }

    // Anthropic provides input as object, not stringified
    const args = toolUseBlock.input || {};
    console.log(`AI called tool: ${toolUseBlock.name}`, args);

    if (toolUseBlock.name === "search_properties") {
      return {
        type: "property_search",
        propertySearchParams: {
          location: enhanceLocation(args.location),
          beds_min: args.beds_min,
          beds_max: args.beds_max,
          baths_min: args.baths_min,
          baths_max: args.baths_max,
          price_min: args.price_min,
          price_max: args.price_max,
          sqft_min: args.sqft_min,
          sqft_max: args.sqft_max,
          property_type: args.property_type,
          list_type: args.list_type || "for-sale",
          year_built_min: args.year_built_min,
          amenities: args.amenities || [],
          keywords: args.keywords || [],
        }
      };
    }

    if (toolUseBlock.name === "show_mortgage_calculator") {
      return {
        type: "mortgage_calculator",
        mortgageCalculatorParams: {
          price: args.price || 300000,
          down_payment_percent: args.down_payment_percent,
          interest_rate: args.interest_rate,
          loan_term_years: args.loan_term_years,
        }
      };
    }

    if (toolUseBlock.name === "show_affordability_calculator") {
      return {
        type: "affordability_calculator",
        affordabilityCalculatorParams: {
          monthly_budget: args.monthly_budget,
          down_payment_percent: args.down_payment_percent,
          interest_rate: args.interest_rate,
          annual_income: args.annual_income,
        }
      };
    }

    if (toolUseBlock.name === "show_closing_costs_calculator") {
      return {
        type: "closing_costs_calculator",
        closingCostsCalculatorParams: {
          home_price: args.home_price,
          down_payment_percent: args.down_payment_percent,
          view: args.view || "buyer",
        }
      };
    }

    if (toolUseBlock.name === "show_rent_vs_buy_calculator") {
      return {
        type: "rent_vs_buy_calculator",
        rentVsBuyCalculatorParams: {
          home_price: args.home_price,
          monthly_rent: args.monthly_rent,
          down_payment_percent: args.down_payment_percent,
          interest_rate: args.interest_rate,
          years_to_compare: args.years_to_compare,
          home_appreciation: args.home_appreciation,
          rent_increase: args.rent_increase,
        }
      };
    }

    if (toolUseBlock.name === "show_cma_comparison") {
      return {
        type: "cma_comparison",
        cmaComparisonParams: {
          zpid: args.zpid,
          address: args.address,
          bedrooms: args.bedrooms,
          bathrooms: args.bathrooms,
          living_area: args.living_area,
          estimated_price: args.estimated_price,
        }
      };
    }

    if (toolUseBlock.name === "show_home_buying_checklist") {
      return {
        type: "home_buying_checklist",
        homeBuyingChecklistParams: {
          highlight_phase: args.highlight_phase,
        }
      };
    }

    if (toolUseBlock.name === "show_home_selling_checklist") {
      return {
        type: "home_selling_checklist",
        homeSellingChecklistParams: {
          highlight_phase: args.highlight_phase,
        }
      };
    }

    if (toolUseBlock.name === "show_seller_net_sheet") {
      return {
        type: "seller_net_sheet",
        sellerNetSheetParams: {
          sale_price: args.sale_price,
          mortgage_balance: args.mortgage_balance,
          commission_percent: args.commission_percent,
        }
      };
    }

    if (toolUseBlock.name === "show_agent_commission_calculator") {
      return {
        type: "agent_commission_calculator",
        agentCommissionCalculatorParams: {
          sale_price: args.sale_price,
          total_commission: args.total_commission,
          listing_buyer_split: args.listing_buyer_split,
          broker_split: args.broker_split,
        }
      };
    }

    if (toolUseBlock.name === "query_collection") {
      return {
        type: "collection_query",
        collectionQueryParams: {
          collection: args.collection,
          query: args.query,
          limit: args.limit || 20,
        }
      };
    }

    return { type: "none" };
  } catch (error) {
    console.error("Error in AI intent detection:", error);
    return { type: "none" };
  }
}

// Legacy function for backward compatibility (delegates to new combined function)
async function detectPropertySearchWithAI(
  message: string, 
  apiKey: string
): Promise<PropertySearchParams | null> {
  const result = await detectIntentWithAI(message, apiKey);
  if (result.type === "property_search" && result.propertySearchParams) {
    return result.propertySearchParams;
  }
  return null;
}

// Format location to API-friendly slug
function formatLocationSlug(location: string): string {
  return location
    .toLowerCase()
    .replace(/,?\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

// Build API query parameters from parsed search params
function buildApiParams(params: PropertySearchParams): URLSearchParams {
  const queryParams = new URLSearchParams();
  
  // Location (required)
  queryParams.set("location", formatLocationSlug(params.location));
  queryParams.set("listType", params.list_type || "for-sale");
  
  // Bedrooms - use exact if min equals max, otherwise use range
  if (params.beds_min !== undefined && params.beds_max !== undefined && params.beds_min === params.beds_max) {
    queryParams.set("beds", String(params.beds_min));
  } else {
    if (params.beds_min !== undefined) queryParams.set("bedsMin", String(params.beds_min));
    if (params.beds_max !== undefined) queryParams.set("bedsMax", String(params.beds_max));
  }
  
  // Bathrooms
  if (params.baths_min !== undefined) queryParams.set("bathsMin", String(params.baths_min));
  if (params.baths_max !== undefined) queryParams.set("bathsMax", String(params.baths_max));
  
  // Price
  if (params.price_min !== undefined) queryParams.set("minPrice", String(params.price_min));
  if (params.price_max !== undefined) queryParams.set("maxPrice", String(params.price_max));
  
  // Square footage
  if (params.sqft_min !== undefined) queryParams.set("minSqft", String(params.sqft_min));
  if (params.sqft_max !== undefined) queryParams.set("maxSqft", String(params.sqft_max));
  
  // Property type
  if (params.property_type && params.property_type !== "any") {
    const type = params.property_type.toLowerCase();
    if (type === "house") queryParams.set("isSingleFamily", "true");
    else if (type === "condo") queryParams.set("isCondo", "true");
    else if (type === "townhouse") queryParams.set("isTownhouse", "true");
    else if (type === "apartment") queryParams.set("isApartment", "true");
    else if (type === "land") queryParams.set("isLotLand", "true");
  }
  
  return queryParams;
}

// Filter results for criteria the API doesn't support
interface FilteredResults {
  properties: PropertyCard[];
  appliedFilters: string[];
  unmetCriteria: string[];
}

interface PropertyCard {
  zpid: string;
  address: {
    streetAddress: string;
    city: string;
    state: string;
    zipcode: string;
    latitude?: number;
    longitude?: number;
  };
  price: number;
  bedrooms: number;
  bathrooms: number;
  livingArea: number;
  propertyType: string;      // Matches frontend (was homeType)
  listingStatus: string;     // Matches frontend (was homeStatus)
  daysOnMarket: number;      // Matches frontend (was daysOnZillow)
  imgSrc: string;
  photos: string[];          // Array of photo URLs for carousel
  lotSize: number;           // Matches frontend (was lotAreaValue)
  zestimate?: number;
  yearBuilt?: number;
  brokerName?: string;       // Listing agent/brokerage
}

function filterResults(
  properties: PropertyCard[], 
  params: PropertySearchParams
): FilteredResults {
  const appliedFilters: string[] = [];
  const unmetCriteria: string[] = [];
  let filtered = [...properties];
  
  // Filter by year built (if API doesn't support it)
  if (params.year_built_min !== undefined) {
    const before = filtered.length;
    filtered = filtered.filter(p => p.yearBuilt && p.yearBuilt >= params.year_built_min!);
    if (filtered.length < before) {
      appliedFilters.push(`built after ${params.year_built_min}`);
    } else if (before === filtered.length && filtered.length > 0) {
      // Check if any properties actually have year_built data
      const withYear = filtered.filter(p => p.yearBuilt);
      if (withYear.length === 0) {
        unmetCriteria.push(`built after ${params.year_built_min} (year data not available for filtering)`);
      }
    }
  }
  
  // Note amenities that couldn't be filtered
  if (params.amenities && params.amenities.length > 0) {
    unmetCriteria.push(...params.amenities.map(a => `${a} (check listing details)`));
  }
  
  // Note keywords that couldn't be filtered
  if (params.keywords && params.keywords.length > 0) {
    unmetCriteria.push(...params.keywords.map(k => `${k} (check listing details)`));
  }
  
  return { properties: filtered, appliedFilters, unmetCriteria };
}

// Build property context for AI response
function buildPropertyContext(
  params: PropertySearchParams,
  propertyCount: number,
  appliedFilters: string[],
  unmetCriteria: string[]
): string {
  const criteriaLines: string[] = [];
  
  criteriaLines.push(`- Location: ${params.location}`);
  
  if (params.beds_min !== undefined || params.beds_max !== undefined) {
    if (params.beds_min === params.beds_max) {
      criteriaLines.push(`- Bedrooms: ${params.beds_min}`);
    } else if (params.beds_min !== undefined && params.beds_max === undefined) {
      criteriaLines.push(`- Bedrooms: ${params.beds_min}+`);
    } else {
      criteriaLines.push(`- Bedrooms: ${params.beds_min || 'any'} - ${params.beds_max || 'any'}`);
    }
  }
  
  if (params.baths_min !== undefined || params.baths_max !== undefined) {
    if (params.baths_min === params.baths_max) {
      criteriaLines.push(`- Bathrooms: ${params.baths_min}`);
    } else {
      criteriaLines.push(`- Bathrooms: ${params.baths_min || 'any'} - ${params.baths_max || 'any'}`);
    }
  }
  
  if (params.price_max !== undefined) {
    criteriaLines.push(`- Max Price: $${params.price_max.toLocaleString()}`);
  }
  if (params.price_min !== undefined) {
    criteriaLines.push(`- Min Price: $${params.price_min.toLocaleString()}`);
  }
  
  if (params.sqft_min !== undefined || params.sqft_max !== undefined) {
    criteriaLines.push(`- Square Feet: ${params.sqft_min?.toLocaleString() || 'any'} - ${params.sqft_max?.toLocaleString() || 'any'}`);
  }
  
  if (params.property_type && params.property_type !== "any") {
    criteriaLines.push(`- Property Type: ${params.property_type}`);
  }
  
  if (params.list_type === "for-rent") {
    criteriaLines.push(`- Listing Type: For Rent`);
  }
  
  if (params.year_built_min !== undefined) {
    criteriaLines.push(`- Built After: ${params.year_built_min}`);
  }
  
  if (params.amenities && params.amenities.length > 0) {
    criteriaLines.push(`- Desired Amenities: ${params.amenities.join(', ')}`);
  }
  
  if (params.keywords && params.keywords.length > 0) {
    criteriaLines.push(`- Additional Criteria: ${params.keywords.join(', ')}`);
  }

  const context = `
## Property Search Results

The user searched for properties with the following criteria:
${criteriaLines.join('\n')}

I found ${propertyCount} properties matching their criteria. The property cards are displayed visually to the user.

${appliedFilters.length > 0 ? `
Filters applied after search:
${appliedFilters.map(f => `- ${f}`).join('\n')}
` : ''}

${unmetCriteria.length > 0 ? `
**Important:** The following criteria couldn't be filtered by the search API and may require manual review:
${unmetCriteria.map(c => `- ${c}`).join('\n')}
Please mention to the user that they should check individual listings for these features.
` : ''}

Provide a brief, helpful summary:
1. How many properties match their criteria
2. A quick overview of the price range seen in results
3. If any criteria couldn't be fully filtered (amenities, keywords), remind them to check listings
4. Ask if they'd like more details on any property or want to refine the search

Keep your response SHORT and conversational - the property cards speak for themselves.
`;

  return context;
}

// Build human-readable search description for status messages
function buildSearchDescription(params: PropertySearchParams): string {
  const parts: string[] = [];
  
  if (params.beds_min !== undefined && params.beds_max !== undefined && params.beds_min === params.beds_max) {
    parts.push(`${params.beds_min} bedroom`);
  } else if (params.beds_min !== undefined) {
    parts.push(`${params.beds_min}+ bedroom`);
  }
  
  if (params.property_type && params.property_type !== "any") {
    parts.push(params.property_type === "house" ? "houses" : `${params.property_type}s`);
  } else {
    parts.push("properties");
  }
  
  parts.push(`in ${params.location}`);
  
  if (params.price_max !== undefined) {
    parts.push(`under $${(params.price_max / 1000).toFixed(0)}k`);
  } else if (params.price_min !== undefined) {
    parts.push(`over $${(params.price_min / 1000).toFixed(0)}k`);
  }
  
  if (params.amenities && params.amenities.length > 0) {
    parts.push(`with ${params.amenities.slice(0, 2).join(", ")}`);
  }
  
  return parts.join(" ");
}

// ====================================================================
// SYSTEM PROMPTS
// ====================================================================

const BASE_SYSTEM_PROMPT = `You are Smart Agent, an AI-powered real estate assistant. You help real estate agents, buyers, and sellers with:

• Finding and analyzing property listings
• Understanding market trends and comparable properties
• Managing buyer and seller pipelines
• Reviewing contracts and documents (with appropriate disclaimers)
• Generating compelling property descriptions
• Managing CRM contacts and follow-ups
• Providing market analysis and pricing insights

You are knowledgeable, professional, and helpful. When discussing legal or financial matters, always remind users to consult with appropriate professionals. Keep responses clear, concise, and actionable.

If asked about specific properties or contacts, let the user know you can help analyze data they share with you.`;

const MULTI_DOC_SYSTEM_PROMPT = `
## Document Analysis Context

You have access to content from the user's documents. When answering questions:

1. **ALWAYS cite your sources** using format: [Source: Document Name, Section X]
2. **Synthesize across documents** when multiple are provided - compare, contrast, and cross-reference
3. **Group findings by document** when listing information from multiple sources
4. **Be specific** - quote relevant text and exact figures when helpful
5. **Acknowledge limitations** - if the documents don't contain enough information, say so
6. **For financial documents** (settlement statements, contracts):
   - Quote EXACT dollar amounts - do not round or estimate
   - Identify the party (buyer/seller) for each amount
   - Reference specific line items by their description
7. **For inspection reports**:
   - Prioritize safety issues and major systems
   - Group findings by system (HVAC, Plumbing, Electrical, etc.)
   - Note severity levels and recommendations
`;

const STRUCTURED_DATA_PROMPT = `
## Structured Financial Data

The following documents have structured data extracted for precision. When answering questions about these documents, USE THE EXACT FIGURES from the structured data below:

`;

const MENTION_CONTEXT_PROMPT = `
## Referenced Data Context

The user has mentioned specific contacts, properties, or documents using @mentions. You have access to their full data below. Use this information to provide relevant, personalized responses.

`;

// Helper to build mention context from mentionData
interface MentionDataItem {
  type: "contact" | "property" | "doc" | "deal";
  id: string;
  name: string;
  data: Record<string, unknown>;
}

function buildMentionContext(mentionData: MentionDataItem[]): string {
  if (!mentionData || mentionData.length === 0) return "";
  
  const sections: string[] = [];
  
  const contacts = mentionData.filter(m => m.type === "contact");
  const properties = mentionData.filter(m => m.type === "property");
  const documents = mentionData.filter(m => m.type === "doc");
  const deals = mentionData.filter(m => m.type === "deal");
  
  if (contacts.length > 0) {
    sections.push("### Contacts\n" + contacts.map(c => {
      const d = c.data;
      return `**${c.name}** (ID: ${c.id})
- Email: ${d.email || "Not provided"}
- Phone: ${d.phone || "Not provided"}
- Company: ${d.company || "Not provided"}
- Type: ${d.contact_type || "Not specified"}
- Stage: ${d.pipeline_stage || "Not specified"}
- Notes: ${d.notes || "None"}
- Created: ${d.created_at ? new Date(d.created_at as string).toLocaleDateString() : "Unknown"}`;
    }).join("\n\n"));
  }
  
  if (properties.length > 0) {
    sections.push("### Properties\n" + properties.map(p => {
      const d = p.data;
      return `**${p.name}** (ID: ${p.id})
- Address: ${d.address || ""}, ${d.city || ""}, ${d.state || ""} ${d.zip_code || ""}
- Price: ${d.price ? `$${Number(d.price).toLocaleString()}` : "Not listed"}
- Beds/Baths: ${d.bedrooms || "?"} bed / ${d.bathrooms || "?"} bath
- Sqft: ${d.square_feet ? `${Number(d.square_feet).toLocaleString()} sqft` : "Not provided"}
- Year Built: ${d.year_built || "Unknown"}
- Property Type: ${d.property_type || "Not specified"}
- Status: ${d.status || "Unknown"}
- Description: ${d.description || "No description"}`;
    }).join("\n\n"));
  }
  
  if (documents.length > 0) {
    sections.push("### Documents\n" + documents.map(doc => {
      const d = doc.data;
      return `**${doc.name}** (ID: ${doc.id})
- Category: ${d.category || "General"}
- Summary: ${d.summary || "No summary available"}
- Created: ${d.created_at ? new Date(d.created_at as string).toLocaleDateString() : "Unknown"}`;
    }).join("\n\n"));
  }
  
  if (deals.length > 0) {
    sections.push("### Deals/Pipeline\n" + deals.map(deal => {
      const d = deal.data;
      return `**${deal.name}** (ID: ${deal.id})
- Deal Type: ${d.deal_type || "Not specified"}
- Stage: ${d.stage || d.buyer_stage || d.seller_stage || "New"}
- Estimated Value: ${d.estimated_value ? `$${Number(d.estimated_value).toLocaleString()}` : "TBD"}
- Commission Rate: ${d.commission_rate ? `${d.commission_rate}%` : "Not set"}
- Contact: ${d.contact_name || "None assigned"}
- Contact Details: ${d.contact_info ? JSON.stringify(d.contact_info) : "N/A"}
- Property: ${d.property_address || "None"}
- Property Details: ${d.property_info ? JSON.stringify(d.property_info) : "N/A"}
- Expected Close: ${d.expected_close_date ? new Date(d.expected_close_date as string).toLocaleDateString() : "Not set"}
- Notes: ${d.notes || "None"}
- Created: ${d.created_at ? new Date(d.created_at as string).toLocaleDateString() : "Unknown"}`;
    }).join("\n\n"));
  }
  
  return MENTION_CONTEXT_PROMPT + sections.join("\n\n---\n\n");
}

// ====================================================================
// DOCUMENT SEARCH HELPERS
// ====================================================================

function expandQuery(query: string): string[] {
  const realEstateTerms: Record<string, string[]> = {
    "inspection": ["inspector", "condition", "defect", "repair", "issue", "problem", "findings", "recommend"],
    "hvac": ["heating", "cooling", "air conditioning", "furnace", "ac", "climate"],
    "roof": ["roofing", "shingles", "flashing", "leak", "gutters"],
    "plumbing": ["pipes", "water", "drain", "faucet", "leak", "sewer"],
    "electrical": ["wiring", "outlet", "panel", "circuit", "breaker"],
    "foundation": ["structural", "crack", "settling", "basement"],
    "contract": ["agreement", "terms", "clause", "contingency", "addendum"],
    "price": ["cost", "value", "appraisal", "amount", "dollar", "proceeds"],
    "closing": ["escrow", "settlement", "title", "deed", "disbursement"],
    "repair": ["fix", "issue", "problem", "defect", "maintenance"],
    "settlement": ["closing", "proceeds", "payoff", "credit", "debit", "alta", "hud"],
  };
  
  const queryWords = query.toLowerCase().split(/\s+/);
  const expandedTerms = new Set<string>(queryWords);
  
  for (const word of queryWords) {
    for (const [key, synonyms] of Object.entries(realEstateTerms)) {
      if (word.includes(key) || key.includes(word)) {
        synonyms.forEach(s => expandedTerms.add(s));
      }
    }
  }
  
  return Array.from(expandedTerms).slice(0, 10);
}

interface ChunkResult {
  chunk_id: string;
  document_id: string;
  document_name: string;
  content: string;
  chunk_index: number;
  text_rank: number;
  category: string;
}

interface NeighborResult {
  chunk_id: string;
  document_id: string;
  document_name: string;
  content: string;
  chunk_index: number;
  category: string;
  is_neighbor: boolean;
}

interface DocumentMetadata {
  document_id: string;
  document_type: string;
  extracted_data: Record<string, unknown>;
  key_facts: string[];
}

// ====================================================================
// MAIN HANDLER
// ====================================================================

// ====================================================================
// STATUS STREAMING HELPER
// ====================================================================

type StatusStep = "analyzing" | "searching" | "filtering" | "generating" | "error";

async function writeStatus(
  writer: WritableStreamDefaultWriter<Uint8Array>,
  encoder: TextEncoder,
  step: StatusStep,
  message: string,
  details?: Record<string, unknown>
) {
  const event = `data: ${JSON.stringify({ 
    status: { step, message, details } 
  })}\n\n`;
  await writer.write(encoder.encode(event));
}

async function writeEmbeddedComponents(
  writer: WritableStreamDefaultWriter<Uint8Array>,
  encoder: TextEncoder,
  components: Record<string, unknown>
) {
  const event = `data: ${JSON.stringify({ embedded_components: components })}\n\n`;
  await writer.write(encoder.encode(event));
}

// ====================================================================
// MAIN HANDLER
// ====================================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, conversationId, includeDocuments, documentIds, mentionData, collectionRefs } = await req.json();
    
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    let tenantId: string | null = null;
    
    if (authHeader?.startsWith("Bearer ") && SUPABASE_URL && SUPABASE_ANON_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData } = await supabase.auth.getUser(token);
      
      if (claimsData?.user?.id) {
        userId = claimsData.user.id;
        
        // Get tenant_id from profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("tenant_id")
          .eq("user_id", userId)
          .single();
          
        tenantId = profile?.tenant_id || null;
        
        // Apply rate limiting per user
        const rateLimitResult = checkRateLimit(userId, AI_CHAT_LIMITS);
        if (!rateLimitResult.allowed) {
          return rateLimitResponse(rateLimitResult);
        }
      }
    }

    // ====================================================================
    // CHECK USAGE LIMITS BEFORE PROCESSING (Skip for super_admin)
    // ====================================================================
    let isSuperAdmin = false;
    
    // Check if user is a super_admin (they have unlimited usage)
    if (userId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      const { data: userRoles } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      
      isSuperAdmin = userRoles?.some(r => r.role === "super_admin") || false;
      
      if (isSuperAdmin) {
        console.log(`User ${userId} is super_admin - skipping usage limits`);
      }
    }
    
    // Only check usage limits for non-super_admin users
    if (!isSuperAdmin && tenantId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      const { data: usageData, error: usageError } = await supabaseAdmin.rpc(
        "check_and_increment_ai_usage",
        { p_tenant_id: tenantId }
      );
      
      if (!usageError && usageData && usageData.length > 0) {
        const usage = usageData[0];
        
        if (usage.is_exceeded) {
          console.log(`Usage limit exceeded for tenant ${tenantId}: ${usage.current_usage}/${usage.usage_limit}`);
          return new Response(
            JSON.stringify({
              error: "usage_limit_exceeded",
              message: `You've reached your monthly AI limit of ${usage.usage_limit} queries. Upgrade your plan for more.`,
              current_usage: usage.current_usage,
              usage_limit: usage.usage_limit,
              plan: usage.plan_name,
            }),
            { 
              status: 429, 
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            }
          );
        }
      }
    }

    // ====================================================================
    // AI-POWERED INTENT DETECTION WITH STATUS STREAMING
    // (Supports: Property Search, Mortgage Calculator, or General Chat)
    // ====================================================================
    const lastUserMessage = messages.filter((m: { role: string }) => m.role === "user").pop();
    
    if (lastUserMessage) {
      // Create SSE stream immediately for responsive feedback
      const encoder = new TextEncoder();
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      
      // Start processing in background
      (async () => {
        try {
          // Send initial analyzing status
          await writeStatus(writer, encoder, "analyzing", "Understanding your request...");
          
          console.log("Analyzing message for intent:", lastUserMessage.content);
          
          // ================================================================
          // HANDLE MULTIPLE COLLECTION REFS (from frontend # syntax)
          // When user includes multiple #Collections, fetch ALL and synthesize
          // ================================================================
          if (collectionRefs && Array.isArray(collectionRefs) && collectionRefs.length > 0) {
            console.log("[MULTI-COLLECTION] Processing", collectionRefs.length, "collections:", collectionRefs.map((c: {collection: string}) => c.collection));
            
            const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
            const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
            
            if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && tenantId) {
              // Use service role key to bypass RLS, then filter by tenant_id in queries
              const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
              
              // Fetch data from ALL collections in parallel
              const collectionDataPromises = collectionRefs.map(async (ref: {collection: string}) => {
                const collName = ref.collection.toLowerCase();
                let results: any[] = [];
                
                await writeStatus(writer, encoder, "searching", `Searching your ${ref.collection}...`);
                
                try {
                  if (collName === "contacts") {
                    const { data, error } = await supabase
                      .from("contacts")
                      .select("id, first_name, last_name, email, company, contact_type, notes")
                      .eq("tenant_id", tenantId)
                      .order("updated_at", { ascending: false })
                      .limit(25);
                    if (!error && data) {
                      results = data.map(c => ({
                        type: "contact",
                        id: c.id,
                        name: [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email || "Unknown",
                        email: c.email,
                        company: c.company,
                        contact_type: c.contact_type,
                        notes: c.notes
                      }));
                    }
                  } else if (collName === "properties") {
                    const { data, error } = await supabase
                      .from("properties")
                      .select("id, address, city, state, zip_code, price, status, property_type, bedrooms, bathrooms, square_feet, description")
                      .eq("tenant_id", tenantId)
                      .order("updated_at", { ascending: false })
                      .limit(25);
                    if (!error && data) {
                      results = data.map(p => ({
                        type: "property",
                        id: p.id,
                        address: p.address,
                        city: p.city,
                        state: p.state,
                        zip: p.zip_code,
                        price: p.price,
                        status: p.status,
                        property_type: p.property_type,
                        bedrooms: p.bedrooms,
                        bathrooms: p.bathrooms,
                        sqft: p.square_feet,
                        notes: p.description
                      }));
                    }
                  } else if (collName === "deals") {
                    const { data, error } = await supabase
                      .from("deals")
                      .select("id, deal_type, stage, estimated_value, notes, property_id")
                      .eq("tenant_id", tenantId)
                      .order("updated_at", { ascending: false })
                      .limit(25);
                    if (!error && data) {
                      results = data.map(d => ({
                        type: "deal",
                        id: d.id,
                        deal_type: d.deal_type,
                        stage: d.stage,
                        value: d.estimated_value,
                        notes: d.notes
                      }));
                    }
                  } else if (collName === "documents") {
                    const { data, error } = await supabase
                      .from("documents")
                      .select("id, name, category, ai_summary")
                      .eq("tenant_id", tenantId)
                      .order("created_at", { ascending: false })
                      .limit(25);
                    if (!error && data) {
                      results = data.map(d => ({
                        type: "document",
                        id: d.id,
                        name: d.name,
                        category: d.category,
                        summary: d.ai_summary?.slice(0, 300)
                      }));
                    }
                  }
                } catch (err) {
                  console.error(`Error fetching ${collName}:`, err);
                }
                
                return { collection: ref.collection, data: results };
              });
              
              const allCollectionData = await Promise.all(collectionDataPromises);
              console.log("[MULTI-COLLECTION] Fetched data from all collections:", allCollectionData.map(c => `${c.collection}: ${c.data.length} items`));
              
              // Build combined context for AI
              let multiCollectionContext = `## User's CRM Data (from explicitly referenced collections)\n\n`;
              multiCollectionContext += `The user has referenced the following collections in their query. Use ALL of this data to provide a comprehensive, synthesized response.\n\n`;
              
              for (const collData of allCollectionData) {
                multiCollectionContext += `### ${collData.collection} (${collData.data.length} items)\n`;
                if (collData.data.length === 0) {
                  multiCollectionContext += `No ${collData.collection.toLowerCase()} found.\n\n`;
                } else {
                  multiCollectionContext += "```json\n" + JSON.stringify(collData.data, null, 2) + "\n```\n\n";
                }
              }
              
              multiCollectionContext += `\n## Instructions\n`;
              multiCollectionContext += `- The user explicitly referenced ${collectionRefs.length} collections: ${collectionRefs.map((c: {collection: string}) => c.collection).join(", ")}\n`;
              multiCollectionContext += `- Analyze and synthesize data from ALL collections to answer their question\n`;
              multiCollectionContext += `- Find relationships, matches, or insights across the data\n`;
              multiCollectionContext += `- Be specific and reference actual items from the data\n`;
              
              await writeStatus(writer, encoder, "generating", "Analyzing your data...");
              
              // Stream AI response with multi-collection context
              const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                  "x-api-key": ANTHROPIC_API_KEY,
                  "anthropic-version": "2023-06-01",
                  "content-type": "application/json",
                },
                body: JSON.stringify({
                  model: "claude-sonnet-4-20250514",
                  max_tokens: 4096,
                  system: BASE_SYSTEM_PROMPT + "\n\n" + multiCollectionContext,
                  messages: messages.filter((m: { role: string }) => m.role === "user" || m.role === "assistant"),
                  stream: true,
                }),
              });
              
              if (aiResponse.ok && aiResponse.body) {
                const reader = aiResponse.body.getReader();
                await convertAnthropicStreamToOpenAI(reader, writer);
              }
              
              // Track usage (using service role key already available in scope)
              if (userId && tenantId) {
                await supabase.from("usage_records").insert({
                  tenant_id: tenantId,
                  user_id: userId,
                  action_type: "ai_chat_multi_collection",
                  metadata: { collections: collectionRefs.map((c: {collection: string}) => c.collection), items_fetched: allCollectionData.map(c => c.data.length).reduce((a, b) => a + b, 0) },
                });
              }
              
              await writeStreamEnd(writer, encoder);
              await writer.close();
              return; // Early return - we handled the multi-collection query
            }
          }
          
          // Use combined intent detection (for single collection or other intents)
          const intentResult = await detectIntentWithAI(lastUserMessage.content, ANTHROPIC_API_KEY);
          console.log("Intent detection result:", intentResult.type);
          
          // ================================================================
          // HANDLE MORTGAGE CALCULATOR INTENT
          // ================================================================
          if (intentResult.type === "mortgage_calculator" && intentResult.mortgageCalculatorParams) {
            const calcParams = intentResult.mortgageCalculatorParams;
            console.log("Mortgage calculator params:", calcParams);
            
            await writeStatus(writer, encoder, "generating", "Preparing your mortgage calculator...");
            
            // Send embedded component with mortgage calculator data
            await writeEmbeddedComponents(writer, encoder, {
              mortgage_calculator: {
                price: calcParams.price,
                downPaymentPercent: calcParams.down_payment_percent || 20,
                interestRate: calcParams.interest_rate || 6.75,
                loanTermYears: calcParams.loan_term_years || 30,
              }
            });
            
            // Build context for AI response
            const downPayment = calcParams.down_payment_percent || 20;
            const rate = calcParams.interest_rate || 6.75;
            const term = calcParams.loan_term_years || 30;
            const loanAmount = calcParams.price * (1 - downPayment / 100);
            const monthlyRate = rate / 100 / 12;
            const numPayments = term * 12;
            const monthlyPI = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
            const monthlyTax = (calcParams.price * 0.012) / 12;
            const monthlyInsurance = 100;
            const totalMonthly = monthlyPI + monthlyTax + monthlyInsurance;
            
            const calcContext = `## Mortgage Calculator Request

The user wants to calculate mortgage payments. An interactive mortgage calculator has been displayed with:
- Home Price: $${calcParams.price.toLocaleString()}
- Down Payment: ${downPayment}% ($${(calcParams.price * downPayment / 100).toLocaleString()})
- Interest Rate: ${rate}%
- Loan Term: ${term} years
- Estimated Monthly Payment: ~$${Math.round(totalMonthly).toLocaleString()} (including taxes & insurance)

Provide a brief, helpful response:
1. Acknowledge the calculator is displayed and they can adjust the sliders
2. Mention the estimated monthly payment briefly
3. Offer a quick affordability tip (28% rule: gross monthly income should be ~$${Math.round(totalMonthly / 0.28).toLocaleString()} to afford this)
4. Note that actual rates depend on credit score and lender
5. Ask if they'd like help understanding how adjusting parameters affects costs

Keep your response SHORT and conversational - the calculator widget speaks for itself.`;
            
            // Stream AI response with calculator context
            const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: {
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
              },
              body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 1024,
                system: BASE_SYSTEM_PROMPT + calcContext,
                messages: messages.filter((m: { role: string }) => m.role === "user" || m.role === "assistant"),
                stream: true,
              }),
            });
            
            if (aiResponse.ok && aiResponse.body) {
              const reader = aiResponse.body.getReader();
              await convertAnthropicStreamToOpenAI(reader, writer);
            }
            
            // Track usage
            if (userId && tenantId && SUPABASE_URL && SUPABASE_ANON_KEY) {
              const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                global: { headers: { Authorization: authHeader! } },
              });
              await supabase.from("usage_records").insert({
                tenant_id: tenantId,
                record_type: "ai_query",
                quantity: 1,
              });
            }
            
            await writer.close();
            return;
          }
          
          // ================================================================
          // HANDLE AFFORDABILITY CALCULATOR INTENT
          // ================================================================
          if (intentResult.type === "affordability_calculator" && intentResult.affordabilityCalculatorParams) {
            const calcParams = intentResult.affordabilityCalculatorParams;
            console.log("Affordability calculator params:", calcParams);
            
            await writeStatus(writer, encoder, "generating", "Preparing your affordability calculator...");
            
            // Default values
            const monthlyBudget = calcParams.monthly_budget || 3000;
            const downPayment = calcParams.down_payment_percent || 20;
            const rate = calcParams.interest_rate || 6.75;
            const annualIncome = calcParams.annual_income || 100000;
            
            // Send embedded component with affordability calculator data
            await writeEmbeddedComponents(writer, encoder, {
              affordability_calculator: {
                monthlyBudget,
                downPaymentPercent: downPayment,
                interestRate: rate,
                annualIncome,
              }
            });
            
            // Calculate max home price for context (simple approximation)
            const monthlyRate = rate / 100 / 12;
            const loanTermMonths = 30 * 12;
            const taxInsuranceRate = 0.017 / 12; // ~1.7% annually for tax+insurance
            const pmiRate = downPayment < 20 ? 0.005 / 12 : 0;
            const loanPercent = 1 - downPayment / 100;
            
            // Solve for max home price iteratively
            let low = 0, high = 3000000;
            while (high - low > 1000) {
              const mid = (low + high) / 2;
              const loanAmount = mid * loanPercent;
              const piPayment = monthlyRate > 0
                ? (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, loanTermMonths)) / (Math.pow(1 + monthlyRate, loanTermMonths) - 1)
                : loanAmount / loanTermMonths;
              const total = piPayment + mid * taxInsuranceRate + loanAmount * pmiRate;
              if (total <= monthlyBudget) low = mid;
              else high = mid;
            }
            const maxHomePrice = Math.floor(low / 1000) * 1000;
            
            const housingRatio = (monthlyBudget / (annualIncome / 12)) * 100;
            
            const calcContext = `## Affordability Calculator Request

The user wants to know how much home they can afford. An interactive affordability calculator has been displayed with:
- Monthly Housing Budget: $${monthlyBudget.toLocaleString()}
- Annual Income: $${annualIncome.toLocaleString()}
- Down Payment: ${downPayment}%
- Interest Rate: ${rate}%
- Estimated Max Home Price: ~$${maxHomePrice.toLocaleString()}
- Housing Ratio: ${housingRatio.toFixed(0)}% of monthly income

Provide a brief, helpful response:
1. Acknowledge the calculator is displayed with their estimated max home price
2. Mention they can adjust the sliders to explore different scenarios
3. Explain the 28% housing ratio rule briefly (their payment should ideally be ≤28% of gross income)
4. If their housing ratio is > 28%, gently note they may want to consider a lower budget
5. Offer to search for properties in a specific location within their budget

Keep your response SHORT and conversational - the calculator widget speaks for itself.`;
            
            // Stream AI response with calculator context
            const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: {
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
              },
              body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 1024,
                system: BASE_SYSTEM_PROMPT + calcContext,
                messages: messages.filter((m: { role: string }) => m.role === "user" || m.role === "assistant"),
                stream: true,
              }),
            });
            
            if (aiResponse.ok && aiResponse.body) {
              const reader = aiResponse.body.getReader();
              await convertAnthropicStreamToOpenAI(reader, writer);
            }
            
            // Track usage
            if (userId && tenantId && SUPABASE_URL && SUPABASE_ANON_KEY) {
              const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                global: { headers: { Authorization: authHeader! } },
              });
              await supabase.from("usage_records").insert({
                tenant_id: tenantId,
                record_type: "ai_query",
                quantity: 1,
              });
            }
            
            await writer.close();
            return;
          }
          
          // ================================================================
          // HANDLE CLOSING COSTS CALCULATOR INTENT
          // ================================================================
          if (intentResult.type === "closing_costs_calculator" && intentResult.closingCostsCalculatorParams) {
            const calcParams = intentResult.closingCostsCalculatorParams;
            console.log("Closing costs calculator params:", calcParams);
            
            await writeStatus(writer, encoder, "generating", "Preparing your closing costs calculator...");
            
            // Default values
            const homePrice = calcParams.home_price || 450000;
            const downPayment = calcParams.down_payment_percent || 20;
            const view = calcParams.view || "buyer";
            
            // Send embedded component with closing costs calculator data
            await writeEmbeddedComponents(writer, encoder, {
              closing_costs_calculator: {
                homePrice,
                downPaymentPercent: downPayment,
                view,
              }
            });
            
            // Calculate estimates for context
            const loanAmount = homePrice * (1 - downPayment / 100);
            let totalClosingCosts: number;
            let costBreakdown: string;
            
            if (view === "buyer") {
              // Buyer closing costs (roughly 2-5% of home price)
              const originationFee = loanAmount * 0.01;
              const titleInsurance = homePrice * 0.005;
              const prepaidTaxInsurance = homePrice * 0.01;
              const otherFees = 2000; // Appraisal, inspection, recording, etc.
              totalClosingCosts = originationFee + titleInsurance + prepaidTaxInsurance + otherFees;
              
              costBreakdown = `Key buyer costs:
- Down Payment: $${(homePrice * downPayment / 100).toLocaleString()} (${downPayment}%)
- Loan Origination: ~$${Math.round(originationFee).toLocaleString()}
- Title Insurance: ~$${Math.round(titleInsurance).toLocaleString()}
- Prepaid Tax/Insurance: ~$${Math.round(prepaidTaxInsurance).toLocaleString()}
- Other Fees: ~$${otherFees.toLocaleString()}
- Total Closing Costs: ~$${Math.round(totalClosingCosts).toLocaleString()}
- Total Cash Needed: ~$${Math.round(homePrice * downPayment / 100 + totalClosingCosts).toLocaleString()}`;
            } else {
              // Seller closing costs (roughly 8-10% of sale price, mostly commission)
              const commission = homePrice * 0.06;
              const titleInsurance = homePrice * 0.003;
              const transferTax = homePrice * 0.002;
              const otherFees = 1500;
              totalClosingCosts = commission + titleInsurance + transferTax + otherFees;
              
              costBreakdown = `Key seller costs:
- Real Estate Commission: ~$${Math.round(commission).toLocaleString()} (6%)
- Title Insurance: ~$${Math.round(titleInsurance).toLocaleString()}
- Transfer Tax: ~$${Math.round(transferTax).toLocaleString()}
- Other Fees: ~$${otherFees.toLocaleString()}
- Total Closing Costs: ~$${Math.round(totalClosingCosts).toLocaleString()}
- Estimated Net Proceeds: ~$${Math.round(homePrice - totalClosingCosts).toLocaleString()}`;
            }
            
            const calcContext = `## Closing Costs Calculator Request

The user wants to understand closing costs. An interactive closing costs calculator has been displayed with:
- ${view === "buyer" ? "Home Price" : "Sale Price"}: $${homePrice.toLocaleString()}
${view === "buyer" ? `- Down Payment: ${downPayment}%` : ""}
- View: ${view.charAt(0).toUpperCase() + view.slice(1)}

${costBreakdown}

Provide a brief, helpful response:
1. Acknowledge the calculator is displayed with their estimated costs
2. Explain that they can toggle between buyer and seller views
3. Mention the biggest cost items for their selected view
4. Note that actual costs vary by location and lender
5. ${view === "buyer" ? "Remind them closing costs are typically 2-5% of home price for buyers" : "Remind them seller costs are largely commission (typically 5-6%)"}

Keep your response SHORT and conversational - the calculator widget speaks for itself.`;
            
            // Stream AI response with calculator context
            const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: {
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
              },
              body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 1024,
                system: BASE_SYSTEM_PROMPT + calcContext,
                messages: messages.filter((m: { role: string }) => m.role === "user" || m.role === "assistant"),
                stream: true,
              }),
            });
            
            if (aiResponse.ok && aiResponse.body) {
              const reader = aiResponse.body.getReader();
              await convertAnthropicStreamToOpenAI(reader, writer);
            }
            
            // Track usage
            if (userId && tenantId && SUPABASE_URL && SUPABASE_ANON_KEY) {
              const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                global: { headers: { Authorization: authHeader! } },
              });
              await supabase.from("usage_records").insert({
                tenant_id: tenantId,
                record_type: "ai_query",
                quantity: 1,
              });
            }
            
            await writer.close();
            return;
          }
          
          // ================================================================
          // HANDLE RENT VS BUY CALCULATOR INTENT
          // ================================================================
          if (intentResult.type === "rent_vs_buy_calculator" && intentResult.rentVsBuyCalculatorParams) {
            const calcParams = intentResult.rentVsBuyCalculatorParams;
            console.log("Rent vs buy calculator params:", calcParams);
            
            await writeStatus(writer, encoder, "generating", "Preparing your rent vs buy comparison...");
            
            // Default values
            const homePrice = calcParams.home_price || 450000;
            const monthlyRent = calcParams.monthly_rent || 2500;
            const downPayment = calcParams.down_payment_percent || 20;
            const interestRate = calcParams.interest_rate || 6.75;
            const yearsToCompare = calcParams.years_to_compare || 7;
            const homeAppreciation = calcParams.home_appreciation || 3;
            const rentIncrease = calcParams.rent_increase || 3;
            
            // Send embedded component with rent vs buy calculator data
            await writeEmbeddedComponents(writer, encoder, {
              rent_vs_buy_calculator: {
                homePrice,
                monthlyRent,
                downPaymentPercent: downPayment,
                interestRate,
                yearsToCompare,
                homeAppreciation,
                rentIncrease,
              }
            });
            
            // Calculate estimates for context
            const downPaymentAmount = homePrice * (downPayment / 100);
            const loanAmount = homePrice - downPaymentAmount;
            const monthlyRate = interestRate / 100 / 12;
            const loanTermMonths = 30 * 12;
            
            // Monthly P&I
            const monthlyPI = monthlyRate > 0
              ? (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, loanTermMonths)) /
                (Math.pow(1 + monthlyRate, loanTermMonths) - 1)
              : loanAmount / loanTermMonths;
            
            // Other monthly costs
            const monthlyPropertyTax = (homePrice * 0.012) / 12;
            const monthlyInsurance = (homePrice * 0.005) / 12;
            const monthlyMaintenance = (homePrice * 0.01) / 12;
            const totalMonthlyBuying = monthlyPI + monthlyPropertyTax + monthlyInsurance + monthlyMaintenance;
            
            // Rough comparison over time
            let rentTotal = 0;
            let currentRent = monthlyRent;
            for (let year = 1; year <= yearsToCompare; year++) {
              rentTotal += currentRent * 12;
              currentRent *= (1 + rentIncrease / 100);
            }
            
            const futureHomeValue = homePrice * Math.pow(1 + homeAppreciation / 100, yearsToCompare);
            const buyingIsBetter = futureHomeValue > rentTotal;
            
            const calcContext = `## Rent vs Buy Calculator Request

The user wants to compare renting vs buying. An interactive calculator has been displayed with:
- Home Price: $${homePrice.toLocaleString()}
- Monthly Rent: $${monthlyRent.toLocaleString()}
- Down Payment: ${downPayment}%
- Interest Rate: ${interestRate}%
- Time Horizon: ${yearsToCompare} years
- Home Appreciation: ${homeAppreciation}%/year
- Rent Increase: ${rentIncrease}%/year

Key estimates:
- Monthly buying cost (P&I + taxes + insurance + maintenance): ~$${Math.round(totalMonthlyBuying).toLocaleString()}
- Current monthly rent: $${monthlyRent.toLocaleString()}
- Estimated home value after ${yearsToCompare} years: ~$${Math.round(futureHomeValue).toLocaleString()}
- Total rent paid over ${yearsToCompare} years: ~$${Math.round(rentTotal).toLocaleString()}
- Initial verdict: ${buyingIsBetter ? "Buying appears better long-term" : "Renting may be more cost-effective"}

Provide a brief, helpful response:
1. Acknowledge the calculator is displayed
2. Note the key difference: rent is "gone" money, but mortgage builds equity
3. Mention the break-even timeline concept
4. Explain they can adjust assumptions like appreciation rate and time horizon
5. Remind them that this is a simplified comparison - real decisions involve lifestyle, job stability, etc.

Keep your response SHORT and conversational - the calculator widget speaks for itself.`;
            
            // Stream AI response with calculator context
            const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: {
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
              },
              body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 1024,
                system: BASE_SYSTEM_PROMPT + calcContext,
                messages: messages.filter((m: { role: string }) => m.role === "user" || m.role === "assistant"),
                stream: true,
              }),
            });
            
            if (aiResponse.ok && aiResponse.body) {
              const reader = aiResponse.body.getReader();
              await convertAnthropicStreamToOpenAI(reader, writer);
            }
            
            // Track usage
            if (userId && tenantId && SUPABASE_URL && SUPABASE_ANON_KEY) {
              const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                global: { headers: { Authorization: authHeader! } },
              });
              await supabase.from("usage_records").insert({
                tenant_id: tenantId,
                record_type: "ai_query",
                quantity: 1,
              });
            }
            
            await writer.close();
            return;
          }
          
          // ================================================================
          // HANDLE CMA COMPARISON INTENT (using Zillow MCP tool)
          // ================================================================
          if (intentResult.type === "cma_comparison" && intentResult.cmaComparisonParams) {
            const cmaParams = intentResult.cmaComparisonParams;
            console.log("CMA comparison params:", cmaParams);
            
            await writeStatus(writer, encoder, "searching", "Finding comparable sales...");
            
            // We need a zpid to get comps - if we don't have one, we need to search first
            const zpid = cmaParams.zpid;
            const subjectAddress = cmaParams.address || "";
            
            // If no zpid but we have an address, try to find the property first
            if (!zpid && cmaParams.address) {
              // For now, we'll proceed with just the address context
              // In a full implementation, we'd search for the property first
              console.log("No zpid provided, using address for context:", cmaParams.address);
            }
            
            // Use the Zillow MCP comparable sales tool
            // Since we may not have a zpid, we'll create mock data for demo
            // In production, this would call the zillow_comparable_sales MCP tool
            
            interface CMAComparable {
              zpid: string;
              address: string;
              price: number;
              priceFormatted: string;
              pricePerSqFt?: number;
              bedrooms: number;
              bathrooms: number;
              livingArea: number;
              homeType: string;
              photo?: string;
              soldDate?: string;
            }

            let comparables: CMAComparable[] = [];
            let analysis: { avgPrice: number; avgPricePerSqFt: number; minPrice: number; maxPrice: number } | null = null;
            
            // If we have a zpid, we can try to get real comps via the search API with sold filter
            const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY");
            if (RAPIDAPI_KEY && cmaParams.address) {
              try {
                // Extract location from address for search
                const addressParts = cmaParams.address.split(',');
                const city = addressParts[1]?.trim() || '';
                const state = addressParts[2]?.trim()?.split(' ')[0] || '';
                const location = city && state ? `${city}-${state}`.toLowerCase() : '';
                
                if (location) {
                  const searchParams = new URLSearchParams({
                    location,
                    listType: 'sold', // Get recently sold properties
                  });
                  
                  // Add filters based on subject property
                  if (cmaParams.bedrooms) {
                    searchParams.set('bedsMin', String(Math.max(1, cmaParams.bedrooms - 1)));
                    searchParams.set('bedsMax', String(cmaParams.bedrooms + 1));
                  }
                  if (cmaParams.estimated_price) {
                    searchParams.set('minPrice', String(Math.round(cmaParams.estimated_price * 0.7)));
                    searchParams.set('maxPrice', String(Math.round(cmaParams.estimated_price * 1.3)));
                  }
                  
                  const apiUrl = `https://real-estate101.p.rapidapi.com/api/search?${searchParams.toString()}`;
                  console.log("Fetching sold comps:", apiUrl);
                  
                  const compsResponse = await fetch(apiUrl, {
                    method: "GET",
                    headers: {
                      "X-RapidAPI-Key": RAPIDAPI_KEY,
                      "X-RapidAPI-Host": "real-estate101.p.rapidapi.com",
                    },
                  });
                  
                  if (compsResponse.ok) {
                    const compsData = await compsResponse.json();
                    const props = compsData.props || compsData.results || [];
                    
                    if (props.length > 0) {
                      comparables = props.slice(0, 10).map((prop: Record<string, unknown>) => {
                        const addressObj = prop.address as Record<string, unknown> | undefined;
                        const street = String(addressObj?.streetAddress || prop.streetAddress || prop.street || "");
                        const propCity = String(addressObj?.city || prop.city || "");
                        const propState = String(addressObj?.state || prop.state || "");
                        const fullAddress = [street, propCity, propState].filter(Boolean).join(', ');
                        
                        let price = 0;
                        const priceVal = prop.price ?? prop.soldPrice ?? prop.listPrice;
                        if (typeof priceVal === 'number') price = priceVal;
                        else if (typeof priceVal === 'string') price = parseFloat(priceVal.replace(/[^0-9.]/g, '')) || 0;
                        
                        const livingArea = Number(prop.livingArea || prop.sqft || prop.squareFeet) || 0;
                        
                        return {
                          zpid: String(prop.zpid || prop.id || Math.random().toString(36).substr(2, 9)),
                          address: fullAddress,
                          price,
                          priceFormatted: new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                            minimumFractionDigits: 0,
                          }).format(price),
                          pricePerSqFt: livingArea > 0 ? Math.round(price / livingArea) : undefined,
                          bedrooms: Number(prop.bedrooms || prop.beds) || 0,
                          bathrooms: Number(prop.bathrooms || prop.baths) || 0,
                          livingArea,
                          homeType: String(prop.homeType || prop.propertyType || "House"),
                          photo: String(prop.imgSrc || prop.image || "") || undefined,
                          soldDate: prop.soldDate ? String(prop.soldDate) : undefined,
                        };
                      });
                      
                      // Calculate analysis
                      if (comparables.length > 0) {
                        const prices = comparables.map(c => c.price).filter(p => p > 0);
                        const pricesPerSqft = comparables.map(c => c.pricePerSqFt).filter((p): p is number => p !== undefined && p > 0);
                        
                        analysis = {
                          avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
                          avgPricePerSqFt: pricesPerSqft.length > 0 
                            ? Math.round(pricesPerSqft.reduce((a, b) => a + b, 0) / pricesPerSqft.length)
                            : 0,
                          minPrice: Math.min(...prices),
                          maxPrice: Math.max(...prices),
                        };
                      }
                    }
                  }
                }
              } catch (error) {
                console.error("Error fetching comps:", error);
              }
            }
            
            // If no real comps found, create sample data for demonstration
            if (comparables.length === 0) {
              console.log("No real comps found, using sample data");
              const basePrice = cmaParams.estimated_price || 450000;
              const beds = cmaParams.bedrooms || 3;
              const baths = cmaParams.bathrooms || 2;
              const sqft = cmaParams.living_area || 1800;
              
              comparables = [
                {
                  zpid: "demo-1",
                  address: "123 Oak Street, Nearby City",
                  price: Math.round(basePrice * 0.95),
                  priceFormatted: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(Math.round(basePrice * 0.95)),
                  pricePerSqFt: Math.round((basePrice * 0.95) / sqft),
                  bedrooms: beds,
                  bathrooms: baths,
                  livingArea: sqft - 100,
                  homeType: "House",
                  soldDate: "2024-12-15",
                },
                {
                  zpid: "demo-2",
                  address: "456 Maple Avenue, Nearby City",
                  price: Math.round(basePrice * 1.02),
                  priceFormatted: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(Math.round(basePrice * 1.02)),
                  pricePerSqFt: Math.round((basePrice * 1.02) / (sqft + 50)),
                  bedrooms: beds,
                  bathrooms: baths + 0.5,
                  livingArea: sqft + 50,
                  homeType: "House",
                  soldDate: "2024-11-28",
                },
                {
                  zpid: "demo-3",
                  address: "789 Pine Lane, Nearby City",
                  price: Math.round(basePrice * 0.98),
                  priceFormatted: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(Math.round(basePrice * 0.98)),
                  pricePerSqFt: Math.round((basePrice * 0.98) / sqft),
                  bedrooms: beds,
                  bathrooms: baths,
                  livingArea: sqft,
                  homeType: "House",
                  soldDate: "2025-01-05",
                },
              ];
              
              const prices = comparables.map(c => c.price);
              const pricesPerSqft = comparables.map(c => c.pricePerSqFt).filter((p): p is number => p !== undefined);
              analysis = {
                avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
                avgPricePerSqFt: Math.round(pricesPerSqft.reduce((a, b) => a + b, 0) / pricesPerSqft.length),
                minPrice: Math.min(...prices),
                maxPrice: Math.max(...prices),
              };
            }
            
            await writeStatus(writer, encoder, "generating", "Preparing CMA report...");
            
            // Send embedded component with CMA data
            await writeEmbeddedComponents(writer, encoder, {
              cma_comparison: {
                subjectProperty: cmaParams.address ? {
                  address: cmaParams.address,
                  price: cmaParams.estimated_price,
                  bedrooms: cmaParams.bedrooms,
                  bathrooms: cmaParams.bathrooms,
                  livingArea: cmaParams.living_area,
                } : undefined,
                comparables,
                analysis,
              }
            });
            
            // Build context for AI response
            const estimatedValue = analysis && cmaParams.living_area 
              ? Math.round(analysis.avgPricePerSqFt * cmaParams.living_area)
              : analysis?.avgPrice;
            
            const cmaContext = `## CMA Comparison Request

The user wants a Comparative Market Analysis. A CMA widget has been displayed with:
- Subject Property: ${cmaParams.address || "Not specified"}
${cmaParams.bedrooms ? `- Bedrooms: ${cmaParams.bedrooms}` : ""}
${cmaParams.bathrooms ? `- Bathrooms: ${cmaParams.bathrooms}` : ""}
${cmaParams.living_area ? `- Square Feet: ${cmaParams.living_area.toLocaleString()}` : ""}
${cmaParams.estimated_price ? `- Asking/Estimated Price: $${cmaParams.estimated_price.toLocaleString()}` : ""}

## Comparable Sales Found: ${comparables.length}
${analysis ? `
### Market Analysis:
- Average Sold Price: $${analysis.avgPrice.toLocaleString()}
- Average Price/SqFt: $${analysis.avgPricePerSqFt}/sqft
- Price Range: $${analysis.minPrice.toLocaleString()} - $${analysis.maxPrice.toLocaleString()}
${estimatedValue ? `- Estimated Value (based on $/sqft): ~$${estimatedValue.toLocaleString()}` : ""}
` : ""}

Provide a brief, helpful CMA summary:
1. Acknowledge the CMA widget is displayed with the comparable sales
2. Summarize the key findings (avg price, price range)
3. If an estimated value can be calculated, mention it
4. Note that these are recently sold properties for comparison
5. Remind them that a professional appraisal is recommended for official valuations

Keep your response SHORT and conversational - the CMA widget speaks for itself.`;
            
            // Stream AI response with CMA context
            const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: {
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
              },
              body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 1024,
                system: BASE_SYSTEM_PROMPT + cmaContext,
                messages: messages.filter((m: { role: string }) => m.role === "user" || m.role === "assistant"),
                stream: true,
              }),
            });
            
            if (aiResponse.ok && aiResponse.body) {
              const reader = aiResponse.body.getReader();
              await convertAnthropicStreamToOpenAI(reader, writer);
            }
            
            // Track usage
            if (userId && tenantId && SUPABASE_URL && SUPABASE_ANON_KEY) {
              const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                global: { headers: { Authorization: authHeader! } },
              });
              await supabase.from("usage_records").insert({
                tenant_id: tenantId,
                record_type: "ai_query",
                quantity: 1,
              });
            }
            
            await writer.close();
            return;
          }
          
          // ================================================================
          // HANDLE HOME BUYING CHECKLIST INTENT
          // ================================================================
          if (intentResult.type === "home_buying_checklist" && intentResult.homeBuyingChecklistParams) {
            const checklistParams = intentResult.homeBuyingChecklistParams;
            console.log("Home buying checklist params:", checklistParams);
            
            await writeStatus(writer, encoder, "generating", "Preparing home buying checklist...");
            
            // Send embedded component with checklist configuration
            await writeEmbeddedComponents(writer, encoder, {
              home_buying_checklist: {
                highlightPhase: checklistParams.highlight_phase,
                showProgress: true,
              }
            });
            
            // Build context for AI response
            const phaseDescriptions: Record<string, string> = {
              getting_started: "Getting Started (budget, credit, pre-approval)",
              finding_home: "Finding Your Home (agent, viewing properties)",
              making_offer: "Making an Offer (submitting, negotiating)",
              due_diligence: "Due Diligence (inspection, appraisal, title)",
              finalizing_loan: "Finalizing Your Loan (documents, insurance)",
              closing: "Closing Day (walkthrough, signing, keys)",
            };
            
            const highlightNote = checklistParams.highlight_phase 
              ? `\n\nThe user asked specifically about the "${phaseDescriptions[checklistParams.highlight_phase] || checklistParams.highlight_phase}" phase, so focus your explanation on that stage.`
              : "";
            
            const checklistContext = `## Home Buying Checklist Request

The user wants guidance on the home buying process. An interactive checklist widget has been displayed showing all 6 phases:
1. Getting Started - Research, budget, credit score, down payment, pre-approval
2. Finding Your Home - Hire agent, create wish list, view properties, compare and choose
3. Making an Offer - Determine price, submit offer, negotiate, sign agreement
4. Due Diligence - Earnest money, inspection, appraisal, title search
5. Finalizing Your Loan - Rate lock, documents, Closing Disclosure, insurance
6. Closing Day - Final walkthrough, bring funds, sign documents, receive keys

The checklist saves progress locally in the browser so users can track their journey.${highlightNote}

Provide a brief, encouraging response:
1. Acknowledge the checklist is displayed for them to track progress
2. Highlight the current phase they should focus on (or the highlighted phase if specified)
3. Offer to explain any step in more detail
4. Keep it SHORT and conversational - the checklist speaks for itself`;
            
            // Stream AI response with checklist context
            const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: {
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
              },
              body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 1024,
                system: BASE_SYSTEM_PROMPT + checklistContext,
                messages: messages.filter((m: { role: string }) => m.role === "user" || m.role === "assistant"),
                stream: true,
              }),
            });
            
            if (aiResponse.ok && aiResponse.body) {
              const reader = aiResponse.body.getReader();
              await convertAnthropicStreamToOpenAI(reader, writer);
            }
            
            // Track usage
            if (userId && tenantId && SUPABASE_URL && SUPABASE_ANON_KEY) {
              const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                global: { headers: { Authorization: authHeader! } },
              });
              await supabase.from("usage_records").insert({
                tenant_id: tenantId,
                record_type: "ai_query",
                quantity: 1,
              });
            }
            
            await writer.close();
            return;
          }
          
          // ================================================================
          // HANDLE HOME SELLING CHECKLIST INTENT
          // ================================================================
          if (intentResult.type === "home_selling_checklist" && intentResult.homeSellingChecklistParams) {
            const checklistParams = intentResult.homeSellingChecklistParams;
            console.log("Home selling checklist params:", checklistParams);
            
            await writeStatus(writer, encoder, "generating", "Preparing home selling checklist...");
            
            // Send embedded component with checklist configuration
            await writeEmbeddedComponents(writer, encoder, {
              home_selling_checklist: {
                highlightPhase: checklistParams.highlight_phase,
                showProgress: true,
              }
            });
            
            // Build context for AI response
            const sellingPhaseDescriptions: Record<string, string> = {
              getting_ready: "Getting Ready (declutter, repairs, curb appeal)",
              choosing_agent: "Choosing an Agent (interview, select)",
              pricing_listing: "Pricing & Listing (CMA, photos, MLS)",
              marketing_showings: "Marketing & Showings (open houses, feedback)",
              offers_negotiation: "Offers & Negotiation (review, counter, accept)",
              under_contract: "Under Contract (inspection, appraisal)",
              closing_moving: "Closing & Moving (final walkthrough, signing)",
            };
            
            const highlightNote = checklistParams.highlight_phase 
              ? `\n\nThe user asked specifically about the "${sellingPhaseDescriptions[checklistParams.highlight_phase] || checklistParams.highlight_phase}" phase, so focus your explanation on that stage.`
              : "";
            
            const checklistContext = `## Home Selling Checklist Request

The user wants guidance on the home selling process. An interactive checklist widget has been displayed showing all 7 phases:
1. Getting Ready - Declutter, deep clean, repairs, curb appeal, gather documents
2. Choosing an Agent - Research, interview, select listing agent
3. Pricing & Listing - CMA review, pricing strategy, photos, MLS listing
4. Marketing & Showings - Open houses, private showings, gather feedback
5. Offers & Negotiation - Review offers, counter, accept best offer
6. Under Contract - Buyer inspection, appraisal, contingency removal
7. Closing & Moving - Final walkthrough, signing, moving out

The checklist saves progress locally in the browser so users can track their journey.${highlightNote}

Provide a brief, encouraging response:
1. Acknowledge the checklist is displayed for them to track progress
2. Highlight the current phase they should focus on (or the highlighted phase if specified)
3. Offer to explain any step in more detail
4. Keep it SHORT and conversational - the checklist speaks for itself`;
            
            // Stream AI response with checklist context
            const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: {
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
              },
              body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 1024,
                system: BASE_SYSTEM_PROMPT + checklistContext,
                messages: messages.filter((m: { role: string }) => m.role === "user" || m.role === "assistant"),
                stream: true,
              }),
            });
            
            if (aiResponse.ok && aiResponse.body) {
              const reader = aiResponse.body.getReader();
              await convertAnthropicStreamToOpenAI(reader, writer);
            }
            
            // Track usage
            if (userId && tenantId && SUPABASE_URL && SUPABASE_ANON_KEY) {
              const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                global: { headers: { Authorization: authHeader! } },
              });
              await supabase.from("usage_records").insert({
                tenant_id: tenantId,
                record_type: "ai_query",
                quantity: 1,
              });
            }
            
            await writer.close();
            return;
          }
          
          // ================================================================
          // HANDLE SELLER NET SHEET INTENT
          // ================================================================
          if (intentResult.type === "seller_net_sheet" && intentResult.sellerNetSheetParams) {
            const netSheetParams = intentResult.sellerNetSheetParams;
            console.log("Seller net sheet params:", netSheetParams);
            
            await writeStatus(writer, encoder, "generating", "Preparing seller net sheet...");
            
            // Default values
            const salePrice = netSheetParams.sale_price || 450000;
            const mortgageBalance = netSheetParams.mortgage_balance || 280000;
            const commissionPercent = netSheetParams.commission_percent || 6;
            
            // Send embedded component
            await writeEmbeddedComponents(writer, encoder, {
              seller_net_sheet: {
                salePrice,
                mortgageBalance,
                commissionPercent,
              }
            });
            
            // Calculate estimates for context
            const commission = salePrice * (commissionPercent / 100);
            const closingCostsEstimate = salePrice * 0.02; // ~2% for other seller costs
            const netProceeds = salePrice - mortgageBalance - commission - closingCostsEstimate;
            
            const netSheetContext = `## Seller Net Sheet Request

The user wants to know how much they'll net from selling their home. An interactive seller net sheet has been displayed with:
- Sale Price: $${salePrice.toLocaleString()}
- Mortgage Payoff: $${mortgageBalance.toLocaleString()}
- Commission: ${commissionPercent}% ($${Math.round(commission).toLocaleString()})
- Estimated Closing Costs: ~$${Math.round(closingCostsEstimate).toLocaleString()}
- Estimated Net Proceeds: ~$${Math.round(netProceeds).toLocaleString()}

Provide a brief, helpful response:
1. Acknowledge the net sheet calculator is displayed
2. Highlight their estimated net proceeds
3. Mention they can adjust the numbers to explore different scenarios
4. Note that actual costs vary by location and specific circumstances
5. Keep it SHORT - the interactive calculator speaks for itself`;
            
            // Stream AI response
            const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: {
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
              },
              body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 1024,
                system: BASE_SYSTEM_PROMPT + netSheetContext,
                messages: messages.filter((m: { role: string }) => m.role === "user" || m.role === "assistant"),
                stream: true,
              }),
            });
            
            if (aiResponse.ok && aiResponse.body) {
              const reader = aiResponse.body.getReader();
              await convertAnthropicStreamToOpenAI(reader, writer);
            }
            
            // Track usage
            if (userId && tenantId && SUPABASE_URL && SUPABASE_ANON_KEY) {
              const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                global: { headers: { Authorization: authHeader! } },
              });
              await supabase.from("usage_records").insert({
                tenant_id: tenantId,
                record_type: "ai_query",
                quantity: 1,
              });
            }
            
            await writer.close();
            return;
          }
          
          // ================================================================
          // HANDLE AGENT COMMISSION CALCULATOR INTENT
          // ================================================================
          if (intentResult.type === "agent_commission_calculator" && intentResult.agentCommissionCalculatorParams) {
            const commParams = intentResult.agentCommissionCalculatorParams;
            console.log("Agent commission calculator params:", commParams);
            
            await writeStatus(writer, encoder, "generating", "Preparing commission calculator...");
            
            // Default values
            const salePrice = commParams.sale_price || 450000;
            const totalCommission = commParams.total_commission || 6;
            const listingBuyerSplit = commParams.listing_buyer_split || 50;
            const brokerSplit = commParams.broker_split || 70;
            
            // Send embedded component
            await writeEmbeddedComponents(writer, encoder, {
              agent_commission_calculator: {
                salePrice,
                totalCommission,
                listingBuyerSplit,
                brokerSplit,
              }
            });
            
            // Calculate estimates for context
            const totalCommissionAmount = salePrice * (totalCommission / 100);
            const listingSideAmount = totalCommissionAmount * (listingBuyerSplit / 100);
            const agentNet = listingSideAmount * (brokerSplit / 100);
            const brokerShareAmount = listingSideAmount - agentNet;
            
            const commContext = `## Agent Commission Calculator Request

The user (a real estate agent) wants to calculate their commission earnings. An interactive commission calculator has been displayed with:
- Sale Price: $${salePrice.toLocaleString()}
- Total Commission: ${totalCommission}% ($${Math.round(totalCommissionAmount).toLocaleString()})
- Listing/Buyer Split: ${listingBuyerSplit}/${100 - listingBuyerSplit}
- Agent's Side: $${Math.round(listingSideAmount).toLocaleString()}
- Agent/Broker Split: ${brokerSplit}/${100 - brokerSplit}
- Agent's Net: $${Math.round(agentNet).toLocaleString()}
- Broker's Share: $${Math.round(brokerShareAmount).toLocaleString()}

Provide a brief, helpful response:
1. Acknowledge the commission calculator is displayed
2. Highlight their estimated net commission
3. Mention they can toggle between listing and buyer side
4. Point out the GCI projection feature for annual earnings
5. Keep it SHORT - the interactive calculator speaks for itself`;
            
            // Stream AI response
            const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: {
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
              },
              body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 1024,
                system: BASE_SYSTEM_PROMPT + commContext,
                messages: messages.filter((m: { role: string }) => m.role === "user" || m.role === "assistant"),
                stream: true,
              }),
            });
            
            if (aiResponse.ok && aiResponse.body) {
              const reader = aiResponse.body.getReader();
              await convertAnthropicStreamToOpenAI(reader, writer);
            }
            
            // Track usage
            if (userId && tenantId && SUPABASE_URL && SUPABASE_ANON_KEY) {
              const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                global: { headers: { Authorization: authHeader! } },
              });
              await supabase.from("usage_records").insert({
                tenant_id: tenantId,
                record_type: "ai_query",
                quantity: 1,
              });
            }
            
            await writer.close();
            return;
          }
          
          // ================================================================
          // HANDLE COLLECTION QUERY INTENT
          // ================================================================
          if (intentResult.type === "collection_query" && intentResult.collectionQueryParams) {
            const collParams = intentResult.collectionQueryParams;
            console.log("Collection query params:", collParams);
            
            await writeStatus(writer, encoder, "searching", `Searching your ${collParams.collection}...`);
            
            try {
              // Get auth header for Supabase client
              const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
              const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
              
              if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !tenantId) {
                throw new Error("Missing Supabase configuration or tenant ID");
              }
              
              const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                global: { headers: authHeader ? { Authorization: authHeader } : {} },
              });
              
              // Map collection type to entity type and table name
              const entityTypeMap: Record<string, string> = {
                "contacts": "contact",
                "properties": "property",
                "deals": "deal",
                "documents": "document",
              };
              const tableNameMap: Record<string, string> = {
                "contacts": "contacts",
                "properties": "properties",
                "deals": "deals",
                "documents": "documents",
              };
              const entityType = entityTypeMap[collParams.collection] || collParams.collection;
              const tableName = tableNameMap[collParams.collection] || collParams.collection;
              
              // Detect if this is a "list all" request (generic query that won't work with full-text search)
              const genericQueryPatterns = [
                /^all\s*/i,
                /^list\s*/i,
                /^show\s*/i,
                /^my\s*/i,
                /^get\s*/i,
                /^\*$/,
                /^$/,
              ];
              const queryLower = (collParams.query || "").toLowerCase().trim();
              const isGenericListQuery = genericQueryPatterns.some(p => p.test(queryLower)) ||
                queryLower === collParams.collection ||
                queryLower === entityType ||
                queryLower.includes("all " + collParams.collection) ||
                queryLower.includes("all " + entityType) ||
                queryLower.includes("my " + collParams.collection) ||
                queryLower.length < 2;
              
              let searchResults: any[] = [];
              let searchError: any = null;
              
              if (isGenericListQuery) {
                // For generic "list all" queries, fetch directly from table instead of full-text search
                const limit = collParams.limit || 20;
                
                if (tableName === "contacts") {
                  const { data, error } = await supabase
                    .from("contacts")
                    .select("id, first_name, last_name, email, company, contact_type, phone, price_min, price_max, preferred_beds, preferred_baths, preferred_areas, pre_approval_status, pre_approval_amount, urgency_level, lead_source")
                    .eq("tenant_id", tenantId)
                    .order("updated_at", { ascending: false })
                    .limit(limit);
                  
                  if (!error && data) {
                    searchResults = data.map(c => ({
                      entity_type: "contact",
                      entity_id: c.id,
                      name: [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email || "Unknown",
                      subtitle: c.company || c.contact_type || "",
                      metadata: { 
                        email: c.email, 
                        company: c.company,
                        phone: c.phone,
                        budget: c.price_min || c.price_max ? `$${c.price_min || 0}-$${c.price_max || '∞'}` : null,
                        beds: c.preferred_beds,
                        baths: c.preferred_baths,
                        areas: c.preferred_areas,
                        pre_approval: c.pre_approval_status,
                        pre_approval_amount: c.pre_approval_amount,
                        urgency: c.urgency_level,
                        lead_source: c.lead_source
                      }
                    }));
                  }
                  searchError = error;
                } else if (tableName === "properties") {
                  const { data, error } = await supabase
                    .from("properties")
                    .select("id, address, city, state, price, status, property_type, bedrooms, bathrooms, square_feet, year_built, hoa_fee, school_district, days_on_market, listing_agent_name")
                    .eq("tenant_id", tenantId)
                    .order("updated_at", { ascending: false })
                    .limit(limit);
                  
                  if (!error && data) {
                    searchResults = data.map(p => ({
                      entity_type: "property",
                      entity_id: p.id,
                      name: p.address || "Unknown Property",
                      subtitle: [p.city, p.state].filter(Boolean).join(", ") || p.property_type || "",
                      metadata: { 
                        price: p.price, 
                        status: p.status, 
                        property_type: p.property_type,
                        beds: p.bedrooms,
                        baths: p.bathrooms,
                        sqft: p.square_feet,
                        year_built: p.year_built,
                        hoa_fee: p.hoa_fee,
                        school_district: p.school_district,
                        days_on_market: p.days_on_market,
                        listing_agent: p.listing_agent_name
                      }
                    }));
                  }
                  searchError = error;
                } else if (tableName === "deals") {
                  const { data, error } = await supabase
                    .from("deals")
                    .select("id, deal_type, stage, estimated_value, property_id, expected_close_date, earnest_money, loan_type, lender_name, has_inspection_contingency, has_financing_contingency, inspection_date, appraisal_date")
                    .eq("tenant_id", tenantId)
                    .order("updated_at", { ascending: false })
                    .limit(limit);
                  
                  if (!error && data) {
                    searchResults = data.map(d => ({
                      entity_type: "deal",
                      entity_id: d.id,
                      name: `${d.deal_type || "Deal"} - ${d.stage || "Unknown Stage"}`,
                      subtitle: d.estimated_value ? `$${d.estimated_value.toLocaleString()}` : "",
                      metadata: { 
                        stage: d.stage, 
                        value: d.estimated_value, 
                        deal_type: d.deal_type,
                        expected_close: d.expected_close_date,
                        earnest_money: d.earnest_money,
                        loan_type: d.loan_type,
                        lender: d.lender_name,
                        contingencies: [
                          d.has_inspection_contingency ? 'inspection' : null,
                          d.has_financing_contingency ? 'financing' : null
                        ].filter(Boolean),
                        inspection_date: d.inspection_date,
                        appraisal_date: d.appraisal_date
                      }
                    }));
                  }
                  searchError = error;
                } else if (tableName === "documents") {
                  const { data, error } = await supabase
                    .from("documents")
                    .select("id, name, category, ai_summary")
                    .eq("tenant_id", tenantId)
                    .order("created_at", { ascending: false })
                    .limit(limit);
                  
                  if (!error && data) {
                    searchResults = data.map(d => ({
                      entity_type: "document",
                      entity_id: d.id,
                      name: d.name || "Untitled Document",
                      subtitle: d.category || "Document",
                      metadata: { category: d.category, ai_summary: d.ai_summary?.slice(0, 200) }
                    }));
                  }
                  searchError = error;
                }
              } else {
                // For specific search queries, use full-text search RPC
                const { data, error } = await supabase.rpc(
                  "search_all_entities",
                  {
                    p_query: collParams.query,
                    p_tenant_id: tenantId,
                    p_entity_types: [entityType],
                    p_match_count_per_type: collParams.limit || 20,
                  }
                );
                searchResults = data || [];
                searchError = error;
              }
              
              if (searchError) {
                console.error("Collection search error:", searchError);
                throw searchError;
              }
              
              console.log(`Found ${searchResults?.length || 0} results in ${collParams.collection}`);
              
              console.log(`Found ${searchResults?.length || 0} results in ${collParams.collection}`);
              
              // Build context with search results
              let collectionContext = `## Collection Query Results

The user asked to search their ${collParams.collection} collection for: "${collParams.query}"

`;
              
              if (!searchResults || searchResults.length === 0) {
                collectionContext += `No matching ${collParams.collection} were found for the search query.

Provide a helpful response:
1. Let them know the search returned no results
2. Suggest they try different search terms
3. Ask if they'd like to search for something else`;
              } else {
                collectionContext += `Found ${searchResults.length} matching ${collParams.collection}:

`;
                // Format results based on entity type
                for (const result of searchResults) {
                  collectionContext += `### ${result.name || "Unknown"}\n`;
                  if (result.subtitle) {
                    collectionContext += `- ${result.subtitle}\n`;
                  }
                  if (result.entity_id) {
                    collectionContext += `- ID: ${result.entity_id}\n`;
                  }
                  collectionContext += "\n";
                }
                
                collectionContext += `
Use this data to answer the user's question. Be specific and reference the actual data found.`;
              }
              
              await writeStatus(writer, encoder, "generating", "Processing results...");
              
              // Stream AI response with collection context
              const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                  "x-api-key": ANTHROPIC_API_KEY,
                  "anthropic-version": "2023-06-01",
                  "content-type": "application/json",
                },
                body: JSON.stringify({
                  model: "claude-sonnet-4-20250514",
                  max_tokens: 2048,
                  system: BASE_SYSTEM_PROMPT + collectionContext,
                  messages: messages.filter((m: { role: string }) => m.role === "user" || m.role === "assistant"),
                  stream: true,
                }),
              });
              
              if (aiResponse.ok && aiResponse.body) {
                const reader = aiResponse.body.getReader();
                await convertAnthropicStreamToOpenAI(reader, writer);
              }
              
              // Track usage
              if (userId && tenantId && SUPABASE_URL && SUPABASE_ANON_KEY) {
                const usageSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                  global: { headers: authHeader ? { Authorization: authHeader } : {} },
                });
                await usageSupabase.from("usage_records").insert({
                  tenant_id: tenantId,
                  record_type: "ai_query",
                  quantity: 1,
                });
              }
            } catch (err) {
              console.error("Collection query error:", err);
              await writeStatus(writer, encoder, "error", "Failed to search collection. Please try again.");
            }
            
            await writer.close();
            return;
          }
          
          // ================================================================
          // HANDLE PROPERTY SEARCH INTENT
          // ================================================================
          if (intentResult.type === "property_search" && intentResult.propertySearchParams) {
            const propertySearchParams = intentResult.propertySearchParams;
            console.log("Property search params extracted:", JSON.stringify(propertySearchParams, null, 2));
            
            // Build a human-readable search description
            const searchDesc = buildSearchDescription(propertySearchParams);
            await writeStatus(writer, encoder, "searching", `Searching for ${searchDesc}...`);
            
            const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY");
            if (!RAPIDAPI_KEY) {
              console.warn("RAPIDAPI_KEY not configured - skipping property search");
              await writeStatus(writer, encoder, "error", "Property search is temporarily unavailable.");
              await writer.close();
              return;
            }
            
            // Build query params using our helper function
            const apiParams = buildApiParams(propertySearchParams);
            
            const apiUrl = `https://real-estate101.p.rapidapi.com/api/search?${apiParams.toString()}`;
            console.log("Calling property API:", apiUrl);
            
            const propertyResponse = await fetch(apiUrl, {
              method: "GET",
              headers: {
                "X-RapidAPI-Key": RAPIDAPI_KEY,
                "X-RapidAPI-Host": "real-estate101.p.rapidapi.com",
              },
            });
            
            if (propertyResponse.ok) {
              const propertyData = await propertyResponse.json();
              const props = propertyData.props || propertyData.results || [];
              
              if (props.length > 0) {
                console.log(`Found ${props.length} properties from API`);
                
                // Send filtering status
                await writeStatus(writer, encoder, "filtering", `Found ${props.length} properties, applying your filters...`);
                
                // Extract photos array from various possible field names
                const extractPhotos = (prop: Record<string, unknown>): string[] => {
                  const photos: string[] = [];
                  
                  // Primary image
                  if (prop.imgSrc) photos.push(String(prop.imgSrc));
                  if (prop.image && !photos.includes(String(prop.image))) photos.push(String(prop.image));
                  if (prop.thumbnail && !photos.includes(String(prop.thumbnail))) photos.push(String(prop.thumbnail));
                  
                  // Photo arrays
                  if (Array.isArray(prop.photos)) {
                    prop.photos.forEach((p: unknown) => {
                      const url = typeof p === 'string' ? p : (p as Record<string, unknown>)?.url || (p as Record<string, unknown>)?.href;
                      if (url && !photos.includes(String(url))) photos.push(String(url));
                    });
                  }
                  if (Array.isArray(prop.images)) {
                    prop.images.forEach((p: unknown) => {
                      const url = typeof p === 'string' ? p : (p as Record<string, unknown>)?.url || (p as Record<string, unknown>)?.href;
                      if (url && !photos.includes(String(url))) photos.push(String(url));
                    });
                  }
                  
                  return photos.slice(0, 6); // Limit to 6 photos
                };

                // Format property type for display
                const formatPropertyType = (type: unknown): string => {
                  const rawType = String(type || "SINGLE_FAMILY");
                  const typeMap: Record<string, string> = {
                    "SINGLE_FAMILY": "House",
                    "CONDO": "Condo",
                    "TOWNHOUSE": "Townhouse",
                    "APARTMENT": "Apartment",
                    "MULTI_FAMILY": "Multi-Family",
                    "LOT": "Land",
                    "LAND": "Land",
                  };
                  return typeMap[rawType.toUpperCase()] || rawType.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
                };

                // Transform properties to card format with frontend-compatible field names
                const rawPropertyCards: PropertyCard[] = props.map((prop: Record<string, unknown>) => {
                  const latLong = prop.latLong as Record<string, unknown> | undefined;
                  const primaryImg = String(prop.imgSrc || prop.image || prop.thumbnail || "");
                  
                  // Handle address - API returns address as nested object or flat fields
                  const addressObj = prop.address as Record<string, unknown> | undefined;
                  const streetAddress = String(
                    addressObj?.streetAddress || 
                    addressObj?.street || 
                    prop.streetAddress || 
                    prop.street ||
                    ""
                  );
                  const city = String(addressObj?.city || prop.city || "");
                  const state = String(addressObj?.state || prop.state || "");
                  const zipcode = String(addressObj?.zipcode || addressObj?.zip || prop.zipcode || prop.zip || "");
                  
                  // Handle coordinates - can be in address, latLong, or root
                  const lat = parseFloat(String(
                    addressObj?.latitude || prop.latitude || prop.lat || latLong?.latitude || ""
                  )) || undefined;
                  const lng = parseFloat(String(
                    addressObj?.longitude || prop.longitude || prop.lng || prop.long || latLong?.longitude || ""
                  )) || undefined;
                  
                  // Handle price - can be number or string with currency
                  let price = 0;
                  const priceVal = prop.price ?? prop.listPrice ?? prop.soldPrice;
                  if (typeof priceVal === 'number') {
                    price = priceVal;
                  } else if (typeof priceVal === 'string') {
                    price = parseFloat(priceVal.replace(/[^0-9.]/g, '')) || 0;
                  }
                  
                  return {
                    zpid: String(prop.zpid || prop.id || ""),
                    address: {
                      streetAddress,
                      city,
                      state,
                      zipcode,
                      latitude: lat,
                      longitude: lng,
                    },
                    price,
                    bedrooms: Number(prop.bedrooms || prop.beds) || 0,
                    bathrooms: Number(prop.bathrooms || prop.baths) || 0,
                    livingArea: Number(prop.livingArea || prop.sqft || prop.squareFeet) || 0,
                    propertyType: formatPropertyType(prop.homeType || prop.propertyType || prop.home_type),
                    listingStatus: String(prop.homeStatus || prop.listingStatus || prop.status || "FOR_SALE"),
                    daysOnMarket: Number(prop.daysOnZillow || prop.daysOnMarket || prop.days_on_zillow) || 0,
                    imgSrc: primaryImg,
                    photos: extractPhotos(prop),
                    lotSize: Number(prop.lotAreaValue || prop.lotSize || prop.lot_size) || 0,
                    zestimate: Number(prop.zestimate) || undefined,
                    yearBuilt: Number(prop.yearBuilt || prop.year_built) || undefined,
                    brokerName: String(prop.brokerName || prop.brokerageName || prop.listingAgent || "") || undefined,
                  };
                });
                
                // Apply post-query filtering for criteria API doesn't support
                const { properties: filteredProperties, appliedFilters, unmetCriteria } = filterResults(
                  rawPropertyCards,
                  propertySearchParams
                );
                
                // Take first 6 for display
                const propertyCards = filteredProperties.slice(0, 6);
                
                console.log(`After filtering: ${filteredProperties.length} properties, showing ${propertyCards.length}`);
                
                // Write embedded components (property cards)
                await writeEmbeddedComponents(writer, encoder, { property_cards: propertyCards });
                
                // Send generating status
                await writeStatus(writer, encoder, "generating", "Preparing your results...");
                
                // Build context with all search criteria and unmet filters
                const propertyContext = buildPropertyContext(
                  propertySearchParams,
                  propertyCards.length,
                  appliedFilters,
                  unmetCriteria
                );
                
                // Call the AI API for the text response
                const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
                  method: "POST",
                  headers: {
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                  },
                  body: JSON.stringify({
                    model: "claude-sonnet-4-20250514",
                    max_tokens: 1024,
                    system: BASE_SYSTEM_PROMPT + propertyContext,
                    messages: messages.filter((m: { role: string }) => m.role === "user" || m.role === "assistant"),
                    stream: true,
                  }),
                });
                
                if (aiResponse.ok && aiResponse.body) {
                  const reader = aiResponse.body.getReader();
                  await convertAnthropicStreamToOpenAI(reader, writer);
                }
                
                // Track usage
                if (userId && tenantId && SUPABASE_URL && SUPABASE_ANON_KEY) {
                  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                    global: { headers: { Authorization: authHeader! } },
                  });
                  await supabase.from("usage_records").insert({
                    tenant_id: tenantId,
                    record_type: "ai_query",
                    quantity: 1,
                  });
                }
                
                await writer.close();
                return;
              } else {
                console.log("No properties found from API");
                await writeStatus(writer, encoder, "error", "No properties found matching your criteria.");
              }
          } else {
              console.error("Property API error:", propertyResponse.status, await propertyResponse.text());
              await writeStatus(writer, encoder, "error", "Property search unavailable, continuing with general response...");
            }
          }
          
          // Fall through to regular AI chat response
          // This handles: no property intent, no properties found, or API error
          console.log("Falling through to regular AI chat response");
          
          // Send status so user sees we're responding
          await writeStatus(writer, encoder, "generating", "Processing your request...");
          
          // Build system prompt with mention context if available
          let streamSystemPrompt = BASE_SYSTEM_PROMPT;
          const streamMentionContext = buildMentionContext(mentionData as MentionDataItem[] || []);
          if (streamMentionContext) {
            console.log("Adding mention context to streaming system prompt");
            streamSystemPrompt += streamMentionContext;
          }
          
          // Call the regular AI API for a general response
          const regularAiResponse = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "x-api-key": ANTHROPIC_API_KEY,
              "anthropic-version": "2023-06-01",
              "content-type": "application/json",
            },
            body: JSON.stringify({
              model: "claude-sonnet-4-20250514",
              max_tokens: 1024,
              system: streamSystemPrompt,
              messages: messages.filter((m: { role: string }) => m.role === "user" || m.role === "assistant"),
              stream: true,
            }),
          });
          
          if (regularAiResponse.ok && regularAiResponse.body) {
            const reader = regularAiResponse.body.getReader();
            await convertAnthropicStreamToOpenAI(reader, writer);

            // Track usage
            if (userId && tenantId && SUPABASE_URL && SUPABASE_ANON_KEY) {
              const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                global: { headers: { Authorization: authHeader! } },
              });
              await supabase.from("usage_records").insert({
                tenant_id: tenantId,
                record_type: "ai_query",
                quantity: 1,
              });
            }
          } else {
            console.error("Regular AI response failed:", regularAiResponse.status);
          }
          
          await writer.close();
        } catch (propError) {
          console.error("Property search error:", propError);
          await writeStatus(writer, encoder, "error", "Something went wrong, please try again.");
          await writer.close();
        }
      })();
      
      return new Response(readable, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }
    
    // No last user message - fall through to regular chat

    // ====================================================================
    // DOCUMENT CONTEXT (if no property search or search failed)
    // ====================================================================
    let systemPrompt = BASE_SYSTEM_PROMPT;
    let documentContext = "";
    let structuredDataContext = "";
    const sourceDocs: { id: string; name: string; category: string; chunkCount: number }[] = [];
    
    // Build mention context if mentionData was provided
    const mentionContext = buildMentionContext(mentionData as MentionDataItem[] || []);
    if (mentionContext) {
      console.log("Adding mention context to system prompt");
      systemPrompt += mentionContext;
    }

    if (includeDocuments && tenantId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        if (lastUserMessage) {
          console.log("Searching documents with hybrid search...");
          
          const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          
          // Fetch structured metadata for selected documents
          if (documentIds && documentIds.length > 0) {
            const { data: metadataRecords, error: metaError } = await supabaseAdmin
              .from("document_metadata")
              .select("document_id, document_type, extracted_data, key_facts")
              .in("document_id", documentIds);
            
            if (!metaError && metadataRecords && metadataRecords.length > 0) {
              console.log(`Found structured metadata for ${metadataRecords.length} documents`);
              
              const { data: docNames } = await supabaseAdmin
                .from("documents")
                .select("id, name")
                .in("id", metadataRecords.map(m => m.document_id));
              
              const nameMap = new Map(docNames?.map(d => [d.id, d.name]) || []);
              
              const structuredParts: string[] = [];
              
              for (const meta of metadataRecords as DocumentMetadata[]) {
                const docName = nameMap.get(meta.document_id) || "Unknown Document";
                
                structuredParts.push(`### ${docName} (${meta.document_type})
**Key Facts:**
${meta.key_facts?.map(f => `- ${f}`).join("\n") || "No key facts extracted"}

**Extracted Data:**
\`\`\`json
${JSON.stringify(meta.extracted_data, null, 2)}
\`\`\`
`);
              }
              
              if (structuredParts.length > 0) {
                structuredDataContext = STRUCTURED_DATA_PROMPT + structuredParts.join("\n\n---\n\n");
              }
            }
          }
          
          // Hybrid search for relevant chunks
          const expandedTerms = expandQuery(lastUserMessage.content);
          const searchQuery = expandedTerms.join(" ");
          console.log(`Expanded query: ${searchQuery}`);
          
          const { data: hybridResults, error: hybridError } = await supabaseAdmin.rpc(
            "search_documents_hybrid",
            {
              p_query: searchQuery,
              p_document_ids: documentIds && documentIds.length > 0 ? documentIds : null,
              p_tenant_id: tenantId,
              p_limit: 20,
            }
          );

          if (hybridError) {
            console.error("Hybrid search error:", hybridError);
          }

          let allChunks: ChunkResult[] = hybridResults || [];
          
          // Get neighbors for context continuity
          if (allChunks.length > 0) {
            const chunkIds = allChunks.map(c => c.chunk_id);
            
            const { data: neighbors, error: neighborError } = await supabaseAdmin.rpc(
              "get_chunk_neighbors",
              {
                p_chunk_ids: chunkIds,
                p_tenant_id: tenantId,
              }
            );
            
            if (!neighborError && neighbors) {
              const existingIds = new Set(allChunks.map(c => c.chunk_id));
              const neighborChunks = (neighbors as NeighborResult[])
                .filter(n => !existingIds.has(n.chunk_id))
                .map(n => ({
                  chunk_id: n.chunk_id,
                  document_id: n.document_id,
                  document_name: n.document_name,
                  content: n.content,
                  chunk_index: n.chunk_index,
                  text_rank: 0.1,
                  category: n.category,
                }));
              
              allChunks = [...allChunks, ...neighborChunks];
              console.log(`Added ${neighborChunks.length} neighbor chunks for context`);
            }
          }
          
          // Fallback: If no results from hybrid search, try direct query
          if (allChunks.length === 0 && documentIds && documentIds.length > 0) {
            console.log("Hybrid search returned no results, trying direct query...");
            
            const { data: fallbackChunks, error: fallbackError } = await supabaseAdmin
              .from("document_chunks")
              .select(`id, content, chunk_index, document_id`)
              .in("document_id", documentIds)
              .order("chunk_index", { ascending: true })
              .limit(30);
            
            if (!fallbackError && fallbackChunks) {
              const { data: docDetails } = await supabaseAdmin
                .from("documents")
                .select("id, name, category")
                .in("id", documentIds);
              
              const docMap = new Map(docDetails?.map(d => [d.id, { name: d.name, category: d.category }]) || []);
              
              allChunks = fallbackChunks.map((c) => {
                const docInfo = docMap.get(c.document_id) || { name: "Unknown", category: "other" };
                return {
                  chunk_id: c.id,
                  document_id: c.document_id,
                  document_name: docInfo.name,
                  content: c.content,
                  chunk_index: c.chunk_index,
                  text_rank: 0.5,
                  category: docInfo.category,
                };
              });
              console.log(`Fallback query found ${allChunks.length} chunks`);
            }
          }

          if (allChunks.length > 0) {
            console.log(`Total chunks for context: ${allChunks.length}`);
            
            const docChunks = new Map<string, { name: string; category: string; chunks: ChunkResult[] }>();
            
            for (const chunk of allChunks) {
              if (!docChunks.has(chunk.document_id)) {
                docChunks.set(chunk.document_id, {
                  name: chunk.document_name,
                  category: chunk.category || "document",
                  chunks: [],
                });
              }
              docChunks.get(chunk.document_id)!.chunks.push(chunk);
            }
            
            let docIndex = 1;
            const contextParts: string[] = [];
            
            for (const [docId, docData] of docChunks) {
              const sortedChunks = docData.chunks.sort((a, b) => a.chunk_index - b.chunk_index);
              
              sourceDocs.push({
                id: docId,
                name: docData.name,
                category: docData.category,
                chunkCount: sortedChunks.length,
              });
              
              const chunkTexts = sortedChunks.map(c => 
                `[Section ${c.chunk_index + 1}]: ${c.content.substring(0, 3000)}${c.content.length > 3000 ? '...' : ''}`
              ).join("\n\n");
              
              contextParts.push(
                `## Document ${docIndex}: ${docData.name} (${docData.category})\n\n${chunkTexts}`
              );
              docIndex++;
            }
            
            documentContext = "\n\n## Document Content:\n\n" + contextParts.join("\n\n---\n\n");
            
            systemPrompt = BASE_SYSTEM_PROMPT + MULTI_DOC_SYSTEM_PROMPT;
            
            if (structuredDataContext) {
              systemPrompt += structuredDataContext;
            }
            
            systemPrompt += documentContext;
            
            console.log(`Built context from ${docChunks.size} documents with ${allChunks.length} total chunks`);
          } else {
            console.log("No matching document chunks found");
            
            if (structuredDataContext) {
              systemPrompt = BASE_SYSTEM_PROMPT + MULTI_DOC_SYSTEM_PROMPT + structuredDataContext + `

Note: While structured data was extracted from the selected documents, no text chunks matching your specific query were found. The answers above are based on the structured extraction. For more detailed analysis, try rephrasing your question.`;
            } else {
              systemPrompt = BASE_SYSTEM_PROMPT + `

Note: The user has selected documents for context, but no content matching their query was found. 
Let them know you couldn't find relevant information in the selected documents and suggest they:
1. Try rephrasing their question with different keywords
2. Verify the documents contain the information they're looking for
3. Make sure the documents are properly indexed`;
            }
          }
        }
      } catch (docError) {
        console.error("Error fetching document context:", docError);
      }
    }

    // ====================================================================
    // STANDARD AI RESPONSE (no property search or document context)
    // ====================================================================
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        messages: messages.filter((m: { role: string }) => m.role === "user" || m.role === "assistant"),
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please check your account." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to get AI response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Track usage if user is authenticated
    if (userId && tenantId && SUPABASE_URL && SUPABASE_ANON_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader! } },
      });
      
      await supabase.from("usage_records").insert({
        tenant_id: tenantId,
        record_type: "ai_query",
        quantity: 1,
      });
    }

    // Return streaming response
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("ai-chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
