import { useState } from "react";
import { Search, Plus, BarChart3, Archive, Inbox } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { PresenceDot } from "./PresenceDot";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";
import { Badge } from "@/components/ui/badge";

interface Participant {
  user_id: string | null;
  contact_id: string | null;
  profile?: {
    full_name: string | null;
    email: string;
  } | null;
  contact?: {
    first_name: string;
    last_name: string;
    email: string | null;
  } | null;
}

interface ConversationWithDetails {
  id: string;
  title: string | null;
  updated_at: string;
  archived: boolean;
  participants: Participant[];
  lastMessage?: {
    content: string;
    sent_at: string;
  } | null;
}

type ConversationFilter = "inbox" | "archived";

interface ConversationListProps {
  conversations: ConversationWithDetails[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewConversation?: () => void;
  onOpenMessageSearch?: () => void;
}

export function ConversationList({
  conversations,
  isLoading,
  selectedId,
  onSelect,
  onNewConversation,
  onOpenMessageSearch,
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<ConversationFilter>("inbox");
  const navigate = useNavigate();

  // Get unread counts for all conversations
  const conversationIds = conversations.map((c) => c.id);
  const { data: unreadCounts = {} } = useUnreadCounts(conversationIds);

  const archivedCount = conversations.filter((c) => c.archived).length;

  const getParticipantName = (p: Participant): string => {
    if (p.profile?.full_name) return p.profile.full_name;
    if (p.profile?.email) return p.profile.email;
    if (p.contact) return `${p.contact.first_name} ${p.contact.last_name}`;
    return "";
  };

  const filteredConversations = conversations.filter((conv) => {
    // Filter by archived status
    const isArchived = conv.archived ?? false;
    if (filter === "inbox" && isArchived) return false;
    if (filter === "archived" && !isArchived) return false;

    const participantNames = conv.participants
      .map(getParticipantName)
      .join(" ")
      .toLowerCase();
    return (
      participantNames.includes(searchQuery.toLowerCase()) ||
      conv.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const getConversationName = (conv: ConversationWithDetails) => {
    if (conv.title) return conv.title;
    const names = conv.participants
      .map(getParticipantName)
      .filter((name) => name.length > 0);
    if (names.length === 0) return "New Conversation";
    return names.join(", ");
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
      <div className="p-4 sm:p-6 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Messages</h2>
          <div className="flex items-center gap-2">
            {onOpenMessageSearch && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onOpenMessageSearch}
                className="gap-1"
                title="Search messages"
              >
                <Search className="h-4 w-4" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate("/messages/metrics")}
              className="gap-1"
              title="View metrics"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            {onNewConversation && (
              <Button
                size="sm"
                onClick={onNewConversation}
                className="gap-1"
              >
                <Plus className="h-4 w-4" />
                New
              </Button>
            )}
          </div>
        </div>

        {/* Inbox / Archived filter tabs */}
        <div className="flex items-center gap-1 mb-3">
          <Button
            size="sm"
            variant={filter === "inbox" ? "default" : "ghost"}
            onClick={() => setFilter("inbox")}
            className="gap-1.5 h-8 text-xs"
          >
            <Inbox className="h-3.5 w-3.5" />
            Inbox
          </Button>
          <Button
            size="sm"
            variant={filter === "archived" ? "default" : "ghost"}
            onClick={() => setFilter("archived")}
            className="gap-1.5 h-8 text-xs"
          >
            <Archive className="h-3.5 w-3.5" />
            Archived
            {archivedCount > 0 && (
              <Badge variant="secondary" className="h-4 min-w-[16px] px-1 text-[10px] ml-1">
                {archivedCount}
              </Badge>
            )}
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={filter === "archived" ? "Search archived..." : "Search conversations..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 sm:p-6">
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
              {searchQuery
                ? "No conversations match your search"
                : filter === "archived"
                  ? "No archived conversations"
                  : "No conversations yet"}
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
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(conv)}
                    </AvatarFallback>
                  </Avatar>
                  {conv.participants.length > 0 && conv.participants[0].user_id && (
                    <ConversationPresence userId={conv.participants[0].user_id} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-medium truncate">
                        {getConversationName(conv)}
                      </span>
                      {unreadCounts[conv.id] > 0 && (
                        <Badge variant="default" className="h-5 min-w-[20px] px-1.5 text-xs shrink-0">
                          {unreadCounts[conv.id]}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                      {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                    </span>
                  </div>
                  {conv.lastMessage && (
                    <p className={cn(
                      "text-sm truncate",
                      unreadCounts[conv.id] > 0 ? "font-medium text-foreground" : "text-muted-foreground"
                    )}>
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

// Helper component to show presence for a user
function ConversationPresence({ userId }: { userId: string }) {
  const { data: presence } = useQuery({
    queryKey: ["presence", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_presence")
        .select("status")
        .eq("user_id", userId)
        .single();
      return data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (!presence) return null;

  return (
    <div className="absolute bottom-0 right-0">
      <PresenceDot status={presence.status} showPulse={true} />
    </div>
  );
}
