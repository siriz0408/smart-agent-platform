import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Play, Copy, Check, Loader2 } from "lucide-react";
import { useAgentExecution, type AgentContext } from "@/hooks/useAgentExecution";
import { AgentInputForm } from "./AgentInputForm";
import { AgentResultDisplay } from "./AgentResultDisplay";
import { UsageLimitDialog } from "./UsageLimitDialog";
import type { Tables } from "@/integrations/supabase/types";

type AIAgent = Tables<"ai_agents">;

interface AgentExecutionSheetProps {
  agent: AIAgent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AgentExecutionSheet({ agent, open, onOpenChange }: AgentExecutionSheetProps) {
  const [context, setContext] = useState<AgentContext>({});
  const [copied, setCopied] = useState(false);
  const [showUsageDialog, setShowUsageDialog] = useState(false);
  const { executeAgent, isExecuting, result, resetResult } = useAgentExecution();

  // Reset state when agent changes or sheet closes
  useEffect(() => {
    if (!open) {
      setContext({});
      resetResult();
    }
  }, [open, resetResult]);

  const handleExecute = async () => {
    if (!agent) return;
    await executeAgent(agent.id, context);
    
    // Check for usage limit exceeded
    if (result.usageLimitExceeded) {
      setShowUsageDialog(true);
    }
  };

  // Watch for usage limit exceeded after execution
  useEffect(() => {
    if (result.error === "usage_limit_exceeded" && result.usageLimitExceeded) {
      setShowUsageDialog(true);
    }
  }, [result.error, result.usageLimitExceeded]);

  const handleCopy = async () => {
    if (result.content) {
      await navigator.clipboard.writeText(result.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getAgentType = (agentName: string): string => {
    const name = agentName.toLowerCase();
    if (name.includes("listing")) return "listing_writer";
    if (name.includes("cma") || name.includes("analyst")) return "cma_analyst";
    if (name.includes("contract") || name.includes("reviewer")) return "contract_reviewer";
    if (name.includes("follow")) return "followup_assistant";
    if (name.includes("offer")) return "offer_analyzer";
    return "general";
  };

  if (!agent) return null;

  const agentType = getAgentType(agent.name);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                <Sparkles className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <SheetTitle className="text-left">{agent.name}</SheetTitle>
                {agent.is_certified && (
                  <Badge variant="secondary" className="mt-1 gap-1">
                    <Sparkles className="h-3 w-3" />
                    Certified
                  </Badge>
                )}
              </div>
            </div>
            <SheetDescription className="text-left pt-2">
              {agent.description || "No description available"}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Input Form */}
            <AgentInputForm
              agentType={agentType}
              dataSources={(agent as any)?.data_sources || []}
              context={context}
              onContextChange={setContext}
              disabled={isExecuting || result.isStreaming}
            />

            {/* Execute Button */}
            <Button
              onClick={handleExecute}
              disabled={isExecuting || result.isStreaming}
              className="w-full"
            >
              {isExecuting || result.isStreaming ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {result.isStreaming ? "Generating..." : "Starting..."}
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Agent
                </>
              )}
            </Button>

            {/* Result Display */}
            {(result.content || result.error) && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Result</h3>
                  {result.content && !result.error && (
                    <Button variant="outline" size="sm" onClick={handleCopy}>
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                  )}
                </div>
                <AgentResultDisplay result={result} />
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <UsageLimitDialog
        open={showUsageDialog}
        onOpenChange={setShowUsageDialog}
        usageData={result.usageLimitExceeded}
      />
    </>
  );
}
