import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { AgentContext } from "@/hooks/useAgentExecution";

interface AgentInputFormProps {
  agentType: string;
  dataSources?: string[];
  context: AgentContext;
  onContextChange: (context: AgentContext) => void;
  disabled?: boolean;
}

export function AgentInputForm({ agentType, dataSources = [], context, onContextChange, disabled }: AgentInputFormProps) {
  // Determine which data sources to show based on dataSources prop or fallback to agentType pattern matching
  const needsProperty = dataSources.includes("property") || agentType === "listing_writer" || agentType === "cma_analyst";
  const needsContact = dataSources.includes("contact") || agentType === "followup_assistant";
  const needsDocument = dataSources.includes("document") || agentType === "contract_reviewer";
  const needsDeal = dataSources.includes("deal") || agentType === "offer_analyzer";

  // Fetch properties for property-related agents
  const { data: properties = [] } = useQuery({
    queryKey: ["properties-for-agent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, address, city, state")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: needsProperty,
  });

  // Fetch contacts for contact-related agents
  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts-for-agent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, email")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: needsContact,
  });

  // Fetch documents for document-related agents
  const { data: documents = [] } = useQuery({
    queryKey: ["documents-for-agent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id, name, category")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: needsDocument,
  });

  // Fetch deals for deal-related agents
  const { data: deals = [] } = useQuery({
    queryKey: ["deals-for-agent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("id, deal_type, stage, contacts(first_name, last_name), properties(address, city)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: needsDeal,
  });

  return (
    <div className="space-y-4">
      {/* Property selector */}
      {needsProperty && (
        <div className="space-y-2">
          <Label>Select Property</Label>
          <Select
            value={context.property_id || ""}
            onValueChange={(value) => onContextChange({ ...context, property_id: value })}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a property..." />
            </SelectTrigger>
            <SelectContent>
              {properties.length === 0 ? (
                <SelectItem value="none" disabled>
                  No properties found
                </SelectItem>
              ) : (
                properties.map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.address}, {property.city}, {property.state}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {properties.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Create a property first to use this agent.
            </p>
          )}
        </div>
      )}

      {/* Contact selector */}
      {needsContact && (
        <div className="space-y-2">
          <Label>Select Contact</Label>
          <Select
            value={context.contact_id || ""}
            onValueChange={(value) => onContextChange({ ...context, contact_id: value })}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a contact..." />
            </SelectTrigger>
            <SelectContent>
              {contacts.length === 0 ? (
                <SelectItem value="none" disabled>
                  No contacts found
                </SelectItem>
              ) : (
                contacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {contact.first_name} {contact.last_name}
                    {contact.email && ` (${contact.email})`}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {contacts.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Create a contact first to use this agent.
            </p>
          )}
        </div>
      )}

      {/* Document selector */}
      {needsDocument && (
        <div className="space-y-2">
          <Label>Select Document</Label>
          <Select
            value={context.document_id || ""}
            onValueChange={(value) => onContextChange({ ...context, document_id: value })}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a document..." />
            </SelectTrigger>
            <SelectContent>
              {documents.length === 0 ? (
                <SelectItem value="none" disabled>
                  No documents found
                </SelectItem>
              ) : (
                documents.map((doc) => (
                  <SelectItem key={doc.id} value={doc.id}>
                    {doc.name} {doc.category && `(${doc.category})`}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {documents.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Upload a document first to use this agent.
            </p>
          )}
        </div>
      )}

      {/* Deal selector */}
      {needsDeal && (
        <div className="space-y-2">
          <Label>Select Deal</Label>
          <Select
            value={context.deal_id || ""}
            onValueChange={(value) => onContextChange({ ...context, deal_id: value })}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a deal..." />
            </SelectTrigger>
            <SelectContent>
              {deals.length === 0 ? (
                <SelectItem value="none" disabled>
                  No deals found
                </SelectItem>
              ) : (
                deals.map((deal) => {
                  const contact = deal.contacts as { first_name: string; last_name: string } | null;
                  const property = deal.properties as { address: string; city: string } | null;
                  return (
                    <SelectItem key={deal.id} value={deal.id}>
                      {deal.deal_type} - {contact ? `${contact.first_name} ${contact.last_name}` : "No contact"}
                      {property && ` @ ${property.address}`}
                    </SelectItem>
                  );
                })
              )}
            </SelectContent>
          </Select>
          {deals.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Create a deal first to use this agent.
            </p>
          )}
        </div>
      )}

      {/* Additional context for all agents */}
      <div className="space-y-2">
        <Label>Additional Context (Optional)</Label>
        <Textarea
          placeholder="Add any additional instructions or context for the AI..."
          value={context.additional_context || ""}
          onChange={(e) => onContextChange({ ...context, additional_context: e.target.value })}
          disabled={disabled}
          rows={3}
        />
      </div>
    </div>
  );
}
