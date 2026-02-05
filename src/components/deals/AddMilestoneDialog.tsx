import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const milestoneSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
  due_date: z.date().optional(),
  notes: z.string().max(500, "Notes must be less than 500 characters").optional(),
});

type MilestoneFormValues = z.infer<typeof milestoneSchema>;

interface Milestone {
  id: string;
  deal_id: string;
  title: string;
  due_date: string | null;
  completed_at: string | null;
  notes: string | null;
}

interface AddMilestoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealId: string;
  milestone?: Milestone | null;
}

export function AddMilestoneDialog({
  open,
  onOpenChange,
  dealId,
  milestone,
}: AddMilestoneDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!milestone;

  const form = useForm<MilestoneFormValues>({
    resolver: zodResolver(milestoneSchema),
    defaultValues: {
      title: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (milestone) {
      form.reset({
        title: milestone.title,
        due_date: milestone.due_date ? new Date(milestone.due_date) : undefined,
        notes: milestone.notes || "",
      });
    } else {
      form.reset({
        title: "",
        due_date: undefined,
        notes: "",
      });
    }
  }, [milestone, form]);

  const mutation = useMutation({
    mutationFn: async (values: MilestoneFormValues) => {
      const data = {
        title: values.title.trim(),
        due_date: values.due_date ? format(values.due_date, "yyyy-MM-dd") : null,
        notes: values.notes?.trim() || null,
      };

      if (isEditing && milestone) {
        const { error } = await supabase
          .from("deal_milestones")
          .update(data)
          .eq("id", milestone.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("deal_milestones")
          .insert({ ...data, deal_id: dealId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal-milestones", dealId] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success(isEditing ? "Milestone updated" : "Milestone added", {
        description: isEditing
          ? "The milestone has been updated."
          : "New milestone added to the deal.",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error("Error", { description: error.message || "Something went wrong." });
    },
  });

  const handleSubmit = (values: MilestoneFormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Milestone" : "Add Milestone"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the milestone details."
              : "Add a new milestone to track progress on this deal."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Home Inspection" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="due_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Due Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional details..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? "Save Changes" : "Add Milestone"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
