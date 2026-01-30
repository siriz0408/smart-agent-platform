import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

export interface SocialLink {
  id: string;
  user_id: string;
  platform: string;
  url: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Credential {
  id: string;
  user_id: string;
  credential_type: string;
  title: string;
  issuer: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  credential_number: string | null;
  verification_url: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface GalleryItem {
  id: string;
  user_id: string;
  storage_path: string;
  filename: string;
  caption: string | null;
  display_order: number;
  created_at: string;
}

export function useProfileExtensions(userId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const targetUserId = userId || user?.id;

  // Fetch social links
  const socialLinksQuery = useQuery({
    queryKey: ["social-links", targetUserId],
    queryFn: async () => {
      if (!targetUserId) return [];
      const { data, error } = await supabase
        .from("profile_social_links")
        .select("*")
        .eq("user_id", targetUserId)
        .order("display_order");
      if (error) throw error;
      return data as SocialLink[];
    },
    enabled: !!targetUserId,
  });

  // Fetch credentials
  const credentialsQuery = useQuery({
    queryKey: ["credentials", targetUserId],
    queryFn: async () => {
      if (!targetUserId) return [];
      const { data, error } = await supabase
        .from("profile_credentials")
        .select("*")
        .eq("user_id", targetUserId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Credential[];
    },
    enabled: !!targetUserId,
  });

  // Fetch gallery
  const galleryQuery = useQuery({
    queryKey: ["gallery", targetUserId],
    queryFn: async () => {
      if (!targetUserId) return [];
      const { data, error } = await supabase
        .from("profile_gallery")
        .select("*")
        .eq("user_id", targetUserId)
        .order("display_order");
      if (error) throw error;
      return data as GalleryItem[];
    },
    enabled: !!targetUserId,
  });

  // Add social link
  const addSocialLink = useMutation({
    mutationFn: async (link: { platform: string; url: string }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("profile_social_links")
        .insert({ user_id: user.id, ...link })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-links", user?.id] });
      toast({ title: "Social link added" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Update social link
  const updateSocialLink = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SocialLink> & { id: string }) => {
      const { error } = await supabase
        .from("profile_social_links")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-links", user?.id] });
    },
  });

  // Delete social link
  const deleteSocialLink = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("profile_social_links")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-links", user?.id] });
      toast({ title: "Social link removed" });
    },
  });

  // Add credential
  const addCredential = useMutation({
    mutationFn: async (credential: Omit<Credential, "id" | "user_id" | "created_at" | "updated_at">) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("profile_credentials")
        .insert({ user_id: user.id, ...credential })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credentials", user?.id] });
      toast({ title: "Credential added" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete credential
  const deleteCredential = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("profile_credentials")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credentials", user?.id] });
      toast({ title: "Credential removed" });
    },
  });

  // Add gallery item
  const addGalleryItem = useMutation({
    mutationFn: async (item: { storage_path: string; filename: string; caption?: string }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("profile_gallery")
        .insert({ user_id: user.id, ...item })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gallery", user?.id] });
      toast({ title: "Image added to gallery" });
    },
  });

  // Delete gallery item
  const deleteGalleryItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("profile_gallery")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gallery", user?.id] });
      toast({ title: "Image removed from gallery" });
    },
  });

  return {
    socialLinks: socialLinksQuery.data ?? [],
    credentials: credentialsQuery.data ?? [],
    gallery: galleryQuery.data ?? [],
    isLoading: socialLinksQuery.isLoading || credentialsQuery.isLoading || galleryQuery.isLoading,
    addSocialLink,
    updateSocialLink,
    deleteSocialLink,
    addCredential,
    deleteCredential,
    addGalleryItem,
    deleteGalleryItem,
  };
}
