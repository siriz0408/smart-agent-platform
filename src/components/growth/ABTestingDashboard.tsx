/**
 * GRW-012: A/B Testing Dashboard Component
 *
 * Admin dashboard for viewing and managing onboarding experiments.
 * Shows:
 * - Experiment list with status
 * - Variant performance metrics
 * - Conversion rates by variant
 * - Statistical significance indicators
 */

import { useState } from "react";
import {
  FlaskConical,
  Play,
  Pause,
  CheckCircle2,
  Clock,
  Users,
  TrendingUp,
  BarChart3,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Settings2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useExperiments,
  useExperimentResults,
  useExperimentAdmin,
  type Experiment,
  type ExperimentResult,
} from "@/hooks/useOnboardingExperiment";
import { useToast } from "@/hooks/use-toast";

// Status badge colors
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  running: "bg-green-100 text-green-800",
  paused: "bg-yellow-100 text-yellow-800",
  completed: "bg-blue-100 text-blue-800",
};

const STATUS_ICONS: Record<string, typeof Play> = {
  draft: Settings2,
  running: Play,
  paused: Pause,
  completed: CheckCircle2,
};

// Calculate statistical significance (simplified z-test)
function calculateSignificance(
  controlConversions: number,
  controlTotal: number,
  variantConversions: number,
  variantTotal: number
): { significant: boolean; confidence: number; lift: number } {
  if (controlTotal === 0 || variantTotal === 0) {
    return { significant: false, confidence: 0, lift: 0 };
  }

  const controlRate = controlConversions / controlTotal;
  const variantRate = variantConversions / variantTotal;
  const lift = controlRate > 0 ? ((variantRate - controlRate) / controlRate) * 100 : 0;

  // Pooled proportion
  const pooledP = (controlConversions + variantConversions) / (controlTotal + variantTotal);

  // Standard error
  const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / controlTotal + 1 / variantTotal));

  if (se === 0) {
    return { significant: false, confidence: 0, lift };
  }

  // Z-score
  const z = Math.abs(variantRate - controlRate) / se;

  // Convert z-score to confidence level (approximation)
  let confidence = 0;
  if (z >= 2.576) confidence = 99;
  else if (z >= 1.96) confidence = 95;
  else if (z >= 1.645) confidence = 90;
  else if (z >= 1.28) confidence = 80;
  else confidence = Math.min(Math.round(z * 40), 79);

  return {
    significant: confidence >= 95,
    confidence,
    lift,
  };
}

interface ExperimentCardProps {
  experiment: Experiment;
  onSelect: (id: string) => void;
  isSelected: boolean;
}

