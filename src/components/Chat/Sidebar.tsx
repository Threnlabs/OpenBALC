import { Plus, MessageSquare, Pin, Trash2, LogOut, User } from 'lucide-react';
import { useChatStore } from '@/store/useChatStore';
import { supabase } from '@/lib/supabase';

export const Sidebar = () => {
  const { conversations, activeConversationId, setActiveConversationId, createConversation, user } = useChatStore();

  const handleLogout = () => {
    supabase.auth.signOut();
  };

  return (
    <aside className="w-80 h-full border-r border-[var(--border)] bg-[var(--bg-sidebar)] flex flex-col z-20">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="text-white font-bold text-xl">B</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">Benchrex</h1>
        </div>

        <button 
          onClick={createConversation}
          className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-center gap-2 transition-all font-medium group"
        >
          <Plus size={18} className="group-hover:rotate-90 transition-transform" />
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 space-y-1">
        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => setActiveConversationId(conv.id)}
            className={`w-full p-4 rounded-xl flex flex-col gap-1 text-left transition-all group ${
              activeConversationId === conv.id 
                ? 'bg-primary/10 border border-primary/20' 
                : 'hover:bg-white/5 border border-transparent'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-sm font-semibold truncate ${
                activeConversationId === conv.id ? 'text-primary' : 'text-[var(--text-main)]'
              }`}>
                {conv.title}
              </span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {conv.isPinned && <Pin size={12} className="text-primary" />}
              </div>
            </div>
            <span className="text-xs text-[var(--text-muted)] truncate">
              {conv.lastMessage || 'No messages yet'}
            </span>
          </button>
        ))}
      </div>

      <div className="p-4 border-t border-[var(--border)] bg-black/20">
        <div className="flex items-center gap-3 p-2 rounded-xl">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-md">
            {user?.name?.[0] || user?.email[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{user?.name || user?.email}</p>
            <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider">{user?.role || 'Student'}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 text-[var(--text-muted)] hover:text-white transition-colors"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
};
