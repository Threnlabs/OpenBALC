import { useState, useEffect } from "react";
import { Award, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Question {
  id?: any;
  question: string;
  options: Record<string, string>;
  answer: string;
}

interface ArtifactQuizPlayerProps {
  questions: Question[];
  artifactId: any;
}

export default function ArtifactQuizPlayer({ questions, artifactId }: ArtifactQuizPlayerProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  // Reset when artifact changes
  useEffect(() => {
    setCurrentIdx(0);
    setAnswers({});
    setShowResult(false);
    setScore(null);
  }, [artifactId]);

  if (!questions || questions.length === 0) {
    return (
      <div className="text-center py-8 text-xs text-muted-foreground font-semibold">
        No questions in this test artifact.
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];

  const handleSelectOption = (optionKey: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id || currentIdx]: optionKey
    }));
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
    } else {
      // Calculate score
      let correct = 0;
      questions.forEach((q, idx) => {
        const qId = q.id || idx;
        const userAnswer = answers[qId];
        if (userAnswer === q.answer) {
          correct++;
        }
      });
      const finalScore = Math.round((correct / questions.length) * 100);
      setScore(finalScore);
      setShowResult(true);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(prev => prev - 1);
    }
  };

  const handleReset = () => {
    setCurrentIdx(0);
    setAnswers({});
    setShowResult(false);
    setScore(null);
  };

  if (showResult) {
    const passed = (score || 0) >= 70;
    return (
      <div className="flex flex-col items-center justify-center p-6 space-y-6 flex-1 text-center">
        <div className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center shadow-lg",
          passed ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"
        )}>
          {passed ? <Award className="h-8 w-8" /> : <GraduationCap className="h-8 w-8" />}
        </div>
        <div className="space-y-2">
          <h4 className="text-base font-bold text-foreground">Quiz Completed!</h4>
          <p className="text-xs text-muted-foreground">You got {questions.filter((q, idx) => answers[q.id || idx] === q.answer).length} out of {questions.length} questions correct.</p>
        </div>
        
        <div className="p-4 bg-muted/30 border border-border/80 rounded-2xl w-full max-w-sm">
          <div className="text-2xl font-bold text-primary">{score}%</div>
          <div className="text-[10px] text-muted-foreground font-semibold uppercase mt-1">Your Score</div>
        </div>

        <Button onClick={handleReset} size="sm" className="h-8 px-4 text-xs font-semibold">
          Try Again
        </Button>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="text-center py-8 text-xs text-muted-foreground font-semibold">
        No questions in this test artifact.
      </div>
    );
  }

  const selectedAnswer = answers[currentQuestion.id || currentIdx];

  return (
    <div className="flex flex-col flex-1 justify-between gap-6">
      <div className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold">
            <span>Question {currentIdx + 1} of {questions.length}</span>
            <span>{Math.round((currentIdx / questions.length) * 100)}% Complete</span>
          </div>
          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(currentIdx / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question Text */}
        <div className="p-4 border border-border/80 bg-muted/15 rounded-2xl">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Question</span>
          <p className="text-xs font-bold text-foreground leading-relaxed mt-1">
            {currentQuestion.question}
          </p>
        </div>

        {/* Options */}
        {currentQuestion.options && (
          <div className="space-y-2">
            {Object.entries(currentQuestion.options).map(([key, value]: [string, any]) => (
              <button
                key={key}
                onClick={() => handleSelectOption(key)}
                className={cn(
                  "w-full text-left p-3.5 rounded-xl border text-xs font-semibold transition-all flex items-start gap-3 hover:scale-[1.005]",
                  selectedAnswer === key
                    ? "border-primary bg-primary/5 text-primary shadow-sm"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/10"
                )}
              >
                <span className={cn(
                  "h-5 w-5 rounded-md flex items-center justify-center shrink-0 border text-[10px] font-bold",
                  selectedAnswer === key 
                    ? "bg-primary border-primary text-primary-foreground" 
                    : "bg-background border-border text-muted-foreground"
                )}>
                  {key}
                </span>
                <span className="leading-normal">{value}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border pt-4">
        <Button
          variant="ghost"
          size="sm"
          disabled={currentIdx === 0}
          onClick={handlePrev}
          className="text-xs h-8"
        >
          Previous
        </Button>
        <Button
          variant="default"
          size="sm"
          disabled={!selectedAnswer}
          onClick={handleNext}
          className="text-xs h-8 px-4"
        >
          {currentIdx === questions.length - 1 ? "Finish" : "Next"}
        </Button>
      </div>
    </div>
  );
}
