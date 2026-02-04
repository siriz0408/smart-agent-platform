import { Link, useLocation } from "react-router-dom";
import {
  Home,
  MessageSquare,
  Users2,
  Users,
  Briefcase,
  Building2,
  FileText,
  Settings,
  Shield,
  Heart,
  Compass,
  Calculator,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/contexts/RoleContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface NavItem {
  icon: LucideIcon;
  label: string;
  href: string;
}

/**
 * Glean-inspired narrow icon sidebar (72px)
 * - Purple background (#6B5CE7)
 * - Icon + label stacked vertically
 * - Active state with white/20 background
 * - Role-based navigation items
 * - Desktop only (hidden on mobile)
 */
export function GleanSidebar() {
  const { user } = useAuth();
  const { activeRole, availableRoles } = useRole();
  const location = useLocation();
  const navigate = useNavigate();

  // Role-based navigation items
  const getNavItems = (): NavItem[] => {
    const baseItems: NavItem[] = [
      { icon: Home, label: 'Home', href: '/' },
      { icon: MessageSquare, label: 'Chat', href: '/chat' },
      { icon: Calculator, label: 'Tools', href: '/tools' },
    ];

    const roleSpecificItems: Record<string, NavItem[]> = {
      super_admin: [
        ...baseItems,
        { icon: Users2, label: 'Agents', href: '/agents' },
        { icon: Users, label: 'Contacts', href: '/contacts' },
        { icon: Briefcase, label: 'Pipeline', href: '/pipeline/buyers' },
        { icon: Building2, label: 'Properties', href: '/properties' },
        { icon: FileText, label: 'Documents', href: '/documents' },
        { icon: MessageSquare, label: 'Messages', href: '/messages' },
      ],
      admin: [
        ...baseItems,
        { icon: Users2, label: 'Agents', href: '/agents' },
        { icon: Users, label: 'Contacts', href: '/contacts' },
        { icon: Briefcase, label: 'Pipeline', href: '/pipeline/buyers' },
        { icon: Building2, label: 'Properties', href: '/properties' },
        { icon: FileText, label: 'Documents', href: '/documents' },
        { icon: MessageSquare, label: 'Messages', href: '/messages' },
      ],
      agent: [
        ...baseItems,
        { icon: Users2, label: 'Agents', href: '/agents' },
        { icon: Users, label: 'Contacts', href: '/contacts' },
        { icon: Briefcase, label: 'Pipeline', href: '/pipeline/buyers' },
        { icon: Building2, label: 'Properties', href: '/properties' },
        { icon: FileText, label: 'Documents', href: '/documents' },
        { icon: MessageSquare, label: 'Messages', href: '/messages' },
      ],
      buyer: [
        { icon: Home, label: 'Home', href: '/' },
        { icon: MessageSquare, label: 'Chat', href: '/chat' },
        { icon: Calculator, label: 'Tools', href: '/tools' },
        { icon: Building2, label: 'Search', href: '/properties/search' },
        { icon: Heart, label: 'Saved', href: '/properties/saved' },
        { icon: Compass, label: 'Journey', href: '/my-journey' },
        { icon: FileText, label: 'Documents', href: '/documents' },
        { icon: MessageSquare, label: 'Messages', href: '/messages' },
      ],
      seller: [
        { icon: Home, label: 'Home', href: '/' },
        { icon: MessageSquare, label: 'Chat', href: '/chat' },
        { icon: Calculator, label: 'Tools', href: '/tools' },
        { icon: Building2, label: 'My Listing', href: '/my-listing' },
        { icon: Compass, label: 'Journey', href: '/my-journey' },
        { icon: FileText, label: 'Documents', href: '/documents' },
        { icon: MessageSquare, label: 'Messages', href: '/messages' },
      ],
    };

    return roleSpecificItems[activeRole] || baseItems;
  };

  const navItems = getNavItems();

  // Bottom navigation items (always shown)
  const bottomItems: NavItem[] = [
    { icon: Settings, label: 'Settings', href: '/settings' },
  ];

  // Add admin link for super_admin and admin roles
  if (activeRole === 'super_admin' || activeRole === 'admin') {
    bottomItems.unshift({ icon: Shield, label: 'Admin', href: '/admin' });
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <aside className="hidden md:flex md:flex-col md:w-[72px] bg-glean-purple text-white h-full">
      {/* Logo */}
      <div className="h-16 flex items-center justify-center flex-shrink-0">
        <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
          <span className="text-xl font-bold">SA</span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.href ||
              (item.href !== '/' && location.pathname.startsWith(item.href));

            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center py-3 gap-1.5",
                    "transition-all duration-200 rounded-lg",
                    "min-h-[64px]", // Touch target compliance
                    isActive
                      ? "bg-white/20 text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <item.icon className="h-6 w-6" />
                  <span className="text-[10px] font-medium text-center leading-tight px-1">
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Navigation */}
      <div className="border-t border-white/10 py-2">
        <ul className="space-y-1 px-2">
          {bottomItems.map((item) => {
            const isActive =
              location.pathname === item.href ||
              location.pathname.startsWith(item.href + '/');

            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center py-2 gap-1",
                    "transition-all duration-200 rounded-lg",
                    "min-h-[56px]",
                    isActive
                      ? "bg-white/20 text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium text-center leading-tight px-1">
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* User Profile */}
      <div className="p-3 border-t border-white/10 flex-shrink-0">
        {/* Role Badge - Always visible */}
        <div className="mb-2 flex justify-center">
          <div className="text-[9px] font-semibold uppercase tracking-wider text-white/60 bg-white/10 px-2 py-0.5 rounded">
            {activeRole.replace('_', ' ')}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-10 w-10 rounded-full overflow-hidden mx-auto hover:ring-2 hover:ring-white/30 transition-all">
              <Avatar className="h-full w-full">
                <AvatarFallback className="bg-white/20 text-white text-sm font-semibold">
                  {user?.email?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="right" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user?.email}</p>
              {availableRoles.length > 1 && (
                <p className="text-xs text-muted-foreground capitalize">
                  {activeRole.replace('_', ' ')}
                </p>
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings/billing')}>
              Billing
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
