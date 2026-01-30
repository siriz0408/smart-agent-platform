import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logger } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SearchParams {
  location: string;
  beds?: number;
  bedsMin?: number;
  bedsMax?: number;
  baths?: number;
  bathsMin?: number;
  bathsMax?: number;
  minPrice?: number;
  maxPrice?: number;
  minSqft?: number;
  maxSqft?: number;
  propertyType?: string;
  listType?: "for-sale" | "for-rent";
  page?: number;
}

interface PropertyResult {
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
  lotSize?: number;
  yearBuilt?: number;
  propertyType: string;
  homeStatus: string;
  imgSrc?: string;
  photos?: string[];
  detailUrl?: string;
  // Marketing fields
  daysOnMarket?: number;
  brokerName?: string;
  listingDate?: string;
  pricePerSqFt?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const params: SearchParams = await req.json();

    if (!params.location) {
      return new Response(
        JSON.stringify({ error: "location is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY");

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify token using getClaims (works even with stale sessions)
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.error("Token validation failed:", claimsError);
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const userId = claimsData.claims.sub;

    // Convert location to slug format: "Austin, TX" -> "austin-tx"
    const locationSlug = params.location
      .toLowerCase()
      .replace(/,\s*/g, "-")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

    // If no RapidAPI key configured, return mock data for development
    if (!RAPIDAPI_KEY) {
      logger.info("No RAPIDAPI_KEY configured, returning mock residential data");
      const mockResults = generateMockResults(params, locationSlug);
      return new Response(
        JSON.stringify({
          results: mockResults,
          totalPages: 1,
          totalResults: mockResults.length,
          page: params.page || 1,
          _mock: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build query parameters for Real Estate 101 API
    const queryParams = new URLSearchParams();
    queryParams.set("location", locationSlug);
    queryParams.set("listType", params.listType || "for-sale");
    
    // Bedrooms - support both exact and range
    if (params.beds) queryParams.set("beds", params.beds.toString());
    if (params.bedsMin) queryParams.set("bedsMin", params.bedsMin.toString());
    if (params.bedsMax) queryParams.set("bedsMax", params.bedsMax.toString());
    
    // Bathrooms - support both exact and range
    if (params.baths) queryParams.set("baths", params.baths.toString());
    if (params.bathsMin) queryParams.set("bathsMin", params.bathsMin.toString());
    if (params.bathsMax) queryParams.set("bathsMax", params.bathsMax.toString());
    
    // Price
    if (params.minPrice) queryParams.set("minPrice", params.minPrice.toString());
    if (params.maxPrice) queryParams.set("maxPrice", params.maxPrice.toString());
    
    // Square footage
    if (params.minSqft) queryParams.set("minSqft", params.minSqft.toString());
    if (params.maxSqft) queryParams.set("maxSqft", params.maxSqft.toString());
    
    // Pagination
    if (params.page) queryParams.set("page", params.page.toString());
    
    // Property type filters
    if (params.propertyType) {
      const type = params.propertyType.toLowerCase();
      if (type === "single family" || type === "house") queryParams.set("isSingleFamily", "true");
      else if (type === "condo") queryParams.set("isCondo", "true");
      else if (type === "townhouse") queryParams.set("isTownhouse", "true");
      else if (type === "apartment") queryParams.set("isApartment", "true");
      else if (type === "land") queryParams.set("isLotLand", "true");
    }

    // Call Real Estate 101 API via RapidAPI
    const response = await fetch(
      `https://real-estate101.p.rapidapi.com/api/search?${queryParams.toString()}`,
      {
        method: "GET",
        headers: {
          "X-RapidAPI-Key": RAPIDAPI_KEY,
          "X-RapidAPI-Host": "real-estate101.p.rapidapi.com",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Real Estate 101 API error", { status: response.status, errorText });

      // Fallback to mock data if API is unavailable
      if (response.status === 404 || response.status === 429 || response.status === 503) {
        logger.info("Real Estate 101 API unavailable, falling back to mock data");
        const mockResults = generateMockResults(params, locationSlug);
        return new Response(
          JSON.stringify({
            results: mockResults,
            totalPages: 1,
            totalResults: mockResults.length,
            page: params.page || 1,
            _mock: true,
            _apiError: `API returned ${response.status}`,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Failed to fetch properties" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    // Transform Real Estate 101 response to our format
    const properties = data.props || data.results || data || [];
    const results: PropertyResult[] = (Array.isArray(properties) ? properties : []).map((prop: Record<string, unknown>, index: number) => {
      // Extract latitude/longitude from various possible field names
      const propAny = prop as Record<string, unknown>;
      const latLong = propAny.latLong as Record<string, unknown> | undefined;
      const lat = parseFloat(String(propAny.latitude || propAny.lat || latLong?.latitude || "")) || undefined;
      const lng = parseFloat(String(propAny.longitude || propAny.lng || propAny.long || latLong?.longitude || "")) || undefined;

      // Handle address field - can be a string or an object
      let streetAddress = "Unknown Address";
      let city = extractCity(locationSlug);
      let state = extractState(locationSlug);
      let zipcode = "";

      // Check if address is an object with properties
      const addressObj = propAny.address as Record<string, unknown> | string | undefined;
      if (addressObj && typeof addressObj === "object") {
        // Address is an object like {street, city, state, zipcode}
        streetAddress = (addressObj.street || addressObj.streetAddress || "Unknown Address") as string;
        city = (addressObj.city || city) as string;
        state = (addressObj.state || state) as string;
        zipcode = (addressObj.zipcode || addressObj.zip || "") as string;
      } else if (typeof addressObj === "string") {
        // Address is a simple string
        streetAddress = addressObj;
      }

      // Override with top-level properties if available
      if (propAny.streetAddress) streetAddress = propAny.streetAddress as string;
      if (propAny.city) city = propAny.city as string;
      if (propAny.state) state = propAny.state as string;
      if (propAny.zipcode) zipcode = (propAny.zipcode || propAny.zip || zipcode) as string;

      // Extract marketing fields if available in API response
      const daysOnMarket = parseNumber(propAny.daysOnMarket || propAny.daysOnZillow);
      const brokerName = (propAny.brokerName || (propAny.attributionInfo as Record<string, unknown>)?.brokerName) as string | undefined;
      const listingDate = (propAny.datePosted || propAny.listedDate) as string | undefined;
      const pricePerSqFt = parseNumber(propAny.pricePerSqFt);

      return {
        zpid: (prop.zpid || prop.id || `zillow-${index}`)?.toString(),
        address: {
          streetAddress,
          city,
          state,
          zipcode,
          latitude: lat,
          longitude: lng,
        },
        price: parseNumber(prop.price),
        bedrooms: parseNumber(prop.bedrooms || prop.beds),
        bathrooms: parseFloat((prop.bathrooms || prop.baths || 0).toString()),
        livingArea: parseNumber(prop.livingArea || prop.sqft || prop.livingAreaValue),
        lotSize: parseNumber(prop.lotAreaValue || prop.lotSize),
        yearBuilt: parseNumber(prop.yearBuilt),
        propertyType: (prop.propertyType || prop.homeType || "Single Family") as string,
        homeStatus: (prop.homeStatus || prop.status || (params.listType === "for-rent" ? "For Rent" : "For Sale")) as string,
        imgSrc: (prop.imgSrc || prop.image || prop.photo) as string | undefined,
        detailUrl: (prop.detailUrl || prop.url) as string | undefined,
        // Marketing fields
        daysOnMarket: daysOnMarket || undefined,
        brokerName: brokerName,
        listingDate: listingDate,
        pricePerSqFt: pricePerSqFt || undefined,
      };
    });

    // Fetch photos for each property in parallel (limit to first 20 results for performance)
    const resultsWithPhotos = await Promise.all(
      results.slice(0, 20).map(async (property) => {
        if (!RAPIDAPI_KEY) {
          return { ...property, photos: property.imgSrc ? [property.imgSrc] : [] };
        }

        try {
          const photos = await fetchPropertyPhotos(
            property.zpid,
            property.address,
            RAPIDAPI_KEY
          );
          return {
            ...property,
            photos: photos.length > 0 ? photos : (property.imgSrc ? [property.imgSrc] : []),
          };
        } catch (error) {
          console.error("Photo fetch failed for", property.zpid, ":", error);
          return {
            ...property,
            photos: property.imgSrc ? [property.imgSrc] : [],
          };
        }
      })
    );

    // Keep remaining results without photo fetching (beyond 20)
    const finalResults = results.length > 20
      ? [...resultsWithPhotos, ...results.slice(20).map(p => ({ ...p, photos: p.imgSrc ? [p.imgSrc] : [] }))]
      : resultsWithPhotos;

    return new Response(
      JSON.stringify({
        results: finalResults,
        totalPages: data.totalPages || Math.ceil((data.totalResultCount || finalResults.length) / 40) || 1,
        totalResults: data.totalResultCount || finalResults.length,
        page: params.page || 1,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    logger.error("property-search error", { error: error instanceof Error ? error.message : String(error) });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Fetch property photos from dedicated photos endpoint
async function fetchPropertyPhotos(
  zpid: string,
  address: { streetAddress: string; city: string; state: string; zipcode: string },
  rapidApiKey: string
): Promise<string[]> {
  try {
    const fullAddress = `${address.streetAddress} ${address.city} ${address.state} ${address.zipcode}`;
    const addressSlug = fullAddress
      .replace(/\s+/g, "-")
      .replace(/,/g, "")
      .replace(/--+/g, "-");

    const zillowUrl = encodeURIComponent(
      `https://www.zillow.com/homedetails/${addressSlug}/${zpid}_zpid/`
    );

    const response = await fetch(
      `https://real-estate101.p.rapidapi.com/api/property-info/photos?zpid=${zpid}&url=${zillowUrl}&address=${encodeURIComponent(fullAddress)}`,
      {
        method: "GET",
        headers: {
          "X-RapidAPI-Key": rapidApiKey,
          "X-RapidAPI-Host": "real-estate101.p.rapidapi.com",
        },
      }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return (data.photos || []).map((photo: { url: string }) => photo.url).slice(0, 10);
  } catch (error) {
    console.error("Error fetching photos for zpid", zpid, ":", error);
    return [];
  }
}

function parseNumber(value: unknown): number {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    return parseInt(value.replace(/[^0-9]/g, "")) || 0;
  }
  return 0;
}

function extractCity(slug: string): string {
  const parts = slug.split("-");
  if (parts.length >= 2) {
    return parts.slice(0, -1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
  }
  return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
}

function extractState(slug: string): string {
  const parts = slug.split("-");
  if (parts.length >= 2) {
    return parts[parts.length - 1].toUpperCase();
  }
  return "";
}

// Generate mock residential data for development with coordinates
function generateMockResults(params: SearchParams, locationSlug: string): PropertyResult[] {
  const city = extractCity(locationSlug);
  const state = extractState(locationSlug);
  
  // Base coordinates for common cities (for mock data)
  const cityCoords: Record<string, { lat: number; lng: number }> = {
    "willoughby-oh": { lat: 41.6395, lng: -81.4065 },
    "austin-tx": { lat: 30.2672, lng: -97.7431 },
    "denver-co": { lat: 39.7392, lng: -104.9903 },
    "seattle-wa": { lat: 47.6062, lng: -122.3321 },
    "miami-fl": { lat: 25.7617, lng: -80.1918 },
  };
  
  const baseCoords = cityCoords[locationSlug] || { lat: 39.8283, lng: -98.5795 };
  
  const mockAddresses = [
    { street: "123 Oak Street", type: "Single Family", beds: 4, baths: 2.5 },
    { street: "456 Maple Avenue", type: "Townhouse", beds: 3, baths: 2 },
    { street: "789 Pine Lane", type: "Condo", beds: 2, baths: 2 },
    { street: "321 Cedar Drive", type: "Single Family", beds: 5, baths: 3 },
    { street: "654 Elm Court", type: "Single Family", beds: 3, baths: 2 },
    { street: "987 Birch Way", type: "Townhouse", beds: 4, baths: 2.5 },
  ];

  const isRent = params.listType === "for-rent";
  const basePrice = isRent ? 2000 : 350000;

  return mockAddresses.map((addr, i) => {
    const price = isRent
      ? basePrice + (i * 300)
      : basePrice + (i * 75000);

    // Add small random offset to coordinates so markers don't stack
    const latOffset = (Math.random() - 0.5) * 0.05;
    const lngOffset = (Math.random() - 0.5) * 0.05;

    const livingArea = 1500 + (i * 350);
    const mockImgSrc = `https://placehold.co/400x300/2d4a3e/white?text=${encodeURIComponent(addr.type)}`;

    return {
      zpid: `mock-${i + 1}`,
      address: {
        streetAddress: addr.street,
        city: city,
        state: state,
        zipcode: `7870${i}`,
        latitude: baseCoords.lat + latOffset,
        longitude: baseCoords.lng + lngOffset,
      },
      price: price,
      bedrooms: params.beds || addr.beds,
      bathrooms: params.baths || addr.baths,
      livingArea: livingArea,
      lotSize: 5000 + (i * 1000),
      yearBuilt: 2000 + i * 3,
      propertyType: params.propertyType || addr.type,
      homeStatus: isRent ? "For Rent" : "For Sale",
      imgSrc: mockImgSrc,
      photos: [mockImgSrc], // Mock photos array
      detailUrl: undefined,
      // Mock marketing data
      daysOnMarket: i * 3 + 1,
      brokerName: i % 2 === 0 ? "Keller Williams" : "RE/MAX Properties",
      pricePerSqFt: Math.round(price / livingArea),
    };
  });
}
