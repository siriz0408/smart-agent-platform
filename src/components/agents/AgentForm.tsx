import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Bot, 
  PenLine, 
  FileText, 
  Zap, 
  Sparkles, 
  MessageSquare, 
  Loader2,
  PenTool,
  BarChart2,
  FileSearch,
  Mail,
  Share2,
  Home,
  Users,
  DollarSign,
  Calendar,
  Search,
  Wand2,
  Database
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  data_sources: z.array(z.string()).default([]),
  system_prompt: z.string().max(10000, "System prompt must be 10,000 characters or less").optional(),
});

type AgentFormData = z.infer<typeof agentFormSchema>;

const dataSourceOptions = [
  { value: "property", label: "Properties", description: "Access property listings and details", icon: Home },
  { value: "contact", label: "Contacts", description: "Access contact information and history", icon: Users },
  { value: "document", label: "Documents", description: "Access uploaded documents", icon: FileText },
  { value: "deal", label: "Deals", description: "Access deal/transaction data", icon: DollarSign },
];

const iconOptions = [
  { value: "bot", label: "Bot", icon: Bot },
  { value: "pen-tool", label: "Writing", icon: PenTool },
  { value: "penline", label: "Pen", icon: PenLine },
  { value: "filetext", label: "Documents", icon: FileText },
  { value: "file-search", label: "File Search", icon: FileSearch },
  { value: "bar-chart-2", label: "Analytics", icon: BarChart2 },
  { value: "mail", label: "Email", icon: Mail },
  { value: "share-2", label: "Social", icon: Share2 },
  { value: "zap", label: "Automation", icon: Zap },
  { value: "sparkles", label: "AI", icon: Sparkles },
  { value: "messagesquare", label: "Communication", icon: MessageSquare },
  { value: "home", label: "Property", icon: Home },
  { value: "users", label: "Contacts", icon: Users },
  { value: "dollar-sign", label: "Finance", icon: DollarSign },
  { value: "calendar", label: "Calendar", icon: Calendar },
  { value: "search", label: "Search", icon: Search },
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
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const isEditMode = !!agent;

  const form = useForm<AgentFormData>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: {
      name: agent?.name || "",
      description: agent?.description || "",
      icon: agent?.icon || "bot",
      category: agent?.category || "general",
      data_sources: (agent?.workflow as { data_sources?: string[] } | null)?.data_sources || [],
      system_prompt: agent?.system_prompt || "",
    },
  });

  // Reset form when agent data changes (for edit mode)
  useEffect(() => {
    if (agent) {
      form.reset({
        name: agent.name || "",
        description: agent.description || "",
        icon: agent.icon || "bot",
        category: agent.category || "general",
        data_sources: (agent?.workflow as { data_sources?: string[] } | null)?.data_sources || [],
        system_prompt: agent.system_prompt || "",
      });
    }
  }, [agent, form]);

  const systemPromptValue = form.watch("system_prompt") || "";

  // Generate AI-suggested prompt
  const handleGeneratePrompt = async () => {
    const name = form.getValues("name");
    const description = form.getValues("description");
    const category = form.getValues("category");

    if (!name) {
      toast({
        title: "Name required",
        description: "Please enter an agent name first so AI can generate relevant instructions.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingPrompt(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-agent-prompt`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name, description, category }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to generate prompt");
      }

      const data = await response.json();
      
      if (data.prompt) {
        form.setValue("system_prompt", data.prompt);
        toast({
          title: "Prompt generated",
          description: "AI has suggested a system prompt. Feel free to edit it!",
        });
      }
    } catch (error) {
      console.error("Error generating prompt:", error);
      toast({
        title: "Generation failed",
        description: "Could not generate prompt. Please try again or write your own.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const onSubmit = async (data: AgentFormData) => {
    if (!user?.id || !profile?.tenant_id) {
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
            workflow: { data_sources: data.data_sources || [] },
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
          tenant_id: profile.tenant_id,
          name: data.name,
          description: data.description || null,
          icon: data.icon,
          category: data.category,
          workflow: { data_sources: data.data_sources || [] },
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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

            {/* Data Sources */}
            <FormField
              control={form.control}
              name="data_sources"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <FormLabel>Data Sources</FormLabel>
                  </div>
                  <FormDescription className="mb-3">
                    Select which data the agent can access when running
                  </FormDescription>
                  <div className="grid gap-3 md:grid-cols-2">
                    {dataSourceOptions.map((option) => {
                      const Icon = option.icon;
                      const isChecked = field.value?.includes(option.value);
                      return (
                        <div
                          key={option.value}
                          role="button"
                          tabIndex={0}
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            isChecked ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                          }`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const newValue = isChecked
                              ? field.value.filter((v: string) => v !== option.value)
                              : [...(field.value || []), option.value];
                            field.onChange(newValue);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              const newValue = isChecked
                                ? field.value.filter((v: string) => v !== option.value)
                                : [...(field.value || []), option.value];
                              field.onChange(newValue);
                            }
                          }}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              const newValue = checked
                                ? [...(field.value || []), option.value]
                                : field.value.filter((v: string) => v !== option.value);
                              field.onChange(newValue);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-sm">{option.label}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {option.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* System Prompt */}
            <FormField
              control={form.control}
              name="system_prompt"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>System Prompt</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGeneratePrompt}
                      disabled={isGeneratingPrompt}
                      className="gap-1.5 text-xs h-7"
                    >
                      {isGeneratingPrompt ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Wand2 className="h-3.5 w-3.5" />
                          AI Suggest
                        </>
                      )}
                    </Button>
                  </div>
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
