import { useState } from "react";
import { FlaskConical, AlertTriangle, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useRole } from "@/contexts/RoleContext";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const ROLE_OPTIONS: { value: AppRole; label: string; description: string }[] = [
  { value: "buyer", label: "Buyer", description: "Property search & journey" },
  { value: "seller", label: "Seller", description: "Listing management" },
  { value: "agent", label: "Agent", description: "Full CRM & pipeline" },
  { value: "admin", label: "Admin", description: "Team management" },
  { value: "super_admin", label: "Super Admin", description: "Platform control" },
];

export function RoleTestingCard() {
  const { activeRole, isOverrideActive, overrideRole, clearOverride, availableRoles } = useRole();
  const [selectedRole, setSelectedRole] = useState<AppRole>(activeRole);

  const handleApply = () => {
    overrideRole(selectedRole);
  };

  return (
    <Card className="border-amber-500/20 bg-amber-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-base">Role Testing Mode</CardTitle>
          </div>
          {isOverrideActive && (
            <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
              Active
            </Badge>
          )}
        </div>
        <CardDescription className="flex items-start gap-2 mt-2">
          <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <span>
            This temporarily changes your UI view to test different user experiences. 
            Your actual database permissions are unchanged.
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-sm font-medium mb-1.5 block">Test as role:</label>
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <span>{option.label}</span>
                      {availableRoles.includes(option.value) && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          Your role
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleApply} className="mt-6">
            Apply
          </Button>
        </div>

        {isOverrideActive && (
          <div className="flex items-center justify-between p-3 rounded-md bg-background border">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Currently viewing as:</span>
              <Badge>{activeRole}</Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={clearOverride} className="text-muted-foreground">
              <X className="h-4 w-4 mr-1" />
              Exit Test Mode
            </Button>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Note: This affects navigation and UI only. Database queries still use your actual permissions.
        </p>
      </CardContent>
    </Card>
  );
}
