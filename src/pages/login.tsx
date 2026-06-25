import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/hooks/use-theme";
import { motion, AnimatePresence } from "framer-motion";

const CAROUSEL_IMAGES = [
  "/carousel/image1.png",
  "/carousel/image2.png",
  "/carousel/image3.png",
];

// Custom SVG Icons for Google, GitHub, and Meta
const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="24" height="24" {...props}>
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" {...props}>
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.479C19.138 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
  </svg>
);

const MetaIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" {...props}>
    <path fillRule="evenodd" d="M8.217 5.243C9.145 3.988 10.171 3 11.483 3 13.96 3 16 6.153 16.001 9.907c0 2.29-.986 3.725-2.757 3.725-1.543 0-2.395-.866-3.924-3.424l-.667-1.123-.118-.197a55 55 0 0 0-.53-.877l-1.178 2.08c-1.673 2.925-2.615 3.541-3.923 3.541C1.086 13.632 0 12.217 0 9.973 0 6.388 1.995 3 4.598 3q.477-.001.924.122c.31.086.611.22.913.407.577.359 1.154.915 1.782 1.714m1.516 2.224q-.378-.615-.727-1.133L9 6.326c.845-1.305 1.543-1.954 2.372-1.954 1.723 0 3.102 2.537 3.102 5.653 0 1.188-.39 1.877-1.195 1.877-.773 0-1.142-.51-2.61-2.87zM4.846 4.756c.725.1 1.385.634 2.34 2.001A212 212 0 0 0 5.551 9.3c-1.357 2.126-1.826 2.603-2.581 2.603-.777 0-1.24-.682-1.24-1.9 0-2.602 1.298-5.264 2.846-5.264q.137 0 .27.018" />
  </svg>
);

function Carousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prevIndex) => (prevIndex + 1) % CAROUSEL_IMAGES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden border border-border/60 bg-muted/10 shadow-xl flex items-center justify-center group">
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={index}
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -100, opacity: 0 }}
          transition={{ type: "tween", ease: "easeInOut", duration: 0.5 }}
          className="absolute inset-0 w-full h-full p-2"
        >
          <img
            src={CAROUSEL_IMAGES[index]}
            alt={`Slide ${index + 1}`}
            className="w-full h-full object-cover rounded-xl shadow-inner border border-border/30"
          />
        </motion.div>
      </AnimatePresence>

      {/* Slide indicators */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-20">
        {CAROUSEL_IMAGES.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${i === index ? "bg-primary w-6" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

interface Organization {
  id: string;
  name: string;
  logo: string;
}

function OrganizationMarquee() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  useEffect(() => {
    fetch("/organizations.json")
      .then((res) => res.json())
      .then((data) => setOrganizations(data))
      .catch((err) => console.error("Failed to load organizations:", err));
  }, []);

  if (organizations.length === 0) return null;

  // Quadruple items to ensure seamless infinite scroll
  const marqueeItems = [...organizations, ...organizations, ...organizations, ...organizations];

  return (
    <div className="space-y-4 w-full">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/50 px-1">
        Trusted by learners from
      </div>
      <div className="marquee-container py-2">
        <div className="animate-marquee gap-5 flex items-center">
          {marqueeItems.map((org, idx) => (
            <div
              key={`${org.id}-${idx}`}
              className="flex items-center gap-3 bg-card border border-border/50 rounded-xl p-3 w-48 shrink-0 shadow-sm hover:border-primary/40 hover:bg-accent/10 transition-all duration-300 select-none group"
            >
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-white flex items-center justify-center border border-border/40 shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                <img
                  src={org.logo}
                  alt={org.name}
                  className="w-full h-full object-contain p-1"
                />
              </div>
              <div className="overflow-hidden">
                <div className="text-sm font-semibold truncate text-foreground/80 group-hover:text-foreground transition-colors">
                  {org.name}
                </div>
                <div className="text-[10px] text-muted-foreground font-medium truncate">
                  Partner
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  const { login, signUp, loginWithOAuth } = useAuth();
  const { isDark } = useTheme();
  const [isLogin, setIsLogin] = useState(true);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signUp(email, password, displayName, username);
      }
    } catch (err) {
      // Errors are handled/displayed by toast inside AuthProvider
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: string) => {
    setOauthLoading(provider);
    const toastId = toast.loading(`Connecting to ${provider}...`);
    try {
      await loginWithOAuth(provider.toLowerCase() as any);
      toast.dismiss(toastId);
    } catch (err) {
      toast.dismiss(toastId);
    } finally {
      setOauthLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <div className="hidden lg:flex w-1/2 bg-card border-r border-border p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
        <div className="relative z-10">
          <div className="mb-8">
            <img
              src={isDark ? "/logo/light_logo.svg" : "/logo/dark_logo.svg"}
              alt="OpenBALC Logo"
              className="h-10 object-contain"
            />
          </div>
          <h2 className="text-4xl font-bold tracking-tight mt-12">
            Welcome to OpenBALC<br />for serious learners.
          </h2>
        </div>

        <div className="relative z-10 flex-grow flex flex-col justify-center gap-8 my-6 overflow-hidden">
          <Carousel />
          <OrganizationMarquee />
        </div>

        <div className="relative z-10 text-muted-foreground">
          © {new Date().getFullYear()} OpenBALC. All rights reserved.
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            <div className="flex justify-center lg:hidden mb-6">
              <img
                src={isDark ? "/logo/light_logo.svg" : "/logo/dark_logo.svg"}
                alt="OpenBALC Logo"
                className="h-8 object-contain"
              />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{isLogin ? "Welcome back" : "Create an account"}</h1>
            <p className="text-muted-foreground mt-2">
              {isLogin ? "Enter your credentials to access your workspace." : "Join OpenBALC to start building your knowledge ecosystem."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Display Name</label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3 py-2 bg-input/50 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Jane Doe"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Username</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-input/50 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="janedoe"
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-input/50 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-input/50 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground font-medium py-2.5 rounded-md hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLogin ? "Sign In" : "Sign Up"}
            </button>
          </form>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-border"></div>
            <span className="flex-shrink mx-4 text-muted-foreground text-xs uppercase tracking-wider">
              Or continue with
            </span>
            <div className="flex-grow border-t border-border"></div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleOAuth("Google")}
              disabled={oauthLoading !== null}
              className="group relative flex items-center justify-center py-2.5 px-4 border border-border bg-card hover:bg-accent/40 rounded-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 active:scale-95 disabled:opacity-50 disabled:pointer-events-none hover:border-muted-foreground/30 shadow-sm"
              aria-label="Continue with Google"
            >
              {oauthLoading === "Google" ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : (
                <GoogleIcon className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
              )}
            </button>
            <button
              onClick={() => handleOAuth("GitHub")}
              disabled={oauthLoading !== null}
              className="group relative flex items-center justify-center py-2.5 px-4 border border-border bg-card hover:bg-accent/40 rounded-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 active:scale-95 disabled:opacity-50 disabled:pointer-events-none hover:border-muted-foreground/30 shadow-sm text-foreground"
              aria-label="Continue with GitHub"
            >
              {oauthLoading === "GitHub" ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : (
                <GithubIcon className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
              )}
            </button>
            <button
              onClick={() => handleOAuth("Meta")}
              disabled={oauthLoading !== null}
              className="group relative flex items-center justify-center py-2.5 px-4 border border-border bg-card hover:bg-accent/40 rounded-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 active:scale-95 disabled:opacity-50 disabled:pointer-events-none hover:border-muted-foreground/30 shadow-sm text-[#0668E1]"
              aria-label="Continue with Meta"
            >
              {oauthLoading === "Meta" ? (
                <Loader2 className="w-5 h-5 animate-spin text-[#0668E1]" />
              ) : (
                <MetaIcon className="w-5.5 h-5.5 transition-transform duration-300 group-hover:scale-110" />
              )}
            </button>
          </div>

          <div className="text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
