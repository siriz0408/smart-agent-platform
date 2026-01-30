import { Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SuggestedQueriesProps {
  documentCount: number;
  onSelectQuery: (query: string) => void;
}

const SINGLE_DOC_QUERIES = [
  "Summarize the key points of this document",
  "What are the main findings or conclusions?",
  "Are there any deadlines or important dates mentioned?",
  "What issues or concerns are highlighted?",
  "List all recommendations or action items",
];

const MULTI_DOC_QUERIES = [
  "Compare and contrast the main findings across all documents",
  "What are the key points from each document?",
  "Are there any conflicts or discrepancies between the documents?",
  "Synthesize the important deadlines from all documents",
  "Based on all documents, what should I prioritize?",
];

const INSPECTION_QUERIES = [
  "What repairs are recommended in the inspection?",
  "Are there any safety concerns mentioned?",
  "What is the overall condition of the property?",
  "Which issues require immediate attention?",
];

const CONTRACT_QUERIES = [
  "What are the key terms and contingencies?",
  "When is the closing date?",
  "What repairs is the seller responsible for?",
  "What are my rights during the inspection period?",
];

export function SuggestedQueries({ documentCount, onSelectQuery }: SuggestedQueriesProps) {
  const queries = documentCount > 1 ? MULTI_DOC_QUERIES : SINGLE_DOC_QUERIES;
  
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Lightbulb className="h-4 w-4" />
        <span>Suggested questions:</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {queries.slice(0, 4).map((query, i) => (
          <Button
            key={i}
            variant="outline"
            size="sm"
            className="text-xs h-auto py-1.5 px-3"
            onClick={() => onSelectQuery(query)}
          >
            {query}
          </Button>
        ))}
      </div>
    </div>
  );
}

export { SINGLE_DOC_QUERIES, MULTI_DOC_QUERIES, INSPECTION_QUERIES, CONTRACT_QUERIES };
