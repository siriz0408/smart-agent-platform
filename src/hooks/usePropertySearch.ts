import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PropertySearchParams {
  location?: string;
  beds?: number;
  baths?: number;
  minPrice?: number;
  maxPrice?: number;
  minSqft?: number;
  maxSqft?: number;
  propertyType?: string;
  listType?: "for-sale" | "for-rent";
  page?: number;
}

export interface ResidentialProperty {
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
  photos?: string[];          // Photo array for carousel
  detailUrl?: string;
  // Marketing fields (optional from search API)
  daysOnMarket?: number;
  brokerName?: string;
  listingAgentName?: string;
  pricePerSqFt?: number;
  listingDate?: string;
}

export interface PropertySearchResult {
  results: ResidentialProperty[];
  totalPages: number;
  totalResults: number;
  page: number;
  _mock?: boolean;
}

export interface PropertyDetail extends ResidentialProperty {
  address: {
    streetAddress: string;
    unit?: string;
    city: string;
    state: string;
    zipcode: string;
    latitude?: number;
    longitude?: number;
  };
  description?: string;
  photos: string[];
  features?: string[];
  parkingSpaces?: number;
  hoaFee?: number;
  pricePerSqFt?: number;
}

export function usePropertySearch() {
  const [searchParams, setSearchParams] = useState<PropertySearchParams>({
    location: "",
    listType: "for-sale",
    page: 1,
  });

  const searchQuery = useQuery({
    queryKey: ["property-search", searchParams],
    queryFn: async (): Promise<PropertySearchResult> => {
      if (!searchParams.location) {
        return { results: [], totalPages: 0, totalResults: 0, page: 1 };
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zillow-search`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(searchParams),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Search failed");
      }

      return response.json();
    },
    enabled: !!searchParams.location,
  });

  const search = (params: PropertySearchParams) => {
    setSearchParams({ ...params, page: params.page || 1 });
  };

  const nextPage = () => {
    if (searchQuery.data && (searchParams.page || 1) < searchQuery.data.totalPages) {
      setSearchParams({ ...searchParams, page: (searchParams.page || 1) + 1 });
    }
  };

  const prevPage = () => {
    if ((searchParams.page || 1) > 1) {
      setSearchParams({ ...searchParams, page: (searchParams.page || 1) - 1 });
    }
  };

  return {
    ...searchQuery,
    searchParams,
    search,
    nextPage,
    prevPage,
  };
}

export function usePropertyDetail(propertyId: string | null) {
  return useQuery({
    queryKey: ["property-detail", propertyId],
    queryFn: async (): Promise<PropertyDetail> => {
      if (!propertyId) throw new Error("No property ID provided");

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zillow-property-detail`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ zpid: propertyId }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch property details");
      }

      return response.json();
    },
    enabled: !!propertyId,
  });
}

export function useSaveProperty() {
  return useMutation({
    mutationFn: async (property: ResidentialProperty & { notes?: string; is_favorite?: boolean }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-external-property`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            source: "zillow",
            external_id: property.zpid,
            address: {
              street_address: property.address.streetAddress,
              city: property.address.city,
              state: property.address.state,
              zip_code: property.address.zipcode,
            },
            price: property.price,
            bedrooms: property.bedrooms,
            bathrooms: property.bathrooms,
            square_feet: property.livingArea,
            lot_size: property.lotSize,
            year_built: property.yearBuilt,
            property_type: property.propertyType,
            status: property.homeStatus,
            photos: property.photos || (property.imgSrc ? [property.imgSrc] : undefined),
            notes: property.notes,
            is_favorite: property.is_favorite,
            // Marketing fields
            days_on_market: property.daysOnMarket,
            broker_name: property.brokerName,
            listing_agent_name: property.listingAgentName,
            listing_date: property.listingDate,
            price_per_sqft: property.pricePerSqFt || (property.price && property.livingArea ? property.price / property.livingArea : undefined),
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save property");
      }

      return response.json();
    },
  });
}

// Legacy type exports for backwards compatibility
export type CommercialProperty = ResidentialProperty;
export type ZillowProperty = ResidentialProperty;
export type ZillowSearchParams = PropertySearchParams;
export type ZillowSearchResult = PropertySearchResult;
export type ZillowPropertyDetail = PropertyDetail;
export const useZillowSearch = usePropertySearch;
export const useZillowPropertyDetail = usePropertyDetail;
export const useSaveExternalProperty = useSaveProperty;
