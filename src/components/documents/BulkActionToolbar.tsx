import { useState } from "react";
import { Trash2, FolderPlus, RefreshCw, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BulkOperationProgress } from "@/hooks/useBulkDocumentOperations";
import type { ProjectWithCount } from "@/hooks/useDocumentProjects";

interface BulkActionToolbarProps {
  selectedCount: number;
  selectedDocumentIds: string[];
  indexedCount: number;
  onClearSelection: () => void;
  onBulkDelete: (documentIds: string[]) => Promise<void>;
  onBulkMoveToProject: (documentIds: string[], projectId: string) => Promise<void>;
  onBulkReindex: (documentIds: string[]) => Promise<void>;
  progress: BulkOperationProgress | null;
  isProcessing: boolean;
  projects: ProjectWithCount[];
  onCreateProject: () => void;
}

export function BulkActionToolbar({
  selectedCount,
  selectedDocumentIds,
  indexedCount,
  onClearSelection,
  onBulkDelete,
  onBulkMoveToProject,
  onBulkReindex,
  progress,
  isProcessing,
  projects,
  onCreateProject,
}: BulkActionToolbarProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [reindexDialogOpen, setReindexDialogOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  const handleDelete = async () => {
    await onBulkDelete(selectedDocumentIds);
    setDeleteDialogOpen(false);
    onClearSelection();
  };

  const handleMoveToProject = async () => {
    if (!selectedProjectId) return;
    await onBulkMoveToProject(selectedDocumentIds, selectedProjectId);
    setMoveDialogOpen(false);
    setSelectedProjectId("");
    onClearSelection();
  };

  const handleReindex = async () => {
    await onBulkReindex(selectedDocumentIds);
    setReindexDialogOpen(false);
    onClearSelection();
  };

  if (selectedCount === 0) return null;

  // Show progress when processing
  if (progress && progress.status === 'processing') {
    const progressPercent = progress.total > 0
      ? Math.round(((progress.completed + progress.failed) / progress.total) * 100)
      : 0;

    const operationLabel = {
      delete: 'Deleting',
      move: 'Moving',
      reindex: 'Re-indexing',
    }[progress.operation];

    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-background border rounded-lg shadow-lg p-4 min-w-[300px] max-w-[400px]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">
            {operationLabel} {progress.completed + progress.failed} of {progress.total}...
          </span>
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
        <Progress value={progressPercent} className="h-2" />
        {progress.failed > 0 && (
          <p className="text-xs text-destructive mt-1">
            {progress.failed} failed
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-background border rounded-lg shadow-lg p-3 flex items-center gap-3">
        <div className="flex items-center gap-2 pr-3 border-r">
          <span className="text-sm font-medium">
            {selectedCount} selected
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClearSelection}
            aria-label="Clear selection"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMoveDialogOpen(true)}
            disabled={isProcessing}
          >
            <FolderPlus className="h-4 w-4 mr-2" />
            Move to Project
          </Button>

          {indexedCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReindexDialogOpen(true)}
              disabled={isProcessing}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Re-index ({indexedCount})
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={isProcessing}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} Document{selectedCount !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected documents
              and remove them from AI search if they are indexed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Move to Project Dialog */}
      <AlertDialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move {selectedCount} Document{selectedCount !== 1 ? 's' : ''} to Project</AlertDialogTitle>
            <AlertDialogDescription>
              Select a project to move the selected documents to. This will remove them from any current project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    No projects yet.{" "}
                    <button
                      className="text-primary hover:underline"
                      onClick={() => {
                        setMoveDialogOpen(false);
                        onCreateProject();
                      }}
                    >
                      Create one
                    </button>
                  </div>
                ) : (
                  projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name} ({project.documentCount} docs)
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMoveToProject}
              disabled={isProcessing || !selectedProjectId}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Moving...
                </>
              ) : (
                "Move"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Re-index Confirmation Dialog */}
      <AlertDialog open={reindexDialogOpen} onOpenChange={setReindexDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Re-index {indexedCount} Document{indexedCount !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will re-process the selected indexed documents for AI search.
              This may take a few minutes depending on the document sizes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReindex}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Re-indexing...
                </>
              ) : (
                "Re-index"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
