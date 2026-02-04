import { useState } from "react";
import { Plus, Trash2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Condition {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface TriggerConditionBuilderProps {
  triggerType: string;
  conditions: Record<string, unknown>;
  onChange: (conditions: Record<string, unknown>) => void;
}

// Field suggestions based on trigger type
const fieldSuggestions: Record<string, Array<{ field: string; label: string; hint: string }>> = {
  contact_created: [
    { field: "contact_type", label: "Contact Type", hint: "lead, buyer, seller, agent, vendor" },
    { field: "lead_source", label: "Lead Source", hint: "Website, Zillow, Referral, etc." },
    { field: "status", label: "Status", hint: "active, inactive, etc." },
  ],
  contact_updated: [
    { field: "new.contact_type", label: "New Contact Type", hint: "The updated contact type" },
    { field: "old.contact_type", label: "Previous Contact Type", hint: "The previous contact type" },
    { field: "new.status", label: "New Status", hint: "The updated status" },
  ],
  deal_created: [
    { field: "deal_type", label: "Deal Type", hint: "buyer, seller, dual" },
    { field: "stage", label: "Stage", hint: "lead, contacted, showing, offer, etc." },
  ],
  deal_stage_changed: [
    { field: "new.stage", label: "New Stage", hint: "The stage being changed to" },
    { field: "old.stage", label: "Previous Stage", hint: "The stage being changed from" },
    { field: "deal_type", label: "Deal Type", hint: "buyer, seller, dual" },
  ],
  deal_updated: [
    { field: "new.stage", label: "New Stage", hint: "Current deal stage" },
    { field: "deal_type", label: "Deal Type", hint: "buyer, seller, dual" },
  ],
  document_uploaded: [
    { field: "category", label: "Category", hint: "contract, disclosure, inspection, etc." },
    { field: "file_type", label: "File Type", hint: "PDF, DOC, etc." },
  ],
  document_indexed: [
    { field: "category", label: "Category", hint: "Document category" },
  ],
  property_created: [
    { field: "property_type", label: "Property Type", hint: "single_family, condo, townhouse, etc." },
    { field: "status", label: "Status", hint: "active, pending, sold, etc." },
  ],
  property_updated: [
    { field: "new.status", label: "New Status", hint: "The updated property status" },
    { field: "old.status", label: "Previous Status", hint: "The previous property status" },
  ],
};

const operators = [
  { value: "eq", label: "equals" },
  { value: "ne", label: "not equals" },
  { value: "in", label: "is one of" },
  { value: "nin", label: "is not one of" },
  { value: "contains", label: "contains" },
  { value: "exists", label: "exists" },
  { value: "gt", label: "greater than" },
  { value: "gte", label: "greater than or equal" },
  { value: "lt", label: "less than" },
  { value: "lte", label: "less than or equal" },
];

export function TriggerConditionBuilder({
  triggerType,
  conditions,
  onChange,
}: TriggerConditionBuilderProps) {
  // Convert conditions object to array for editing
  const parseConditions = (conds: Record<string, unknown>): Condition[] => {
    const result: Condition[] = [];
    
    for (const [field, value] of Object.entries(conds)) {
      if (typeof value === "object" && value !== null) {
        // Complex condition
        const condObj = value as Record<string, unknown>;
        for (const [op, val] of Object.entries(condObj)) {
          const operator = op.replace("$", "");
          result.push({
            id: crypto.randomUUID(),
            field,
            operator,
            value: Array.isArray(val) ? val.join(", ") : String(val),
          });
        }
      } else {
        // Simple equality
        result.push({
          id: crypto.randomUUID(),
          field,
          operator: "eq",
          value: String(value),
        });
      }
    }
    
    return result;
  };

  const [localConditions, setLocalConditions] = useState<Condition[]>(() =>
    parseConditions(conditions)
  );

  // Convert array back to conditions object
  const buildConditionsObject = (conds: Condition[]): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    
    for (const cond of conds) {
      if (!cond.field || !cond.value) continue;
      
      let value: unknown = cond.value;
      
      // Parse arrays for "in" and "nin" operators
      if (cond.operator === "in" || cond.operator === "nin") {
        value = cond.value.split(",").map((v) => v.trim());
      }
      
      // Parse numbers for comparison operators
      if (["gt", "gte", "lt", "lte"].includes(cond.operator)) {
        const num = parseFloat(cond.value);
        if (!isNaN(num)) value = num;
      }
      
      // Parse boolean for exists
      if (cond.operator === "exists") {
        value = cond.value.toLowerCase() === "true";
      }
      
      if (cond.operator === "eq") {
        result[cond.field] = value;
      } else {
        result[cond.field] = { [`$${cond.operator}`]: value };
      }
    }
    
    return result;
  };

  const addCondition = () => {
    const newConditions = [
      ...localConditions,
      { id: crypto.randomUUID(), field: "", operator: "eq", value: "" },
    ];
    setLocalConditions(newConditions);
    onChange(buildConditionsObject(newConditions));
  };

  const removeCondition = (id: string) => {
    const newConditions = localConditions.filter((c) => c.id !== id);
    setLocalConditions(newConditions);
    onChange(buildConditionsObject(newConditions));
  };

  const updateCondition = (id: string, updates: Partial<Condition>) => {
    const newConditions = localConditions.map((c) =>
      c.id === id ? { ...c, ...updates } : c
    );
    setLocalConditions(newConditions);
    onChange(buildConditionsObject(newConditions));
  };

  const suggestions = fieldSuggestions[triggerType] || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Conditions (Optional)</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs text-sm">
                Add conditions to filter when this trigger should fire.
                Leave empty to trigger on all events of this type.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Field Suggestions */}
      {suggestions.length > 0 && (
        <div className="text-xs text-muted-foreground">
          <span className="font-medium">Available fields:</span>{" "}
          {suggestions.map((s, i) => (
            <span key={s.field}>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="underline decoration-dotted hover:text-foreground"
                      onClick={() => {
                        if (!localConditions.some((c) => c.field === s.field)) {
                          const newConditions = [
                            ...localConditions,
                            { id: crypto.randomUUID(), field: s.field, operator: "eq", value: "" },
                          ];
                          setLocalConditions(newConditions);
                        }
                      }}
                    >
                      {s.field}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{s.hint}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {i < suggestions.length - 1 && ", "}
            </span>
          ))}
        </div>
      )}

      {/* Conditions List */}
      {localConditions.length > 0 && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            {localConditions.map((condition, index) => (
              <div key={condition.id} className="flex items-center gap-2">
                {index > 0 && (
                  <span className="text-xs text-muted-foreground w-8">AND</span>
                )}
                {index === 0 && <span className="w-8" />}
                
                <Input
                  placeholder="Field name"
                  value={condition.field}
                  onChange={(e) =>
                    updateCondition(condition.id, { field: e.target.value })
                  }
                  className="flex-1"
                  list={`field-suggestions-${condition.id}`}
                />
                <datalist id={`field-suggestions-${condition.id}`}>
                  {suggestions.map((s) => (
                    <option key={s.field} value={s.field}>
                      {s.label}
                    </option>
                  ))}
                </datalist>

                <Select
                  value={condition.operator}
                  onValueChange={(value) =>
                    updateCondition(condition.id, { operator: value })
                  }
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {operators.map((op) => (
                      <SelectItem key={op.value} value={op.value}>
                        {op.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  placeholder={
                    condition.operator === "in" || condition.operator === "nin"
                      ? "value1, value2, ..."
                      : condition.operator === "exists"
                      ? "true or false"
                      : "Value"
                  }
                  value={condition.value}
                  onChange={(e) =>
                    updateCondition(condition.id, { value: e.target.value })
                  }
                  className="flex-1"
                />

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCondition(condition.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addCondition}
        className="w-full"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Condition
      </Button>
    </div>
  );
}
