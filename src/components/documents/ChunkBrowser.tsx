import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, FileText, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";

interface ChunkBrowserProps {
  documentId: string;
  documentName: string;
  onClose?: () => void;
}

interface DocumentChunk {
  id: string;
  content: string;
  chunk_index: number;
}

export function ChunkBrowser({ documentId, documentName, onClose }: ChunkBrowserProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedChunks, setExpandedChunks] = useState<Set<string>>(new Set());

  const { data: chunks = [], isLoading } = useQuery({
    queryKey: ["document-chunks", documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_chunks")
        .select("id, content, chunk_index")
        .eq("document_id", documentId)
        .order("chunk_index");

      if (error) throw error;
      return data as DocumentChunk[];
    },
  });

  const filteredChunks = searchTerm
    ? chunks.filter((chunk) =>
        chunk.content.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : chunks;

  const toggleChunk = (chunkId: string) => {
    setExpandedChunks((prev) => {
      const next = new Set(prev);
      if (next.has(chunkId)) {
        next.delete(chunkId);
      } else {
        next.add(chunkId);
      }
      return next;
    });
  };

  const highlightText = (text: string, term: string) => {
    if (!term) return text;
    
    const parts = text.split(new RegExp(`(${term})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === term.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-900 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold truncate">{documentName}</h3>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search within document..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary">{chunks.length} chunks</Badge>
          {searchTerm && (
            <Badge variant="outline">
              {filteredChunks.length} matches
            </Badge>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))
          ) : filteredChunks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">
                {searchTerm ? "No matching content found" : "No chunks available"}
              </p>
            </div>
          ) : (
            filteredChunks.map((chunk) => (
              <Collapsible
                key={chunk.id}
                open={expandedChunks.has(chunk.id)}
                onOpenChange={() => toggleChunk(chunk.id)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-left h-auto py-3 px-3 hover:bg-muted"
                  >
                    <div className="flex items-start gap-2 w-full">
                      {expandedChunks.has(chunk.id) ? (
                        <ChevronDown className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            Chunk {chunk.chunk_index + 1}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {highlightText(
                            chunk.content.substring(0, 200),
                            searchTerm
                          )}
                          {chunk.content.length > 200 ? "..." : ""}
                        </p>
                      </div>
                    </div>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-6 pl-4 border-l-2 border-muted py-3 pr-3">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {highlightText(chunk.content, searchTerm)}
                    </p>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
