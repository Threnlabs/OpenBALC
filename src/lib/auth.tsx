import React, { createContext, useContext, useState, useEffect } from "react";
import { useLocation } from "wouter";

interface AuthContextType {
  isLoggedIn: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem("openbalc_auth") === "true";
  });
  const [, setLocation] = useLocation();

  useEffect(() => {
    localStorage.setItem("openbalc_auth", String(isLoggedIn));
  }, [isLoggedIn]);

  const login = () => {
    setIsLoggedIn(true);
    setLocation("/app");
  };

  const logout = () => {
    setIsLoggedIn(false);
    setLocation("/login");
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
