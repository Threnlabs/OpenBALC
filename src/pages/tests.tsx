import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import {
  useListTests, useCreateTest, useGetTest, useDeleteTest, useSubmitTestAttempt,
  getListTestsQueryKey
} from "@/lib/api-client-react";
import { cn, timeAgo } from "@/lib/utils";
import {
  FlaskConical, Plus, Play, Trash2, Trophy, ChevronRight, CheckCircle, XCircle, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "text-emerald-400 bg-emerald-400/10",
  medium: "text-amber-400 bg-amber-400/10",
  hard: "text-rose-400 bg-rose-400/10",
  mixed: "text-violet-400 bg-violet-400/10",
};

function TestCard({ test, onTake, onDelete }: { test: any; onTake: () => void; onDelete: () => void }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-sm leading-tight">{test.title}</h3>
          {test.sourceTitle && <p className="text-xs text-muted-foreground mt-0.5">From: {test.sourceTitle}</p>}
        </div>
        <Badge className={cn("text-[10px] border-0 capitalize", DIFFICULTY_COLORS[test.difficulty])}>
          {test.difficulty}
        </Badge>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
        <span>{test.questionCount} questions</span>
        <span>{timeAgo(test.createdAt)}</span>
      </div>

      {test.bestScore != null && (
        <div className="flex items-center gap-1.5 mb-4">
          <Trophy className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-xs text-amber-400 font-medium">Best: {Math.round(test.bestScore)}%</span>
        </div>
      )}

      <div className="flex gap-2">
        <Button size="sm" className="flex-1 h-7 text-xs" onClick={onTake}>
          <Play className="h-3 w-3 mr-1.5" /> Take Test
        </Button>
        <Button
          size="sm" variant="ghost" className="h-7 text-xs px-2 text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function CreateTestModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [questionType, setQuestionType] = useState<"mcq" | "short" | "both">("mcq");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | "mixed">("medium");
  const [customTopic, setCustomTopic] = useState("");
  const qc = useQueryClient();
  const createTest = useCreateTest();

  function handleCreate() {
    if (!title.trim()) return;
    createTest.mutate({ data: { title, questionCount, questionType, difficulty, customTopic: customTopic || undefined } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListTestsQueryKey() });
        toast.success("Test created!");
        onClose();
        setTitle(""); setStep(1); setCustomTopic("");
      },
      onError: () => toast.error("Failed to create test")
    });
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Test</DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4 py-2">
            <div>
              <Label>Test Title</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. ML Concepts Quiz" className="mt-1.5" />
            </div>
            <div>
              <Label>Custom Topic (optional)</Label>
              <Input value={customTopic} onChange={e => setCustomTopic(e.target.value)} placeholder="Specific topic to focus on..." className="mt-1.5" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={() => setStep(2)} disabled={!title.trim()}>Continue</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div>
              <Label>Question Count: {questionCount}</Label>
              <input
                type="range" min={5} max={50} value={questionCount}
                onChange={e => setQuestionCount(+e.target.value)}
                className="w-full mt-2"
              />
            </div>
            <div>
              <Label>Question Type</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {(["mcq", "short", "both"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setQuestionType(t)}
                    className={cn(
                      "px-3 py-2 rounded-lg border text-xs font-medium capitalize transition-all",
                      questionType === t ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                    )}
                  >
                    {t === "mcq" ? "MCQ" : t === "short" ? "Short Answer" : "Both"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Difficulty</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {(["easy", "medium", "hard", "mixed"] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={cn(
                      "px-2 py-2 rounded-lg border text-xs font-medium capitalize transition-all",
                      difficulty === d ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={handleCreate} disabled={createTest.isPending}>
                {createTest.isPending && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
                Generate Test
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TakeTestModal({ testId, open, onClose }: { testId: number; open: boolean; onClose: () => void }) {
  const { data: test, isLoading } = useGetTest(testId, { query: { enabled: open } as any });
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const qc = useQueryClient();
  const submitAttempt = useSubmitTestAttempt();

  function handleAnswer(questionId: number, answer: string) {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  }

  function handleSubmit() {
    submitAttempt.mutate({ id: testId, data: { answers } }, {
      onSuccess: (result: any) => {
        setScore(result.score);
        setSubmitted(true);
        qc.invalidateQueries({ queryKey: getListTestsQueryKey() });
      },
      onError: () => toast.error("Failed to submit test")
    });
  }

  const questions = test?.questions ?? [];
  const currentQ = questions[current];

  function handleClose() {
    setCurrent(0); setAnswers({}); setSubmitted(false); onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && submitted && (
          <div className="text-center py-8">
            <div className="w-24 h-24 rounded-full border-4 border-primary flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl font-bold">{Math.round(score)}%</span>
            </div>
            <h2 className="text-xl font-bold mb-1">
              {score >= 80 ? "Excellent!" : score >= 60 ? "Good job!" : "Keep practicing!"}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              You scored {Math.round(score)}% on this test.
            </p>
            <Button onClick={handleClose}>Done</Button>
          </div>
        )}

        {!isLoading && !submitted && test && (
          <>
            <DialogHeader>
              <DialogTitle>{test.title}</DialogTitle>
              <p className="text-xs text-muted-foreground">Question {current + 1} of {questions.length}</p>
            </DialogHeader>

            {/* Progress */}
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${((current + 1) / questions.length) * 100}%` }}
              />
            </div>

            {currentQ && (
              <div className="space-y-4 py-2">
                <p className="text-sm font-medium leading-relaxed">{currentQ.question}</p>

                {currentQ.type === "mcq" && currentQ.options ? (
                  <div className="space-y-2">
                    {Object.entries(currentQ.options as Record<string, string>).map(([key, val]) => (
                      <button
                        key={key}
                        onClick={() => handleAnswer(currentQ.id, key)}
                        className={cn(
                          "w-full text-left px-4 py-3 rounded-lg border text-sm transition-all",
                          answers[currentQ.id] === key
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-muted-foreground/30"
                        )}
                      >
                        <span className="font-medium mr-2">{key}.</span> {val}
                      </button>
                    ))}
                  </div>
                ) : (
                  <textarea
                    value={answers[currentQ.id] ?? ""}
                    onChange={e => handleAnswer(currentQ.id, e.target.value)}
                    placeholder="Your answer..."
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[100px] resize-none focus:outline-none focus:border-primary"
                  />
                )}
              </div>
            )}

            <DialogFooter className="gap-2">
              {current > 0 && (
                <Button variant="outline" onClick={() => setCurrent(c => c - 1)}>Previous</Button>
              )}
              {current < questions.length - 1 ? (
                <Button
                  onClick={() => setCurrent(c => c + 1)}
                  disabled={!answers[currentQ?.id]}
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={submitAttempt.isPending || Object.keys(answers).length === 0}
                >
                  {submitAttempt.isPending && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
                  Submit Test
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function TestsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [takingTestId, setTakingTestId] = useState<number | null>(null);
  const { data: tests, isLoading } = useListTests();
  const qc = useQueryClient();
  const deleteTest = useDeleteTest();

  function handleDelete(id: number) {
    if (!confirm("Delete this test?")) return;
    deleteTest.mutate({ id }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListTestsQueryKey() });
        toast.success("Test deleted");
      }
    });
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">Tests</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Practice and assess your knowledge</p>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Create Test
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-7 w-full" />
              </div>
            ))}
          </div>
        ) : !Array.isArray(tests) || tests.length === 0 ? (
          <EmptyState
            icon={<FlaskConical className="h-6 w-6" />}
            title="No tests yet"
            description="Generate AI-powered tests from your modules to test your knowledge"
            action={{ label: "Create Test", onClick: () => setCreateOpen(true) }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tests.map(test => (
              <TestCard
                key={test.id} test={test}
                onTake={() => setTakingTestId(test.id)}
                onDelete={() => handleDelete(test.id)}
              />
            ))}
          </div>
        )}
      </div>

      <CreateTestModal open={createOpen} onClose={() => setCreateOpen(false)} />
      {takingTestId && (
        <TakeTestModal
          testId={takingTestId}
          open={!!takingTestId}
          onClose={() => setTakingTestId(null)}
        />
      )}
    </AppLayout>
  );
}
