import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Bot, User, Plus, SlidersHorizontal, Lightbulb, ArrowUp } from "lucide-react";
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

const quickActions = [
  { label: "Featured", icon: Sparkles },
  { label: "Recommended agents", icon: Bot },
  { label: "Your agents", icon: Bot },
];

export default function Home() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { messages, isLoading, sendMessage, clearMessages } = useAIChat();
  const { preferences, updatePreference } = useUserPreferences();
  const [input, setInput] = useState("");
  const [activeMentions, setActiveMentions] = useState<Mention[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use thinking mode from preferences
  const thinkingMode = preferences.thinkingMode || false;
  const setThinkingMode = (value: boolean) => updatePreference("thinkingMode", value);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const message = input;
    setInput("");
    await sendMessage(message, { thinkingMode });
  };

  const firstName = profile?.full_name?.split(" ")[0] || "there";

  return (
    <AppLayout>
      <main className="flex h-full flex-col">
        {/* Chat Area - responsive padding */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center max-w-2xl mx-auto text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary mb-6">
                <Sparkles className="h-8 w-8 text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-semibold mb-2">
                Good {getTimeOfDay()}, {firstName}
              </h1>
              <p className="text-muted-foreground text-lg mb-4">
                How can I help you with your real estate business today?
              </p>
              <p className="text-sm text-muted-foreground mb-8 max-w-xl">
                Smart Agent is your AI-powered assistant for real estate professionals.
                Analyze <a href="/documents" className="text-primary hover:underline">documents</a>, manage your{" "}
                <a href="/contacts" className="text-primary hover:underline">CRM</a>, chat with multiple documents simultaneously,
                and get intelligent insights to streamline your workflow. Visit our{" "}
                <a href="/help" className="text-primary hover:underline">help center</a> to learn more, or check out{" "}
                <a href="https://www.nar.realtor/research-and-statistics" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  NAR research
                </a> for real estate market insights.
              </p>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2 justify-center">
                {quickActions.map((action) => (
                  <Button
                    key={action.label}
                    variant="outline"
                    className="gap-2"
                    onClick={() => setInput(`Show me ${action.label.toLowerCase()}`)}
                  >
                    <action.icon className="h-4 w-4" />
                    {action.label}
                  </Button>
                ))}
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
              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
                    <Bot className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <Card className="p-4">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
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
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
            {/* Input container - Glean style rounded (no overflow-hidden to allow dropdown) */}
            <div className="border border-border rounded-2xl bg-card shadow-sm">
              {/* Text input area */}
              <div className="p-3 md:p-4">
                <MentionInput
                  value={input}
                  onChange={setInput}
                  onMentionsChange={setActiveMentions}
                  placeholder="Explore a topic..."
                  disabled={isLoading}
                  onSubmit={() => {
                    if (input.trim() && !isLoading) {
                      const message = input;
                      setInput("");
                      sendMessage(message);
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
