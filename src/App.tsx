import { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { RoleProvider } from "@/contexts/RoleContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { KeyboardShortcutsProvider } from "@/components/keyboard/KeyboardShortcutsProvider";
import { ErrorBoundary } from "@/lib/errorTracking";
import { ErrorFallback } from "@/components/ErrorFallback";
import { Loader2 } from "lucide-react";
import { useRoutePerformanceTracking } from "@/hooks/usePerformanceMonitoring";

// Critical path - eager loaded
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";

// Lazy loaded pages
const Home = lazy(() => import("./pages/Home"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Chat = lazy(() => import("./pages/Chat"));
const Agents = lazy(() => import("./pages/Agents"));
const AgentCreate = lazy(() => import("./pages/AgentCreate"));
const AgentEdit = lazy(() => import("./pages/AgentEdit"));
const ActionQueue = lazy(() => import("./pages/ActionQueue"));
const AdminAgents = lazy(() => import("./pages/AdminAgents"));
const AdminAgentEdit = lazy(() => import("./pages/AdminAgentEdit"));
const AdminTeammates = lazy(() => import("./pages/AdminTeammates"));
const AdminDataSources = lazy(() => import("./pages/AdminDataSources"));
const Contacts = lazy(() => import("./pages/Contacts"));
const ContactDetail = lazy(() => import("./pages/ContactDetail"));
const Pipeline = lazy(() => import("./pages/Pipeline"));
const Properties = lazy(() => import("./pages/Properties"));
const PropertyDetail = lazy(() => import("./pages/PropertyDetail"));
const PropertySearch = lazy(() => import("./pages/PropertySearch"));
const SavedProperties = lazy(() => import("./pages/SavedProperties"));
const MyListing = lazy(() => import("./pages/MyListing"));
const MyJourney = lazy(() => import("./pages/MyJourney"));
const Documents = lazy(() => import("./pages/Documents"));
const DocumentDetail = lazy(() => import("./pages/DocumentDetail"));
const DocumentChat = lazy(() => import("./pages/DocumentChat"));
const SearchResults = lazy(() => import("./pages/SearchResults"));
const Messages = lazy(() => import("./pages/Messages"));
const MessageMetrics = lazy(() => import("./pages/MessageMetrics"));
const ProductionMetrics = lazy(() => import("./pages/ProductionMetrics"));
const DataHealth = lazy(() => import("./pages/DataHealth"));
const AIChatQuality = lazy(() => import("./pages/AIChatQuality"));
const Admin = lazy(() => import("./pages/Admin"));
const Settings = lazy(() => import("./pages/Settings"));
const Billing = lazy(() => import("./pages/Billing"));
const Tools = lazy(() => import("./pages/Tools"));
const Integrations = lazy(() => import("./pages/Integrations"));
const TrialExpired = lazy(() => import("./pages/TrialExpired"));
const Terms = lazy(() => import("./pages/Terms"));
const Help = lazy(() => import("./pages/Help"));
const Privacy = lazy(() => import("./pages/Privacy"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Onboarding = lazy(() => import("./pages/Onboarding"));

function LoadingSpinner() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

// Optimized QueryClient configuration for performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is fresh for 30 seconds (reduces unnecessary refetches)
      staleTime: 30 * 1000,
      // Cache data for 5 minutes (keeps data available for instant navigation)
      gcTime: 5 * 60 * 1000, // Previously cacheTime
      // Don't refetch on window focus (reduces network requests)
      refetchOnWindowFocus: false,
      // Retry failed requests once
      retry: 1,
      // Retry delay with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
    },
  },
});

// Component to track route performance
function RoutePerformanceTracker() {
  useRoutePerformanceTracking();
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <WorkspaceProvider>
        <RoleProvider>
          <TooltipProvider>
          <Sonner />
          <BrowserRouter>
            <RoutePerformanceTracker />
            <KeyboardShortcutsProvider>
            <ErrorBoundary fallback={({ error, resetError }) => (
              <ErrorFallback error={error} resetError={resetError} />
            )}>
            <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/privacy-policy" element={<Privacy />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />

              {/* Onboarding - Protected but without full layout, skip onboarding check to prevent infinite redirect */}
              <Route path="/onboarding" element={<ProtectedRoute skipOnboardingCheck><Onboarding /></ProtectedRoute>} />

              {/* Protected routes - Common */}
              <Route path="/dashboard" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
              <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
              <Route path="/documents/:id" element={<ProtectedRoute><DocumentDetail /></ProtectedRoute>} />
              <Route path="/documents/chat" element={<ProtectedRoute><DocumentChat /></ProtectedRoute>} />
              <Route path="/search" element={<ProtectedRoute><SearchResults /></ProtectedRoute>} />
              <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
              <Route path="/messages/:conversationId" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
              <Route path="/messages/metrics" element={<ProtectedRoute><MessageMetrics /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/settings/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
              <Route path="/tools" element={<ProtectedRoute><Tools /></ProtectedRoute>} />
              <Route path="/integrations" element={<ProtectedRoute><Integrations /></ProtectedRoute>} />
              <Route path="/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />

              {/* Protected routes - Admin Only */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requiredRoles={['super_admin', 'admin']}>
                    <Admin />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/agents"
                element={
                  <ProtectedRoute requiredRoles={['super_admin', 'admin']}>
                    <AdminAgents />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/agents/:id/edit"
                element={
                  <ProtectedRoute requiredRoles={['super_admin', 'admin']}>
                    <AdminAgentEdit />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/teammates"
                element={
                  <ProtectedRoute requiredRoles={['super_admin', 'admin']}>
                    <AdminTeammates />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/data-sources"
                element={
                  <ProtectedRoute requiredRoles={['super_admin', 'admin']}>
                    <AdminDataSources />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/metrics"
                element={
                  <ProtectedRoute requiredRoles={['super_admin', 'admin']}>
                    <ProductionMetrics />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/growth-metrics"
                element={
                  <ProtectedRoute requiredRoles={['super_admin', 'admin']}>
                    <GrowthMetrics />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/data-health"
                element={
                  <ProtectedRoute requiredRoles={['super_admin', 'admin']}>
                    <DataHealth />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/ai-chat-quality"
                element={
                  <ProtectedRoute requiredRoles={['super_admin', 'admin']}>
                    <AIChatQuality />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/search-analytics"
                element={
                  <ProtectedRoute requiredRoles={['super_admin', 'admin']}>
                    <SearchAnalytics />
                  </ProtectedRoute>
                }
              />

              {/* Protected routes - Agent/Admin */}
              <Route
                path="/agents"
                element={
                  <ProtectedRoute requiredRoles={['agent', 'admin', 'super_admin']}>
                    <Agents />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/agents/create"
                element={
                  <ProtectedRoute requiredRoles={['agent', 'admin', 'super_admin']}>
                    <AgentCreate />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/agents/:id/edit"
                element={
                  <ProtectedRoute requiredRoles={['agent', 'admin', 'super_admin']}>
                    <AgentEdit />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/action-queue"
                element={
                  <ProtectedRoute requiredRoles={['agent', 'admin', 'super_admin']}>
                    <ActionQueue />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/contacts"
                element={
                  <ProtectedRoute requiredRoles={['agent', 'admin', 'super_admin']}>
                    <Contacts />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/contacts/:id"
                element={
                  <ProtectedRoute requiredRoles={['agent', 'admin', 'super_admin']}>
                    <ContactDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pipeline/:type"
                element={
                  <ProtectedRoute requiredRoles={['agent', 'admin', 'super_admin']}>
                    <Pipeline />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/properties"
                element={
                  <ProtectedRoute requiredRoles={['agent', 'admin', 'super_admin']}>
                    <Properties />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/properties/:id"
                element={
                  <ProtectedRoute requiredRoles={['agent', 'admin', 'super_admin']}>
                    <PropertyDetail />
                  </ProtectedRoute>
                }
              />

              {/* Protected routes - Buyer */}
              <Route
                path="/properties/search"
                element={
                  <ProtectedRoute requiredRoles={['buyer', 'admin', 'super_admin']}>
                    <PropertySearch />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/properties/saved"
                element={
                  <ProtectedRoute requiredRoles={['buyer', 'admin', 'super_admin']}>
                    <SavedProperties />
                  </ProtectedRoute>
                }
              />

              {/* Protected routes - Seller */}
              <Route
                path="/my-listing"
                element={
                  <ProtectedRoute requiredRoles={['seller', 'admin', 'super_admin']}>
                    <MyListing />
                  </ProtectedRoute>
                }
              />

              {/* Protected routes - Buyer/Seller Journey */}
              <Route
                path="/my-journey"
                element={
                  <ProtectedRoute requiredRoles={['buyer', 'seller', 'admin', 'super_admin']}>
                    <MyJourney />
                  </ProtectedRoute>
                }
              />

              {/* Trial Expired - Accessible when trial is expired */}
              <Route path="/trial-expired" element={<ProtectedRoute allowExpiredTrial><TrialExpired /></ProtectedRoute>} />

              {/* Billing - Accessible when trial is expired */}
              <Route path="/billing" element={<ProtectedRoute allowExpiredTrial><Billing /></ProtectedRoute>} />

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
            </ErrorBoundary>
            </KeyboardShortcutsProvider>
          </BrowserRouter>
          </TooltipProvider>
        </RoleProvider>
      </WorkspaceProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
