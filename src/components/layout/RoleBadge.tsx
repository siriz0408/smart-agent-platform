import { useRole } from "@/contexts/RoleContext";
import { Badge } from "@/components/ui/badge";
import { UserCheck, Users, User, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const roleConfig: Record<AppRole, { label: string; icon: React.ElementType; color: string }> = {
  super_admin: { label: "Super Admin", icon: UserCheck, color: "bg-purple-600" },
  admin: { label: "Admin", icon: UserCheck, color: "bg-purple-500" },
  agent: { label: "Agent", icon: Users, color: "bg-blue-600" },
  buyer: { label: "Buyer", icon: User, color: "bg-green-600" },
  seller: { label: "Seller", icon: Building2, color: "bg-orange-600" },
};

interface RoleBadgeProps {
  variant?: "full" | "compact";
  className?: string;
}

/**
 * Role indicator badge component
 * - Shows current user role with color-coded badge
 * - Full variant: Icon + Label
 * - Compact variant: Icon only
 * - Always visible (unlike RoleSwitcher which hides for single-role users)
 */
export function RoleBadge({ variant = "full", className }: RoleBadgeProps) {
  const { activeRole } = useRole();
  const config = roleConfig[activeRole];
  const Icon = config.icon;

  if (variant === "compact") {
    return (
      <Badge className={cn("gap-1.5", config.color, "text-white border-0", className)}>
        <Icon className="h-3 w-3" />
      </Badge>
    );
  }

  return (
    <Badge className={cn("gap-1.5", config.color, "text-white border-0", className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
