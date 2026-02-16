import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/lib/logger";

// Activity types that can be logged
export type DealActivityType =
  | "created"
  | "stage_changed"
  | "note_added"
  | "milestone_created"
  | "milestone_completed"
  | "document_uploaded"
  | "field_updated";

// Metadata structures for different activity types
export interface StageChangedMetadata {
  previous_stage: string | null;
  new_stage: string;
  previous_stage_label?: string;
  new_stage_label?: string;
}

export interface NoteAddedMetadata {
  note_content: string;
  note_preview?: string;
}

export interface MilestoneMetadata {
  milestone_id: string;
  milestone_title: string;
  due_date?: string | null;
  completed_at?: string | null;
}

export interface DocumentMetadata {
  document_id: string;
  filename: string;
  document_type?: string | null;
  file_size?: number | null;
}

export interface FieldUpdatedMetadata {
  field_name: string;
  old_value: unknown;
  new_value: unknown;
  field_label?: string;
}

export type ActivityMetadata =
  | StageChangedMetadata
  | NoteAddedMetadata
  | MilestoneMetadata
  | DocumentMetadata
  | FieldUpdatedMetadata
  | Record<string, unknown>;

// Main DealActivity type
export interface DealActivity {
  id: string;
  deal_id: string;
  tenant_id: string;
  activity_type: DealActivityType;
  title: string;
  description: string | null;
  metadata: ActivityMetadata;
  created_at: string;
  created_by: string | null;
}

// Input for creating a new activity
export interface CreateDealActivityInput {
  deal_id: string;
  activity_type: DealActivityType;
  title: string;
  description?: string | null;
  metadata?: ActivityMetadata;
}

/**
 * Hook to fetch all activities for a deal
 */
export function useDealActivities(dealId: string | null) {
  return useQuery({
    queryKey: ["deal-activities", dealId],
    queryFn: async (): Promise<DealActivity[]> => {
      if (!dealId) return [];

      const { data, error } = await supabase
        .from("deal_activities")
        .select("*")
        .eq("deal_id", dealId)
        .order("created_at", { ascending: false });

      if (error) {
        logger.error("Failed to fetch deal activities", { error, dealId });
        throw error;
      }

      return (data || []) as DealActivity[];
    },
    enabled: !!dealId,
  });
}

/**
 * Hook to create a new deal activity
 */
export function useCreateDealActivity() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateDealActivityInput) => {
      if (!profile?.tenant_id) {
        throw new Error("Unable to determine tenant");
      }

      const { error } = await supabase.from("deal_activities").insert({
        deal_id: input.deal_id,
        tenant_id: profile.tenant_id,
        activity_type: input.activity_type,
        title: input.title,
        description: input.description || null,
        metadata: input.metadata || {},
        created_by: profile.user_id,
      });

      if (error) {
        logger.error("Failed to create deal activity", { error, input });
        throw error;
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["deal-activities", variables.deal_id],
      });
    },
    onError: (error: Error) => {
      logger.error("Deal activity creation error", { error: error.message });
    },
  });
}

/**
 * Helper to log a stage change activity
 */
export function useLogStageChange() {
  const createActivity = useCreateDealActivity();

  return {
    logStageChange: async (
      dealId: string,
      previousStage: string | null,
      newStage: string,
      previousStageLabel?: string,
      newStageLabel?: string
    ) => {
      const title = previousStage
        ? `Stage changed: ${previousStageLabel || previousStage} to ${newStageLabel || newStage}`
        : `Stage set to ${newStageLabel || newStage}`;

      await createActivity.mutateAsync({
        deal_id: dealId,
        activity_type: "stage_changed",
        title,
        description: null,
        metadata: {
          previous_stage: previousStage,
          new_stage: newStage,
          previous_stage_label: previousStageLabel,
          new_stage_label: newStageLabel,
        } as StageChangedMetadata,
      });
    },
    isPending: createActivity.isPending,
  };
}

/**
 * Helper to log a note added activity
 */
export function useLogNoteAdded() {
  const createActivity = useCreateDealActivity();

  return {
    logNoteAdded: async (dealId: string, noteContent: string) => {
      // Create a preview (first 100 chars)
      const preview =
        noteContent.length > 100
          ? noteContent.substring(0, 100) + "..."
          : noteContent;

      await createActivity.mutateAsync({
        deal_id: dealId,
        activity_type: "note_added",
        title: "Note added",
        description: preview,
        metadata: {
          note_content: noteContent,
          note_preview: preview,
        } as NoteAddedMetadata,
      });
    },
    isPending: createActivity.isPending,
  };
}

/**
 * Helper to log a field update activity
 */
export function useLogFieldUpdate() {
  const createActivity = useCreateDealActivity();

  return {
    logFieldUpdate: async (
      dealId: string,
      fieldName: string,
      oldValue: unknown,
      newValue: unknown,
      fieldLabel?: string
    ) => {
      const label = fieldLabel || fieldName;
      const title = `${label} updated`;

      await createActivity.mutateAsync({
        deal_id: dealId,
        activity_type: "field_updated",
        title,
        description: null,
        metadata: {
          field_name: fieldName,
          field_label: fieldLabel,
          old_value: oldValue,
          new_value: newValue,
        } as FieldUpdatedMetadata,
      });
    },
    isPending: createActivity.isPending,
  };
}
