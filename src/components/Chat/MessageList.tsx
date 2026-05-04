import { motion, AnimatePresence } from 'framer-motion';
import type { Message } from '@/types';
import { useChatStore } from '@/store/useChatStore';
import { Sparkles, User, BrainCircuit } from 'lucide-react';

interface MessageListProps {
  messages: Message[];
}

export const MessageList = ({ messages }: MessageListProps) => {
  const { isTyping } = useChatStore();

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="w-24 h-24 bg-primary/10 rounded-[2rem] flex items-center justify-center mb-6 relative">
          <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
          <BrainCircuit size={48} className="text-primary relative" />
        </div>
        <h2 className="text-3xl font-bold mb-3">Welcome to Benchrex</h2>
        <p className="text-[var(--text-muted)] max-w-md text-lg">
          Your personal AI expert for courses and doubts. Ask me anything to get started.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-12 w-full max-w-2xl">
          {[
            "Explain the concept of Law of Torts",
            "How to prepare for Accountancy boards?",
            "What is the difference between ROI and ROE?",
            "Summarize the latest budget highlights"
          ].map((q, i) => (
            <button 
              key={i}
              className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/30 hover:bg-primary/5 text-left transition-all group"
            >
              <p className="text-sm font-medium text-[var(--text-muted)] group-hover:text-primary transition-colors">{q}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {messages.map((msg, i) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${
              msg.role === 'user' ? 'bg-zinc-800' : 'bg-primary/20'
            }`}>
              {msg.role === 'user' ? <User size={20} /> : <Sparkles size={20} className="text-primary" />}
            </div>
            
            <div className={`flex flex-col max-w-[80%] gap-2 ${msg.role === 'user' ? 'items-end' : ''}`}>
              <div className={`p-5 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-zinc-800/80 text-white border border-white/5' 
                  : 'bg-white/5 text-zinc-200 border border-white/5 shadow-xl'
              }`}>
                {msg.content}
              </div>
              
              {msg.reasoning && (
                <div className="mt-2 p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-[12px] text-indigo-300 italic">
                  <div className="flex items-center gap-2 mb-1">
                    <BrainCircuit size={12} />
                    <span className="font-bold uppercase tracking-wider text-[10px]">Thinking Process</span>
                  </div>
                  {msg.reasoning}
                </div>
              )}
              
              <span className="text-[10px] text-[var(--text-muted)] font-medium">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </motion.div>
        ))}
        
        {isTyping && (
          <div className="flex gap-4 animate-pulse">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Sparkles size={20} className="text-primary" />
            </div>
            <div className="p-5 rounded-2xl bg-white/5 border border-white/5 text-sm text-zinc-400">
              Benchrex is thinking...
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
