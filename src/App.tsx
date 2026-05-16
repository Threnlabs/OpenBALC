import { BrowserRouter } from "react-router-dom";
import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import { BenchrexProvider, useApp } from "./context/BenchrexContext";
import LoginPage from "./pages/LoginPage";
import ChatPage from "./pages/ChatPage";
import PrivacyPage from "./pages/PrivacyPage";
import ProfilePage from "./pages/ProfilePage";
import BoardPage from "./pages/BoardPage";
import NotFound from "./pages/NotFound";

import "./index.css";

const queryClient = new QueryClient();

const AppShell = () => {
  const { user } = useApp();
  if (!user) return <LoginPage />;
  return <ChatPage />;
};

const BenchrexApp = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BenchrexProvider>
        <div className="benchrex-app-root">
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
      </BenchrexProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default BenchrexApp;
