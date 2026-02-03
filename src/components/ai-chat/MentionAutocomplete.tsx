import { FileText, User, Building2, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Mention, MentionType } from "@/hooks/useMentionSearch";

interface MentionAutocompleteProps {
  results: Mention[];
  activeIndex: number;
  onSelect: (mention: Mention) => void;
  visible: boolean;
  className?: string;
}

const iconMap: Record<MentionType, React.ElementType> = {
  doc: FileText,
  contact: User,
  property: Building2,
  deal: Briefcase,
};

const labelMap: Record<MentionType, string> = {
  doc: "Document",
  contact: "Contact",
  property: "Property",
  deal: "Deal",
};

export function MentionAutocomplete({
  results,
  activeIndex,
  onSelect,
  visible,
  className,
}: MentionAutocompleteProps) {
  if (!visible || results.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "absolute bottom-full left-0 right-0 mb-2 bg-popover border rounded-lg shadow-lg overflow-hidden z-50",
        className
      )}
    >
      <div className="p-1 text-xs text-muted-foreground border-b">
        Type to search, then press Enter or click to select
      </div>
      <ul className="max-h-60 overflow-y-auto">
        {results.map((result, index) => {
          const Icon = iconMap[result.type];
          return (
            <li
              key={`${result.type}-${result.id}`}
              className={cn(
                "flex items-center gap-3 px-3 py-2 cursor-pointer",
                index === activeIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted"
              )}
              onClick={() => onSelect(result)}
            >
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                  result.type === "doc" && "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300",
                  result.type === "contact" && "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300",
                  result.type === "property" && "bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300",
                  result.type === "deal" && "bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-300"
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{result.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {labelMap[result.type]}
                  {result.subtitle && ` - ${result.subtitle}`}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
