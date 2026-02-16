// Property type definitions for AI chat property search

export interface PropertyAddress {
  streetAddress?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  latitude?: number;
  longitude?: number;
}

export interface PropertyCardData {
  zpid: string;
  address: PropertyAddress;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  livingArea?: number;
  lotSize?: number;
  yearBuilt?: number;
  propertyType?: string;      // "House", "Condo", "Townhouse", etc.
  listingStatus?: string;     // "FOR_SALE", "FOR_RENT", "PENDING"
  daysOnMarket?: number;      // Days since listing
  imgSrc?: string;            // Primary image URL (fallback)
  photos: string[];           // All photos for carousel (required for unified cards)
  description?: string;
  pricePerSqFt?: number;
  brokerName?: string;        // Listing agent/brokerage
  listingAgentName?: string;  // Primary listing agent
  listingAgentPhone?: string; // Agent contact
  listingDate?: string;       // ISO 8601 date when listed
  lotSizeSqFt?: number;       // Lot size in sqft (may differ from livingArea)
  latitude?: number;
  longitude?: number;
}

export interface CMAComparable {
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
  distance?: number;
}

export interface CMAAnalysis {
  avgPrice: number;
  avgPricePerSqFt: number;
  minPrice: number;
  maxPrice: number;
  medianPrice?: number;
}

export interface EmbeddedComponents {
  property_cards?: PropertyCardData[];
  comparison_table?: {
    headers: string[];
    rows: string[][];
  };
  agent_result?: {
    id: string;
    name: string;
    output: string;
  };
  mortgage_calculator?: {
    price: number;
    downPaymentPercent?: number;
    interestRate?: number;
    loanTermYears?: number;
  };
  affordability_calculator?: {
    monthlyBudget?: number;
    downPaymentPercent?: number;
    interestRate?: number;
    annualIncome?: number;
  };
  closing_costs_calculator?: {
    homePrice?: number;
    downPaymentPercent?: number;
    view?: "buyer" | "seller";
  };
  rent_vs_buy_calculator?: {
    homePrice?: number;
    monthlyRent?: number;
    downPaymentPercent?: number;
    interestRate?: number;
    yearsToCompare?: number;
    homeAppreciation?: number;
    rentIncrease?: number;
  };
  cma_comparison?: {
    subjectProperty?: {
      address: string;
      price?: number;
      bedrooms?: number;
      bathrooms?: number;
      livingArea?: number;
    };
    comparables: CMAComparable[];
    analysis?: CMAAnalysis;
  };
  home_buying_checklist?: {
    highlightPhase?: string;
    showProgress?: boolean;
  };
  home_selling_checklist?: {
    highlightPhase?: string;
    showProgress?: boolean;
  };
  seller_net_sheet?: {
    salePrice?: number;
    mortgageBalance?: number;
    commissionPercent?: number;
  };
  agent_commission_calculator?: {
    salePrice?: number;
    totalCommission?: number;
    listingBuyerSplit?: number;
    brokerSplit?: number;
  };
  property_detail?: {
    zpid: string;
    address: PropertyAddress;
    price: number;
    bedrooms: number;
    bathrooms: number;
    livingArea: number;
    lotSize?: number;
    yearBuilt?: number;
    propertyType: string;
    homeStatus: string;
    description?: string;
    photos: string[];
    features?: string[];
    parkingSpaces?: number;
    hoaFee?: number;
    pricePerSqFt?: number;
    taxHistory?: Array<{ year: number; amount: number }>;
    priceHistory?: Array<{ date: string; price: number; event: string }>;
  };
  property_comparison?: {
    properties: Array<{
      zpid: string;
      imgSrc?: string;
      address: string;
      price: number;
      bedrooms: number;
      bathrooms: number;
      livingArea: number;
      yearBuilt?: number;
      pricePerSqFt?: number;
      propertyType: string;
      hoaFee?: number;
    }>;
    userPreferences?: Record<string, string>;
  };
  /** Connectors used in this response */
  active_connectors?: Array<{
    name: string;
    connector_key: string;
    category: string;
    icon?: string;
  }>;
}
