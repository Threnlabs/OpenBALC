import { useState } from "react";
import { useLocation } from "wouter";
import { useCompleteOnboarding } from "@/lib/api-client-react";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { Loader2, Check, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

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
  const steps = ["Profile Setup", "Course Select", "Certifications", "Complete"];
  return (
    <div className="w-full flex items-center justify-between mb-10 select-none relative px-2">
      {/* Background Track Line */}
      <div className="absolute top-[14px] left-[40px] right-[40px] h-[3px] bg-border rounded-full -z-10 overflow-hidden">
        {/* Animated fill line */}
        <div 
          className="h-full bg-primary transition-all duration-500 ease-out" 
          style={{ width: `${(current / (steps.length - 1)) * 100}%` }}
        />
      </div>

      {steps.map((step, i) => (
        <div key={step} className="flex flex-col items-center gap-2 relative">
          {/* Node */}
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 border-2 z-10",
            i < current ? "bg-primary border-primary text-primary-foreground scale-105 shadow-md shadow-primary/20" :
            i === current ? "bg-background border-primary text-primary scale-110 ring-4 ring-primary/10 shadow-lg" :
            "bg-card border-border text-muted-foreground scale-95"
          )}>
            {i < current ? <Check className="h-4 w-4" /> : i + 1}
          </div>
          {/* Label */}
          <span className={cn(
            "text-[9px] font-bold uppercase tracking-wider transition-colors duration-300",
            i <= current ? "text-foreground" : "text-muted-foreground/60"
          )}>
            {step}
          </span>
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
        "px-4 py-2 rounded-full border text-xs font-semibold transition-all hover:scale-[1.02] cursor-pointer",
        selected
          ? "border-primary bg-primary/10 text-primary shadow-xs"
          : "border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}

export default function OnboardPage() {
  const { isDark } = useTheme();
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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8 justify-center sm:justify-start">
          <img 
            src={isDark ? "/logo/light_logo.svg" : "/logo/dark_logo.svg"} 
            alt="OpenBALC Logo" 
            className="h-8 object-contain" 
          />
        </div>

        <StepIndicator current={step} />

        {/* Carousel Slide Container */}
        <div className="w-full overflow-hidden relative bg-card/85 backdrop-blur-md border border-border/80 rounded-2xl shadow-xl mb-6">
          <div 
            className="flex transition-transform duration-500 ease-out p-6"
            style={{ 
              width: "400%", 
              transform: `translateX(-${step * 25}%)` 
            }}
          >
            {/* Slide 0: Profile */}
            <div className="w-1/4 px-2 space-y-5">
              <div>
                <h2 className="text-lg font-bold mb-1">Set up your profile</h2>
                <p className="text-xs text-muted-foreground">Tell us a bit about yourself</p>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-semibold">Display Name *</Label>
                  <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your full name" className="mt-1.5 h-9 text-xs" />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Username *</Label>
                  <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="your_username" className="mt-1.5 h-9 text-xs" />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Phone (optional)</Label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 234 567 8900" className="mt-1.5 h-9 text-xs" />
                </div>
              </div>
              <Button
                className="w-full mt-4 h-9 text-xs font-bold" onClick={() => setStep(1)}
                disabled={!displayName.trim() || !username.trim()}
              >
                Continue <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            {/* Slide 1: Courses */}
            <div className="w-1/4 px-2 space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold mb-1">Choose your courses</h2>
                  <p className="text-xs text-muted-foreground font-semibold">Select subjects you're studying or interested in</p>
                </div>
                <div className="flex flex-wrap gap-2 max-h-[190px] overflow-y-auto pr-1 scrollbar-thin">
                  {COURSES.map(c => (
                    <ToggleChip key={c} label={c} selected={courses.includes(c)} onClick={() => setCourses(toggle(courses, c))} />
                  ))}
                </div>
              </div>
              <div className="flex gap-2.5 pt-4">
                <Button variant="outline" className="h-9 text-xs font-bold" onClick={() => setStep(0)}>Back</Button>
                <Button className="flex-1 h-9 text-xs font-bold" onClick={() => setStep(2)}>
                  Continue <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>

            {/* Slide 2: Micro courses */}
            <div className="w-1/4 px-2 space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold mb-1">Micro courses</h2>
                  <p className="text-xs text-muted-foreground font-semibold">What skills are you picking up?</p>
                </div>
                <div className="flex flex-wrap gap-2 max-h-[190px] overflow-y-auto pr-1 scrollbar-thin">
                  {MICRO_COURSES.map(c => (
                    <ToggleChip key={c} label={c} selected={microCourses.includes(c)} onClick={() => setMicroCourses(toggle(microCourses, c))} />
                  ))}
                </div>
              </div>
              <div className="flex gap-2.5 pt-4">
                <Button variant="outline" className="h-9 text-xs font-bold" onClick={() => setStep(1)}>Back</Button>
                <Button className="flex-1 h-9 text-xs font-bold" onClick={() => setStep(3)}>
                  Continue <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>

            {/* Slide 3: Interests */}
            <div className="w-1/4 px-2 space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold mb-1">Your interests</h2>
                  <p className="text-xs text-muted-foreground font-semibold">Help us personalize your experience</p>
                </div>
                <div className="flex flex-wrap gap-2 max-h-[190px] overflow-y-auto pr-1 scrollbar-thin">
                  {INTERESTS.map(i => (
                    <ToggleChip key={i} label={i} selected={interests.includes(i)} onClick={() => setInterests(toggle(interests, i))} />
                  ))}
                </div>
              </div>
              <div className="flex gap-2.5 pt-4">
                <Button variant="outline" className="h-9 text-xs font-bold" onClick={() => setStep(2)}>Back</Button>
                <Button className="flex-1 h-9 text-xs font-bold" onClick={handleSubmit} disabled={completeOnboarding.isPending}>
                  {completeOnboarding.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Finish Setup
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
