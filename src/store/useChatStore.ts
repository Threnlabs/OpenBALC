import { create } from 'zustand';
import type { Conversation, Message, User, AIPersonality } from '../types';

interface ChatState {
  user: User | null;
  conversations: Conversation[];
  activeConversationId: string | null;
  isTyping: boolean;
  personalities: AIPersonality[];
  selectedPersonalityId: string;
  
  setUser: (user: User | null) => void;
  setConversations: (convs: Conversation[]) => void;
  setActiveConversationId: (id: string | null) => void;
  addMessage: (convId: string, message: Message) => void;
  setIsTyping: (isTyping: boolean) => void;
  setSelectedPersonalityId: (id: string) => void;
  createConversation: () => string;
}

export const useChatStore = create<ChatState>((set, get) => ({
  user: null,
  conversations: [],
  activeConversationId: null,
  isTyping: false,
  personalities: [
    {
      id: 'academic-tutor',
      name: 'Academic Tutor',
      icon: '🎓',
      description: 'Expert in core academic subjects',
      model: 'llama-3.3-70b-versatile',
      systemInstructions: 'You are a helpful academic tutor. Explain complex concepts simply.'
    },
    {
      id: 'tax-expert',
      name: 'Tax Expert',
      icon: '⚖️',
      description: 'Specialist in tax laws and accounting',
      model: 'llama-3.3-70b-versatile',
      systemInstructions: 'You are a professional tax expert. Provide accurate tax advice and explanations.'
    }
  ],
  selectedPersonalityId: 'academic-tutor',

  setUser: (user) => set({ user }),
  setConversations: (conversations) => set({ conversations }),
  setActiveConversationId: (activeConversationId) => set({ activeConversationId }),
  setIsTyping: (isTyping) => set({ isTyping }),
  setSelectedPersonalityId: (selectedPersonalityId) => set({ selectedPersonalityId }),
  
  addMessage: (convId, message) => set((state) => ({
    conversations: state.conversations.map((c) => 
      c.id === convId ? { ...c, messages: [...c.messages, message], lastMessage: message.content, timestamp: message.timestamp } : c
    )
  })),

  createConversation: () => {
    const id = crypto.randomUUID();
    const newConv: Conversation = {
      id,
      title: 'New Conversation',
      timestamp: Date.now(),
      messages: []
    };
    set((state) => ({
      conversations: [newConv, ...state.conversations],
      activeConversationId: id
    }));
    return id;
  }
}));
