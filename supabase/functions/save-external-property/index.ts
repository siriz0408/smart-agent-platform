import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logger } from "../_shared/logger.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createErrorResponse } from "../_shared/error-handler.ts";

interface SavePropertyRequest {
  source: "zillow" | "redfin" | "realtor" | "loopnet" | "manual";
  external_id: string;
  address: {
    street_address: string;
    unit?: string;
    city: string;
    state: string;
    zip_code: string;
    latitude?: number;
    longitude?: number;
  };
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  square_feet?: number;
  lot_size?: number;
  year_built?: number;
  property_type?: string;
  status?: string;
  description?: string;
  photos?: string[];
  raw_data?: Record<string, unknown>;
  notes?: string;
  is_favorite?: boolean;
  // Marketing fields
  days_on_market?: number;
  broker_name?: string;
  listing_agent_name?: string;
  listing_agent_phone?: string;
  listing_date?: string;
  price_per_sqft?: number;
  lot_size_sqft?: number;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: SavePropertyRequest = await req.json();

    if (!body.source || !body.external_id || !body.address) {
      return new Response(
        JSON.stringify({ error: "source, external_id, and address are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // User client for authentication
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Service client for inserting external data (bypasses RLS)
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Step 1: Upsert address
    const formattedAddress = `${body.address.street_address}${body.address.unit ? ` ${body.address.unit}` : ""}, ${body.address.city}, ${body.address.state} ${body.address.zip_code}`;

    const { data: addressData, error: addressError } = await serviceClient
      .from("addresses")
      .upsert({
        street_address: body.address.street_address,
        unit: body.address.unit || null,
        city: body.address.city,
        state: body.address.state,
        zip_code: body.address.zip_code,
        latitude: body.address.latitude || null,
        longitude: body.address.longitude || null,
        formatted_address: formattedAddress,
      }, {
        onConflict: "street_address,unit,city,state,zip_code",
      })
      .select("id")
      .single();

    if (addressError) {
      logger.error("Address upsert error", { error: addressError.message });
      return new Response(
        JSON.stringify({ error: "Failed to save address", details: addressError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Upsert external property (store address as JSONB with formatted_address)
    const addressJson = {
      street_address: body.address.street_address,
      unit: body.address.unit || null,
      city: body.address.city,
      state: body.address.state,
      zip_code: body.address.zip_code,
      latitude: body.address.latitude || null,
      longitude: body.address.longitude || null,
      formatted_address: formattedAddress,
    };

    const { data: propertyData, error: propertyError } = await serviceClient
      .from("external_properties")
      .upsert({
        source: body.source,
        external_id: body.external_id,
        address: addressJson,
        price: body.price || null,
        bedrooms: body.bedrooms || null,
        bathrooms: body.bathrooms || null,
        square_feet: body.square_feet || null,
        lot_size: body.lot_size || null,
        year_built: body.year_built || null,
        property_type: body.property_type || null,
        status: body.status || null,
        description: body.description || null,
        photos: body.photos || null,
        raw_data: body.raw_data || null,
        last_synced_at: new Date().toISOString(),
        // Marketing fields
        days_on_market: body.days_on_market || null,
        broker_name: body.broker_name || null,
        listing_agent_name: body.listing_agent_name || null,
        listing_agent_phone: body.listing_agent_phone || null,
        listing_date: body.listing_date ? new Date(body.listing_date).toISOString() : null,
        price_per_sqft: body.price_per_sqft || null,
        lot_size_sqft: body.lot_size_sqft || body.lot_size || null,
      }, {
        onConflict: "source,external_id",
      })
      .select("id")
      .single();

    if (propertyError) {
      logger.error("Property upsert error", { error: propertyError.message });
      return new Response(
        JSON.stringify({ error: "Failed to save external property", details: propertyError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Check if already saved, then insert or update
    // Using check-then-upsert pattern because Supabase SDK doesn't support partial indexes in onConflict
    const { data: existingSaved } = await userClient
      .from("saved_properties")
      .select("id")
      .eq("user_id", user.id)
      .eq("external_property_id", propertyData.id)
      .maybeSingle();

    let savedData;
    let savedError;

    if (existingSaved) {
      // Update existing saved property
      const { data, error } = await userClient
        .from("saved_properties")
        .update({
          notes: body.notes || null,
          is_favorite: body.is_favorite || false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingSaved.id)
        .select(`
          id,
          property_type,
          notes,
          is_favorite,
          created_at,
          external_properties (
            id,
            source,
            external_id,
            price,
            bedrooms,
            bathrooms,
            square_feet,
            property_type,
            status,
            photos,
            address
          )
        `)
        .single();
      savedData = data;
      savedError = error;
    } else {
      // Insert new saved property
      const { data, error } = await userClient
        .from("saved_properties")
        .insert({
          user_id: user.id,
          property_type: "external",
          external_property_id: propertyData.id,
          notes: body.notes || null,
          is_favorite: body.is_favorite || false,
        })
        .select(`
          id,
          property_type,
          notes,
          is_favorite,
          created_at,
          external_properties (
            id,
            source,
            external_id,
            price,
            bedrooms,
            bathrooms,
            square_feet,
            property_type,
            status,
            photos,
            address
          )
        `)
        .single();
      savedData = data;
      savedError = error;
    }

    if (savedError) {
      logger.error("Saved property error", { error: savedError.message });
      return new Response(
        JSON.stringify({ error: "Failed to save property to user's list", details: savedError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        saved_property: savedData,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return createErrorResponse(error, corsHeaders, {
      functionName: "save-external-property",
      logContext: { endpoint: "save-external-property" },
    });
  }
});
