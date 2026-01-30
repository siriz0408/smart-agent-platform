import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface DocumentProject {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithCount extends DocumentProject {
  documentCount: number;
}

export function useDocumentProjects() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all document projects for the tenant
  const projectsQuery = useQuery({
    queryKey: ["document-projects", profile?.tenant_id],
    queryFn: async (): Promise<ProjectWithCount[]> => {
      if (!profile?.tenant_id) return [];

      // Fetch projects
      const { data: projects, error } = await supabase
        .from("document_projects")
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch document counts for each project
      const projectsWithCounts = await Promise.all(
        (projects || []).map(async (project) => {
          const { count } = await supabase
            .from("document_project_members")
            .select("*", { count: "exact", head: true })
            .eq("project_id", project.id);

          return {
            ...project,
            documentCount: count || 0,
          };
        })
      );

      return projectsWithCounts;
    },
    enabled: !!profile?.tenant_id,
  });

  // Create a new project
  const createProject = useMutation({
    mutationFn: async (params: { name: string; description?: string }) => {
      if (!profile?.tenant_id || !user?.id) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase
        .from("document_projects")
        .insert({
          tenant_id: profile.tenant_id,
          name: params.name,
          description: params.description || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-projects"] });
      toast({
        title: "Project Created",
        description: "Your document project has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create project.",
        variant: "destructive",
      });
    },
  });

  // Delete a project
  const deleteProject = useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase
        .from("document_projects")
        .delete()
        .eq("id", projectId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-projects"] });
      toast({
        title: "Project Deleted",
        description: "The project has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete project.",
        variant: "destructive",
      });
    },
  });

  // Update a project
  const updateProject = useMutation({
    mutationFn: async (params: { id: string; name: string; description?: string }) => {
      const { data, error } = await supabase
        .from("document_projects")
        .update({
          name: params.name,
          description: params.description || null,
        })
        .eq("id", params.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-projects"] });
      toast({
        title: "Project Updated",
        description: "The project has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update project.",
        variant: "destructive",
      });
    },
  });

  // Add a document to a project
  const addToProject = useMutation({
    mutationFn: async (params: { documentId: string; projectId: string }) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("document_project_members")
        .insert({
          project_id: params.projectId,
          document_id: params.documentId,
          added_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-projects"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast({
        title: "Document Added",
        description: "The document has been added to the project.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add document to project.",
        variant: "destructive",
      });
    },
  });

  // Remove a document from a project
  const removeFromProject = useMutation({
    mutationFn: async (documentId: string) => {
      const { error } = await supabase
        .from("document_project_members")
        .delete()
        .eq("document_id", documentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-projects"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast({
        title: "Document Removed",
        description: "The document has been removed from the project.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove document from project.",
        variant: "destructive",
      });
    },
  });

  return {
    projects: projectsQuery.data || [],
    isLoading: projectsQuery.isLoading,
    error: projectsQuery.error,
    createProject,
    deleteProject,
    updateProject,
    addToProject,
    removeFromProject,
    refetch: projectsQuery.refetch,
  };
}
