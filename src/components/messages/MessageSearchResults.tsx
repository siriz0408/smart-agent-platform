import { Search, X, Loader2, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { MessageSearchResult } from "@/hooks/useMessageSearch";

interface MessageSearchResultsProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  results: MessageSearchResult[];
  isSearching: boolean;
  onSelectResult: (conversationId: string) => void;
  onClose: () => void;
}

/**
 * Highlights matching text within a snippet.
 */
function HighlightedSnippet({ snippet, query }: { snippet: string; query: string }) {
  if (!query.trim()) return <span>{snippet}</span>;

  const lowerSnippet = snippet.toLowerCase();
  const lowerQuery = query.toLowerCase().trim();
  const parts: { text: string; highlighted: boolean }[] = [];
  let lastIndex = 0;

  let index = lowerSnippet.indexOf(lowerQuery, lastIndex);
  while (index !== -1) {
    if (index > lastIndex) {
      parts.push({ text: snippet.slice(lastIndex, index), highlighted: false });
    }
    parts.push({ text: snippet.slice(index, index + query.trim().length), highlighted: true });
    lastIndex = index + query.trim().length;
    index = lowerSnippet.indexOf(lowerQuery, lastIndex);
  }

  if (lastIndex < snippet.length) {
    parts.push({ text: snippet.slice(lastIndex), highlighted: false });
  }

  return (
    <span>
      {parts.map((part, i) =>
        part.highlighted ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded-sm px-0.5">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </span>
  );
}

export function MessageSearchResults({
  searchQuery,
  onSearchQueryChange,
  results,
  isSearching,
  onSelectResult,
  onClose,
}: MessageSearchResultsProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Search Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Search Messages</h2>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search message content..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>
      </div>

      {/* Results */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isSearching ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span>Searching...</span>
            </div>
          ) : searchQuery.trim().length < 2 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Type at least 2 characters to search
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No messages match &ldquo;{searchQuery}&rdquo;</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground px-3 py-1">
                {results.length} result{results.length !== 1 ? "s" : ""}
              </p>
              {results.map((result) => (
                <button
                  key={result.messageId}
                  onClick={() => onSelectResult(result.conversationId)}
                  className={cn(
                    "w-full flex flex-col gap-1 p-3 rounded-lg text-left transition-colors",
                    "hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">
                      {result.conversationTitle}
                    </span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                      {formatDistanceToNow(new Date(result.sentAt), { addSuffix: true })}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {result.senderName}
                  </span>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    <HighlightedSnippet snippet={result.snippet} query={searchQuery} />
                  </p>
                </button>
              ))}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
