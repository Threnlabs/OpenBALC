import React, { createContext, useContext, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { supabase, hasSupabaseConfig } from "./supabase";
import { toast } from "sonner";

interface AuthContextType {
  isLoggedIn: boolean;
  user: any | null;
  loading: boolean;
  login: (email?: string, password?: string) => Promise<void>;
  signUp: (email?: string, password?: string, displayName?: string, username?: string) => Promise<void>;
  loginWithOAuth: (provider: "google" | "github" | "meta") => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    if (!hasSupabaseConfig) {
      return localStorage.getItem("openbalc_auth") === "true";
    }
    return false;
  });
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(hasSupabaseConfig);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!hasSupabaseConfig) {
      localStorage.setItem("openbalc_auth", String(isLoggedIn));
      if (isLoggedIn && !user) {
        setUser({
          id: 1,
          email: "user@example.com",
          displayName: "Jane Doe",
          username: "janedoe",
        });
      }
      return;
    }

    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setUser(session.user);
          setIsLoggedIn(true);
        }
      } catch (error) {
        console.error("Error getting session:", error);
      } finally {
        setLoading(false);
      }
    };
    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          setUser(session.user);
          setIsLoggedIn(true);
        } else {
          setUser(null);
          setIsLoggedIn(false);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [isLoggedIn]);

  const login = async (email?: string, password?: string) => {
    if (!hasSupabaseConfig) {
      setIsLoggedIn(true);
      setUser({
        id: 1,
        email: email || "user@example.com",
        displayName: "Jane Doe",
        username: "janedoe",
      });
      setLocation("/app");
      return;
    }

    if (!email || !password) {
      toast.error("Email and password are required");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      toast.success("Successfully logged in!");
      setLocation("/app");
    } catch (error: any) {
      toast.error(error.message || "Failed to log in");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
    email?: string,
    password?: string,
    displayName?: string,
    username?: string
  ) => {
    if (!hasSupabaseConfig) {
      setIsLoggedIn(true);
      setUser({
        id: 1,
        email: email || "user@example.com",
        displayName: displayName || "Jane Doe",
        username: username || "janedoe",
      });
      setLocation("/onboard");
      return;
    }

    if (!email || !password) {
      toast.error("Email and password are required");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName || email.split("@")[0],
            username: username || email.split("@")[0],
          },
        },
      });
      if (error) throw error;
      
      toast.success("Account created successfully!");
      if (data.session) {
        setLocation("/onboard");
      } else {
        toast.info("Please check your email to confirm your account");
        setLocation("/login");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to sign up");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginWithOAuth = async (provider: "google" | "github" | "meta") => {
    if (!hasSupabaseConfig) {
      setIsLoggedIn(true);
      setUser({
        id: 1,
        email: "oauth@example.com",
        displayName: `OAuth User (${provider})`,
        username: `oauth_${provider}`,
      });
      setLocation("/app");
      return;
    }

    const supabaseProvider = provider === "meta" ? "facebook" : provider;
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: supabaseProvider as any,
        options: {
          redirectTo: window.location.origin + "/app",
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || "OAuth login failed");
    }
  };

  const logout = async () => {
    if (!hasSupabaseConfig) {
      setIsLoggedIn(false);
      setUser(null);
      setLocation("/login");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || "Failed to log out");
    } finally {
      setLoading(false);
      setLocation("/login");
    }
  };

  return (
    <AuthContext.Provider
      value={{ isLoggedIn, user, loading, login, signUp, loginWithOAuth, logout }}
    >
      {!loading && children}
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

