import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Filter, FileText, Upload, MoreHorizontal, Download, Eye, FolderOpen, Loader2, Sparkles, CheckCircle2, Trash2, FolderPlus } from "lucide-react";
import { UploadDocumentDialog } from "@/components/documents/UploadDocumentDialog";
import { ProjectSidebar } from "@/components/documents/ProjectSidebar";
import { CreateProjectDialog } from "@/components/documents/CreateProjectDialog";
import { AddToProjectDialog } from "@/components/documents/AddToProjectDialog";
import { useQuery } from "@tanstack/react-query";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useDocumentProjects } from "@/hooks/useDocumentProjects";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useDocumentIndexing } from "@/hooks/useDocumentIndexing";
import { useDocumentDelete } from "@/hooks/useDocumentDelete";
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
  if (!bytes) return "-";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function Documents() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [moveDocumentOpen, setMoveDocumentOpen] = useState(false);
  const [documentToMove, setDocumentToMove] = useState<Document | null>(null);

  const { indexDocument, isIndexing, getProgress } = useDocumentIndexing();
  const deleteDocument = useDocumentDelete();
  const { projects } = useDocumentProjects();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["documents", activeProjectId],
    queryFn: async () => {
      if (activeProjectId === null) {
        // Show all documents
        const { data, error } = await supabase
          .from("documents")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        return data as Document[];
      } else {
        // Filter by project - get documents that are members of this project
        const { data: members, error: membersError } = await supabase
          .from("document_project_members")
          .select("document_id")
          .eq("project_id", activeProjectId);

        if (membersError) throw membersError;

        const documentIds = members.map((m) => m.document_id);

        if (documentIds.length === 0) {
          return [];
        }

        // Fetch the actual documents
        const { data, error } = await supabase
          .from("documents")
          .select("*")
          .in("id", documentIds)
          .order("created_at", { ascending: false });

        if (error) throw error;
        return data as Document[];
      }
    },
  });

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || doc.category === selectedCategory;
    // Project filtering is now handled in the query itself
    return matchesSearch && matchesCategory;
  });

  // Get project name for display
  const activeProject = activeProjectId
    ? projects.find((p) => p.id === activeProjectId)
    : null;

  const handleMoveToProject = (doc: Document, e: React.MouseEvent) => {
    e.stopPropagation();
    setDocumentToMove(doc);
    setMoveDocumentOpen(true);
  };

  const totalSize = documents.reduce((acc, d) => acc + (d.file_size || 0), 0);
  const indexedCount = documents.filter((d) => d.indexed_at).length;

  const handleChatWithDocuments = () => {
    navigate("/documents/chat");
  };

  const handleAskAboutDocument = (docId: string) => {
    navigate(`/documents/chat?documentId=${docId}`);
  };

  const handleDeleteClick = (doc: Document, e: React.MouseEvent) => {
    e.stopPropagation();
    setDocumentToDelete(doc);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (documentToDelete) {
      deleteDocument.mutate(documentToDelete.id);
    }
    setDeleteDialogOpen(false);
    setDocumentToDelete(null);
  };

  // Render the status cell for a document
  const renderStatusCell = (doc: Document) => {
    const progress = getProgress(doc.id);
    
    // If actively indexing, show progress
    if (progress && (progress.status === 'starting' || progress.status === 'processing')) {
      return (
        <div className="flex flex-col gap-1 min-w-[120px]">
          <div className="flex items-center gap-2">
            <Progress value={progress.progress} className="h-2 flex-1" />
            <span className="text-xs text-muted-foreground w-8">
              {Math.round(progress.progress)}%
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {progress.status === 'starting' 
              ? 'Preparing...' 
              : `Batch ${progress.currentBatch}/${progress.totalBatches}`
            }
          </span>
        </div>
      );
    }
    
    // If failed, show error with retry
    if (progress?.status === 'failed') {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                indexDocument(doc.id);
              }}
              disabled={isIndexing}
              className="text-destructive border-destructive/50"
            >
              <Loader2 className="h-3 w-3 mr-1" />
              Retry
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{progress.error || 'Indexing failed'}</p>
          </TooltipContent>
        </Tooltip>
      );
    }
    
    // Already indexed
    if (doc.indexed_at) {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Indexed
        </Badge>
      );
    }
    
    // Not indexed yet - show index button
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          indexDocument(doc.id);
        }}
        disabled={isIndexing}
      >
        <Sparkles className="h-3 w-3 mr-1" />
        Index
      </Button>
    );
  };

  return (
    <AppLayout>
      <TooltipProvider>
        <div className="flex h-full">
          {/* Project Sidebar */}
          <ProjectSidebar
            activeProjectId={activeProjectId}
            onProjectSelect={setActiveProjectId}
            onCreateProject={() => setCreateProjectOpen(true)}
            totalDocuments={documents.length}
          />

          {/* Main Content */}
          <div className="flex-1 overflow-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold">
                  {activeProject ? activeProject.name : "All Documents"}
                </h1>
                <p className="text-muted-foreground">
                  {activeProject
                    ? activeProject.description || "No description"
                    : "Manage and search your real estate documents"}
                </p>
              </div>
              <Button onClick={() => setUploadDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </div>

          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                {isLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <div className="text-2xl font-semibold">{documents.length}</div>
                )}
                <div className="text-sm text-muted-foreground">Total Documents</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                {isLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <div className="text-2xl font-semibold">{indexedCount}</div>
                )}
                <div className="text-sm text-muted-foreground">Indexed for AI</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-semibold">{formatFileSize(totalSize)}</div>
                )}
                <div className="text-sm text-muted-foreground">Total Size</div>
              </CardContent>
            </Card>
            <Card 
              className="bg-accent cursor-pointer hover:bg-accent/80 transition-colors"
              onClick={handleChatWithDocuments}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium">Chat with Documents</div>
                  <div className="text-sm text-muted-foreground">
                    {indexedCount > 0 ? `${indexedCount} docs ready` : "Index docs first"}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="icon" aria-label="Filter documents">
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {/* Category Tabs */}
          <Tabs defaultValue="all" onValueChange={setSelectedCategory}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="contract">Contracts</TabsTrigger>
              <TabsTrigger value="disclosure">Disclosures</TabsTrigger>
              <TabsTrigger value="inspection">Inspections</TabsTrigger>
              <TabsTrigger value="appraisal">Appraisals</TabsTrigger>
              <TabsTrigger value="title">Title</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedCategory} className="mt-6">
              {isMobile ? (
                /* Mobile: Card Layout */
                <div className="space-y-4">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <Card key={i} className="overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-12 w-12 rounded-lg" />
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-3 w-2/3" />
                            </div>
                            <Skeleton className="h-11 w-11 rounded-full" />
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : filteredDocuments.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">
                          {searchQuery ? "No documents match your search" : "No documents yet. Upload your first document!"}
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    filteredDocuments.map((doc) => (
                      <Card key={doc.id} className="overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted flex-shrink-0">
                              <FileText className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{doc.name}</p>
                                  <p className="text-sm text-muted-foreground truncate">
                                    {doc.file_type || "Unknown type"}
                                  </p>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-11 w-11 flex-shrink-0" aria-label="Document actions">
                                      <MoreHorizontal className="h-5 w-5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem>
                                      <Eye className="h-4 w-4 mr-2" />
                                      View
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <Download className="h-4 w-4 mr-2" />
                                      Download
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => handleMoveToProject(doc, e)}>
                                      <FolderPlus className="h-4 w-4 mr-2" />
                                      Move to Project
                                    </DropdownMenuItem>
                                    {doc.indexed_at && (
                                      <DropdownMenuItem onClick={() => handleAskAboutDocument(doc.id)}>
                                        <Sparkles className="h-4 w-4 mr-2" />
                                        Ask AI about this
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={(e) => handleDeleteClick(doc, e)}
                                      disabled={deleteDocument.isPending}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap mb-2">
                                <Badge
                                  className={categoryColors[doc.category || "other"]}
                                  variant="secondary"
                                >
                                  {(doc.category || "other").charAt(0).toUpperCase() + (doc.category || "other").slice(1)}
                                </Badge>
                                {renderStatusCell(doc)}
                              </div>
                              {doc.ai_summary && (
                                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                  {doc.ai_summary}
                                </p>
                              )}
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span>{formatFileSize(doc.file_size)}</span>
                                <span>•</span>
                                <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              ) : (
                /* Desktop: Table View */
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Uploaded</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Skeleton className="h-9 w-9 rounded-lg" />
                                <div className="space-y-1">
                                  <Skeleton className="h-4 w-48" />
                                  <Skeleton className="h-3 w-24" />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                          </TableRow>
                        ))
                      ) : filteredDocuments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">
                              {searchQuery ? "No documents match your search" : "No documents yet. Upload your first document!"}
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredDocuments.map((doc) => (
                          <TableRow key={doc.id} className="cursor-pointer hover:bg-muted/50">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                                  <FileText className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium">{doc.name}</div>
                                  {doc.ai_summary ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="text-sm text-muted-foreground truncate max-w-[300px] cursor-help">
                                          {doc.ai_summary}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-sm">
                                        <p>{doc.ai_summary}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : (
                                    <div className="text-sm text-muted-foreground">
                                      {doc.file_type || "Unknown type"}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={categoryColors[doc.category || "other"]}
                                variant="secondary"
                              >
                                {(doc.category || "other").charAt(0).toUpperCase() + (doc.category || "other").slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {renderStatusCell(doc)}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatFileSize(doc.file_size)}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(doc.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Document actions">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Download className="h-4 w-4 mr-2" />
                                    Download
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => handleMoveToProject(doc, e)}>
                                    <FolderPlus className="h-4 w-4 mr-2" />
                                    Move to Project
                                  </DropdownMenuItem>
                                  {doc.indexed_at && (
                                    <DropdownMenuItem onClick={() => handleAskAboutDocument(doc.id)}>
                                      <Sparkles className="h-4 w-4 mr-2" />
                                      Ask AI about this
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={(e) => handleDeleteClick(doc, e)}
                                    disabled={deleteDocument.isPending}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </TabsContent>
            </Tabs>
          </div>
        </div>

        <UploadDocumentDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
        />

        <CreateProjectDialog
          open={createProjectOpen}
          onOpenChange={setCreateProjectOpen}
        />

        {documentToMove && (
          <AddToProjectDialog
            open={moveDocumentOpen}
            onOpenChange={(open) => {
              setMoveDocumentOpen(open);
              if (!open) setDocumentToMove(null);
            }}
            documentId={documentToMove.id}
            documentName={documentToMove.name}
            currentProjectId={null}
            onCreateProject={() => {
              setMoveDocumentOpen(false);
              setCreateProjectOpen(true);
            }}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Document</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{documentToDelete?.name}"?
                {documentToDelete?.indexed_at && (
                  <span className="block mt-2 text-yellow-600 dark:text-yellow-400">
                    This document is indexed for AI search. Deleting it will remove it from search results.
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteDocument.isPending}
              >
                {deleteDocument.isPending ? (
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
      </TooltipProvider>
    </AppLayout>
  );
}
