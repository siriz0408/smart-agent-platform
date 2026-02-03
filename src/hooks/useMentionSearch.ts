import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type MentionType = "doc" | "contact" | "property" | "deal";

// Collection types for bulk references using # syntax
export type CollectionType = "Properties" | "Contacts" | "Deals" | "Documents";

export interface Mention {
  type: MentionType;
  id: string;
  name: string;
  subtitle?: string;
}

// Collection mention (e.g., #Properties, #Contacts)
export interface CollectionMention {
  type: "collection";
  collection: CollectionType;
}

export interface ParsedMention {
  type: MentionType;
  id: string;
  name: string;
}

// Parsed collection reference
export interface ParsedCollection {
  collection: CollectionType;
}

// Parse @mentions from a message string
export function parseMentions(text: string): { mentions: ParsedMention[]; cleanText: string } {
  const mentionRegex = /@(doc|contact|property|deal):([a-f0-9-]+)\[([^\]]+)\]/g;
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

// Parse #Collection references from a message string
export function parseCollectionMentions(text: string): { collections: ParsedCollection[]; cleanText: string } {
  const collectionRegex = /#(Properties|Contacts|Deals|Documents)/gi;
  const collections: ParsedCollection[] = [];
  const seen = new Set<string>();
  let cleanText = text;
  let match;

  while ((match = collectionRegex.exec(text)) !== null) {
    // Normalize to title case
    const collection = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase() as CollectionType;
    
    // Only add unique collections
    if (!seen.has(collection)) {
      seen.add(collection);
      collections.push({ collection });
    }
    // Replace with display format
    cleanText = cleanText.replace(match[0], `#${collection}`);
  }

  return { collections, cleanText };
}

// Format a collection mention for the message string
export function formatCollection(collection: CollectionType): string {
  return `#${collection}`;
}

// Get all available collections for autocomplete
export function getAvailableCollections(): Array<{ type: "collection"; collection: CollectionType; name: string; subtitle: string }> {
  return [
    { type: "collection", collection: "Properties", name: "Properties", subtitle: "Search all your properties" },
    { type: "collection", collection: "Contacts", name: "Contacts", subtitle: "Search all your contacts" },
    { type: "collection", collection: "Deals", name: "Deals", subtitle: "Search all your deals" },
    { type: "collection", collection: "Documents", name: "Documents", subtitle: "Search all your documents" },
  ];
}

// Format a mention for the message string
export function formatMention(mention: Mention): string {
  return `@${mention.type}:${mention.id}[${mention.name}]`;
}

// Fetch full data for mentioned entities
export interface MentionData {
  type: MentionType;
  id: string;
  name: string;
  data: Record<string, unknown>;
}

export async function fetchMentionData(
  mentions: ParsedMention[],
  supabaseClient: typeof supabase
): Promise<MentionData[]> {
  const results: MentionData[] = [];
  
  const contactIds = mentions.filter(m => m.type === "contact").map(m => m.id);
  const propertyIds = mentions.filter(m => m.type === "property").map(m => m.id);
  const documentIds = mentions.filter(m => m.type === "doc").map(m => m.id);
  const dealIds = mentions.filter(m => m.type === "deal").map(m => m.id);
  
  // Fetch contacts
  if (contactIds.length > 0) {
    const { data: contacts } = await supabaseClient
      .from("contacts")
      .select("*")
      .in("id", contactIds);
    
    if (contacts) {
      for (const contact of contacts) {
        results.push({
          type: "contact",
          id: contact.id,
          name: `${contact.first_name} ${contact.last_name}`,
          data: contact,
        });
      }
    }
  }
  
  // Fetch properties
  if (propertyIds.length > 0) {
    const { data: properties } = await supabaseClient
      .from("properties")
      .select("*")
      .in("id", propertyIds);
    
    if (properties) {
      for (const property of properties) {
        results.push({
          type: "property",
          id: property.id,
          name: property.address,
          data: property,
        });
      }
    }
  }
  
  // Fetch document metadata (not full content, just metadata)
  if (documentIds.length > 0) {
    const { data: documents } = await supabaseClient
      .from("documents")
      .select("id, name, category, summary, created_at")
      .in("id", documentIds);
    
    if (documents) {
      for (const doc of documents) {
        results.push({
          type: "doc",
          id: doc.id,
          name: doc.name,
          data: doc,
        });
      }
    }
  }
  
  // Fetch deals with related data
  if (dealIds.length > 0) {
    const { data: dealsData } = await supabaseClient
      .from("deals")
      .select(`
        *,
        contacts:contact_id(first_name, last_name, email, phone),
        properties:property_id(address, city, state, price)
      `)
      .in("id", dealIds);
    
    if (dealsData) {
      for (const deal of dealsData) {
        const contactName = deal.contacts ? `${(deal.contacts as { first_name: string; last_name: string }).first_name} ${(deal.contacts as { first_name: string; last_name: string }).last_name}` : "Unknown";
        const propertyAddr = deal.properties ? (deal.properties as { address: string }).address : "";
        results.push({
          type: "deal",
          id: deal.id,
          name: propertyAddr || contactName,
          data: {
            ...deal,
            contact_name: contactName,
            contact_info: deal.contacts,
            property_address: propertyAddr,
            property_info: deal.properties,
          },
        });
      }
    }
  }
  
  return results;
}

