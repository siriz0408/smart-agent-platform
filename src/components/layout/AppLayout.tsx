import { ReactNode } from "react";
import { GleanSidebar } from "./GleanSidebar";
import { MobileBottomNav } from "./MobileBottomNav";
import { AppHeader } from "./AppHeader";
import { TrialBanner } from "@/components/billing/TrialBanner";

interface AppLayoutProps {
  children: ReactNode;
}

/**
 * Main app layout with Glean-inspired navigation
 * - Desktop: 72px purple sidebar (Glean style)
 * - Mobile: Bottom tab navigation (5 tabs)
 * - Responsive padding for mobile nav
 */
export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Glean-style purple sidebar - Desktop only */}
      <GleanSidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TrialBanner />
        <AppHeader />

        {/* Main content area with bottom padding for mobile nav */}
        <main className="flex-1 overflow-y-auto bg-muted/30 pb-16 md:pb-0">
          {children}
        </main>

        {/* Mobile bottom tab navigation */}
        <MobileBottomNav />
      </div>
    </div>
  );
}
