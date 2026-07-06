import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/AuthPage";
import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Pages
import PortalHome from "@/pages/portal/PortalHome";
import NewTicket from "@/pages/portal/NewTicket";
import TicketDetail from "@/pages/portal/TicketDetail";
import ResolverDashboard from "@/pages/dashboard/ResolverDashboard";
import SettingsPage from "@/pages/admin/SettingsPage";
import QueuesPage from "@/pages/queues/QueuesPage";

// AI Module Pages
import AiDashboard from "@/pages/ai/AiDashboard";
import AiAssistantsList from "@/pages/ai/AiAssistantsList";
import AiAssistantWizard from "@/pages/ai/AiAssistantWizard";
import AiConversations from "@/pages/ai/AiConversations";
import AiChannels from "@/pages/ai/AiChannels";
import AiConnections from "@/pages/ai/AiConnections";
import AiLogs from "@/pages/ai/AiLogs";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />

      {/* Customer Portal */}
      <Route path="/portal">
        {() => (
          <ProtectedRoute allowedRoles={['user', 'resolver', 'admin']}>
            <Layout>
              <PortalHome />
            </Layout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/portal/new">
        {() => (
          <ProtectedRoute allowedRoles={['user', 'resolver', 'admin']}>
            <Layout>
              <NewTicket />
            </Layout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/portal/ticket/:id">
        {(params) => (
          <ProtectedRoute allowedRoles={['user', 'resolver', 'admin']}>
            <Layout>
              <TicketDetail />
            </Layout>
          </ProtectedRoute>
        )}
      </Route>

      {/* Agent Dashboard */}
      <Route path="/dashboard">
        {() => (
          <ProtectedRoute allowedRoles={['resolver', 'admin']}>
            <Layout>
              <ResolverDashboard />
            </Layout>
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/queues">
        {() => (
          <ProtectedRoute allowedRoles={['resolver', 'admin']}>
            <Layout>
              <QueuesPage />
            </Layout>
          </ProtectedRoute>
        )}
      </Route>

      {/* Admin/Settings */}
      <Route path="/settings">
        {() => (
          <ProtectedRoute allowedRoles={['admin']}>
            <Layout>
              <SettingsPage />
            </Layout>
          </ProtectedRoute>
        )}
      </Route>

      {/* AI Module Routes */}
      <Route path="/ai/dashboard">
        {() => (
          <ProtectedRoute allowedRoles={['admin']}>
            <Layout>
              <AiDashboard />
            </Layout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/ai/assistants">
        {() => (
          <ProtectedRoute allowedRoles={['admin']}>
            <Layout>
              <AiAssistantsList />
            </Layout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/ai/assistants/new">
        {() => (
          <ProtectedRoute allowedRoles={['admin']}>
            <Layout>
              <AiAssistantWizard />
            </Layout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/ai/conversations">
        {() => (
          <ProtectedRoute allowedRoles={['admin']}>
            <Layout>
              <AiConversations />
            </Layout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/ai/channels">
        {() => (
          <ProtectedRoute allowedRoles={['admin']}>
            <Layout>
              <AiChannels />
            </Layout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/ai/connections">
        {() => (
          <ProtectedRoute allowedRoles={['admin']}>
            <Layout>
              <AiConnections />
            </Layout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/ai/logs">
        {() => (
          <ProtectedRoute allowedRoles={['admin']}>
            <Layout>
              <AiLogs />
            </Layout>
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/admin">
        <Redirect to="/settings" />
      </Route>

      {/* Default Route */}
      <Route path="/">
        <Redirect to="/auth" />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
