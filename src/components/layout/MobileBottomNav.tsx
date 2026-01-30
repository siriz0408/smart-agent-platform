import { Link, useLocation } from "react-router-dom";
import {
  MessageSquare,
  Building2,
  Users,
  MoreHorizontal,
  Search,
  Heart,
  Compass,
  Briefcase,
  Calculator,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole } from "@/contexts/RoleContext";

interface TabItem {
  icon: LucideIcon;
  label: string;
  href: string;
}

/**
 * Mobile bottom tab navigation (iOS/Android pattern)
 * - Shows on mobile only (< 768px)
 * - 5 tabs maximum for optimal UX
 * - Role-based tabs
 * - Purple active states (Glean branding)
 * - 56px touch targets
 * - Safe area support for iOS notch
 */
export function MobileBottomNav() {
  const { activeRole } = useRole();
  const location = useLocation();

  // Role-based tab configuration
  const tabs: Record<string, TabItem[]> = {
    // Agent, Admin, Super Admin
    agent: [
      { icon: MessageSquare, label: 'Chat', href: '/chat' },
      { icon: Calculator, label: 'Tools', href: '/tools' },
      { icon: Building2, label: 'Props', href: '/properties' },
      { icon: Users, label: 'People', href: '/contacts' },
      { icon: Briefcase, label: 'Pipeline', href: '/pipeline/buyers' },
    ],
    admin: [
      { icon: MessageSquare, label: 'Chat', href: '/chat' },
      { icon: Calculator, label: 'Tools', href: '/tools' },
      { icon: Building2, label: 'Props', href: '/properties' },
      { icon: Users, label: 'People', href: '/contacts' },
      { icon: MoreHorizontal, label: 'More', href: '/settings' },
    ],
    super_admin: [
      { icon: MessageSquare, label: 'Chat', href: '/chat' },
      { icon: Calculator, label: 'Tools', href: '/tools' },
      { icon: Building2, label: 'Props', href: '/properties' },
      { icon: Users, label: 'People', href: '/contacts' },
      { icon: MoreHorizontal, label: 'More', href: '/admin' },
    ],
    // Buyer
    buyer: [
      { icon: MessageSquare, label: 'Chat', href: '/chat' },
      { icon: Calculator, label: 'Tools', href: '/tools' },
      { icon: Search, label: 'Search', href: '/properties/search' },
      { icon: Heart, label: 'Saved', href: '/properties/saved' },
      { icon: Compass, label: 'Journey', href: '/my-journey' },
    ],
    // Seller
    seller: [
      { icon: MessageSquare, label: 'Chat', href: '/chat' },
      { icon: Calculator, label: 'Tools', href: '/tools' },
      { icon: Building2, label: 'Listing', href: '/my-listing' },
      { icon: Compass, label: 'Journey', href: '/my-journey' },
      { icon: MoreHorizontal, label: 'More', href: '/settings' },
    ],
  };

  const currentTabs = tabs[activeRole] || tabs.agent;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-card border-t border-border md:hidden pb-safe"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex justify-around items-stretch h-16">
        {currentTabs.map((tab) => {
          // Match active state more precisely
          const isActive =
            location.pathname === tab.href ||
            (tab.href !== '/' && location.pathname.startsWith(tab.href));

          return (
            <Link
              key={tab.href}
              to={tab.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 flex-1",
                "min-h-[56px] min-w-[64px]", // Touch target compliance
                "active:scale-95 transition-all duration-200 touch-manipulation",
                isActive ? "text-glean-purple" : "text-muted-foreground"
              )}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <tab.icon className="h-6 w-6" />
              <span className="text-[10px] font-medium leading-tight">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