function ExperimentCard({ experiment, onSelect, isSelected }: ExperimentCardProps) {
  const StatusIcon = STATUS_ICONS[experiment.status] || Settings2;
  const totalWeight = experiment.variants.reduce((sum, v) => sum + v.weight, 0);

  return (
    <Card
      className={`cursor-pointer transition-all ${
        isSelected ? "ring-2 ring-primary" : "hover:border-primary/50"
      }`}
      onClick={() => onSelect(experiment.id)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary" />
              {experiment.name}
            </CardTitle>
            <CardDescription>{experiment.description}</CardDescription>
          </div>
          <Badge className={STATUS_COLORS[experiment.status]}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {experiment.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Type</p>
            <p className="font-medium capitalize">{experiment.type}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Variants</p>
            <p className="font-medium">{experiment.variants.length}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Traffic</p>
            <p className="font-medium">{experiment.trafficAllocation}%</p>
          </div>
        </div>

        {/* Variant weight visualization */}
        <div className="mt-4 space-y-2">
          <p className="text-xs text-muted-foreground">Variant Distribution</p>
          <div className="flex h-3 rounded-full overflow-hidden">
            {experiment.variants.map((variant, index) => (
              <div
                key={variant.id}
                className={`h-full ${
                  index === 0
                    ? "bg-blue-500"
                    : index === 1
                    ? "bg-green-500"
                    : index === 2
                    ? "bg-purple-500"
                    : "bg-orange-500"
                }`}
                style={{ width: `${(variant.weight / totalWeight) * 100}%` }}
                title={`${variant.name}: ${variant.weight}%`}
              />
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            {experiment.variants.map((variant, index) => (
              <span
                key={variant.id}
                className="text-xs flex items-center gap-1"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    index === 0
                      ? "bg-blue-500"
                      : index === 1
                      ? "bg-green-500"
                      : index === 2
                      ? "bg-purple-500"
                      : "bg-orange-500"
                  }`}
                />
                {variant.name}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ExperimentResultsProps {
  experimentName: string;
  experiment: Experiment | undefined;
}

function ExperimentResultsPanel({ experimentName, experiment }: ExperimentResultsProps) {
  const { data: results, isLoading, refetch } = useExperimentResults(experimentName);
  const { updateStatus, updateTraffic, isUpdating } = useExperimentAdmin();
  const { toast } = useToast();
  const [trafficValue, setTrafficValue] = useState(experiment?.trafficAllocation || 100);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>No results yet</AlertTitle>
        <AlertDescription>
          Results will appear once users have been assigned to the experiment.
        </AlertDescription>
      </Alert>
    );
  }

  // Find control variant for comparison
  const controlResult = results.find((r) => r.variantId === "control");
  const totalAssigned = results.reduce((sum, r) => sum + r.totalAssigned, 0);
  const totalConverted = results.reduce((sum, r) => sum + r.totalConverted, 0);
  const overallConversionRate = totalAssigned > 0 ? (totalConverted / totalAssigned) * 100 : 0;

  // Calculate best performing variant
  const bestVariant = results.reduce((best, current) =>
    current.conversionRate > best.conversionRate ? current : best
  );

  const handleStatusChange = async (newStatus: "running" | "paused" | "completed") => {
    if (!experiment) return;
    try {
      await updateStatus({ experimentId: experiment.id, status: newStatus });
      toast({
        title: "Status updated",
        description: `Experiment is now ${newStatus}`,
      });
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const handleTrafficChange = async () => {
    if (!experiment) return;
    try {
      await updateTraffic({ experimentId: experiment.id, trafficAllocation: trafficValue });
      toast({
        title: "Traffic updated",
        description: `Traffic allocation set to ${trafficValue}%`,
      });
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update traffic",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Total Participants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalAssigned.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Total Conversions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalConverted.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              Overall Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{overallConversionRate.toFixed(1)}%</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-green-600" />
              Best Performing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{bestVariant.variantName}</p>
            <p className="text-sm text-muted-foreground">
              {bestVariant.conversionRate.toFixed(1)}% conversion
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Variant Results Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Variant Performance</CardTitle>
            <CardDescription>
              Conversion rates and statistical significance by variant
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Variant</TableHead>
                <TableHead className="text-right">Assigned</TableHead>
                <TableHead className="text-right">Converted</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">vs Control</TableHead>
                <TableHead className="text-center">Significance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result) => {
                const stats =
                  controlResult && result.variantId !== "control"
                    ? calculateSignificance(
                        controlResult.totalConverted,
                        controlResult.totalAssigned,
                        result.totalConverted,
                        result.totalAssigned
                      )
                    : null;

                return (
                  <TableRow key={result.variantId}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {result.variantId === bestVariant.variantId && (
                          <Badge variant="default" className="text-xs">
                            Best
                          </Badge>
                        )}
                        {result.variantName}
                        {result.variantId === "control" && (
                          <Badge variant="outline" className="text-xs">
                            Control
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {result.totalAssigned.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {result.totalConverted.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {result.conversionRate.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right">
                      {stats ? (
                        <span
                          className={
                            stats.lift > 0
                              ? "text-green-600"
                              : stats.lift < 0
                              ? "text-red-600"
                              : "text-muted-foreground"
                          }
                        >
                          {stats.lift > 0 ? "+" : ""}
                          {stats.lift.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {stats ? (
                        <Badge
                          variant={stats.significant ? "default" : "secondary"}
                          className={stats.significant ? "bg-green-600" : ""}
                        >
                          {stats.confidence}%
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">Baseline</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Legend */}
          <div className="mt-4 text-xs text-muted-foreground">
            <p>
              <strong>Significance:</strong> 95% or higher indicates the result is statistically
              significant (not due to random chance).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Experiment Controls */}
      {experiment && (
        <Card>
          <CardHeader>
            <CardTitle>Experiment Controls</CardTitle>
            <CardDescription>Manage experiment status and traffic allocation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Controls */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Status</p>
              <div className="flex gap-2">
                <Button
                  variant={experiment.status === "running" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleStatusChange("running")}
                  disabled={isUpdating}
                >
                  <Play className="h-4 w-4 mr-1" />
                  Run
                </Button>
                <Button
                  variant={experiment.status === "paused" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleStatusChange("paused")}
                  disabled={isUpdating}
                >
                  <Pause className="h-4 w-4 mr-1" />
                  Pause
                </Button>
                <Button
                  variant={experiment.status === "completed" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleStatusChange("completed")}
                  disabled={isUpdating}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Complete
                </Button>
              </div>
            </div>

            {/* Traffic Allocation */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Traffic Allocation</p>
                <span className="text-sm font-bold">{trafficValue}%</span>
              </div>
              <Slider
                value={[trafficValue]}
                onValueChange={([value]) => setTrafficValue(value)}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>0% (No users)</span>
                <span>100% (All users)</span>
              </div>
              {trafficValue !== experiment.trafficAllocation && (
                <Button
                  onClick={handleTrafficChange}
                  disabled={isUpdating}
                  size="sm"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Traffic Changes"
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function ABTestingDashboard() {
  const { data: experiments, isLoading, error } = useExperiments();
  const [selectedExperimentId, setSelectedExperimentId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error loading experiments</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : "Failed to load experiments"}
        </AlertDescription>
      </Alert>
    );
  }

  if (!experiments || experiments.length === 0) {
    return (
      <Alert>
        <FlaskConical className="h-4 w-4" />
        <AlertTitle>No experiments</AlertTitle>
        <AlertDescription>
          No A/B tests have been configured yet. Experiments are created via database migrations.
        </AlertDescription>
      </Alert>
    );
  }

  const selectedExperiment = experiments.find((e) => e.id === selectedExperimentId);
  const activeExperiment =
    selectedExperiment || experiments.find((e) => e.status === "running") || experiments[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FlaskConical className="h-6 w-6 text-primary" />
          A/B Testing Dashboard
        </h2>
        <p className="text-sm text-muted-foreground">
          Monitor and manage onboarding experiments
        </p>
      </div>

      <Tabs defaultValue="experiments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="experiments" className="gap-1.5">
            <FlaskConical className="h-4 w-4" />
            Experiments
          </TabsTrigger>
          <TabsTrigger value="results" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            Results
          </TabsTrigger>
        </TabsList>

        <TabsContent value="experiments" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {experiments.map((experiment) => (
              <ExperimentCard
                key={experiment.id}
                experiment={experiment}
                onSelect={setSelectedExperimentId}
                isSelected={experiment.id === selectedExperimentId}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {/* Experiment selector for results */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Viewing results for:</span>
            <select
              className="border rounded px-2 py-1 text-sm"
              value={selectedExperimentId || activeExperiment?.id || ""}
              onChange={(e) => setSelectedExperimentId(e.target.value)}
            >
              {experiments.map((exp) => (
                <option key={exp.id} value={exp.id}>
                  {exp.name} ({exp.status})
                </option>
              ))}
            </select>
          </div>

          <ExperimentResultsPanel
            experimentName={activeExperiment?.name || ""}
            experiment={activeExperiment}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
