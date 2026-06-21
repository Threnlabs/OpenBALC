import { useState } from "react";
import { useLocation } from "wouter";
import { useCompleteOnboarding } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { Loader2, Check, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const STEPS = ["Profile", "Courses", "Micro Courses", "Interests"];

const COURSES = [
  "Computer Science", "Mathematics", "Physics", "Chemistry", "Biology",
  "History", "Literature", "Economics", "Psychology", "Philosophy",
  "Law", "Medicine", "Engineering", "Art & Design", "Music", "Languages",
];

const MICRO_COURSES = [
  "Machine Learning", "Web Development", "Data Science", "UX Design",
  "Digital Marketing", "Photography", "Writing", "Public Speaking",
  "Personal Finance", "Nutrition", "Meditation", "Leadership",
];

const INTERESTS = [
  "AI & Technology", "Science", "Arts", "Business", "Health & Wellness",
  "Travel", "Sports", "Gaming", "Cooking", "Environment", "Politics", "Philosophy",
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((step, i) => (
        <div key={step} className="flex items-center gap-2">
          <div className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all",
            i < current ? "bg-primary text-primary-foreground" :
            i === current ? "bg-primary/20 text-primary border-2 border-primary" :
            "bg-muted text-muted-foreground"
          )}>
            {i < current ? <Check className="h-3.5 w-3.5" /> : i + 1}
          </div>
          <span className={cn("text-xs hidden sm:block", i === current ? "text-foreground" : "text-muted-foreground")}>
            {step}
          </span>
          {i < STEPS.length - 1 && (
            <div className={cn("h-px w-8 mx-1", i < current ? "bg-primary" : "bg-border")} />
          )}
        </div>
      ))}
    </div>
  );
}

function ToggleChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-full border text-sm font-medium transition-all",
        selected
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:border-muted-foreground/50"
      )}
    >
      {label}
    </button>
  );
}

export default function OnboardPage() {
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [courses, setCourses] = useState<string[]>([]);
  const [microCourses, setMicroCourses] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [, setLocation] = useLocation();
  const completeOnboarding = useCompleteOnboarding();

  function toggle<T>(arr: T[], val: T) {
    return arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];
  }

  function handleSubmit() {
    completeOnboarding.mutate({
      data: { displayName, username, phone: phone || null, courses, microCourses, interests }
    }, {
      onSuccess: () => {
        toast.success("Welcome to OpenBALC!");
        setLocation("/app");
      },
      onError: () => toast.error("Failed to complete onboarding")
    });
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-xs">
            OB
          </div>
          <span className="font-bold text-sm">OpenBALC</span>
        </div>

        <StepIndicator current={step} />

        {/* Step 0: Profile */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold mb-1">Set up your profile</h2>
              <p className="text-sm text-muted-foreground">Tell us a bit about yourself</p>
            </div>
            <div>
              <Label>Display Name *</Label>
              <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your full name" className="mt-1.5" />
            </div>
            <div>
              <Label>Username *</Label>
              <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="your_username" className="mt-1.5" />
            </div>
            <div>
              <Label>Phone (optional)</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 234 567 8900" className="mt-1.5" />
            </div>
            <Button
              className="w-full" onClick={() => setStep(1)}
              disabled={!displayName.trim() || !username.trim()}
            >
              Continue <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}

        {/* Step 1: Courses */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold mb-1">Choose your courses</h2>
              <p className="text-sm text-muted-foreground">Select subjects you're studying or interested in</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {COURSES.map(c => (
                <ToggleChip key={c} label={c} selected={courses.includes(c)} onClick={() => setCourses(toggle(courses, c))} />
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
              <Button className="flex-1" onClick={() => setStep(2)}>
                Continue <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Micro courses */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold mb-1">Micro courses</h2>
              <p className="text-sm text-muted-foreground">What skills are you picking up?</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {MICRO_COURSES.map(c => (
                <ToggleChip key={c} label={c} selected={microCourses.includes(c)} onClick={() => setMicroCourses(toggle(microCourses, c))} />
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button className="flex-1" onClick={() => setStep(3)}>
                Continue <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Interests */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold mb-1">Your interests</h2>
              <p className="text-sm text-muted-foreground">Help us personalize your experience</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map(i => (
                <ToggleChip key={i} label={i} selected={interests.includes(i)} onClick={() => setInterests(toggle(interests, i))} />
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={completeOnboarding.isPending}>
                {completeOnboarding.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Finish Setup
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
