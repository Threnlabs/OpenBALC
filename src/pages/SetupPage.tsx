import React, { useState } from "react";
import { useApp } from "benchrex/context/BenchrexContext";
import { Button } from "benchrex/components/ui/button";
import { Label } from "benchrex/components/ui/label";
import { Input } from "benchrex/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "benchrex/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "benchrex/components/ui/select";
import { GRADES, COURSES } from "benchrex/types";
import { GraduationCap } from "lucide-react";
import { motion } from "framer-motion";

const SetupPage = () => {
  const { completeSetup, user } = useApp();
  const [grade, setGrade] = useState("");
  const [course, setCourse] = useState("");
  const [batch, setBatch] = useState("");
  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grade || !course || !batch) {
      setError("Please fill all fields");
      return;
    }
    setLoading(true);
    await completeSetup(grade, course, batch);
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <GraduationCap className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Welcome, {user?.name}!
          </h1>
          <p className="mt-1 text-muted-foreground">
            Let's set up your profile to personalize your experience
          </p>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="font-display text-lg">Your Details</CardTitle>
            <CardDescription>This helps us tailor answers to your level</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Grade / Level</Label>
                <Select value={grade} onValueChange={(v) => { setGrade(v); setError(""); }}>
                  <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                  <SelectContent>
                    {GRADES.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Primary Course / Subject</Label>
                <Select value={course} onValueChange={(v) => { setCourse(v); setError(""); }}>
                  <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                  <SelectContent>
                    {COURSES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Batch / Year</Label>
                <Input
                  placeholder="e.g. 2024-25"
                  value={batch}
                  onChange={(e) => { setBatch(e.target.value); setError(""); }}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "Saving Profile..." : "Get Started"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default SetupPage;
