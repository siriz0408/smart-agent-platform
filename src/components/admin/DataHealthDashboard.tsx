import { 
  useDataHealthMetrics, 
  formatHealthPercent,
  formatTimestamp
} from "@/hooks/useDataHealthMetrics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  FileText, 
  Users, 
  Home, 
  Briefcase, 
  Database, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Clock,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";

export function DataHealthDashboard() {
  const { data: metrics, isLoading } = useDataHealthMetrics();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">...</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No data available. Please ensure you are authenticated.
      </div>
    );
  }

  const indexingHealth = formatHealthPercent(metrics.indexing_success_rate);
  const embeddingHealth = formatHealthPercent(metrics.embedding_coverage_rate);

  return (
    <div className="space-y-6">
      {/* Entity Count Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4">CRM Entity Counts</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Documents */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.total_documents.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.indexed_documents.toLocaleString()} indexed
              </p>
            </CardContent>
          </Card>

          {/* Contacts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contacts</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.total_contacts.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Total contacts</p>
            </CardContent>
          </Card>

          {/* Properties */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Properties</CardTitle>
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.total_properties.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Total properties</p>
            </CardContent>
          </Card>

          {/* Deals */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Deals</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.total_deals.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Total deals</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Document Indexing Health */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Document Indexing Health</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Indexing Success Rate */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Indexing Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-bold",
                indexingHealth.status === "good" && "text-green-600",
                indexingHealth.status === "warning" && "text-yellow-600",
                indexingHealth.status === "critical" && "text-red-600"
              )}>
                {indexingHealth.value}
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics.indexed_documents} of {metrics.total_documents} documents indexed
              </p>
              <div className="mt-2 flex items-center gap-1">
                {indexingHealth.status === "good" ? (
                  <>
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span className="text-xs text-green-500">Healthy (≥90%)</span>
                  </>
                ) : indexingHealth.status === "warning" ? (
                  <>
                    <AlertTriangle className="h-3 w-3 text-yellow-500" />
                    <span className="text-xs text-yellow-500">Needs attention (≥70%)</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3 text-red-500" />
                    <span className="text-xs text-red-500">Critical (&lt;70%)</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Embedding Coverage */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Embedding Coverage</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-bold",
                embeddingHealth.status === "good" && "text-green-600",
                embeddingHealth.status === "warning" && "text-yellow-600",
                embeddingHealth.status === "critical" && "text-red-600"
              )}>
                {embeddingHealth.value}
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics.documents_with_embeddings} documents with embeddings
              </p>
              <div className="mt-2 flex items-center gap-1">
                {embeddingHealth.status === "good" ? (
                  <>
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span className="text-xs text-green-500">Healthy (≥90%)</span>
                  </>
                ) : embeddingHealth.status === "warning" ? (
                  <>
                    <AlertTriangle className="h-3 w-3 text-yellow-500" />
                    <span className="text-xs text-yellow-500">Needs attention (≥70%)</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3 text-red-500" />
                    <span className="text-xs text-red-500">Critical (&lt;70%)</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Total Chunks */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Document Chunks</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.total_chunks.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.chunks_with_embeddings.toLocaleString()} with embeddings
              </p>
            </CardContent>
          </Card>

          {/* Last Indexing */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Indexing</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatTimestamp(metrics.last_indexing_timestamp)}
              </div>
              <p className="text-xs text-muted-foreground">
                Most recent document indexed
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Data Freshness */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Data Freshness</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Documents Freshness */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="text-sm">
                  <span className="text-muted-foreground">Newest: </span>
                  <span className="font-medium">
                    {formatTimestamp(metrics.newest_document_created_at)}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Oldest: </span>
                  <span className="font-medium">
                    {formatTimestamp(metrics.oldest_document_created_at)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contacts Freshness */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contacts</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="text-sm">
                  <span className="text-muted-foreground">Newest: </span>
                  <span className="font-medium">
                    {formatTimestamp(metrics.newest_contact_created_at)}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Oldest: </span>
                  <span className="font-medium">
                    {formatTimestamp(metrics.oldest_contact_created_at)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Properties Freshness */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Properties</CardTitle>
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="text-sm">
                  <span className="text-muted-foreground">Newest: </span>
                  <span className="font-medium">
                    {formatTimestamp(metrics.newest_property_created_at)}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Oldest: </span>
                  <span className="font-medium">
                    {formatTimestamp(metrics.oldest_property_created_at)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Deals Freshness */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Deals</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="text-sm">
                  <span className="text-muted-foreground">Newest: </span>
                  <span className="font-medium">
                    {formatTimestamp(metrics.newest_deal_created_at)}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Oldest: </span>
                  <span className="font-medium">
                    {formatTimestamp(metrics.oldest_deal_created_at)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
