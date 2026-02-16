import { formatDistanceToNow, format } from "date-fns";
import {
  Clock,
  CheckCircle2,
  FileText,
  ArrowRight,
  StickyNote,
  Target,
  Edit3,
  Plus,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useDealActivities,
  DealActivity,
  DealActivityType,
  StageChangedMetadata,
  NoteAddedMetadata,
  MilestoneMetadata,
  DocumentMetadata,
  FieldUpdatedMetadata,
} from "@/hooks/useDealActivities";

interface DealActivityTimelineProps {
  dealId: string;
  maxHeight?: string;
}

// Configuration for activity types
const ACTIVITY_CONFIG: Record<
  DealActivityType,
  {
    icon: typeof Clock;
    color: string;
    bgColor: string;
    label: string;
  }
> = {
  created: {
    icon: Plus,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    label: "Created",
  },
  stage_changed: {
    icon: ArrowRight,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    label: "Stage Change",
  },
  note_added: {
    icon: StickyNote,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    label: "Note",
  },
  milestone_created: {
    icon: Target,
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
    label: "Milestone Added",
  },
  milestone_completed: {
    icon: CheckCircle2,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    label: "Milestone Complete",
  },
  document_uploaded: {
    icon: FileText,
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/30",
    label: "Document",
  },
  field_updated: {
    icon: Edit3,
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-800",
    label: "Update",
  },
};

function ActivityIcon({ type }: { type: DealActivityType }) {
  const config = ACTIVITY_CONFIG[type] || ACTIVITY_CONFIG.field_updated;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex items-center justify-center w-8 h-8 rounded-full shrink-0",
        config.bgColor
      )}
    >
      <Icon className={cn("w-4 h-4", config.color)} />
    </div>
  );
}

function ActivityDetails({ activity }: { activity: DealActivity }) {
  const metadata = activity.metadata;

  switch (activity.activity_type) {
    case "stage_changed": {
      const stageData = metadata as StageChangedMetadata;
      return (
        <div className="flex items-center gap-2 text-sm mt-1">
          {stageData.previous_stage && (
            <>
              <Badge variant="outline" className="text-xs">
                {stageData.previous_stage_label || stageData.previous_stage}
              </Badge>
              <ArrowRight className="w-3 h-3 text-muted-foreground" />
            </>
          )}
          <Badge className="text-xs bg-primary/10 text-primary hover:bg-primary/20">
            {stageData.new_stage_label || stageData.new_stage}
          </Badge>
        </div>
      );
    }

    case "note_added": {
      const noteData = metadata as NoteAddedMetadata;
      return (
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
          {noteData.note_preview || activity.description}
        </p>
      );
    }

    case "milestone_created":
    case "milestone_completed": {
      const milestoneData = metadata as MilestoneMetadata;
      return (
        <div className="text-sm text-muted-foreground mt-1">
          {milestoneData.due_date && activity.activity_type === "milestone_created" && (
            <span>Due: {format(new Date(milestoneData.due_date), "MMM d, yyyy")}</span>
          )}
          {milestoneData.completed_at && activity.activity_type === "milestone_completed" && (
            <span>
              Completed: {format(new Date(milestoneData.completed_at), "MMM d, yyyy")}
            </span>
          )}
        </div>
      );
    }

    case "document_uploaded": {
      const docData = metadata as DocumentMetadata;
      return (
        <div className="text-sm text-muted-foreground mt-1">
          {docData.document_type && (
            <Badge variant="secondary" className="text-xs mr-2">
              {docData.document_type}
            </Badge>
          )}
          {docData.file_size && (
            <span className="text-xs">
              ({(docData.file_size / 1024).toFixed(1)} KB)
            </span>
          )}
        </div>
      );
    }

    case "field_updated": {
      const fieldData = metadata as FieldUpdatedMetadata;
      return (
        <div className="text-sm text-muted-foreground mt-1">
          <span className="text-xs">
            {fieldData.field_label || fieldData.field_name}:{" "}
            {String(fieldData.old_value || "empty")} {"-> "}
            {String(fieldData.new_value)}
          </span>
        </div>
      );
    }

    default:
      return activity.description ? (
        <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
      ) : null;
  }
}

function ActivityItem({ activity, isLast }: { activity: DealActivity; isLast: boolean }) {
  const config = ACTIVITY_CONFIG[activity.activity_type] || ACTIVITY_CONFIG.field_updated;
  const timeAgo = formatDistanceToNow(new Date(activity.created_at), { addSuffix: true });
  const exactTime = format(new Date(activity.created_at), "MMM d, yyyy 'at' h:mm a");

  return (
    <div className="flex gap-3 relative">
      {/* Timeline connector line */}
      {!isLast && (
        <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-border -translate-x-1/2" />
      )}

      {/* Activity icon */}
      <ActivityIcon type={activity.activity_type} />

      {/* Activity content */}
      <div className="flex-1 min-w-0 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{activity.title}</span>
              <Badge variant="outline" className="text-xs">
                {config.label}
              </Badge>
            </div>
            <ActivityDetails activity={activity} />
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                {timeAgo}
              </span>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>{exactTime}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

export function DealActivityTimeline({
  dealId,
  maxHeight = "400px",
}: DealActivityTimelineProps) {
  const { data: activities = [], isLoading, error } = useDealActivities(dealId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6 text-destructive">
        <p className="text-sm">Failed to load activity timeline</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-6 border rounded-lg bg-muted/30">
        <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
        <p className="text-sm text-muted-foreground">No activity recorded yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Activities will appear here as the deal progresses
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-muted-foreground">
          Activity Timeline ({activities.length})
        </h4>
      </div>

      <ScrollArea style={{ maxHeight }} className="pr-4">
        <div className="space-y-0">
          {activities.map((activity, index) => (
            <ActivityItem
              key={activity.id}
              activity={activity}
              isLast={index === activities.length - 1}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
