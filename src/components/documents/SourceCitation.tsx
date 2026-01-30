import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface DocumentSource {
  id: string;
  name: string;
  category: string;
  chunkCount: number;
}

interface SourceCitationProps {
  sources: DocumentSource[];
  onViewDocument?: (documentId: string) => void;
}

export function SourceCitation({ sources, onViewDocument }: SourceCitationProps) {
  if (sources.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/50">
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <FileText className="h-3 w-3" />
        Sources:
      </span>
      {sources.map((source) => (
        <TooltipProvider key={source.id}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-muted text-xs"
                onClick={() => onViewDocument?.(source.id)}
              >
                {source.name}
                <span className="ml-1 text-muted-foreground">
                  ({source.chunkCount} sections)
                </span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">
                Category: {source.category}
                <br />
                Click to view document
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
}

// Parse AI response for inline citations like [Source: Document Name, Chunk #X]
export function parseSourceCitations(content: string): { 
  text: string; 
  citations: { document: string; chunk?: string }[] 
} {
  const citationRegex = /\[Source:\s*([^,\]]+)(?:,\s*Chunk\s*#?(\d+))?\]/g;
  const citations: { document: string; chunk?: string }[] = [];
  
  let match;
  while ((match = citationRegex.exec(content)) !== null) {
    citations.push({
      document: match[1].trim(),
      chunk: match[2],
    });
  }
  
  return { text: content, citations };
}
