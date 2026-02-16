import { format } from "date-fns";
import {
  FileText,
  Calendar,
  Download,
  MessageSquare,
  Trash2,
  Eye,
  Sparkles,
  HardDrive,
  Tag as TagIcon,
  RefreshCw,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useDocumentIndexing } from "@/hooks/useDocumentIndexing";
import type { Tables } from "@/integrations/supabase/types";

type Document = Tables<"documents">;

const categoryColors: Record<string, string> = {
  contract: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  disclosure: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  inspection: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  appraisal: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  title: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "Unknown size";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

interface DocumentDetailsViewProps {
  document: Document;
  onDelete?: () => void;
}

export function DocumentDetailsView({ document, onDelete }: DocumentDetailsViewProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { indexDocument, isIndexing, getProgress } = useDocumentIndexing();

  // Get indexing progress for this document
  const progress = getProgress(document.id);
  const isReindexing = progress && (progress.status === 'starting' || progress.status === 'processing');
  const reindexFailed = progress?.status === 'failed';
  const reindexCompleted = progress?.status === 'completed';

  const handleReindex = () => {
    indexDocument(document.id);
  };

  // Fetch AI summary if available
  const { data: summary } = useQuery({
    queryKey: ["document-summary", document.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_metadata")
        .select("summary")
        .eq("document_id", document.id)
        .single();

      if (error && error.code !== "PGRST116") {
        // Ignore "not found" errors
        logger.error("Failed to fetch document summary:", error);
      }

      return data?.summary || null;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("delete-document", {
        body: { documentId: document.id },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Document deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      onDelete?.();
    },
    onError: (error) => {
      logger.error("Failed to delete document:", error);
      toast.error("Failed to delete document");
    },
  });

  const handleDownload = async () => {
    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .download(document.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = document.name;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Document downloaded");
    } catch (error) {
      logger.error("Failed to download document:", error);
      toast.error("Failed to download document");
    }
  };

  const handleChatWithDocument = () => {
    navigate(`/documents/chat?documentId=${document.id}`);
  };

  const isPDF = document.file_type === "application/pdf";

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4 flex-1">
              <div className="p-3 bg-primary/10 rounded-lg">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold mb-2">{document.name}</h1>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    className={categoryColors[document.category || "other"]}
                    variant="secondary"
                  >
                    {(document.category || "other").charAt(0).toUpperCase() +
                      (document.category || "other").slice(1)}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {document.file_type || "Unknown type"}
                  </span>
                  <span className="text-sm text-muted-foreground">•</span>
                  <span className="text-sm text-muted-foreground">
                    {formatFileSize(document.file_size)}
                  </span>
                  {document.indexed_at && (
                    <>
                      <span className="text-sm text-muted-foreground">•</span>
                      <Badge variant="outline" className="text-xs">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Indexed
                      </Badge>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReindex}
                disabled={isIndexing}
              >
                {isReindexing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Re-indexing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Re-index
                  </>
                )}
              </Button>
              <Button variant="default" size="sm" onClick={handleChatWithDocument}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Chat with AI
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Re-indexing Progress Card */}
      {(isReindexing || reindexFailed || reindexCompleted) && (
        <Card className={reindexFailed ? "border-destructive/50" : reindexCompleted ? "border-green-500/50" : ""}>
          <CardHeader className="pb-2">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              {reindexFailed ? (
                <>
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  Re-indexing Failed
                </>
              ) : reindexCompleted ? (
                <>
                  <Sparkles className="h-4 w-4 text-green-600" />
                  Re-indexing Complete
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Re-indexing Document
                </>
              )}
            </h3>
          </CardHeader>
          <CardContent>
            {isReindexing && progress && (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Progress value={progress.progress} className="flex-1" />
                  <span className="text-sm text-muted-foreground w-12 text-right">
                    {Math.round(progress.progress)}%
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {progress.status === 'starting'
                    ? 'Preparing document for indexing...'
                    : `Processing batch ${progress.currentBatch} of ${progress.totalBatches} (${progress.chunksIndexed} chunks indexed)`
                  }
                </p>
              </div>
            )}
            {reindexFailed && progress && (
              <div className="space-y-3">
                <p className="text-sm text-destructive">
                  {progress.error || 'An error occurred while re-indexing the document.'}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReindex}
                  disabled={isIndexing}
                  className="border-destructive/50 text-destructive hover:bg-destructive/10"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            )}
            {reindexCompleted && (
              <p className="text-sm text-green-600 dark:text-green-400">
                Document has been successfully re-indexed with the latest processing improvements.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Summary Card */}
      {summary && (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI Summary
            </h3>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{summary}</p>
          </CardContent>
        </Card>
      )}

      {/* PDF Viewer Card */}
      {isPDF && (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Document Preview
            </h3>
          </CardHeader>
          <CardContent className="p-0">
            <div className="aspect-[8.5/11] w-full bg-muted">
              <iframe
                src={`${supabase.storage.from("documents").getPublicUrl(document.file_path).data.publicUrl}#view=FitH`}
                className="w-full h-full"
                title={document.name}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* File Information Card */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            File Information
          </h3>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="text-sm font-medium">Filename</div>
              <div className="text-sm text-muted-foreground">{document.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="text-sm font-medium">File Size</div>
              <div className="text-sm text-muted-foreground">
                {formatFileSize(document.file_size)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <TagIcon className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="text-sm font-medium">Category</div>
              <div className="text-sm text-muted-foreground">
                {(document.category || "other").charAt(0).toUpperCase() +
                  (document.category || "other").slice(1)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metadata Card */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Metadata
          </h3>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <span className="font-medium">Uploaded:</span>{" "}
              {format(new Date(document.created_at), "MMM d, yyyy 'at' h:mm a")}
            </div>
          </div>
          {document.indexed_at && (
            <div className="flex items-center gap-3 text-sm">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              <div>
                <span className="font-medium">Indexed:</span>{" "}
                {format(new Date(document.indexed_at), "MMM d, yyyy 'at' h:mm a")}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Section */}
      <Card className="border-destructive/50">
        <CardHeader>
          <h3 className="text-sm font-medium text-destructive uppercase tracking-wide">
            Danger Zone
          </h3>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Delete this document</p>
              <p className="text-sm text-muted-foreground">
                Once you delete a document, there is no going back. Please be certain.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Document</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete {document.name}? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMutation.mutate()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleteMutation.isPending ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
