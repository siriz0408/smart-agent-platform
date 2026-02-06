import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
  FileText,
  Mail,
  Bot,
  ListTodo,
  HelpCircle,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole } from "@/contexts/RoleContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

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
  const navigate = useNavigate();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

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

  // Additional pages available in More menu
  const moreMenuPages = [
    { icon: FileText, label: "Documents", href: "/documents", roles: ["agent", "admin", "super_admin", "buyer", "seller"] },
    { icon: Mail, label: "Messages", href: "/messages", roles: ["agent", "admin", "super_admin", "buyer", "seller"] },
    { icon: Bot, label: "Agents", href: "/agents", roles: ["agent", "admin", "super_admin"] },
    { icon: ListTodo, label: "Action Queue", href: "/action-queue", roles: ["agent", "admin", "super_admin"] },
    { icon: HelpCircle, label: "Help", href: "/help", roles: ["agent", "admin", "super_admin", "buyer", "seller"] },
    { icon: Settings, label: "Settings", href: "/settings", roles: ["agent", "admin", "super_admin", "buyer", "seller"] },
    { icon: ShieldCheck, label: "Admin", href: "/admin", roles: ["admin", "super_admin"] },
  ].filter(page => page.roles.includes(activeRole));

  const handleMoreClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowMoreMenu(true);
  };

  const handleNavigate = (href: string) => {
    setShowMoreMenu(false);
    navigate(href);
  };

  return (
    <>
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

            // If this is the "More" tab, handle it specially
            const isMoreTab = tab.label === "More";

            if (isMoreTab) {
              return (
                <button
                  key={tab.href}
                  onClick={handleMoreClick}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 px-3 flex-1",
                    "min-h-[56px] min-w-[64px]", // Touch target compliance
                    "active:scale-95 transition-all duration-200 touch-manipulation",
                    "text-muted-foreground"
                  )}
                  aria-label={tab.label}
                >
                  <tab.icon className="h-6 w-6" />
                  <span className="text-[10px] font-medium leading-tight">
                    {tab.label}
                  </span>
                </button>
              );
            }

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

      {/* More Menu Sheet */}
      <Sheet open={showMoreMenu} onOpenChange={setShowMoreMenu}>
        <SheetContent side="bottom" className="max-h-[80vh]">
          <SheetHeader>
            <SheetTitle>More</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-2">
            {moreMenuPages.map((page) => (
              <Button
                key={page.href}
                variant="ghost"
                className="w-full justify-start h-14"
                onClick={() => handleNavigate(page.href)}
                aria-label={page.label}
              >
                <page.icon className="h-5 w-5 mr-3" />
                <span className="text-base">{page.label}</span>
              </Button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
