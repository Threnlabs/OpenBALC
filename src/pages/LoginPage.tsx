import React, { useState } from "react";
import { useApp } from "../context/BenchrexContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { motion } from "framer-motion";

const LoginPage = () => {
  const { login } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);
    const success = await login(email, password);
    setLoading(false);
    if (!success) {
      setError("Invalid credentials");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="mb-8 text-center flex flex-col items-center justify-center">
          <img 
            src="/logo.png" 
            alt="Benchrex Logo" 
            className="mx-auto h-20 w-20 object-contain mb-4 animate-float"
          />
          <h1 className="text-4xl font-black text-foreground tracking-tighter uppercase leading-[0.8] mb-1">
            Benchrex
          </h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold">
            Intelligent Student Portal
          </p>
        </div>

        <Card className="border-border/50 shadow-lg backdrop-blur-sm bg-card/80">
          <CardHeader className="pb-2 text-center">
            <CardTitle className="font-display text-2xl font-bold">Benchrex Login</CardTitle>
            <CardDescription>
              Sign in to start solving doubts in the Benchrex AI Portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="e.g. student@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>

      </motion.div>
    </div>
  );
};

export default LoginPage;
