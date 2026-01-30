import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  MessageSquare,
  Bot,
  Users,
  FileText,
  Building2,
  Settings,
  ChevronLeft,
  ChevronRight,
  Kanban,
  Shield,
  MessagesSquare,
  Search,
  Heart,
  MapPin,
  Compass,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RoleSwitcher } from "./RoleSwitcher";
import { useRole } from "@/contexts/RoleContext";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: number;
}

// Navigation items per role
const navItemsByRole: Record<AppRole, NavItem[]> = {
  super_admin: [
    { icon: Home, label: "Dashboard", href: "/" },
    { icon: MessageSquare, label: "AI Chat", href: "/chat" },
    { icon: MessagesSquare, label: "Messages", href: "/messages" },
    { icon: Bot, label: "Agents", href: "/agents" },
    { icon: Users, label: "Contacts", href: "/contacts" },
    { icon: Kanban, label: "Pipeline", href: "/pipeline/buyers" },
    { icon: Building2, label: "Properties", href: "/properties" },
    { icon: FileText, label: "Documents", href: "/documents" },
  ],
  admin: [
    { icon: Home, label: "Dashboard", href: "/" },
    { icon: MessageSquare, label: "AI Chat", href: "/chat" },
    { icon: MessagesSquare, label: "Messages", href: "/messages" },
    { icon: Bot, label: "Agents", href: "/agents" },
    { icon: Users, label: "Contacts", href: "/contacts" },
    { icon: Kanban, label: "Pipeline", href: "/pipeline/buyers" },
    { icon: Building2, label: "Properties", href: "/properties" },
    { icon: FileText, label: "Documents", href: "/documents" },
  ],
  agent: [
    { icon: Home, label: "Dashboard", href: "/" },
    { icon: MessageSquare, label: "AI Chat", href: "/chat" },
    { icon: MessagesSquare, label: "Messages", href: "/messages" },
    { icon: Bot, label: "Agents", href: "/agents" },
    { icon: Users, label: "Contacts", href: "/contacts" },
    { icon: Kanban, label: "Pipeline", href: "/pipeline/buyers" },
    { icon: Building2, label: "Properties", href: "/properties" },
    { icon: FileText, label: "Documents", href: "/documents" },
  ],
  buyer: [
    { icon: Home, label: "Dashboard", href: "/" },
    { icon: MessageSquare, label: "AI Chat", href: "/chat" },
    { icon: Search, label: "Property Search", href: "/properties/search" },
    { icon: Heart, label: "Saved Properties", href: "/properties/saved" },
    { icon: Compass, label: "My Journey", href: "/my-journey" },
    { icon: FileText, label: "Documents", href: "/documents" },
    { icon: MessagesSquare, label: "Messages", href: "/messages" },
  ],
  seller: [
    { icon: Home, label: "Dashboard", href: "/" },
    { icon: MessageSquare, label: "AI Chat", href: "/chat" },
    { icon: MapPin, label: "My Listing", href: "/my-listing" },
    { icon: Compass, label: "My Journey", href: "/my-journey" },
    { icon: FileText, label: "Documents", href: "/documents" },
    { icon: MessagesSquare, label: "Messages", href: "/messages" },
  ],
};

const bottomNavItemsByRole: Record<AppRole, NavItem[]> = {
  super_admin: [
    { icon: Shield, label: "Admin", href: "/admin" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ],
  admin: [
    { icon: Shield, label: "Admin", href: "/admin" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ],
  agent: [
    { icon: Settings, label: "Settings", href: "/settings" },
  ],
  buyer: [
    { icon: Settings, label: "Settings", href: "/settings" },
  ],
  seller: [
    { icon: Settings, label: "Settings", href: "/settings" },
  ],
};

export function AppSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const { activeRole } = useRole();

  const mainNavItems = navItemsByRole[activeRole] || navItemsByRole.agent;
  const bottomNavItems = bottomNavItemsByRole[activeRole] || bottomNavItemsByRole.agent;

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href);
  };

  const NavLink = ({ item }: { item: NavItem }) => {
    const active = isActive(item.href);
    const Icon = item.icon;

    const linkContent = (
      <Link
        to={item.href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          active
            ? "bg-sidebar-accent text-sidebar-primary"
            : "text-sidebar-foreground"
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {!isCollapsed && <span>{item.label}</span>}
        {!isCollapsed && item.badge !== undefined && (
          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
            {item.badge}
          </span>
        )}
      </Link>
    );

    if (isCollapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            {item.label}
            {item.badge !== undefined && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                {item.badge}
              </span>
            )}
          </TooltipContent>
        </Tooltip>
      );
    }

    return linkContent;
  };

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        {!isCollapsed && (
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-sidebar-foreground">
              Smart Agent
            </span>
          </Link>
        )}
        {isCollapsed && (
          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Bot className="h-5 w-5 text-primary-foreground" />
          </div>
        )}
      </div>

      {/* Role Switcher */}
      <RoleSwitcher collapsed={isCollapsed} />

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3 scrollbar-thin">
        {mainNavItems.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      {/* Bottom Navigation */}
      <div className="border-t border-sidebar-border p-3">
        <div className="space-y-1">
          {bottomNavItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>

        {/* Collapse Toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full justify-center text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
