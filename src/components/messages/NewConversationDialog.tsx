import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, MessageSquare, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  user_id: string | null;
}

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectContact: (contactId: string) => void;
}

export function NewConversationDialog({
  open,
  onOpenChange,
  onSelectContact,
}: NewConversationDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { profile } = useAuth();

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["contacts-for-messaging", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      const { data, error } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, email, phone, user_id")
        .eq("tenant_id", profile.tenant_id)
        .order("first_name", { ascending: true });

      if (error) throw error;
      return data as Contact[];
    },
    enabled: open && !!profile?.tenant_id,
  });

  const filteredContacts = contacts.filter((contact) => {
    const fullName = `${contact.first_name} ${contact.last_name}`.toLowerCase();
    const email = contact.email?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || email.includes(query);
  });

  const handleSelect = (contact: Contact) => {
    onSelectContact(contact.id);
    onOpenChange(false);
    setSearchQuery("");
  };

  const getInitials = (contact: Contact) => {
    return `${contact.first_name[0] || ""}${contact.last_name[0] || ""}`.toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            New Conversation
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>

        <ScrollArea className="h-[300px] pr-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <User className="h-10 w-10 mb-2 opacity-50" />
              <p className="text-sm">
                {searchQuery
                  ? "No contacts match your search"
                  : "No contacts found. Add contacts first."}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredContacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => handleSelect(contact)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors hover:bg-muted/50"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {getInitials(contact)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {contact.first_name} {contact.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {contact.email || contact.phone || "No contact info"}
                    </p>
                  </div>
                  {contact.user_id && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      On platform
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
