import { Copy, RefreshCw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface MessageActionsProps {
  content: string;
  isLastMessage: boolean;
  isStreaming: boolean;
  onRegenerate?: () => void;
}

/**
 * Message Actions Component
 *
 * Provides copy and regenerate functionality for AI chat messages.
 * - Copy: Copies the message content to clipboard
 * - Regenerate: Re-generates the last AI response
 */
export function MessageActions({
  content,
  isLastMessage,
  isStreaming,
  onRegenerate,
}: MessageActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleRegenerate = () => {
    if (onRegenerate && !isStreaming) {
      onRegenerate();
    }
  };

  return (
    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/40">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
        onClick={handleCopy}
        disabled={!content}
      >
        {copied ? (
          <>
            <Check className="h-3 w-3 mr-1 text-green-500" />
            Copied
          </>
        ) : (
          <>
            <Copy className="h-3 w-3 mr-1" />
            Copy
          </>
        )}
      </Button>

      {isLastMessage && onRegenerate && (
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 px-2 text-xs text-muted-foreground hover:text-foreground",
            isStreaming && "cursor-not-allowed opacity-50"
          )}
          onClick={handleRegenerate}
          disabled={isStreaming}
        >
          <RefreshCw className={cn("h-3 w-3 mr-1", isStreaming && "animate-spin")} />
          Regenerate
        </Button>
      )}
    </div>
  );
}
