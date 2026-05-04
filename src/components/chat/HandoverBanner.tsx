import React from "react";
import { motion } from "framer-motion";
import { Button } from "benchrex/components/ui/button";
import { UserCircle, Sparkles, ArrowRight } from "lucide-react";

interface HandoverBannerProps {
  onConnect: () => void;
  onDismiss: () => void;
}

const HandoverBanner = ({ onConnect, onDismiss }: HandoverBannerProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.98, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: 20, scale: 0.98, filter: "blur(10px)" }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="relative my-6 overflow-hidden rounded-2xl border border-primary/20 bg-background/40 p-1 backdrop-blur-2xl shadow-2xl shadow-primary/5"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-50" />
      
      <div className="relative flex flex-col items-center gap-6 p-6 md:flex-row md:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserCircle className="h-8 w-8" />
            <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 border-2 border-background">
              <Sparkles className="h-3 w-3 text-white" />
            </div>
          </div>
          
          <div className="space-y-1">
            <h3 className="font-display text-lg font-semibold text-foreground">
              Need a deeper explanation?
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Our subject matter experts are online and ready to help you master this topic with 1:1 guidance.
            </p>
          </div>
        </div>

        <div className="flex w-full items-center gap-3 md:w-auto">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onDismiss}
            className="text-muted-foreground hover:text-foreground"
          >
            Maybe later
          </Button>
          <Button 
            onClick={onConnect}
            className="group relative overflow-hidden bg-primary px-8 text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
          >
            <span className="relative z-10 flex items-center gap-2 font-semibold">
              Connect to Expert
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default HandoverBanner;
