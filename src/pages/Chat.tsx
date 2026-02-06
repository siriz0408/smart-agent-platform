import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Send, Bot, User, Search, Trash2, MoreHorizontal, AlertTriangle, Loader2, Menu, PenSquare, PanelLeftClose, PanelLeft, Settings, Plus, SlidersHorizontal, Lightbulb, ArrowUp } from "lucide-react";
import { useAIStreaming, type UsageLimitInfo, type StatusUpdate } from "@/hooks/useAIStreaming";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MentionInput, AISettingsPopover } from "@/components/ai-chat";
import { parseMentions, parseCollectionMentions, fetchMentionData, type Mention, type CollectionType } from "@/hooks/useMentionSearch";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { AppLayout } from "@/components/layout/AppLayout";
import { PropertyCardGrid, ChatMarkdown, MortgageCalculator, AffordabilityCalculator, ClosingCostsCalculator, RentVsBuyCalculator, CMAComparisonWidget, HomeBuyingChecklist, HomeSellingChecklist, SellerNetSheet, AgentCommissionCalculator, UserMessageContent } from "@/components/ai-chat";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import type { Tables } from "@/integrations/supabase/types";
import type { EmbeddedComponents, PropertyCardData } from "@/types/property";

type Conversation = Tables<"ai_conversations">;
type DBMessage = Tables<"ai_messages">;

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  embeddedComponents?: EmbeddedComponents;
  error?: boolean;
  errorMessage?: string;
}

