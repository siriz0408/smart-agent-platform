import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Contact = Tables<"contacts">;

const pipelineSchema = z.object({
  deal_type: z.enum(["buy", "sell"]),
  property_id: z.string().optional(),
  estimated_value: z.string().optional(),
});

type PipelineFormData = z.infer<typeof pipelineSchema>;

interface AddToPipelineDialogProps {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddToPipelineDialog({
  contact,
  open,
  onOpenChange,
}: AddToPipelineDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const form = useForm<PipelineFormData>({
    resolver: zodResolver(pipelineSchema),
    defaultValues: {
      deal_type: "buy",
      property_id: "",
      estimated_value: "",
    },
  });

  // Fetch properties for optional linking
  const { data: properties = [] } = useQuery({
    queryKey: ["properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, address, city, state")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createDealMutation = useMutation({
    mutationFn: async (data: PipelineFormData) => {
      if (!contact) throw new Error("No contact selected");

      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id || "")
        .single();

      if (!profile) throw new Error("Profile not found");

      const { error } = await supabase.from("deals").insert({
        tenant_id: profile.tenant_id,
        contact_id: contact.id,
        deal_type: data.deal_type,
        property_id: data.property_id || null,
        estimated_value: data.estimated_value ? parseFloat(data.estimated_value) : null,
        stage: "lead",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deal created successfully");
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      onOpenChange(false);
      form.reset();
      navigate("/pipeline");
    },
    onError: (error) => {
      logger.error("Failed to create deal:", error);
      toast.error("Failed to create deal");
    },
  });

  const onSubmit = (data: PipelineFormData) => {
    createDealMutation.mutate(data);
  };

  if (!contact) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Pipeline</DialogTitle>
          <DialogDescription>
            Create a new deal for {contact.first_name} {contact.last_name}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="deal_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deal Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select deal type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="buy">Buying</SelectItem>
                      <SelectItem value="sell">Selling</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="property_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a property" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">No property</SelectItem>
                      {properties.map((property) => (
                        <SelectItem key={property.id} value={property.id}>
                          {property.address}, {property.city}, {property.state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="estimated_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estimated Value (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="500000"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createDealMutation.isPending}>
                {createDealMutation.isPending ? "Creating..." : "Create Deal"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
