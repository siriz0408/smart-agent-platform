import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Bot, User, Plus, SlidersHorizontal, Lightbulb, ArrowUp, RotateCcw, AlertCircle, FileText, Users, TrendingUp, Upload, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useAIChat } from "@/hooks/useAIChat";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { cn } from "@/lib/utils";
import { MentionInput, ChatMarkdown, UserMessageContent, AISettingsPopover } from "@/components/ai-chat";
import { parseMentions, fetchMentionData, type Mention } from "@/hooks/useMentionSearch";
import { supabase } from "@/integrations/supabase/client";
import { usePerformanceMonitoring } from "@/hooks/usePerformanceMonitoring";
import { QuickActionCard, RecentActivityFeed, StatsOverview, OnboardingChecklist } from "@/components/dashboard";

const suggestedPrompts = [
  "What can I afford on a $100k salary?",
  "Calculate mortgage payments for a $400k home",
  "What are the steps to buying a home?",
  "Show me properties under $500k",
  "What are closing costs on a $450k home?",
  "Should I rent or buy?",
];

export default function Home() {
  
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { messages, isLoading, sendMessage, clearMessages } = useAIChat();
  const { preferences, updatePreference } = useUserPreferences();
  const { measureAsync } = usePerformanceMonitoring("Home");
  const [input, setInput] = useState("");
  const [activeMentions, setActiveMentions] = useState<Mention[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lastError, setLastError] = useState<{ message: string; userMessage: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);

  // Use thinking mode from preferences
  const thinkingMode = preferences.thinkingMode || false;
  const setThinkingMode = (value: boolean) => updatePreference("thinkingMode", value);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Keyboard shortcut: Cmd+K or Ctrl+K to focus input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input/textarea/contenteditable
      const target = e.target as HTMLElement;
      const isInputElement = 
        target.tagName === "INPUT" || 
        target.tagName === "TEXTAREA" || 
        target.isContentEditable ||
        target.closest('[contenteditable="true"]');
      
      // Only handle Cmd+K/Ctrl+K if not in an input element
      if ((e.metaKey || e.ctrlKey) && e.key === "k" && !isInputElement) {
        e.preventDefault();
        // Focus the contenteditable div inside MentionInput
        const editor = inputRef.current?.querySelector<HTMLElement>('[contenteditable="true"]');
        if (editor) {
          editor.focus();
          // Move cursor to end
          const range = document.createRange();
          const sel = window.getSelection();
          range.selectNodeContents(editor);
          range.collapse(false);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const message = input;
    setInput("");
    setLastError(null);
    try {
      await sendMessage(message, { thinkingMode });
    } catch (error) {
      setLastError({
        message: error instanceof Error ? error.message : "Failed to send message",
        userMessage: message,
      });
    }
  };

  const handleRetry = async () => {
    if (!lastError || isLoading) return;
    setLastError(null);
    await sendMessage(lastError.userMessage, { thinkingMode });
  };

  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt);
    // Focus the input after setting the value
    setTimeout(() => {
      const editor = inputRef.current?.querySelector<HTMLElement>('[contenteditable="true"]');
      editor?.focus();
    }, 0);
  };

  const firstName = profile?.full_name?.split(" ")[0] || "there";

  return (
    <AppLayout>
      <main className="flex h-full flex-col">
        {/* Chat Area - responsive padding */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {messages.length === 0 ? (
            <div className="max-w-7xl mx-auto w-full space-y-6 sm:space-y-8">
              {/* Welcome Header */}
              <div className="text-center space-y-3 sm:space-y-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary mx-auto mb-4">
                  <Sparkles className="h-8 w-8 text-primary-foreground" />
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold">
                  Good {getTimeOfDay()}, {firstName}
                </h1>
                <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
                  How can I help you with your real estate business today?
                </p>
              </div>

              {/* Stats Overview */}
              <StatsOverview
                onStatClick={(stat) => {
                  const routes: Record<typeof stat, string> = {
                    documents: "/documents",
                    contacts: "/contacts",
                    deals: "/pipeline",
                    conversations: "/chat",
                  };
                  navigate(routes[stat]);
                }}
              />

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Left Column - Quick Actions & Prompts */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Quick Action Cards */}
                  <div>
                    <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                      Quick Actions
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <QuickActionCard
                        icon={Upload}
                        title="Upload Document"
                        description="Add contracts, inspections, or other real estate documents"
                        onClick={() => navigate("/documents")}
                        variant="primary"
                      />
                      <QuickActionCard
                        icon={Users}
                        title="Add Contact"
                        description="Create a new contact in your CRM"
                        onClick={() => navigate("/contacts")}
                      />
                      <QuickActionCard
                        icon={TrendingUp}
                        title="View Pipeline"
                        description="Track your deals and transactions"
                        onClick={() => navigate("/pipeline")}
                      />
                      <QuickActionCard
                        icon={MessageSquare}
                        title="Start Chat"
                        description="Chat with AI about your real estate needs"
                        onClick={() => navigate("/chat")}
                      />
                    </div>
                  </div>

                  {/* Suggested Prompts */}
                  <div>
                    <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                      Try Asking
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {suggestedPrompts.map((prompt, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          className="h-auto py-2.5 px-4 text-left justify-start text-sm font-normal hover:bg-accent hover:text-accent-foreground"
                          onClick={() => handleSuggestedPrompt(prompt)}
                        >
                          {prompt}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Helpful Links */}
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-3">
                      Smart Agent is your AI-powered assistant for real estate professionals.
                      Analyze <a href="/documents" className="text-primary hover:underline">documents</a>, manage your{" "}
                      <a href="/contacts" className="text-primary hover:underline">CRM</a>, chat with multiple documents simultaneously,
                      and get intelligent insights to streamline your workflow. Visit our{" "}
                      <a href="/help" className="text-primary hover:underline">help center</a> to learn more, or check out{" "}
                      <a href="https://www.nar.realtor/research-and-statistics" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        NAR research
                      </a> for real estate market insights.
                    </p>
                  </div>
                </div>

                {/* Right Column - Onboarding Checklist + Recent Activity */}
                <div className="lg:col-span-1 space-y-6">
                  <OnboardingChecklist />
                  <RecentActivityFeed limit={5} />
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Aria-live region for screen readers to announce new messages */}
              <div aria-live="polite" aria-atomic="false" className="sr-only">
                {messages.length > 0 && (
                  <span>
                    {messages[messages.length - 1].role === "assistant"
                      ? "AI assistant sent a message"
                      : "You sent a message"}
                  </span>
                )}
              </div>
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
                      </div>
                    ) : (
                      <UserMessageContent content={message.content} />
                    )}
                  </Card>
                  {message.role === "user" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {lastError && (
                <div className="flex gap-4 justify-start">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  </div>
                  <Card className="max-w-[80%] p-4 border-destructive/50 bg-destructive/5">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-destructive mb-1">Error sending message</p>
                          <p className="text-sm text-muted-foreground">{lastError.message}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRetry}
                        disabled={isLoading}
                        className="w-fit gap-2"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Retry
                      </Button>
                    </div>
                  </Card>
                </div>
              )}
              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex gap-4" aria-busy="true" aria-live="polite">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
                    <Bot className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
                  </div>
                  <Card className="p-4">
                    <div className="flex gap-1" role="status" aria-label="AI is thinking">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" aria-hidden="true" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" aria-hidden="true" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" aria-hidden="true" />
                    </div>
                  </Card>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area - Glean style */}
        <div className="border-t border-border bg-background p-3 sm:p-4 lg:p-6">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto" ref={inputRef}>
            {/* Input container - Glean style rounded (no overflow-hidden to allow dropdown) */}
            <div className="border border-border rounded-2xl bg-card shadow-sm">
              {/* Text input area */}
              <div className="p-3 md:p-4">
                <MentionInput
                  value={input}
                  onChange={setInput}
                  onMentionsChange={setActiveMentions}
                  placeholder="Explore a topic... (⌘K to focus)"
                  disabled={isLoading}
                  ariaLabel="Chat input - type your message or use @ to mention documents, contacts, or properties. Press Cmd+K or Ctrl+K to focus."
                  onSubmit={() => {
                    if (input.trim() && !isLoading) {
                      const message = input;
                      setInput("");
                      setLastError(null);
                      sendMessage(message, { thinkingMode }).catch((error) => {
                        setLastError({
                          message: error instanceof Error ? error.message : "Failed to send message",
                          userMessage: message,
                        });
                      });
                    }
                  }}
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
                    onClick={clearMessages}
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
                    disabled={!input.trim() || isLoading}
                    className="h-8 w-8 rounded-full"
                    aria-label="Send message"
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
      </main>
    </AppLayout>
  );
}

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
