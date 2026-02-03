import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { RoleProvider } from "@/contexts/RoleContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { KeyboardShortcutsProvider } from "@/components/keyboard/KeyboardShortcutsProvider";

// Pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ResetPassword from "./pages/ResetPassword";
import Chat from "./pages/Chat";
import Agents from "./pages/Agents";
import AgentCreate from "./pages/AgentCreate";
import AgentEdit from "./pages/AgentEdit";
import AdminAgents from "./pages/AdminAgents";
import AdminAgentEdit from "./pages/AdminAgentEdit";
import Contacts from "./pages/Contacts";
import ContactDetail from "./pages/ContactDetail";
import Pipeline from "./pages/Pipeline";
import Properties from "./pages/Properties";
import PropertyDetail from "./pages/PropertyDetail";
import PropertySearch from "./pages/PropertySearch";
import SavedProperties from "./pages/SavedProperties";
import MyListing from "./pages/MyListing";
import MyJourney from "./pages/MyJourney";
import Documents from "./pages/Documents";
import DocumentDetail from "./pages/DocumentDetail";
import DocumentChat from "./pages/DocumentChat";
import SearchResults from "./pages/SearchResults";
import Messages from "./pages/Messages";
import Admin from "./pages/Admin";
import Settings from "./pages/Settings";
import Billing from "./pages/Billing";
import Tools from "./pages/Tools";
import TrialExpired from "./pages/TrialExpired";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <RoleProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <KeyboardShortcutsProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Protected routes - Common */}
              <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
              <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
              <Route path="/documents/:id" element={<ProtectedRoute><DocumentDetail /></ProtectedRoute>} />
              <Route path="/documents/chat" element={<ProtectedRoute><DocumentChat /></ProtectedRoute>} />
              <Route path="/search" element={<ProtectedRoute><SearchResults /></ProtectedRoute>} />
              <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
              <Route path="/messages/:conversationId" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/settings/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
              <Route path="/tools" element={<ProtectedRoute><Tools /></ProtectedRoute>} />

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
            </KeyboardShortcutsProvider>
          </BrowserRouter>
        </TooltipProvider>
      </RoleProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
