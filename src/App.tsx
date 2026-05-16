import { BrowserRouter } from "react-router-dom";
import { Toaster } from "benchrex/components/ui/toaster";
import { Toaster as Sonner } from "benchrex/components/ui/sonner";
import { TooltipProvider } from "benchrex/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import { ScholarsAnchorProvider, useApp } from "benchrex/context/BenchrexContext";
import LoginPage from "benchrex/pages/LoginPage";
import ChatPage from "benchrex/pages/ChatPage";
import PrivacyPage from "benchrex/pages/PrivacyPage";
import SetupPage from "benchrex/pages/SetupPage";
import ProfilePage from "benchrex/pages/ProfilePage";
import BoardPage from "benchrex/pages/BoardPage";
import NotFound from "./pages/NotFound";

import "./index.css";

const queryClient = new QueryClient();

const AppShell = () => {
  const { user } = useApp();
  if (!user) return <LoginPage />;
  return <ChatPage />;
};

const ScholarsAnchorApp = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ScholarsAnchorProvider>
        <div className="scholarsanchor-app-root">
          <div className="gradient-bg" />
          <BrowserRouter>
            <Routes>
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/board" element={<BoardPage />} />
              <Route path="/" element={<AppShell />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </div>
      </ScholarsAnchorProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default ScholarsAnchorApp;
