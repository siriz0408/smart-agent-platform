import { useState, useEffect } from "react";
import { Home, Search, FileText, ClipboardCheck, Landmark, Key, ChevronDown, RotateCcw } from "lucide-react";
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

interface HomeBuyingChecklistProps {
  initialCompletedTasks?: string[];
  onTasksChange?: (completedTasks: string[]) => void;
  readOnly?: boolean;
  highlightPhase?: string;
  showProgress?: boolean;
}

// ============================================================================
// CHECKLIST DATA
// ============================================================================

const CHECKLIST_PHASES: ChecklistPhase[] = [
  {
    id: "getting_started",
    title: "Getting Started",
    icon: <Home className="h-4 w-4" />,
    tasks: [
      { id: "gs_1", label: "Research neighborhoods", description: "Identify areas that match your lifestyle" },
      { id: "gs_2", label: "Determine your budget", description: "Calculate what you can afford" },
      { id: "gs_3", label: "Check your credit score", description: "Review and improve if needed" },
      { id: "gs_4", label: "Save for down payment", description: "Aim for 3-20% of home price" },
      { id: "gs_5", label: "Get pre-approved for mortgage", description: "Strengthen your offer with a pre-approval letter" },
    ],
  },
  {
    id: "finding_home",
    title: "Finding Your Home",
    icon: <Search className="h-4 w-4" />,
    tasks: [
      { id: "fh_1", label: "Hire a real estate agent", description: "Find a licensed agent to represent you" },
      { id: "fh_2", label: "Create your wish list", description: "Must-haves vs. nice-to-haves" },
      { id: "fh_3", label: "Start viewing properties", description: "Tour homes that match your criteria" },
      { id: "fh_4", label: "Compare your options", description: "Weigh pros and cons of top choices" },
      { id: "fh_5", label: "Choose your home", description: "Select the property to make an offer on" },
    ],
  },
  {
    id: "making_offer",
    title: "Making an Offer",
    icon: <FileText className="h-4 w-4" />,
    tasks: [
      { id: "mo_1", label: "Determine offer price", description: "Research comps and market conditions" },
      { id: "mo_2", label: "Submit your offer", description: "Include earnest money amount" },
      { id: "mo_3", label: "Negotiate terms", description: "Counter-offers and contingencies" },
      { id: "mo_4", label: "Sign purchase agreement", description: "Official contract with seller" },
    ],
  },
  {
    id: "due_diligence",
    title: "Due Diligence",
    icon: <ClipboardCheck className="h-4 w-4" />,
    tasks: [
      { id: "dd_1", label: "Deposit earnest money", description: "Typically 1-3% of purchase price" },
      { id: "dd_2", label: "Schedule home inspection", description: "Identify potential issues" },
      { id: "dd_3", label: "Review inspection report", description: "Request repairs if needed" },
      { id: "dd_4", label: "Order appraisal", description: "Required by lender" },
      { id: "dd_5", label: "Complete title search", description: "Verify clear ownership" },
    ],
  },
  {
    id: "finalizing_loan",
    title: "Finalizing Your Loan",
    icon: <Landmark className="h-4 w-4" />,
    tasks: [
      { id: "fl_1", label: "Lock your interest rate", description: "Secure your rate before closing" },
      { id: "fl_2", label: "Provide documents to lender", description: "Pay stubs, tax returns, etc." },
      { id: "fl_3", label: "Review Closing Disclosure", description: "Receive 3 days before closing" },
      { id: "fl_4", label: "Obtain homeowners insurance", description: "Required before closing" },
      { id: "fl_5", label: "Confirm closing costs", description: "Know what you'll pay at closing" },
    ],
  },
  {
    id: "closing",
    title: "Closing Day",
    icon: <Key className="h-4 w-4" />,
    tasks: [
      { id: "cl_1", label: "Final walkthrough", description: "Verify property condition" },
      { id: "cl_2", label: "Bring funds for closing", description: "Wire or cashier's check" },
      { id: "cl_3", label: "Sign closing documents", description: "Deed, mortgage, disclosures" },
      { id: "cl_4", label: "Receive keys", description: "Congratulations, you're a homeowner!" },
    ],
  },
];

const STORAGE_KEY = "home-buying-checklist";

interface StoredChecklistData {
  version: number;
  completedTasks: string[];
  lastUpdated: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function HomeBuyingChecklist({
  initialCompletedTasks,
  onTasksChange,
  readOnly = false,
  highlightPhase,
  showProgress = true,
}: HomeBuyingChecklistProps) {
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [openPhases, setOpenPhases] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);

  // Total tasks count
  const totalTasks = CHECKLIST_PHASES.reduce((sum, phase) => sum + phase.tasks.length, 0);
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
      for (const phase of CHECKLIST_PHASES) {
        const phaseComplete = phase.tasks.every((t) => completedTasks.has(t.id));
        if (!phaseComplete) {
          initialOpen.add(phase.id);
          break;
        }
      }
      // If all complete, open the last phase
      if (initialOpen.size === 0) {
        initialOpen.add(CHECKLIST_PHASES[CHECKLIST_PHASES.length - 1].id);
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
              <CardTitle className="text-base">Home Buying Checklist</CardTitle>
              <CardDescription className="text-xs">
                Track your progress through the home buying journey
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
        {CHECKLIST_PHASES.map((phase) => {
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
