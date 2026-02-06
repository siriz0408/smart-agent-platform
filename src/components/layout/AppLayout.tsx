import { ReactNode } from "react";
import { GleanSidebar } from "./GleanSidebar";
import { MobileBottomNav } from "./MobileBottomNav";
import { AppHeader } from "./AppHeader";
import { TrialBanner } from "@/components/billing/TrialBanner";
import { UsageLimitBanner } from "@/components/billing/UsageLimitBanner";

interface AppLayoutProps {
  children: ReactNode;
}

/**
 * Main app layout with Glean-inspired navigation
 * - Desktop: 72px purple sidebar (Glean style)
 * - Mobile: Bottom tab navigation (5 tabs)
 * - Responsive padding for mobile nav
 * - iOS safe area support for notch/home indicator
 */
export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-[100dvh] overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md focus:text-sm focus:font-medium"
      >
        Skip to content
      </a>
      {/* Glean-style purple sidebar - Desktop only */}
      <GleanSidebar />

      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <TrialBanner />
        <UsageLimitBanner />
        <AppHeader />

        {/* Main content area with bottom padding for mobile nav and safe area */}
        <main id="main-content" className="flex-1 overflow-y-auto bg-muted/30 pb-20 md:pb-0">
          {children}
        </main>

        {/* Mobile bottom tab navigation with safe area support */}
        <MobileBottomNav />
      </div>
    </div>
  );
}
