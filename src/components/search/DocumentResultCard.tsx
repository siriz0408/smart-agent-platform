import { useNavigate } from "react-router-dom";
import { FileText, Calendar, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import type { SearchResult } from "@/hooks/useGlobalSearch";

const categoryColors: Record<string, string> = {
  contract: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  disclosure: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  inspection: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  appraisal: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  title: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

interface DocumentResultCardProps {
  result: SearchResult;
  /** Optional callback invoked before navigation (for click tracking) */
  onBeforeNavigate?: (entityType: string, entityId: string) => void;
}

export function DocumentResultCard({ result, onBeforeNavigate }: DocumentResultCardProps) {
  const navigate = useNavigate();

  const category = (result.metadata?.category as string) || "other";
  const fileType = (result.metadata?.file_type as string) || "";
  const fileSize = result.metadata?.file_size as number | undefined;
  const isIndexed = !!result.metadata?.indexed_at;

  const formatFileSize = (bytes: number | undefined): string => {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleClick = () => {
    onBeforeNavigate?.("document", result.entity_id);
    navigate(`/documents/${result.entity_id}`);
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-lg shrink-0">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate mb-1">{result.name}</h3>
            <p className="text-sm text-muted-foreground truncate mb-2">
              {result.subtitle}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="secondary"
                className={`text-xs ${categoryColors[category]}`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </Badge>
              {fileType && (
                <span className="text-xs text-muted-foreground">
                  {fileType.split("/")[1]?.toUpperCase() || fileType}
                </span>
              )}
              {fileSize && (
                <>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(fileSize)}
                  </span>
                </>
              )}
              {isIndexed && (
                <>
                  <span className="text-xs text-muted-foreground">•</span>
                  <Badge variant="outline" className="text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI
                  </Badge>
                </>
              )}
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {format(new Date(result.updated_at), "MMM d, yyyy")}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