export function useMentionSearch() {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [mentionType, setMentionType] = useState<MentionType | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce the search query to reduce API calls
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 150); // 150ms debounce
    
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery]);

  // Search documents
  const { data: documents = [] } = useQuery({
    queryKey: ["mention-documents", debouncedQuery],
    queryFn: async () => {
      if (!profile?.tenant_id || !debouncedQuery) return [];
      const { data, error } = await supabase
        .from("documents")
        .select("id, name, category")
        .eq("tenant_id", profile.tenant_id)
        .ilike("name", `%${debouncedQuery}%`)
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
    enabled: !!profile?.tenant_id && !!debouncedQuery && mentionType !== "contact" && mentionType !== "property" && mentionType !== "deal",
  });

  // Search contacts
  const { data: contacts = [] } = useQuery({
    queryKey: ["mention-contacts", debouncedQuery],
    queryFn: async () => {
      if (!profile?.tenant_id || !debouncedQuery) return [];
      const { data, error } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, company")
        .eq("tenant_id", profile.tenant_id)
        .or(`first_name.ilike.%${debouncedQuery}%,last_name.ilike.%${debouncedQuery}%`)
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
    enabled: !!profile?.tenant_id && !!debouncedQuery && mentionType !== "doc" && mentionType !== "property" && mentionType !== "deal",
  });

  // Search properties
  const { data: properties = [] } = useQuery({
    queryKey: ["mention-properties", debouncedQuery],
    queryFn: async () => {
      if (!profile?.tenant_id || !debouncedQuery) return [];
      const { data, error } = await supabase
        .from("properties")
        .select("id, address, city, state")
        .eq("tenant_id", profile.tenant_id)
        .or(`address.ilike.%${debouncedQuery}%,city.ilike.%${debouncedQuery}%`)
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
    enabled: !!profile?.tenant_id && !!debouncedQuery && mentionType !== "doc" && mentionType !== "contact" && mentionType !== "deal",
  });

  // Search deals
  const { data: deals = [] } = useQuery({
    queryKey: ["mention-deals", debouncedQuery],
    queryFn: async () => {
      if (!profile?.tenant_id || !debouncedQuery) return [];
      // Get deals with related contact and property info
      const { data, error } = await supabase
        .from("deals")
        .select(`
          id, 
          deal_type, 
          stage,
          estimated_value,
          contacts:contact_id(first_name, last_name),
          properties:property_id(address)
        `)
        .eq("tenant_id", profile.tenant_id)
        .order("updated_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      // Filter by search query (deal type or related contact/property)
      const filtered = data.filter((d) => {
        const contactName = d.contacts ? `${(d.contacts as { first_name: string; last_name: string }).first_name} ${(d.contacts as { first_name: string; last_name: string }).last_name}`.toLowerCase() : "";
        const propertyAddr = d.properties ? (d.properties as { address: string }).address?.toLowerCase() : "";
        const dealType = d.deal_type?.toLowerCase() || "";
        const query = debouncedQuery.toLowerCase();
        return contactName.includes(query) || propertyAddr.includes(query) || dealType.includes(query);
      });
      return filtered.slice(0, 5).map((d) => {
        const contactName = d.contacts ? `${(d.contacts as { first_name: string; last_name: string }).first_name} ${(d.contacts as { first_name: string; last_name: string }).last_name}` : "Unknown";
        const propertyAddr = d.properties ? (d.properties as { address: string }).address : "";
        return {
          type: "deal" as MentionType,
          id: d.id,
          name: propertyAddr || contactName,
          subtitle: `${d.deal_type} - ${d.stage || "New"} - $${d.estimated_value?.toLocaleString() || "TBD"}`,
        };
      });
    },
    enabled: !!profile?.tenant_id && !!debouncedQuery && mentionType !== "doc" && mentionType !== "contact" && mentionType !== "property",
  });

  // Combine results based on filter
  const getFilteredResults = useCallback((): Mention[] => {
    if (!mentionType) {
      return [...documents, ...contacts, ...properties, ...deals];
    }
    switch (mentionType) {
      case "doc":
        return documents;
      case "contact":
        return contacts;
      case "property":
        return properties;
      case "deal":
        return deals;
      default:
        return [];
    }
  }, [documents, contacts, properties, deals, mentionType]);

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
