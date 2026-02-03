import { X, FileText, User, Building2, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Mention, MentionType } from "@/hooks/useMentionSearch";

interface MentionPillProps {
  mention: Mention;
  onRemove?: () => void;
  className?: string;
}

const iconMap: Record<MentionType, React.ElementType> = {
  doc: FileText,
  contact: User,
  property: Building2,
  deal: Briefcase,
};

const colorMap: Record<MentionType, string> = {
  doc: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  contact: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  property: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  deal: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
};

export function MentionPill({ mention, onRemove, className }: MentionPillProps) {
  const Icon = iconMap[mention.type];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
        colorMap[mention.type],
        className
      )}
    >
      <Icon className="h-3 w-3" />
      <span className="max-w-[120px] truncate">{mention.name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
