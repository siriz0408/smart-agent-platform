import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

interface PropertyDetail {
  zpid: string;
  address: {
    streetAddress: string;
    unit?: string;
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
  description?: string;
  photos: string[];
  features?: string[];
  parkingSpaces?: number;
  hoaFee?: number;
  pricePerSqFt?: number;
}

// Fetch property photos from dedicated photos endpoint
async function fetchPropertyPhotos(
  zpid: string,
  address: string,
  rapidApiKey: string
): Promise<string[]> {
  try {
    // Build the address slug for Zillow URL (e.g., "188-Shaw-St-New-London-CT-06320")
    const addressSlug = address
      .replace(/\s+/g, "-")
      .replace(/,/g, "")
      .replace(/--+/g, "-");
    
    const zillowUrl = encodeURIComponent(
      `https://www.zillow.com/homedetails/${addressSlug}/${zpid}_zpid/`
    );

    console.log("Fetching photos for zpid:", zpid, "address:", address);

    const response = await fetch(
      `https://real-estate101.p.rapidapi.com/api/property-info/photos?zpid=${zpid}&url=${zillowUrl}&address=${encodeURIComponent(address)}`,
      {
        method: "GET",
        headers: {
          "X-RapidAPI-Key": rapidApiKey,
          "X-RapidAPI-Host": "real-estate101.p.rapidapi.com",
        },
      }
    );

    if (!response.ok) {
      console.error("Photos API error:", response.status);
      return [];
    }

    const data = await response.json();
    console.log("Photos API returned", data.photos?.length || 0, "photos");
    
    // Extract just the URLs from the photos array
    return (data.photos || []).map((photo: { url: string }) => photo.url);
  } catch (error) {
    console.error("Error fetching property photos:", error);
    return [];
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { id, zpid } = await req.json();
    const propertyId = id || zpid;

    if (!propertyId) {
      return new Response(
        JSON.stringify({ error: "id is required" }),
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

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If no RapidAPI key configured or mock ID, return mock data
    if (!RAPIDAPI_KEY || propertyId.startsWith("mock-")) {
      console.log("Returning mock property detail for:", propertyId);
      const mockDetail = generateMockDetail(propertyId);
      return new Response(
        JSON.stringify(mockDetail),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Real Estate 101 API for property details
    const propertyResponse = await fetch(
      `https://real-estate101.p.rapidapi.com/api/property?zpid=${propertyId}`,
      {
        method: "GET",
        headers: {
          "X-RapidAPI-Key": RAPIDAPI_KEY,
          "X-RapidAPI-Host": "real-estate101.p.rapidapi.com",
        },
      }
    );

    if (!propertyResponse.ok) {
      console.error("Real Estate 101 API error:", propertyResponse.status, await propertyResponse.text());
      // Return mock data as fallback
      const mockDetail = generateMockDetail(propertyId);
      return new Response(
        JSON.stringify({ ...mockDetail, _mock: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await propertyResponse.json();

    // Transform response to our format
    const detail: PropertyDetail = {
      zpid: data.zpid?.toString() || propertyId,
      address: {
        streetAddress: data.streetAddress || data.address || "",
        unit: data.unit || undefined,
        city: data.city || "",
        state: data.state || "",
        zipcode: data.zipcode || data.zip || "",
        latitude: data.latitude || undefined,
        longitude: data.longitude || undefined,
      },
      price: parseNumber(data.price),
      bedrooms: parseNumber(data.bedrooms || data.beds),
      bathrooms: parseFloat((data.bathrooms || data.baths || 0).toString()),
      livingArea: parseNumber(data.livingArea || data.sqft),
      lotSize: parseNumber(data.lotAreaValue || data.lotSize),
      yearBuilt: parseNumber(data.yearBuilt),
      propertyType: data.propertyType || data.homeType || "Single Family",
      homeStatus: data.homeStatus || "For Sale",
      description: data.description || undefined,
      photos: [], // Will be populated from photos API
      features: data.features || data.amenities || [],
      parkingSpaces: parseNumber(data.parkingSpaces),
      hoaFee: parseNumber(data.hoaFee || data.monthlyHoaFee),
      pricePerSqFt: undefined,
    };

    // Calculate price per sqft
    if (detail.livingArea > 0) {
      detail.pricePerSqFt = Math.round(detail.price / detail.livingArea);
    }

    // Fetch property photos from dedicated photos endpoint
    const addressString = `${detail.address.streetAddress}, ${detail.address.city}, ${detail.address.state} ${detail.address.zipcode}`;
    const photos = await fetchPropertyPhotos(propertyId, addressString, RAPIDAPI_KEY);

    // Use fetched photos, or fall back to main API photos, or empty array
    detail.photos = photos.length > 0 
      ? photos 
      : (data.photos || data.images || []);

    return new Response(
      JSON.stringify(detail),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("property-detail error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function parseNumber(value: unknown): number {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    return parseInt(value.replace(/[^0-9]/g, "")) || 0;
  }
  return 0;
}

// Generate mock residential property detail
function generateMockDetail(id: string): PropertyDetail {
  return {
    zpid: id,
    address: {
      streetAddress: "123 Oak Street",
      city: "Austin",
      state: "TX",
      zipcode: "78701",
      latitude: 30.2672,
      longitude: -97.7431,
    },
    price: 450000,
    bedrooms: 4,
    bathrooms: 2.5,
    livingArea: 2400,
    lotSize: 7500,
    yearBuilt: 2018,
    propertyType: "Single Family",
    homeStatus: "For Sale",
    description: "Beautiful single-family home in a desirable neighborhood. Features an open floor plan with modern finishes, updated kitchen with granite countertops and stainless steel appliances. Large backyard perfect for entertaining. Close to schools, parks, and shopping.",
    photos: [
      "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&h=600&fit=crop",
    ],
    features: [
      "Central Air",
      "Hardwood Floors",
      "Granite Countertops",
      "Stainless Appliances",
      "2-Car Garage",
      "Fenced Backyard",
      "Walk-in Closets",
      "Energy Efficient",
    ],
    parkingSpaces: 2,
    hoaFee: 0,
    pricePerSqFt: 188,
  };
}
