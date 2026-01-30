import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Participant {
  user_id: string;
  profile?: {
    full_name: string | null;
    email: string;
  } | null;
}

interface ConversationWithDetails {
  id: string;
  title: string | null;
  updated_at: string;
  participants: Participant[];
  lastMessage?: {
    content: string;
    sent_at: string;
  } | null;
}

interface ConversationListProps {
  conversations: ConversationWithDetails[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ConversationList({
  conversations,
  isLoading,
  selectedId,
  onSelect,
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredConversations = conversations.filter((conv) => {
    const participantNames = conv.participants
      .map((p) => p.profile?.full_name || p.profile?.email || "")
      .join(" ")
      .toLowerCase();
    return (
      participantNames.includes(searchQuery.toLowerCase()) ||
      conv.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const getConversationName = (conv: ConversationWithDetails) => {
    if (conv.title) return conv.title;
    const otherParticipants = conv.participants.filter(
      (p) => p.profile?.full_name || p.profile?.email
    );
    if (otherParticipants.length === 0) return "New Conversation";
    return otherParticipants
      .map((p) => p.profile?.full_name || p.profile?.email?.split("@")[0])
      .join(", ");
  };

  const getInitials = (conv: ConversationWithDetails) => {
    const name = getConversationName(conv);
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold mb-3">Messages</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              {searchQuery ? "No conversations match your search" : "No conversations yet"}
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
                  "hover:bg-muted/50",
                  selectedId === conv.id && "bg-muted"
                )}
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(conv)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">
                      {getConversationName(conv)}
                    </span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                    </span>
                  </div>
                  {conv.lastMessage && (
                    <p className="text-sm text-muted-foreground truncate">
                      {conv.lastMessage.content}
                    </p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
