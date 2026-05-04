import React, { useState, useRef } from 'react';
import { Send, Paperclip, Sparkles, ChevronDown } from 'lucide-react';
import { useChatStore } from '@/store/useChatStore';

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export const MessageInput = ({ onSend, disabled }: MessageInputProps) => {
  const [text, setText] = useState('');
  const { personalities, selectedPersonalityId, setSelectedPersonalityId } = useChatStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  };

  const selectedPersona = personalities.find(p => p.id === selectedPersonalityId);

  return (
    <div className="p-6 relative">
      <div className="max-w-4xl mx-auto">
        <form 
          onSubmit={handleSubmit}
          className="relative glass-panel rounded-[2rem] p-2 pr-4 pl-3 shadow-2xl flex items-end gap-2 border border-white/10"
        >
          {/* Persona Selector */}
          <div className="flex items-center self-center px-2 py-2 rounded-2xl hover:bg-white/5 cursor-pointer transition-all border border-transparent hover:border-white/5">
            <span className="text-xl mr-2">{selectedPersona?.icon}</span>
            <span className="text-xs font-bold mr-1 hidden sm:block">{selectedPersona?.name}</span>
            <ChevronDown size={14} className="text-[var(--text-muted)]" />
          </div>

          <div className="w-px h-6 bg-white/10 self-center mx-1" />

          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            rows={1}
            disabled={disabled}
            className="flex-1 bg-transparent border-none outline-none py-3 px-2 text-sm text-white placeholder:text-zinc-500 resize-none min-h-[44px]"
          />

          <div className="flex items-center gap-2 pb-1">
            <button 
              type="button"
              className="p-2 text-zinc-400 hover:text-white transition-colors rounded-full hover:bg-white/5"
            >
              <Paperclip size={20} />
            </button>
            <button 
              type="submit"
              disabled={!text.trim() || disabled}
              className={`p-2.5 rounded-full transition-all flex items-center justify-center ${
                text.trim() && !disabled 
                  ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-100 hover:scale-105 active:scale-95' 
                  : 'bg-zinc-800 text-zinc-500 scale-100 opacity-50'
              }`}
            >
              <Send size={18} />
            </button>
          </div>
        </form>
        <p className="text-[10px] text-center mt-3 text-zinc-500 font-medium">
          Benchrex is an AI and can make mistakes. Check important info.
        </p>
      </div>
    </div>
  );
};
