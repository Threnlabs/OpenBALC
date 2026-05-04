import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "benchrex/context/BenchrexContext";
import { Button } from "benchrex/components/ui/button";
import { Input } from "benchrex/components/ui/input";
import { Label } from "benchrex/components/ui/label";
import { Separator } from "benchrex/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "benchrex/components/ui/card";
import { toast } from "benchrex/hooks/use-toast";
import {
  User, Mail, GraduationCap, BookOpen, Users,
  Sparkles, KeyRound, ChevronLeft, LogOut
} from "lucide-react";
import { motion } from "framer-motion";

const ProfileRow = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) => (
  <div className="flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-card/50 p-4 transition-all hover:bg-card hover:shadow-sm">
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{label}</span>
        <span className="text-sm font-medium text-foreground">{value || "—"}</span>
      </div>
    </div>
  </div>
);

const ProfilePage = () => {
  const { user, resetPassword, logout } = useApp();
  const navigate = useNavigate();
  const [showReset, setShowReset] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  if (!user) {
    navigate("/benchrex");
    return null;
  }

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!current || !next) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    if (next.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (next !== confirm) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    resetPassword(current, next);
    toast({ title: "Password reset", description: "Your password has been updated." });
    setCurrent(""); setNext(""); setConfirm("");
    setShowReset(false);
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => navigate("/benchrex")}
          >
            <ChevronLeft className="h-4 w-4" />
            Back to App
          </Button>
          <h1 className="font-display text-lg font-bold">Profile</h1>
          <div className="w-20" /> {/* Spacer for centering */}
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 pt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          {/* User Header */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="relative">
              <div className="h-24 w-24 rounded-full bg-primary/20 flex items-center justify-center ring-4 ring-primary/10">
                <User className="h-12 w-12 text-primary" />
              </div>
              <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">{user.name}</h2>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <Card className="border-border/50 shadow-xl overflow-hidden bg-card/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Account Details</CardTitle>
              <CardDescription>Your academic and account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <ProfileRow icon={Mail} label="Student ID" value={user.email.replace("@student.local", "")} />
                <ProfileRow icon={GraduationCap} label="Grade" value={user.grade} />
                <ProfileRow icon={BookOpen} label="Course" value={user.course} />
                <ProfileRow icon={Users} label="Batch" value={user.batch} />
                <ProfileRow icon={Sparkles} label="Credits" value={String(user.credits)} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-lg bg-card/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Security</CardTitle>
              <CardDescription>Manage your password and security</CardDescription>
            </CardHeader>
            <CardContent>
              {!showReset ? (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2 h-11"
                    onClick={() => setShowReset(true)}
                  >
                    <KeyRound className="h-4 w-4" /> Reset Password
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1 gap-2 h-11"
                    onClick={() => {
                      logout();
                      navigate("/benchrex");
                    }}
                  >
                    <LogOut className="h-4 w-4" /> Logout
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleReset} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="current">Current Password</Label>
                      <Input id="current" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} className="bg-background/50" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="next">New Password</Label>
                      <Input id="next" type="password" value={next} onChange={(e) => setNext(e.target.value)} className="bg-background/50" />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="confirm">Confirm New Password</Label>
                      <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="bg-background/50" />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="ghost" className="flex-1" onClick={() => setShowReset(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1">Update Password</Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          <div className="text-center">
            <p className="text-xs text-muted-foreground italic">
              Student ID: {user.email.split("@")[0]} • Member since April 2024
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ProfilePage;
