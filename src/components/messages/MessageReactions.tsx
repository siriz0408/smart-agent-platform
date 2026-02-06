import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SmilePlus } from "lucide-react";
import {
  REACTION_EMOJIS,
  type ReactionSummary,
} from "@/hooks/useMessageReactions";

interface MessageReactionsProps {
  /** Aggregated reactions for this message */
  reactions: ReactionSummary[];
  /** Called when user toggles a reaction */
  onToggleReaction: (emoji: string) => void;
  /** Whether the message was sent by the current user (affects alignment) */
  isOwnMessage: boolean;
  /** Map of user_id -> display name for tooltip */
  userNames?: Record<string, string>;
}

/**
 * Displays existing reactions as emoji pills with counts,
 * and provides an "add reaction" button with an emoji picker popover.
 */
export function MessageReactions({
  reactions,
  onToggleReaction,
  isOwnMessage,
  userNames = {},
}: MessageReactionsProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleEmojiSelect = (emoji: string) => {
    onToggleReaction(emoji);
    setPickerOpen(false);
  };

  const getReactorNames = (reaction: ReactionSummary): string => {
    const names = reaction.userIds.map(
      (id) => userNames[id] || "Someone"
    );
    if (names.length === 0) return "";
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} and ${names[1]}`;
    return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  };

  // Don't render anything if no reactions and not hoverable (we always show the add button via CSS hover)
  return (
    <div
      className={cn(
        "flex items-center gap-1 flex-wrap mt-1",
        isOwnMessage ? "justify-end" : "justify-start"
      )}
    >
      {/* Existing reaction pills */}
      {reactions.map((reaction) => (
        <Tooltip key={reaction.emoji}>
          <TooltipTrigger asChild>
            <button
              onClick={() => onToggleReaction(reaction.emoji)}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs",
                "border transition-colors cursor-pointer",
                "hover:border-primary/50",
                reaction.hasReacted
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-muted/50 border-border text-muted-foreground"
              )}
            >
              <span className="text-sm leading-none">{reaction.emoji}</span>
              <span className="font-medium">{reaction.count}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {getReactorNames(reaction)} reacted with {reaction.emoji}
          </TooltipContent>
        </Tooltip>
      ))}

      {/* Add reaction button */}
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "inline-flex items-center justify-center",
              "h-6 w-6 rounded-full border border-transparent",
              "text-muted-foreground/50 hover:text-muted-foreground",
              "hover:bg-muted hover:border-border",
              "transition-all cursor-pointer",
              // Show on hover of parent message via group class
              reactions.length === 0
                ? "opacity-0 group-hover/message:opacity-100"
                : "opacity-60 hover:opacity-100"
            )}
            aria-label="Add reaction"
          >
            <SmilePlus className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side={isOwnMessage ? "left" : "right"}
          align="start"
          className="w-auto p-2"
        >
          <div className="flex gap-1">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleEmojiSelect(emoji)}
                className={cn(
                  "h-8 w-8 rounded-md flex items-center justify-center",
                  "text-lg hover:bg-muted transition-colors cursor-pointer",
                  "hover:scale-110 active:scale-95"
                )}
                aria-label={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
