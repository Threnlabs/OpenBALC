import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { useEffect } from "react";

import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Pricing from "@/pages/pricing";
import Login from "@/pages/login";
import OnboardPage from "@/pages/onboard";
import Dashboard from "@/pages/dashboard";
import ChatPage from "@/pages/chat";
import ModulesPage from "@/pages/modules";
import ModuleDetailPage from "@/pages/module-detail";
import NotesPage from "@/pages/notes";
import TestsPage from "@/pages/tests";
import ProfilePage from "@/pages/profile";
import OrgPage from "@/pages/org";
import AdsPortal from "@/pages/ads-portal";
import PublicModulesPage from "@/pages/public-modules";
import PublicModuleDetailPage from "@/pages/public-module-detail";
import AdminPage from "@/pages/admin";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isLoggedIn } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoggedIn) {
      setLocation("/login");
    }
  }, [isLoggedIn, setLocation]);

  if (!isLoggedIn) return null;

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/login" component={Login} />
      <Route path="/onboard" component={() => <ProtectedRoute component={OnboardPage} />} />
      <Route path="/ads" component={AdsPortal} />
      <Route path="/modules" component={PublicModulesPage} />
      <Route path="/modules/:id" component={PublicModuleDetailPage} />

      <Route path="/app" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/app/chat" component={() => <ProtectedRoute component={ChatPage} />} />
      <Route path="/app/chat/:id" component={() => <ProtectedRoute component={ChatPage} />} />
      <Route path="/app/modules" component={() => <ProtectedRoute component={ModulesPage} />} />
      <Route path="/app/modules/:id" component={() => <ProtectedRoute component={ModuleDetailPage} />} />
      <Route path="/app/notes" component={() => <ProtectedRoute component={NotesPage} />} />
      <Route path="/app/tests" component={() => <ProtectedRoute component={TestsPage} />} />
      <Route path="/app/profile" component={() => <ProtectedRoute component={ProfilePage} />} />
      <Route path="/app/org" component={() => <ProtectedRoute component={OrgPage} />} />
      <Route path="/app/admin" component={() => <ProtectedRoute component={AdminPage} />} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster richColors position="top-right" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
