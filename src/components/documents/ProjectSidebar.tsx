import { FolderOpen, FolderPlus, MoreHorizontal, Pencil, Trash2, Files } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useDocumentProjects, type ProjectWithCount } from "@/hooks/useDocumentProjects";

interface ProjectSidebarProps {
  activeProjectId: string | null;
  onProjectSelect: (projectId: string | null) => void;
  onCreateProject: () => void;
  totalDocuments: number;
}

export function ProjectSidebar({
  activeProjectId,
  onProjectSelect,
  onCreateProject,
  totalDocuments,
}: ProjectSidebarProps) {
  const { projects, isLoading, deleteProject } = useDocumentProjects();

  const handleDelete = (e: React.MouseEvent, project: ProjectWithCount) => {
    e.stopPropagation();
    if (confirm(`Delete project "${project.name}"? Documents will be moved to All Documents.`)) {
      deleteProject.mutate(project.id);
      if (activeProjectId === project.id) {
        onProjectSelect(null);
      }
    }
  };

  return (
    <div className="w-64 border-r border-border bg-muted/30 flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={onCreateProject}
        >
          <FolderPlus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {/* All Documents */}
          <button
            className={cn(
              "flex items-center gap-3 w-full p-2 rounded-md text-left transition-colors",
              activeProjectId === null
                ? "bg-accent text-accent-foreground"
                : "hover:bg-muted"
            )}
            onClick={() => onProjectSelect(null)}
          >
            <Files className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 text-sm font-medium">All Documents</span>
            <Badge variant="secondary" className="text-xs">
              {totalDocuments}
            </Badge>
          </button>

          {/* Loading state */}
          {isLoading && (
            <>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-5 w-8" />
                </div>
              ))}
            </>
          )}

          {/* Projects list */}
          {!isLoading &&
            projects.map((project) => (
              <div
                key={project.id}
                className={cn(
                  "group flex items-center gap-3 w-full p-2 rounded-md transition-colors cursor-pointer",
                  activeProjectId === project.id
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted"
                )}
                onClick={() => onProjectSelect(project.id)}
              >
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 text-sm font-medium truncate">
                  {project.name}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {project.documentCount}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Project actions"
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem disabled>
                      <Pencil className="h-4 w-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={(e) => handleDelete(e, project)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}

          {/* Empty state */}
          {!isLoading && projects.length === 0 && (
            <div className="p-4 text-center text-muted-foreground text-sm">
              <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No projects yet</p>
              <p className="text-xs mt-1">Create a project to organize your documents</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
