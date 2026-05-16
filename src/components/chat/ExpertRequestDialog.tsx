import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { MessageSquare, ShieldCheck, Zap } from "lucide-react";

interface ExpertRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (context: string) => void;
}

const ExpertRequestDialog = ({
  open,
  onOpenChange,
  onSubmit,
}: ExpertRequestDialogProps) => {
  const [context, setContext] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(context);
    setContext("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" aria-describedby="expert-request-description">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary fill-primary" />
              Connect with an Expert
            </DialogTitle>
            <DialogDescription id="expert-request-description">
              To give you the best help, tell us what specifically is bothering you about this topic.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="context">Your specific doubt</Label>
              <Textarea
                id="context"
                placeholder="e.g., 'I don't understand how the step from line 3 to 4 happened...'"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                className="min-h-[120px] resize-none"
                required
              />
            </div>

            <div className="flex flex-col gap-3 rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-4 w-4" />
                <span>Your chat history will be shared with the expert.</span>
              </div>
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4" />
                <span>All experts are verified subject matter specialists.</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!context.trim()}>
              Start Session
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ExpertRequestDialog;
