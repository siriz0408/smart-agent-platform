import { useRole } from "@/contexts/RoleContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Users, Building2, UserCheck } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const roleConfig: Record<AppRole, { label: string; icon: React.ElementType; description: string }> = {
  super_admin: { label: "Super Admin", icon: UserCheck, description: "Full platform access" },
  admin: { label: "Admin", icon: UserCheck, description: "Tenant administration" },
  agent: { label: "Agent", icon: Users, description: "Real estate agent view" },
  buyer: { label: "Buyer", icon: User, description: "Property buyer view" },
  seller: { label: "Seller", icon: Building2, description: "Property seller view" },
};

interface RoleSwitcherProps {
  collapsed?: boolean;
}

export function RoleSwitcher({ collapsed = false }: RoleSwitcherProps) {
  const { activeRole, availableRoles, canSwitchRoles, switchRole } = useRole();

  const currentRoleConfig = roleConfig[activeRole];
  const Icon = currentRoleConfig.icon;

  if (collapsed) {
    return (
      <div className="flex items-center justify-center px-3 py-2">
        <Icon className="h-5 w-5 text-sidebar-foreground" />
      </div>
    );
  }

  // Show read-only badge for single-role users (instead of hiding component)
  if (!canSwitchRoles || availableRoles.length <= 1) {
    return (
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 px-3 py-2 bg-sidebar-accent/50 rounded-md cursor-default">
          <Icon className="h-4 w-4 text-sidebar-foreground" />
          <span className="text-sm font-medium text-sidebar-foreground">{currentRoleConfig.label}</span>
        </div>
      </div>
    );
  }

  // Multi-role: Show interactive switcher dropdown
  return (
    <div className="px-3 py-2">
      <Select value={activeRole} onValueChange={(value) => switchRole(value as AppRole)}>
        <SelectTrigger className="w-full bg-sidebar-accent border-sidebar-border">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          {availableRoles.map((role) => {
            const config = roleConfig[role];
            const RoleIcon = config.icon;
            return (
              <SelectItem key={role} value={role}>
                <div className="flex items-center gap-2">
                  <RoleIcon className="h-4 w-4" />
                  <div className="flex flex-col">
                    <span>{config.label}</span>
                    <span className="text-xs text-muted-foreground">{config.description}</span>
                  </div>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
