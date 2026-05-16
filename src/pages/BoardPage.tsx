import React from "react";
import { useNavigate } from "react-router-dom";
import BoardPanel from "../components/board/BoardPanel";
import { Button } from "../components/ui/button";
import { ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";

const BoardPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-md shrink-0">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => navigate("/")}
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Chat
          </Button>
          <h1 className="font-display text-lg font-bold">Notes Board</h1>
          <div className="w-24" /> {/* Spacer */}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="h-full"
        >
          <BoardPanel onClose={() => navigate("/")} />
        </motion.div>
      </div>
    </div>
  );
};

export default BoardPage;
