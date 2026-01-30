import { useState } from "react";
import { FolderOpen, FolderPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDocumentProjects } from "@/hooks/useDocumentProjects";

interface AddToProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentName: string;
  currentProjectId: string | null;
  onCreateProject: () => void;
}

export function AddToProjectDialog({
  open,
  onOpenChange,
  documentId,
  documentName,
  currentProjectId,
  onCreateProject,
}: AddToProjectDialogProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    currentProjectId
  );
  const { projects, isLoading, addToProject, removeFromProject } = useDocumentProjects();

  const handleSubmit = async () => {
    if (selectedProjectId === currentProjectId) {
      onOpenChange(false);
      return;
    }

    if (selectedProjectId === null) {
      // Remove from current project
      await removeFromProject.mutateAsync(documentId);
    } else {
      // Add to new project
      await addToProject.mutateAsync({
        documentId,
        projectId: selectedProjectId,
      });
    }

    onOpenChange(false);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedProjectId(currentProjectId);
    }
    onOpenChange(isOpen);
  };

  const isPending = addToProject.isPending || removeFromProject.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move to Project</DialogTitle>
          <DialogDescription>
            Choose a project for "{documentName}"
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-4">No projects yet</p>
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  onCreateProject();
                }}
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            </div>
          ) : (
            <RadioGroup
              value={selectedProjectId || "none"}
              onValueChange={(value) =>
                setSelectedProjectId(value === "none" ? null : value)
              }
            >
              <div className="space-y-2">
                {/* No project option */}
                <div className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted">
                  <RadioGroupItem value="none" id="project-none" />
                  <Label
                    htmlFor="project-none"
                    className="flex-1 cursor-pointer text-muted-foreground"
                  >
                    No project (All Documents)
                  </Label>
                </div>

                {/* Project options */}
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted"
                  >
                    <RadioGroupItem value={project.id} id={`project-${project.id}`} />
                    <Label
                      htmlFor={`project-${project.id}`}
                      className="flex-1 cursor-pointer flex items-center gap-2"
                    >
                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                      {project.name}
                      <span className="text-xs text-muted-foreground">
                        ({project.documentCount} docs)
                      </span>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || projects.length === 0}
          >
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
