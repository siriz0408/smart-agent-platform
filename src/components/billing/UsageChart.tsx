import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useUsageHistory, type UsageMonth } from "@/hooks/useUsageHistory";

interface UsageChartProps {
  planLimit?: number;
}

export function UsageChart({ planLimit }: UsageChartProps) {
  const [metric, setMetric] = useState<"aiQueries" | "documents">("aiQueries");
  const { history, isLoading, error } = useUsageHistory();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Usage Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Usage Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Failed to load usage history
          </div>
        </CardContent>
      </Card>
    );
  }

  const dataKey = metric;
  const label = metric === "aiQueries" ? "AI Queries" : "Documents";
  const color = metric === "aiQueries" ? "hsl(var(--primary))" : "hsl(var(--chart-2))";

  // Calculate max value for Y axis
  const maxValue = Math.max(
    ...history.map((d: UsageMonth) => d[dataKey]),
    planLimit && metric === "aiQueries" ? planLimit : 0
  );
  const yAxisMax = Math.ceil(maxValue * 1.2) || 10;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Usage Trends
          </CardTitle>
          <Tabs value={metric} onValueChange={(v) => setMetric(v as typeof metric)}>
            <TabsList className="h-8">
              <TabsTrigger value="aiQueries" className="text-xs px-3">
                AI Queries
              </TabsTrigger>
              <TabsTrigger value="documents" className="text-xs px-3">
                Documents
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={history}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="monthLabel"
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                domain={[0, yAxisMax]}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-sm">
                        <div className="text-sm font-medium">{label}</div>
                        <div className="text-sm text-muted-foreground">
                          {payload[0].value} {dataKey === "aiQueries" ? "queries" : "uploads"}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {planLimit && metric === "aiQueries" && planLimit !== -1 && (
                <ReferenceLine
                  y={planLimit}
                  stroke="hsl(var(--destructive))"
                  strokeDasharray="5 5"
                  label={{
                    value: "Plan Limit",
                    position: "insideTopRight",
                    fill: "hsl(var(--destructive))",
                    fontSize: 11,
                  }}
                />
              )}
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorUsage)"
                name={label}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
