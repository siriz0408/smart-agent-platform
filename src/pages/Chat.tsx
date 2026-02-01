import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Send, Bot, User, Search, Trash2, MoreHorizontal, AlertTriangle, Loader2, Menu, PenSquare, PanelLeftClose, PanelLeft } from "lucide-react";
import { useAIStreaming, type UsageLimitInfo, type StatusUpdate } from "@/hooks/useAIStreaming";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
import { PropertyCardGrid, ChatMarkdown, MortgageCalculator, AffordabilityCalculator, ClosingCostsCalculator, RentVsBuyCalculator, CMAComparisonWidget, HomeBuyingChecklist, HomeSellingChecklist, SellerNetSheet, AgentCommissionCalculator } from "@/components/ai-chat";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
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
}

export default function Chat() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { refetchUsage } = useSubscription();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { streamMessage, isStreaming } = useAIStreaming();

  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [limitInfo, setLimitInfo] = useState<UsageLimitInfo | null>(null);
  const [currentStatus, setCurrentStatus] = useState<StatusUpdate | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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

    // Save user message
    await saveMessage(convId, "user", userMessage.content);

    const assistantMessageId = (Date.now() + 1).toString();
    let currentEmbeddedComponents: EmbeddedComponents | undefined;

    const result = await streamMessage({
      messages: [...messages, userMessage],
      conversationId: convId,
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
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      },
      onUsageLimitExceeded: (info) => {
        setLimitInfo(info);
        setShowLimitDialog(true);
      },
    });

    if (!result) return;
  };

  const handleNewChat = () => {
    setSelectedConversation(null);
    setMessages([]);
  };

  const filteredConversations = conversations.filter((c) =>
    c.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sidebar content component (reused in desktop and mobile)
  const SidebarContent = () => (
    <>
      <div className="p-4 border-b border-border">
        <Button
          className="w-full justify-start gap-2 bg-glean-purple hover:bg-glean-purple-hover text-white"
          onClick={() => {
            handleNewChat();
            setMobileDrawerOpen(false);
          }}
        >
          <PenSquare className="h-4 w-4" />
          New chat
        </Button>
      </div>

      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-muted/50 border-muted"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 pr-4 pb-20 space-y-1">
          {conversationsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-3">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))
          ) : filteredConversations.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 text-center">
              No conversations yet
            </p>
          ) : (
            filteredConversations.map((conversation) => {
              const displayTitle = conversation.title || "New conversation";
              return (
                <div key={conversation.id} className="relative group">
                  {/* Row selection button - reserves right gutter for menu */}
                  <button
                    type="button"
                    className={cn(
                      "w-full text-left p-3 pr-12 rounded-lg transition-colors overflow-hidden",
                      selectedConversation === conversation.id
                        ? "bg-muted"
                        : "hover:bg-muted/50"
                    )}
                    onClick={() => {
                      setSelectedConversation(conversation.id);
                      setMobileDrawerOpen(false);
                    }}
                  >
                    <div className="min-w-0">
                      <div 
                        className="font-medium text-sm truncate"
                        title={displayTitle}
                      >
                        {displayTitle}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(conversation.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                  </button>
                  
                  {/* Actions menu - positioned absolutely, outside the button */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="z-50">
                        <DropdownMenuItem
                          className="text-destructive cursor-pointer"
                          onClick={() => deleteConversation.mutate(conversation.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </>
  );

  return (
    <AppLayout>
      <div className="flex h-full">
        {/* Desktop Sidebar - Collapsible with slide animation */}
        <div 
          className={cn(
            "hidden md:flex border-r border-border flex-col bg-background transition-all duration-300 ease-in-out overflow-hidden",
            sidebarCollapsed ? "w-0 border-r-0" : "w-[350px]"
          )}
        >
          <div className="w-[350px] h-full flex flex-col">
            <SidebarContent />
          </div>
        </div>

        {/* Mobile Drawer */}
        <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
          <SheetContent side="left" className="w-[85vw] max-w-sm p-0">
            <div className="flex flex-col h-full pt-10">
              <SidebarContent />
            </div>
          </SheetContent>
        </Sheet>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Desktop Header with toggle */}
          <div className="hidden md:flex h-14 items-center gap-3 px-4 border-b bg-background">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="h-9 w-9"
            >
              {sidebarCollapsed ? (
                <PanelLeft className="h-5 w-5" />
              ) : (
                <PanelLeftClose className="h-5 w-5" />
              )}
            </Button>
            <h1 className="text-base font-semibold">AI Chat</h1>
          </div>

          {/* Mobile Header */}
          <div className="md:hidden h-14 flex items-center gap-3 px-4 border-b bg-background">
            <Button
              size="icon-lg"
              variant="ghost"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Open conversations"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-base font-semibold">AI Chat</h1>
          </div>

          {/* Chat Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 md:px-8">
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
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h2 className="text-lg font-medium mb-2">Start a conversation</h2>
                  <p className="text-muted-foreground text-sm">
                    Ask me anything about real estate
                  </p>
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
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
                        <Bot className="h-5 w-5 text-primary-foreground" />
                      </div>
                    )}
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
                        <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                      )}
                    </Card>
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

          {/* Input Area */}
          <div className="border-t border-border bg-background p-4">
            <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
              <div className="flex gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me anything..."
                  className="min-h-[44px] max-h-32 resize-none"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
                <Button type="submit" size="icon" disabled={!input.trim() || isStreaming}>
                  <Send className="h-5 w-5" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
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
