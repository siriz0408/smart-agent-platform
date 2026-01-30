import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Bot, User, Plus, History, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useAIChat } from "@/hooks/useAIChat";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

const quickActions = [
  { label: "Featured", icon: Sparkles },
  { label: "Recommended agents", icon: Bot },
  { label: "Your agents", icon: Bot },
];

export default function Home() {
  const { profile } = useAuth();
  const { messages, isLoading, sendMessage, clearMessages } = useAIChat();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    await sendMessage(message);
  };

  const firstName = profile?.full_name?.split(" ")[0] || "there";

  return (
    <AppLayout>
      <div className="flex h-full flex-col">
        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center max-w-2xl mx-auto text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary mb-6">
                <Sparkles className="h-8 w-8 text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-semibold mb-2">
                Good {getTimeOfDay()}, {firstName}
              </h1>
              <p className="text-muted-foreground text-lg mb-8">
                How can I help you with your real estate business today?
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
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
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

        {/* Input Area */}
        <div className="border-t border-border bg-background p-4">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
            <div className="flex gap-2">
              <div className="flex gap-1">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="shrink-0"
                  onClick={clearMessages}
                  title="New conversation"
                >
                  <Plus className="h-5 w-5" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="shrink-0">
                  <Paperclip className="h-5 w-5" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="shrink-0">
                  <History className="h-5 w-5" />
                </Button>
              </div>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything about your real estate business..."
                className="min-h-[44px] max-h-32 resize-none"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              <Button type="submit" size="icon" disabled={!input.trim() || isLoading}>
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
