import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Bot, PenLine, FileText, Zap, Sparkles, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type AIAgent = Tables<"ai_agents">;

const agentFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  description: z.string().max(500, "Description must be 500 characters or less").optional(),
  icon: z.string().default("bot"),
  category: z.string().default("general"),
  system_prompt: z.string().max(10000, "System prompt must be 10,000 characters or less").optional(),
});

type AgentFormData = z.infer<typeof agentFormSchema>;

const iconOptions = [
  { value: "bot", label: "Bot", icon: Bot },
  { value: "penline", label: "Writing", icon: PenLine },
  { value: "filetext", label: "Documents", icon: FileText },
  { value: "zap", label: "Automation", icon: Zap },
  { value: "sparkles", label: "AI", icon: Sparkles },
  { value: "messagesquare", label: "Communication", icon: MessageSquare },
];

const categoryOptions = [
  { value: "general", label: "General" },
  { value: "marketing", label: "Marketing" },
  { value: "analysis", label: "Analysis" },
  { value: "legal", label: "Legal" },
  { value: "communication", label: "Communication" },
];

interface AgentFormProps {
  agent?: AIAgent;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function AgentForm({ agent, onSuccess, onCancel }: AgentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const isEditMode = !!agent;

  const form = useForm<AgentFormData>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: {
      name: agent?.name || "",
      description: agent?.description || "",
      icon: agent?.icon || "bot",
      category: agent?.category || "general",
      system_prompt: agent?.system_prompt || "",
    },
  });

  const systemPromptValue = form.watch("system_prompt") || "";

  const onSubmit = async (data: AgentFormData) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to save an agent",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditMode && agent) {
        // Update existing agent
        const { error } = await supabase
          .from("ai_agents")
          .update({
            name: data.name,
            description: data.description || null,
            icon: data.icon,
            category: data.category,
            system_prompt: data.system_prompt || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", agent.id);

        if (error) throw error;

        toast({
          title: "Agent updated",
          description: "Your agent has been updated successfully.",
        });
      } else {
        // Create new agent
        const { error } = await supabase.from("ai_agents").insert({
          name: data.name,
          description: data.description || null,
          icon: data.icon,
          category: data.category,
          system_prompt: data.system_prompt || null,
          created_by: user.id,
          is_public: false,
          is_certified: false,
        });

        if (error) throw error;

        toast({
          title: "Agent created",
          description: "Your agent has been created successfully.",
        });
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving agent:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save agent",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{isEditMode ? "Edit Agent" : "Create Agent"}</CardTitle>
            <CardDescription>
              {isEditMode
                ? "Update your agent's configuration and system prompt"
                : "Configure your new AI agent with a name, description, and system prompt"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Listing Writer Pro" {...field} />
                  </FormControl>
                  <FormDescription>A descriptive name for your agent</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what this agent does..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    A brief description of the agent's purpose ({field.value?.length || 0}/500)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Icon and Category Row */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Icon */}
              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an icon" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {iconOptions.map((option) => {
                          const Icon = option.icon;
                          return (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                <span>{option.label}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categoryOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* System Prompt */}
            <FormField
              control={form.control}
              name="system_prompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>System Prompt</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="You are a helpful AI assistant that..."
                      className="min-h-[300px] font-mono text-sm resize-y"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The instructions that define how your agent behaves ({systemPromptValue.length.toLocaleString()}/10,000 characters)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? "Save Changes" : "Create Agent"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