export default function Chat() {
  const { user, profile } = useAuth();
  const { refetchUsage } = useSubscription();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { streamMessage, isStreaming } = useAIStreaming();
  const { preferences, updatePreference } = useUserPreferences();
  const { measureAsync } = usePerformanceMonitoring("Chat");

  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [limitInfo, setLimitInfo] = useState<UsageLimitInfo | null>(null);
  const [currentStatus, setCurrentStatus] = useState<StatusUpdate | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Persist sidebar collapsed state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("chat-sidebar-collapsed");
    return saved === "true";
  });
  const [activeMentions, setActiveMentions] = useState<Mention[]>([]);

  // Use thinking mode from preferences
  const thinkingMode = preferences.thinkingMode || false;
  const setThinkingMode = (value: boolean) => updatePreference("thinkingMode", value);
  
  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem("chat-sidebar-collapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ["ai-conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_conversations")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Conversation[];
    },
    enabled: !!user,
  });

  // Fetch messages for selected conversation
  const { data: dbMessages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["ai-messages", selectedConversation],
    queryFn: async () => {
      if (!selectedConversation) return [];
      const { data, error } = await supabase
        .from("ai_messages")
        .select("*")
        .eq("conversation_id", selectedConversation)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as DBMessage[];
    },
    enabled: !!selectedConversation,
  });

  // Sync DB messages to local state
  useEffect(() => {
    if (dbMessages.length > 0) {
      setMessages(
        dbMessages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          timestamp: new Date(m.created_at),
          embeddedComponents: m.embedded_components as EmbeddedComponents | undefined,
        }))
      );
    } else if (selectedConversation) {
      setMessages([]);
    }
  }, [dbMessages, selectedConversation]);

  // Create conversation mutation
  const createConversation = useMutation({
    mutationFn: async (title: string) => {
      if (!profile?.tenant_id) throw new Error("No tenant");
      const { data, error } = await supabase
        .from("ai_conversations")
        .insert({
          user_id: user!.id,
          tenant_id: profile.tenant_id,
          title,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
      setSelectedConversation(data.id);
      setMessages([]);
    },
  });

  // Delete conversation mutation
  const deleteConversation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ai_conversations")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
      if (selectedConversation) {
        setSelectedConversation(null);
        setMessages([]);
      }
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const saveMessage = async (
    conversationId: string, 
    role: string, 
    content: string,
    embeddedComponents?: EmbeddedComponents
  ) => {
    const { error } = await supabase.from("ai_messages").insert({
      conversation_id: conversationId,
      role,
      content,
      embedded_components: embeddedComponents as Record<string, unknown> | null || null,
    });
    if (error) throw error;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    // Parse mentions from the input to extract entity references
    const { mentions } = parseMentions(input);
    
    // Parse collection references (#Properties, #Contacts, etc.)
    const { collections } = parseCollectionMentions(input);

    // Fetch full data for all mentioned entities
    let mentionData: Awaited<ReturnType<typeof fetchMentionData>> = [];
    if (mentions.length > 0) {
      try {
        mentionData = await fetchMentionData(mentions, supabase);
        console.log("Fetched mention data:", mentionData);
      } catch (err) {
        console.error("Error fetching mention data:", err);
      }
    }
    
    // Convert collection references to the format expected by the API
    const collectionRefs = collections.map(c => ({ collection: c.collection }));
    if (collectionRefs.length > 0) {
      console.log("Collection references:", collectionRefs);
    }

    let convId = selectedConversation;

    // Create new conversation if none selected
    if (!convId) {
      const title = input.slice(0, 50) + (input.length > 50 ? "..." : "");
      const newConv = await createConversation.mutateAsync(title);
      convId = newConv.id;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setActiveMentions([]); // Clear mentions after sending

    // Save user message
    await saveMessage(convId, "user", userMessage.content);

    const assistantMessageId = (Date.now() + 1).toString();
    let currentEmbeddedComponents: EmbeddedComponents | undefined;

    const result = await streamMessage({
      messages: [...messages, userMessage],
      conversationId: convId,
      mentionData: mentionData.length > 0 ? mentionData : undefined,
      collectionRefs: collectionRefs.length > 0 ? collectionRefs : undefined,
      thinkingMode,
      onChunk: (_chunk, fullContent) => {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) =>
              i === prev.length - 1 
                ? { ...m, content: fullContent, embeddedComponents: currentEmbeddedComponents } 
                : m
            );
          }
          return [
            ...prev,
            {
              id: assistantMessageId,
              role: "assistant" as const,
              content: fullContent,
              timestamp: new Date(),
              embeddedComponents: currentEmbeddedComponents,
            },
          ];
        });
      },
      onEmbeddedComponents: (components) => {
        currentEmbeddedComponents = components;
        // Update existing assistant message or create a placeholder
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, embeddedComponents: components } : m
            );
          }
          // If no assistant message yet, create one with just the embedded components
          return [
            ...prev,
            {
              id: assistantMessageId,
              role: "assistant" as const,
              content: "",
              timestamp: new Date(),
              embeddedComponents: components,
            },
          ];
        });
      },
      onStatus: (status) => {
        setCurrentStatus(status);
      },
      onComplete: async (fullContent, embeddedComps) => {
        setCurrentStatus(null); // Clear status when complete
        if (fullContent) {
          await saveMessage(convId!, "assistant", fullContent, embeddedComps);
          await supabase
            .from("ai_conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", convId!);
          queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
          refetchUsage();
        }
      },
      onError: (error) => {
        setMessages((prev) => {
          // Remove the empty/partial assistant message if there is one
          const cleaned = prev.filter(
            (m) => !(m.id === assistantMessageId && m.role === "assistant" && !m.content)
          );
          return [
            ...cleaned,
            {
              id: `error-${Date.now()}`,
              role: "assistant" as const,
              content: "",
              timestamp: new Date(),
              error: true,
              errorMessage: error.message || "Something went wrong. Please try again.",
            },
          ];
        });
      },
      onUsageLimitExceeded: (info) => {
        setLimitInfo(info);
        setShowLimitDialog(true);
      },
    });

    if (!result) return;
  };

  const handleRetry = () => {
    if (isStreaming) return;
    // Find the last user message before the error
    const errorIdx = messages.findLastIndex((m) => m.error);
    if (errorIdx === -1) return;
    const lastUserMsg = messages
      .slice(0, errorIdx)
      .findLast((m) => m.role === "user");
    if (!lastUserMsg) return;

    // Remove the error message and re-submit
    setMessages((prev) => prev.filter((m) => !m.error));
    setInput(lastUserMsg.content);
    // Use setTimeout to let state settle before triggering submit
    setTimeout(() => {
      const form = document.querySelector<HTMLFormElement>("[data-chat-form]");
      form?.requestSubmit();
    }, 100);
  };

  const handleNewChat = () => {
    setSelectedConversation(null);
    setMessages([]);
  };

  const filteredConversations = conversations.filter((c) =>
    c.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group conversations by date
  const groupConversationsByDate = (convs: Conversation[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const groups: { label: string; conversations: Conversation[] }[] = [
      { label: "Today", conversations: [] },
      { label: "Yesterday", conversations: [] },
      { label: "Previous 7 days", conversations: [] },
      { label: "Older", conversations: [] },
    ];

    convs.forEach((conv) => {
      const date = new Date(conv.updated_at);
      date.setHours(0, 0, 0, 0);

      if (date.getTime() === today.getTime()) {
        groups[0].conversations.push(conv);
      } else if (date.getTime() === yesterday.getTime()) {
        groups[1].conversations.push(conv);
      } else if (date > lastWeek) {
        groups[2].conversations.push(conv);
      } else {
        groups[3].conversations.push(conv);
      }
    });

    return groups.filter((g) => g.conversations.length > 0);
  };

  const groupedConversations = groupConversationsByDate(filteredConversations);

  // Sidebar content component (reused in desktop and mobile)
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header with title and toggle */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <span className="font-semibold text-base">Chat</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground md:hidden"
          onClick={() => setMobileDrawerOpen(false)}
          aria-label="Close sidebar"
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <Button
          variant="outline"
          className="w-full justify-center gap-2"
          onClick={() => {
            handleNewChat();
            setMobileDrawerOpen(false);
          }}
        >
          <PenSquare className="h-4 w-4" />
          New chat
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm bg-muted/50 border-0"
          />
        </div>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1 min-h-0 overflow-hidden">
        <div className="px-2 pb-4 overflow-hidden">
          {conversationsLoading ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : groupedConversations.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 text-center">
              No conversations yet
            </p>
          ) : (
            groupedConversations.map((group) => (
              <div key={group.label} className="mb-3">
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {group.label}
                </div>
                <div className="space-y-0.5">
                  {group.conversations.map((conversation) => {
                    const displayTitle = conversation.title || "New conversation";
                    return (
                      <div 
                        key={conversation.id} 
                        className={cn(
                          "group flex items-center gap-1 rounded-md transition-colors",
                          selectedConversation === conversation.id
                            ? "bg-muted"
                            : "hover:bg-muted/50"
                        )}
                      >
                        {/* Conversation title button */}
                        <button
                          type="button"
                          className={cn(
                            "flex-1 min-w-0 text-left px-2 py-2 text-sm",
                            selectedConversation === conversation.id && "font-medium"
                          )}
                          onClick={() => {
                            setSelectedConversation(conversation.id);
                            setMobileDrawerOpen(false);
                          }}
                        >
                          <span className="block truncate" title={displayTitle}>
                            {displayTitle}
                          </span>
                        </button>
                        
                        {/* Actions menu - visible on hover (desktop) or always subtle (mobile) */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0 mr-1 text-muted-foreground/50 hover:text-foreground group-hover:text-muted-foreground"
                              onClick={(e) => e.stopPropagation()}
                              aria-label="Conversation actions"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" sideOffset={4} className="w-40">
                            <DropdownMenuItem
                              className="text-destructive cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteConversation.mutate(conversation.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete chat
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer with delete option and user profile */}
      <div className="mt-auto border-t border-border">
        <div className="px-3 py-2 text-xs text-muted-foreground">
          <p>Chats are saved up to 30 days.</p>
          <p className="mt-1">
            <button 
              type="button"
              onClick={() => {
                if (selectedConversation) {
                  deleteConversation.mutate(selectedConversation);
                }
              }}
              disabled={!selectedConversation}
              className="text-primary hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed"
            >
              Delete
            </button>
            {" or "}
            <button 
              type="button"
              className="text-muted-foreground cursor-not-allowed"
              title="Coming soon"
            >
              Disable
            </button>
          </p>
        </div>
        {/* User profile section */}
        {profile && (
          <div className="flex items-center gap-3 p-3 border-t border-border hover:bg-muted/50 cursor-pointer"
               onClick={() => navigate("/settings")}>
            <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium text-sm shrink-0">
              {profile.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {profile.full_name || user?.email?.split("@")[0] || "User"}
              </p>
              <p className="text-xs text-muted-foreground">Go to profile</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={(e) => { e.stopPropagation(); navigate("/settings"); }} aria-label="Settings">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <AppLayout>
      <div className="flex h-full overflow-hidden">
        {/* Desktop Sidebar - Collapsible */}
        <div 
          className={cn(
            "hidden md:flex border-r border-border flex-col bg-background transition-all duration-200 ease-in-out overflow-hidden",
            sidebarCollapsed ? "w-0 border-r-0" : "w-[280px] min-w-[280px]"
          )}
        >
          <div className="w-[280px] h-full overflow-hidden">
            <SidebarContent />
          </div>
        </div>

        {/* Mobile Drawer */}
        <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
          <SheetContent side="left" className="w-[85vw] max-w-[320px] p-0">
            <div className="flex flex-col h-full pt-6">
              <SidebarContent />
            </div>
          </SheetContent>
        </Sheet>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Desktop Header with toggle */}
          <div className="hidden md:flex h-12 items-center gap-2 px-3 border-b bg-background">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              aria-label={sidebarCollapsed ? "Show chat history" : "Hide chat history"}
              className="h-9 w-9"
              title={sidebarCollapsed ? "Show chat history" : "Hide chat history"}
            >
              <Menu className="h-5 w-5" />
            </Button>
            {sidebarCollapsed && (
              <Button
                size="icon"
                variant="ghost"
                onClick={handleNewChat}
                aria-label="New chat"
                className="h-9 w-9"
                title="New chat"
              >
                <PenSquare className="h-5 w-5" />
              </Button>
            )}
          </div>

          {/* Mobile Header */}
          <div className="md:hidden h-12 flex items-center gap-2 px-3 border-b bg-background">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Open conversations"
              className="h-9 w-9"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleNewChat}
              aria-label="New chat"
              className="h-9 w-9"
            >
              <PenSquare className="h-5 w-5" />
            </Button>
          </div>

          {/* Chat Messages Area - responsive padding */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            {messagesLoading ? (
              <div className="max-w-3xl mx-auto space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-20 flex-1 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center">
                {/* Glean-style greeting */}
                <h2 className="text-2xl md:text-3xl font-medium mb-8 text-center">
                  Good {getTimeOfDay()}, {profile?.full_name?.split(" ")[0] || "there"}
                </h2>
                
                {/* Horizontal scrolling agent cards - Glean style */}
                <div className="w-full max-w-lg overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
                  <div className="flex gap-3 min-w-max">
                    {[
                      { id: 1, title: "Property Search Assistant", subtitle: "Find your dream home" },
                      { id: 2, title: "Market Analysis Agent", subtitle: "Get market insights" },
                      { id: 3, title: "Document Helper", subtitle: "Review contracts" },
                    ].map((card) => (
                      <Card 
                        key={card.id} 
                        className="w-44 p-4 cursor-pointer hover:shadow-md transition-shadow flex-shrink-0"
                        onClick={() => setInput(`Help me with ${card.title.toLowerCase()}`)}
                      >
                        <p className="text-sm font-medium mb-1">{card.title}</p>
                        <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto space-y-6">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-4",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.role === "assistant" && (
                      <div className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        message.error ? "bg-destructive" : "bg-primary"
                      )}>
                        {message.error ? (
                          <AlertTriangle className="h-5 w-5 text-destructive-foreground" />
                        ) : (
                          <Bot className="h-5 w-5 text-primary-foreground" />
                        )}
                      </div>
                    )}
                    {message.error ? (
                      <Card className="max-w-[80%] p-4 border-destructive/50 bg-destructive/5">
                        <p className="text-sm text-destructive font-medium mb-1">Failed to get response</p>
                        <p className="text-sm text-muted-foreground mb-3">
                          {message.errorMessage}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRetry}
                          disabled={isStreaming}
                        >
                          Retry
                        </Button>
                      </Card>
                    ) : (
                    <Card
                      className={cn(
                        "max-w-[80%] p-4",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-card"
                      )}
                    >
                      {message.role === "assistant" ? (
                        <div className="max-w-none">
                          <ChatMarkdown content={message.content} />
                          {message.embeddedComponents?.property_cards && (
                            <PropertyCardGrid 
                              properties={message.embeddedComponents.property_cards as PropertyCardData[]} 
                            />
                          )}
                          {message.embeddedComponents?.mortgage_calculator && (
                            <div className="mt-4">
                              <MortgageCalculator 
                                propertyPrice={message.embeddedComponents.mortgage_calculator.price}
                                initialDownPaymentPercent={message.embeddedComponents.mortgage_calculator.downPaymentPercent}
                                initialInterestRate={message.embeddedComponents.mortgage_calculator.interestRate}
                                initialLoanTerm={message.embeddedComponents.mortgage_calculator.loanTermYears}
                              />
                            </div>
                          )}
                          {message.embeddedComponents?.affordability_calculator && (
                            <div className="mt-4">
                              <AffordabilityCalculator 
                                initialMonthlyBudget={message.embeddedComponents.affordability_calculator.monthlyBudget}
                                initialDownPaymentPercent={message.embeddedComponents.affordability_calculator.downPaymentPercent}
                                initialInterestRate={message.embeddedComponents.affordability_calculator.interestRate}
                                initialAnnualIncome={message.embeddedComponents.affordability_calculator.annualIncome}
                              />
                            </div>
                          )}
                          {message.embeddedComponents?.closing_costs_calculator && (
                            <div className="mt-4">
                              <ClosingCostsCalculator 
                                initialHomePrice={message.embeddedComponents.closing_costs_calculator.homePrice}
                                initialDownPaymentPercent={message.embeddedComponents.closing_costs_calculator.downPaymentPercent}
                                initialView={message.embeddedComponents.closing_costs_calculator.view}
                              />
                            </div>
                          )}
                          {message.embeddedComponents?.rent_vs_buy_calculator && (
                            <div className="mt-4">
                              <RentVsBuyCalculator 
                                initialHomePrice={message.embeddedComponents.rent_vs_buy_calculator.homePrice}
                                initialMonthlyRent={message.embeddedComponents.rent_vs_buy_calculator.monthlyRent}
                                initialDownPaymentPercent={message.embeddedComponents.rent_vs_buy_calculator.downPaymentPercent}
                                initialInterestRate={message.embeddedComponents.rent_vs_buy_calculator.interestRate}
                                initialYearsToCompare={message.embeddedComponents.rent_vs_buy_calculator.yearsToCompare}
                                initialHomeAppreciation={message.embeddedComponents.rent_vs_buy_calculator.homeAppreciation}
                                initialRentIncrease={message.embeddedComponents.rent_vs_buy_calculator.rentIncrease}
                              />
                            </div>
                          )}
                          {message.embeddedComponents?.cma_comparison && (
                            <div className="mt-4">
                              <CMAComparisonWidget 
                                subjectProperty={message.embeddedComponents.cma_comparison.subjectProperty}
                                comparables={message.embeddedComponents.cma_comparison.comparables}
                                analysis={message.embeddedComponents.cma_comparison.analysis}
                              />
                            </div>
                          )}
                          {message.embeddedComponents?.home_buying_checklist && (
                            <div className="mt-4">
                              <HomeBuyingChecklist 
                                highlightPhase={message.embeddedComponents.home_buying_checklist.highlightPhase}
                                showProgress={message.embeddedComponents.home_buying_checklist.showProgress ?? true}
                              />
                            </div>
                          )}
                          {message.embeddedComponents?.home_selling_checklist && (
                            <div className="mt-4">
                              <HomeSellingChecklist 
                                highlightPhase={message.embeddedComponents.home_selling_checklist.highlightPhase}
                                showProgress={message.embeddedComponents.home_selling_checklist.showProgress ?? true}
                              />
                            </div>
                          )}
                          {message.embeddedComponents?.seller_net_sheet && (
                            <div className="mt-4">
                              <SellerNetSheet 
                                initialSalePrice={message.embeddedComponents.seller_net_sheet.salePrice}
                                initialMortgageBalance={message.embeddedComponents.seller_net_sheet.mortgageBalance}
                                initialCommissionPercent={message.embeddedComponents.seller_net_sheet.commissionPercent}
                              />
                            </div>
                          )}
                          {message.embeddedComponents?.agent_commission_calculator && (
                            <div className="mt-4">
                              <AgentCommissionCalculator 
                                initialSalePrice={message.embeddedComponents.agent_commission_calculator.salePrice}
                                initialTotalCommission={message.embeddedComponents.agent_commission_calculator.totalCommission}
                                initialListingBuyerSplit={message.embeddedComponents.agent_commission_calculator.listingBuyerSplit}
                                initialBrokerSplit={message.embeddedComponents.agent_commission_calculator.brokerSplit}
                              />
                            </div>
                          )}
                          {/* Show mortgage calculator with first property if property cards exist */}
                          {message.embeddedComponents?.property_cards && 
                           message.embeddedComponents.property_cards.length > 0 &&
                           message.embeddedComponents.property_cards[0].price &&
                           !message.embeddedComponents?.mortgage_calculator && (
                            <div className="mt-4">
                              <MortgageCalculator 
                                propertyPrice={message.embeddedComponents.property_cards[0].price}
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <UserMessageContent content={message.content} />
                      )}
                    </Card>
                    )}
                    {message.role === "user" && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
                      <Bot className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <Card className="p-4">
                      {currentStatus ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span className="text-sm text-muted-foreground">
                            {currentStatus.message}
                          </span>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
                        </div>
                      )}
                    </Card>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Area - Glean style */}
          <div className="border-t border-border bg-background p-3 sm:p-4 lg:p-6">
            <form onSubmit={handleSubmit} data-chat-form className="max-w-3xl mx-auto">
              {/* Input container - Glean style rounded (no overflow-hidden to allow dropdown) */}
              <div className="border border-border rounded-2xl bg-card shadow-sm">
                {/* Text input area */}
                <div className="p-3 md:p-4">
                  <MentionInput
                    value={input}
                    onChange={setInput}
                    onMentionsChange={setActiveMentions}
                    placeholder="Explore a topic..."
                    disabled={isStreaming}
                    onSubmit={() => handleSubmit(new Event('submit') as unknown as React.FormEvent)}
                  />
                </div>
                {/* Action bar with Glean-style icons */}
                <div className="flex items-center justify-between px-3 py-2 border-t border-border/50 rounded-b-2xl">
                  <div className="flex items-center gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={handleNewChat}
                      title="New conversation"
                      aria-label="New conversation"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <AISettingsPopover open={settingsOpen} onOpenChange={setSettingsOpen}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        title="AI Settings"
                        aria-label="AI Settings"
                      >
                        <SlidersHorizontal className="h-4 w-4" />
                      </Button>
                    </AISettingsPopover>
                    <Button
                      type="button"
                      variant={thinkingMode ? "secondary" : "ghost"}
                      size="icon"
                      className={cn(
                        "h-8 w-8",
                        thinkingMode ? "text-primary" : "text-muted-foreground hover:text-foreground"
                      )}
                      title={thinkingMode ? "Thinking mode ON" : "Enable thinking mode"}
                      onClick={() => setThinkingMode(!thinkingMode)}
                      aria-label={thinkingMode ? "Disable thinking mode" : "Enable thinking mode"}
                    >
                      <Lightbulb className={cn("h-4 w-4", thinkingMode && "fill-current")} />
                    </Button>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <Button 
                      type="submit" 
                      size="icon" 
                      disabled={!input.trim() || isStreaming} 
                      className="h-8 w-8 rounded-full"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground text-center mt-2">
                AI responses are informational only. Not legal, financial, or professional advice.
              </p>
            </form>
          </div>
        </div>
      </div>

      {/* Usage Limit Dialog */}
      <Dialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Monthly AI Limit Reached
            </DialogTitle>
            <DialogDescription>
              You've used all {limitInfo?.limit} AI queries included in your {limitInfo?.plan} plan this month.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-muted rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-primary">
                {limitInfo?.current}/{limitInfo?.limit}
              </div>
              <div className="text-sm text-muted-foreground">queries used</div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Upgrade your plan to get more AI queries and unlock additional features.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLimitDialog(false)}>
              Maybe Later
            </Button>
            <Button onClick={() => navigate("/billing")}>
              Upgrade Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
