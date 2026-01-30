import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Send, ArrowLeft, FileText, Loader2, CheckCircle2, Eye, Layers, AlertTriangle, Menu } from "lucide-react";
import { useAIStreaming, type UsageLimitInfo } from "@/hooks/useAIStreaming";
import ReactMarkdown from "react-markdown";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { MentionInput } from "@/components/ai-chat";
import type { Mention } from "@/hooks/useMentionSearch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";
import { ChunkBrowser } from "@/components/documents/ChunkBrowser";
import { SuggestedQueries } from "@/components/documents/SuggestedQueries";
import { SourceCitation, parseSourceCitations, type DocumentSource } from "@/components/documents/SourceCitation";
import type { Tables } from "@/integrations/supabase/types";

type Document = Tables<"documents"> & { chunkCount?: number };
type Message = { role: "user" | "assistant"; content: string };

export default function DocumentChat() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refetchUsage } = useSubscription();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { streamMessage, isStreaming } = useAIStreaming();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [browsingDocId, setBrowsingDocId] = useState<string | null>(null);
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [limitInfo, setLimitInfo] = useState<UsageLimitInfo | null>(null);
  const [_activeMentions, setActiveMentions] = useState<Mention[]>([]);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Initialize with document ID from URL
  useEffect(() => {
    const docId = searchParams.get("documentId");
    if (docId) {
      setSelectedDocIds([docId]);
    }
  }, [searchParams]);

  // Fetch indexed documents with chunk counts
  const { data: documents = [], isLoading: docsLoading } = useQuery({
    queryKey: ["indexed-documents-with-chunks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .not("indexed_at", "is", null)
        .order("name");
      
      if (error) throw error;
      
      // Get chunk counts for each document
      const docsWithCounts = await Promise.all(
        (data as Document[]).map(async (doc) => {
          const { count } = await supabase
            .from("document_chunks")
            .select("*", { count: "exact", head: true })
            .eq("document_id", doc.id);
          
          return { ...doc, chunkCount: count || 0 };
        })
      );
      
      return docsWithCounts;
    },
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toggleDocument = (docId: string) => {
    setSelectedDocIds(prev => 
      prev.includes(docId) 
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const selectedDocuments = documents.filter(d => selectedDocIds.includes(d.id));
  const browsingDoc = documents.find(d => d.id === browsingDocId);

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || isStreaming) return;

    const userMessage: Message = { role: "user", content: textToSend };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setActiveMentions([]);

    const result = await streamMessage({
      messages: [...messages, userMessage],
      includeDocuments: true,
      documentIds: selectedDocIds.length > 0 ? selectedDocIds : undefined,
      onChunk: (_chunk, fullContent) => {
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: fullContent } : m
            );
          }
          return [...prev, { role: "assistant", content: fullContent }];
        });
      },
      onComplete: () => {
        refetchUsage();
      },
      onError: (error) => {
        toast.error(error.message);
        // Remove the user message if we failed
        setMessages(prev => prev.slice(0, -1));
      },
      onUsageLimitExceeded: (info) => {
        setLimitInfo(info);
        setShowLimitDialog(true);
        // Remove the user message if we hit limit
        setMessages(prev => prev.slice(0, -1));
      },
    });

    // If aborted, remove the user message
    if (!result) {
      setMessages(prev => prev.slice(0, -1));
    }
  };


  const handleSuggestedQuery = (query: string) => {
    sendMessage(query);
  };

  // Document selector sidebar content (reused in desktop and mobile)
  const DocumentSidebarContent = () => (
    <>
      <div className="p-4 border-b">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/documents")}
          className="mb-3"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Documents
        </Button>
        <h2 className="font-semibold">Select Documents</h2>
        <p className="text-sm text-muted-foreground">
          Choose documents to analyze together
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
              {docsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))
              ) : documents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No indexed documents yet</p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => navigate("/documents")}
                  >
                    Index documents first
                  </Button>
                </div>
              ) : (
                documents.map(doc => (
                  <Card
                    key={doc.id}
                    className={`transition-colors ${
                      selectedDocIds.includes(doc.id)
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedDocIds.includes(doc.id)}
                          onCheckedChange={() => toggleDocument(doc.id)}
                          className="mt-0.5"
                        />
                        <div 
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => toggleDocument(doc.id)}
                        >
                          <p className="font-medium truncate text-sm">{doc.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {doc.category}
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Layers className="h-3 w-3" />
                              {doc.chunkCount} chunks
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              setBrowsingDocId(doc.id);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>

          {selectedDocIds.length > 0 && (
            <div className="p-4 border-t bg-background">
              <Badge variant="secondary" className="w-full justify-center py-1">
                {selectedDocIds.length} document{selectedDocIds.length !== 1 ? "s" : ""} selected
              </Badge>
            </div>
          )}
        </>
      );

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Desktop Sidebar - Document Selection */}
        <div className="hidden md:flex md:w-80 border-r bg-muted/30 flex-col">
          <DocumentSidebarContent />
        </div>

        {/* Mobile Drawer - Document Selection */}
        <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
          <SheetContent side="left" className="w-[90vw] max-w-md p-0">
            <div className="flex flex-col h-full">
              <DocumentSidebarContent />
            </div>
          </SheetContent>
        </Sheet>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Mobile Header */}
          <div className="md:hidden h-14 flex items-center gap-3 px-4 border-b bg-background">
            <Button
              size="icon-lg"
              variant="ghost"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Select documents"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-base font-semibold">Document Chat</h1>
              {selectedDocIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedDocIds.length} doc{selectedDocIds.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          </div>

          {/* Desktop Header */}
          <div className="hidden md:block p-4 border-b">
            <h1 className="text-xl font-semibold">Chat with Documents</h1>
            <p className="text-sm text-muted-foreground">
              {selectedDocIds.length > 1
                ? "Ask questions across multiple documents - I'll synthesize and compare"
                : selectedDocIds.length === 1
                ? `Analyzing: ${selectedDocuments[0]?.name}`
                : "Select documents from the sidebar to start"}
            </p>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <h3 className="font-medium mb-2">Start a conversation</h3>
                  <p className="text-sm mb-6">
                    {selectedDocIds.length > 0
                      ? "Ask questions about your selected documents"
                      : "Select documents from the sidebar, then ask questions"}
                  </p>
                  
                  {selectedDocIds.length > 0 && (
                    <SuggestedQueries 
                      documentCount={selectedDocIds.length}
                      onSelectQuery={handleSuggestedQuery}
                    />
                  )}
                </div>
              )}

              {messages.map((message, i) => {
                // Parse citations for assistant messages
                const { citations }: { citations: Array<{ document: string; chunk?: string }> } = message.role === "assistant"
                  ? parseSourceCitations(message.content)
                  : { citations: [] };

                // Build source objects from citations matched to selected documents
                const messageSources: DocumentSource[] = citations
                  .map(c => {
                    const doc = documents.find(d =>
                      d.name.toLowerCase().includes(c.document.toLowerCase()) ||
                      c.document.toLowerCase().includes(d.name.toLowerCase())
                    );
                    if (doc) {
                      return {
                        id: doc.id,
                        name: doc.name,
                        category: doc.category || "Document",
                        chunkCount: doc.chunkCount || 0,
                      };
                    }
                    return null;
                  })
                  .filter((s): s is DocumentSource => s !== null);

                // Deduplicate sources
                const uniqueSources = messageSources.filter(
                  (s, idx, arr) => arr.findIndex(x => x.id === s.id) === idx
                );

                return (
                  <div
                    key={i}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-4 py-3 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {message.role === "assistant" ? (
                        <>
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                          </div>
                          {uniqueSources.length > 0 && (
                            <SourceCitation
                              sources={uniqueSources}
                              onViewDocument={(docId) => setBrowsingDocId(docId)}
                            />
                          )}
                        </>
                      ) : (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      )}
                    </div>
                  </div>
                );
              })}

              {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t bg-background">
            <div className="max-w-3xl mx-auto">
              <div className="flex gap-2">
                <div className="flex-1">
                  <MentionInput
                    value={input}
                    onChange={setInput}
                    onMentionsChange={setActiveMentions}
                    placeholder={
                      selectedDocIds.length > 0
                        ? "Ask a question... Type @ to add more context"
                        : "Select documents first, then ask a question..."
                    }
                    disabled={isStreaming || selectedDocIds.length === 0}
                    onSubmit={() => sendMessage()}
                  />
                </div>
                <Button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isStreaming || selectedDocIds.length === 0}
                  className="self-end"
                >
                  {isStreaming ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                AI responses are informational only. Not legal, financial, or professional advice.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chunk Browser Sheet */}
      <Sheet open={!!browsingDocId} onOpenChange={(open) => !open && setBrowsingDocId(null)}>
        <SheetContent side="right" className="w-[500px] sm:w-[600px] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Document Chunks</SheetTitle>
          </SheetHeader>
          {browsingDoc && (
            <ChunkBrowser
              documentId={browsingDoc.id}
              documentName={browsingDoc.name}
              onClose={() => setBrowsingDocId(null)}
            />
          )}
        </SheetContent>
      </Sheet>

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
