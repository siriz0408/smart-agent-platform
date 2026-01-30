import ReactMarkdown from "react-markdown";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AgentExecutionResult } from "@/hooks/useAgentExecution";

interface AgentResultDisplayProps {
  result: AgentExecutionResult;
}

export function AgentResultDisplay({ result }: AgentResultDisplayProps) {
  if (result.error && result.error !== "usage_limit_exceeded") {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{result.error}</AlertDescription>
      </Alert>
    );
  }

  if (result.error === "usage_limit_exceeded") {
    return null; // Handled by UsageLimitDialog
  }

  if (!result.content && result.isStreaming) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
        Generating response...
      </div>
    );
  }

  if (!result.content) {
    return null;
  }

  return (
    <ScrollArea className="h-[300px] w-full rounded-md border p-4">
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown>{result.content}</ReactMarkdown>
      </div>
      {result.isStreaming && (
        <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse" />
      )}
    </ScrollArea>
  );
}
