import { useNavigate } from "react-router-dom";
import { Briefcase, DollarSign, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import type { SearchResult } from "@/hooks/useGlobalSearch";

const stageColors: Record<string, string> = {
  lead: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  contacted: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  showing: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  offer: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  under_contract: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  pending: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
  closed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  lost: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const dealTypeColors: Record<string, string> = {
  buyer: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  seller: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  dual: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
};

interface DealResultCardProps {
  result: SearchResult;
}

export function DealResultCard({ result }: DealResultCardProps) {
  const navigate = useNavigate();

  const estimatedValue = result.metadata?.estimated_value as number | undefined;
  const stage = (result.metadata?.stage as string) || "lead";
  const dealType = (result.metadata?.deal_type as string) || "buyer";
  const expectedCloseDate = result.metadata?.expected_close_date as string | undefined;

  const handleClick = () => {
    // Navigate to pipeline with deal ID in query params (keeps modal behavior for now)
    navigate(`/pipeline/all?id=${result.entity_id}`);
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-lg shrink-0">
            <Briefcase className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            {/* Value */}
            {estimatedValue !== undefined && (
              <div className="flex items-center gap-1 text-lg font-semibold mb-1">
                <DollarSign className="h-4 w-4" />
                {estimatedValue.toLocaleString()}
              </div>
            )}

            {/* Title */}
            <h3 className="font-medium truncate mb-1">{result.name}</h3>
            <p className="text-sm text-muted-foreground truncate mb-2">
              {result.subtitle}
            </p>

            {/* Badges */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge
                variant="secondary"
                className={`text-xs ${stageColors[stage]}`}
              >
                {stage.replace("_", " ").toUpperCase()}
              </Badge>
              <Badge
                variant="secondary"
                className={`text-xs ${dealTypeColors[dealType]}`}
              >
                {dealType.charAt(0).toUpperCase() + dealType.slice(1)}
              </Badge>
            </div>

            {/* Expected Close Date */}
            {expectedCloseDate && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>Expected: {format(new Date(expectedCloseDate), "MMM d, yyyy")}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
