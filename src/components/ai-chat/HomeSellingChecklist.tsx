import { useState, useEffect } from "react";
import { Home, Megaphone, DollarSign, ClipboardCheck, Handshake, FileText, Truck, ChevronDown, RotateCcw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

interface ChecklistTask {
  id: string;
  label: string;
  description: string;
}

interface ChecklistPhase {
  id: string;
  title: string;
  icon: React.ReactNode;
  tasks: ChecklistTask[];
}

interface HomeSellingChecklistProps {
  initialCompletedTasks?: string[];
  onTasksChange?: (completedTasks: string[]) => void;
  readOnly?: boolean;
  highlightPhase?: string;
  showProgress?: boolean;
}

// ============================================================================
// CHECKLIST DATA
// ============================================================================

const SELLING_CHECKLIST_PHASES: ChecklistPhase[] = [
  {
    id: "getting_ready",
    title: "Getting Ready",
    icon: <Home className="h-4 w-4" />,
    tasks: [
      { id: "sr_1", label: "Declutter and depersonalize", description: "Remove excess items and personal photos" },
      { id: "sr_2", label: "Deep clean the home", description: "Professional cleaning recommended" },
      { id: "sr_3", label: "Make minor repairs", description: "Fix leaky faucets, squeaky doors, etc." },
      { id: "sr_4", label: "Improve curb appeal", description: "Landscaping, paint touch-ups, pressure wash" },
      { id: "sr_5", label: "Gather important documents", description: "Deed, survey, warranties, HOA docs" },
      { id: "sr_6", label: "Research comparable sales", description: "Look at recent sales in your area" },
    ],
  },
  {
    id: "choosing_agent",
    title: "Choosing an Agent",
    icon: <Handshake className="h-4 w-4" />,
    tasks: [
      { id: "ca_1", label: "Interview multiple agents", description: "Meet with 2-3 agents to compare" },
      { id: "ca_2", label: "Review marketing plans", description: "How will they market your home?" },
      { id: "ca_3", label: "Negotiate commission rate", description: "Typical range is 5-6%" },
      { id: "ca_4", label: "Sign listing agreement", description: "Read terms carefully before signing" },
    ],
  },
  {
    id: "pricing_listing",
    title: "Pricing & Listing",
    icon: <DollarSign className="h-4 w-4" />,
    tasks: [
      { id: "pl_1", label: "Review CMA report", description: "Comparative Market Analysis from agent" },
      { id: "pl_2", label: "Set listing price", description: "Price competitively based on market" },
      { id: "pl_3", label: "Complete seller disclosures", description: "Legally required property condition forms" },
      { id: "pl_4", label: "Schedule professional photos", description: "High-quality photos sell homes faster" },
    ],
  },
  {
    id: "marketing_showings",
    title: "Marketing & Showings",
    icon: <Megaphone className="h-4 w-4" />,
    tasks: [
      { id: "ms_1", label: "Review MLS listing", description: "Verify all details are accurate" },
      { id: "ms_2", label: "Prepare for showings", description: "Keep home clean and show-ready" },
      { id: "ms_3", label: "Plan for open houses", description: "Secure valuables, leave during showings" },
      { id: "ms_4", label: "Gather showing feedback", description: "Review feedback with your agent" },
    ],
  },
  {
    id: "offers_negotiation",
    title: "Offers & Negotiation",
    icon: <FileText className="h-4 w-4" />,
    tasks: [
      { id: "on_1", label: "Review all offers", description: "Consider price, contingencies, timing" },
      { id: "on_2", label: "Negotiate terms", description: "Counter-offers and concessions" },
      { id: "on_3", label: "Accept best offer", description: "Sign purchase agreement" },
    ],
  },
  {
    id: "under_contract",
    title: "Under Contract",
    icon: <ClipboardCheck className="h-4 w-4" />,
    tasks: [
      { id: "uc_1", label: "Buyer deposits earnest money", description: "Typically 1-3% of sale price" },
      { id: "uc_2", label: "Complete buyer inspections", description: "Be available for inspector access" },
      { id: "uc_3", label: "Negotiate repairs if needed", description: "Respond to inspection requests" },
      { id: "uc_4", label: "Appraisal completed", description: "Buyer's lender orders appraisal" },
      { id: "uc_5", label: "Clear title issues", description: "Resolve any title concerns" },
    ],
  },
  {
    id: "closing_moving",
    title: "Closing & Moving",
    icon: <Truck className="h-4 w-4" />,
    tasks: [
      { id: "cm_1", label: "Review closing disclosure", description: "Verify all fees and credits" },
      { id: "cm_2", label: "Schedule final walkthrough", description: "Buyer inspects before closing" },
      { id: "cm_3", label: "Attend closing", description: "Sign documents, transfer ownership" },
      { id: "cm_4", label: "Cancel utilities & services", description: "Transfer or close accounts" },
    ],
  },
];

const STORAGE_KEY = "home-selling-checklist";

interface StoredChecklistData {
  version: number;
  completedTasks: string[];
  lastUpdated: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function HomeSellingChecklist({
  initialCompletedTasks,
  onTasksChange,
  readOnly = false,
  highlightPhase,
  showProgress = true,
}: HomeSellingChecklistProps) {
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [openPhases, setOpenPhases] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);

  // Total tasks count
  const totalTasks = SELLING_CHECKLIST_PHASES.reduce((sum, phase) => sum + phase.tasks.length, 0);
  const completedCount = completedTasks.size;
  const progressPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  // Load from localStorage on mount
  useEffect(() => {
    if (initialCompletedTasks) {
      setCompletedTasks(new Set(initialCompletedTasks));
    } else {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const data: StoredChecklistData = JSON.parse(stored);
          setCompletedTasks(new Set(data.completedTasks));
        }
      } catch (error) {
        console.error("Failed to load checklist from localStorage:", error);
      }
    }

    // Set initial open phases
    const initialOpen = new Set<string>();
    if (highlightPhase) {
      initialOpen.add(highlightPhase);
    } else {
      // Open first incomplete phase by default
      for (const phase of SELLING_CHECKLIST_PHASES) {
        const phaseComplete = phase.tasks.every((t) => completedTasks.has(t.id));
        if (!phaseComplete) {
          initialOpen.add(phase.id);
          break;
        }
      }
      // If all complete, open the last phase
      if (initialOpen.size === 0) {
        initialOpen.add(SELLING_CHECKLIST_PHASES[SELLING_CHECKLIST_PHASES.length - 1].id);
      }
    }
    setOpenPhases(initialOpen);
    setIsLoaded(true);
  }, [initialCompletedTasks, highlightPhase]);

  // Save to localStorage when tasks change
  useEffect(() => {
    if (!isLoaded || initialCompletedTasks) return;

    try {
      const data: StoredChecklistData = {
        version: 1,
        completedTasks: Array.from(completedTasks),
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save checklist to localStorage:", error);
    }

    onTasksChange?.(Array.from(completedTasks));
  }, [completedTasks, isLoaded, initialCompletedTasks, onTasksChange]);

  const toggleTask = (taskId: string) => {
    if (readOnly) return;

    setCompletedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const togglePhase = (phaseId: string) => {
    setOpenPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) {
        next.delete(phaseId);
      } else {
        next.add(phaseId);
      }
      return next;
    });
  };

  const handleReset = () => {
    if (readOnly) return;
    setCompletedTasks(new Set());
  };

  const getPhaseProgress = (phase: ChecklistPhase) => {
    const completed = phase.tasks.filter((t) => completedTasks.has(t.id)).length;
    return { completed, total: phase.tasks.length };
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Home className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Home Selling Checklist</CardTitle>
              <CardDescription className="text-xs">
                Track your progress through the home selling journey
              </CardDescription>
            </div>
          </div>
          {!readOnly && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          )}
        </div>

        {showProgress && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-medium">
                {progressPercent}% ({completedCount}/{totalTasks})
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-2 pt-0">
        {SELLING_CHECKLIST_PHASES.map((phase) => {
          const { completed, total } = getPhaseProgress(phase);
          const isOpen = openPhases.has(phase.id);
          const isComplete = completed === total;

          return (
            <Collapsible
              key={phase.id}
              open={isOpen}
              onOpenChange={() => togglePhase(phase.id)}
            >
              <CollapsibleTrigger asChild>
                <button
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors",
                    isOpen ? "bg-muted/50" : "hover:bg-muted/30",
                    isComplete && "border-green-500/30 bg-green-500/5"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center",
                        isComplete
                          ? "bg-green-500/10 text-green-600"
                          : "bg-primary/10 text-primary"
                      )}
                    >
                      {phase.icon}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{phase.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {completed}/{total} completed
                      </div>
                    </div>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="mt-2 ml-4 space-y-1 border-l-2 border-muted pl-4">
                  {phase.tasks.map((task) => {
                    const isChecked = completedTasks.has(task.id);

                    return (
                      <div
                        key={task.id}
                        className={cn(
                          "flex items-start gap-3 rounded-md p-2 transition-colors",
                          !readOnly && "hover:bg-muted/50 cursor-pointer",
                          isChecked && "opacity-70"
                        )}
                        onClick={() => toggleTask(task.id)}
                      >
                        <Checkbox
                          id={task.id}
                          checked={isChecked}
                          disabled={readOnly}
                          onCheckedChange={() => toggleTask(task.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <label
                            htmlFor={task.id}
                            className={cn(
                              "text-sm font-medium cursor-pointer",
                              isChecked && "line-through text-muted-foreground"
                            )}
                          >
                            {task.label}
                          </label>
                          <p className="text-xs text-muted-foreground">
                            {task.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}
