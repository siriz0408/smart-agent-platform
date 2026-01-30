import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type MentionType = "doc" | "contact" | "property";

export interface Mention {
  type: MentionType;
  id: string;
  name: string;
  subtitle?: string;
}

export interface ParsedMention {
  type: MentionType;
  id: string;
  name: string;
}

// Parse @mentions from a message string
export function parseMentions(text: string): { mentions: ParsedMention[]; cleanText: string } {
  const mentionRegex = /@(doc|contact|property):([a-f0-9-]+)\[([^\]]+)\]/g;
  const mentions: ParsedMention[] = [];
  let cleanText = text;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push({
      type: match[1] as MentionType,
      id: match[2],
      name: match[3],
    });
    // Replace mention with just the name for display
    cleanText = cleanText.replace(match[0], `@${match[3]}`);
  }

  return { mentions, cleanText };
}

// Format a mention for the message string
export function formatMention(mention: Mention): string {
  return `@${mention.type}:${mention.id}[${mention.name}]`;
}

export function useMentionSearch() {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [mentionType, setMentionType] = useState<MentionType | null>(null);

  // Search documents
  const { data: documents = [] } = useQuery({
    queryKey: ["mention-documents", searchQuery],
    queryFn: async () => {
      if (!profile?.tenant_id || !searchQuery) return [];
      const { data, error } = await supabase
        .from("documents")
        .select("id, name, category")
        .eq("tenant_id", profile.tenant_id)
        .ilike("name", `%${searchQuery}%`)
        .order("updated_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data.map((d) => ({
        type: "doc" as MentionType,
        id: d.id,
        name: d.name,
        subtitle: d.category || "Document",
      }));
    },
    enabled: !!profile?.tenant_id && !!searchQuery && mentionType !== "contact" && mentionType !== "property",
  });

  // Search contacts
  const { data: contacts = [] } = useQuery({
    queryKey: ["mention-contacts", searchQuery],
    queryFn: async () => {
      if (!profile?.tenant_id || !searchQuery) return [];
      const { data, error } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, company")
        .eq("tenant_id", profile.tenant_id)
        .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`)
        .order("updated_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data.map((c) => ({
        type: "contact" as MentionType,
        id: c.id,
        name: `${c.first_name} ${c.last_name}`,
        subtitle: c.company || "Contact",
      }));
    },
    enabled: !!profile?.tenant_id && !!searchQuery && mentionType !== "doc" && mentionType !== "property",
  });

  // Search properties
  const { data: properties = [] } = useQuery({
    queryKey: ["mention-properties", searchQuery],
    queryFn: async () => {
      if (!profile?.tenant_id || !searchQuery) return [];
      const { data, error } = await supabase
        .from("properties")
        .select("id, address, city, state")
        .eq("tenant_id", profile.tenant_id)
        .or(`address.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%`)
        .order("updated_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data.map((p) => ({
        type: "property" as MentionType,
        id: p.id,
        name: p.address,
        subtitle: `${p.city}, ${p.state}`,
      }));
    },
    enabled: !!profile?.tenant_id && !!searchQuery && mentionType !== "doc" && mentionType !== "contact",
  });

  // Combine results based on filter
  const getFilteredResults = useCallback((): Mention[] => {
    if (!mentionType) {
      return [...documents, ...contacts, ...properties];
    }
    switch (mentionType) {
      case "doc":
        return documents;
      case "contact":
        return contacts;
      case "property":
        return properties;
      default:
        return [];
    }
  }, [documents, contacts, properties, mentionType]);

  const search = useCallback((query: string, type?: MentionType) => {
    setSearchQuery(query);
    setMentionType(type || null);
  }, []);

  const clear = useCallback(() => {
    setSearchQuery("");
    setMentionType(null);
  }, []);

  return {
    search,
    clear,
    results: getFilteredResults(),
    isSearching: !!searchQuery,
  };
}
