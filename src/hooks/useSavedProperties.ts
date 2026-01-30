import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface SavedProperty {
  id: string;
  property_type: "internal" | "external";
  notes: string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  // Internal property data (if internal)
  internal_property?: {
    id: string;
    address: string;
    city: string;
    state: string;
    zip_code: string;
    price: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    square_feet: number | null;
    lot_size: number | null;
    year_built: number | null;
    property_type: string | null;
    status: string | null;
    photos: string[] | null;
  };
  // External property data (if external)
  external_property?: {
    id: string;
    source: string;
    external_id: string;
    price: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    square_feet: number | null;
    lot_size: number | null;
    year_built: number | null;
    property_type: string | null;
    status: string | null;
    photos: string[] | null;
    address?: {
      street_address: string;
      city: string;
      state: string;
      zip_code: string;
      formatted_address: string | null;
    };
  };
}

interface SavedPropertyRow {
  id: string;
  property_type: string;
  notes: string | null;
  is_favorite: boolean | null;
  created_at: string;
  updated_at: string;
  properties: Record<string, unknown> | null;
  external_properties: Record<string, unknown> | null;
}

export function useSavedProperties() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["saved-properties", user?.id],
    queryFn: async (): Promise<SavedProperty[]> => {
      if (!user) return [];

      // Fetch saved properties with related data
      const { data, error } = await supabase
        .from("saved_properties")
        .select(`
          id,
          property_type,
          notes,
          is_favorite,
          created_at,
          updated_at,
          properties:internal_property_id (
            id,
            address,
            city,
            state,
            zip_code,
            price,
            bedrooms,
            bathrooms,
            square_feet,
            lot_size,
            year_built,
            property_type,
            status,
            photos
          ),
          external_properties:external_property_id (
            id,
            source,
            external_id,
            price,
            bedrooms,
            bathrooms,
            square_feet,
            lot_size,
            year_built,
            property_type,
            status,
            photos,
            address
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Transform the data to a cleaner format
      return ((data || []) as unknown as SavedPropertyRow[]).map((item) => ({
        id: item.id,
        property_type: item.property_type as "internal" | "external",
        notes: item.notes,
        is_favorite: item.is_favorite ?? false,
        created_at: item.created_at,
        updated_at: item.updated_at,
        internal_property: item.properties ? {
          id: item.properties.id as string,
          address: item.properties.address as string,
          city: item.properties.city as string,
          state: item.properties.state as string,
          zip_code: item.properties.zip_code as string,
          price: item.properties.price as number | null,
          bedrooms: item.properties.bedrooms as number | null,
          bathrooms: item.properties.bathrooms as number | null,
          square_feet: item.properties.square_feet as number | null,
          lot_size: item.properties.lot_size as number | null,
          year_built: item.properties.year_built as number | null,
          property_type: item.properties.property_type as string | null,
          status: item.properties.status as string | null,
          photos: item.properties.photos as string[] | null,
        } : undefined,
        external_property: item.external_properties ? {
          id: item.external_properties.id as string,
          source: item.external_properties.source as string,
          external_id: item.external_properties.external_id as string,
          price: item.external_properties.price as number | null,
          bedrooms: item.external_properties.bedrooms as number | null,
          bathrooms: item.external_properties.bathrooms as number | null,
          square_feet: item.external_properties.square_feet as number | null,
          lot_size: item.external_properties.lot_size as number | null,
          year_built: item.external_properties.year_built as number | null,
          property_type: item.external_properties.property_type as string | null,
          status: item.external_properties.status as string | null,
          photos: item.external_properties.photos as string[] | null,
          address: item.external_properties.address ? (item.external_properties.address as {
            street_address: string;
            city: string;
            state: string;
            zip_code: string;
            formatted_address: string | null;
          }) : undefined,
        } : undefined,
      }));
    },
    enabled: !!user,
  });
}

export function useUpdateSavedProperty() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, notes, is_favorite }: { id: string; notes?: string; is_favorite?: boolean }) => {
      const updates: Record<string, unknown> = {};
      if (notes !== undefined) updates.notes = notes;
      if (is_favorite !== undefined) updates.is_favorite = is_favorite;

      const { data, error } = await supabase
        .from("saved_properties")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-properties", user?.id] });
    },
  });
}

export function useRemoveSavedProperty() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("saved_properties")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-properties", user?.id] });
    },
  });
}
