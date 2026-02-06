import { AppLayout } from "@/components/layout/AppLayout";
import { MessageMetricsDashboard } from "@/components/messages/MessageMetricsDashboard";
import { BarChart3 } from "lucide-react";

export default function MessageMetrics() {
  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Message Metrics</h1>
            <p className="text-muted-foreground">
              Track response times and messaging performance
            </p>
          </div>
        </div>
        <MessageMetricsDashboard />
      </div>
    </AppLayout>
  );
}
