import { useQuery, useMutation } from "@tanstack/react-query";
// --------------------------------------------------------
// Local Storage Helper
// --------------------------------------------------------
const isClient = typeof window !== "undefined";
function getStorageItem(key, defaultValue) {
    if (!isClient)
        return defaultValue;
    const val = localStorage.getItem(key);
    if (!val) {
        localStorage.setItem(key, JSON.stringify(defaultValue));
        return defaultValue;
    }
    try {
        return JSON.parse(val);
    }
    catch (e) {
        return defaultValue;
    }
}
function setStorageItem(key, value) {
    if (isClient) {
        localStorage.setItem(key, JSON.stringify(value));
    }
}
// --------------------------------------------------------
// Initial Data Sets
// --------------------------------------------------------
const DEFAULT_USER = {
    id: 1,
    email: "user@example.com",
    displayName: "Jane Doe",
    username: "janedoe",
    avatarUrl: null,
    phone: null,
    role: "user",
    credits: 100,
    onboardingComplete: true,
    bufferMode: "quotes",
    courses: ["Computer Science"],
    microCourses: ["Machine Learning"],
    interests: ["AI & Technology"]
};
const DEFAULT_CONVERSATIONS = [
    {
        id: 1,
        title: "Welcome to OpenBALC",
        pinned: false,
        lastMessage: "How can I help you learn today?",
        taggedModuleIds: [],
        updatedAt: new Date(Date.now() - 3600000).toISOString(),
        createdAt: new Date(Date.now() - 3600000).toISOString()
    }
];
const DEFAULT_MESSAGES = {
    "1": [
        {
            "id": 1,
            "conversationId": 1,
            "role": "assistant",
            "content": "Hi! I am the OpenBALC assistant. I can help you structure knowledge from uploaded documents, URLs, or custom topics. You can ask me anything about your modules or create tests to challenge yourself!",
            "sources": [],
            "createdAt": new Date(Date.now() - 3600000).toISOString()
        }
    ]
};
const DEFAULT_MODULES = [
    {
        id: 1,
        title: "Introduction to Machine Learning",
        description: "Basic concepts of machine learning including supervised and unsupervised learning, regressions, and neural networks.",
        subject: "Computer Science",
        method: "topic",
        visibility: "public",
        status: "active",
        creditsValue: 0,
        chapterCount: 3,
        sourceCount: 1,
        starCount: 5,
        useCount: 20,
        isStarred: false,
        processingPct: 100,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString()
    }
];
const DEFAULT_SOURCES = {
    "1": [
        {
            id: 1,
            moduleId: 1,
            type: "url",
            name: "Wikipedia - Machine Learning",
            url: "https://en.wikipedia.org/wiki/Machine_learning",
            processed: true,
            createdAt: new Date(Date.now() - 86300000).toISOString()
        }
    ]
};
const DEFAULT_CONTENT = {
    "1": [
        {
            id: 1,
            moduleId: 1,
            chapter: "Chapter 1",
            topic: "What is Machine Learning?",
            content: "Machine learning (ML) is a field of study in artificial intelligence concerned with the development and study of statistical algorithms that can learn from data and generalize to unseen data and perform tasks without explicit instructions.",
            createdAt: new Date(Date.now() - 86200000).toISOString()
        },
        {
            id: 2,
            moduleId: 1,
            chapter: "Chapter 2",
            topic: "Supervised vs Unsupervised Learning",
            content: "Supervised learning algorithms build a mathematical model of a set of data that contains both the inputs and the desired outputs. Unsupervised learning algorithms take a set of data that contains only inputs, and find structure in the data, like grouping or clustering.",
            createdAt: new Date(Date.now() - 86100000).toISOString()
        },
        {
            id: 3,
            moduleId: 1,
            chapter: "Chapter 3",
            topic: "Neural Networks",
            content: "Artificial neural networks (ANNs) are systems inspired by biological neural networks. They consist of interconnected nodes (neurons) that process information in layers, adjusting weights during training to minimize errors.",
            createdAt: new Date(Date.now() - 86000000).toISOString()
        }
    ]
};
const DEFAULT_NOTES = [
    {
        id: 1,
        title: "ML Definition Note",
        content: "Machine learning focuses on statistical algorithms that learn from data and generalize to unseen data.",
        color: "#6366f1",
        pinned: true,
        starred: true,
        sourceTitle: "Wikipedia - Machine Learning",
        updatedAt: new Date(Date.now() - 1800000).toISOString(),
        createdAt: new Date(Date.now() - 1800000).toISOString()
    }
];
const DEFAULT_TESTS = [
    {
        id: 1,
        moduleId: 1,
        title: "Machine Learning Basics Quiz",
        difficulty: "medium",
        questionCount: 3,
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        bestScore: 100,
        questions: [
            {
                id: 1,
                type: "mcq",
                question: "What is the primary difference between supervised and unsupervised learning?",
                options: {
                    "A": "Supervised learning uses labeled training data.",
                    "B": "Unsupervised learning requires humans to label the outcomes.",
                    "C": "Supervised learning is faster to train.",
                    "D": "Unsupervised learning only works on neural networks."
                },
                answer: "A"
            },
            {
                id: 2,
                type: "mcq",
                question: "Which of the following is an example of an unsupervised learning task?",
                options: {
                    "A": "Spam email classification",
                    "B": "Predicting house prices",
                    "C": "Customer segmentation",
                    "D": "Handwritten digit recognition"
                },
                answer: "C"
            },
            {
                id: 3,
                type: "mcq",
                question: "Neural networks are inspired by which biological system?",
                options: {
                    "A": "Biological neural networks (human brain)",
                    "B": "DNA replication structures",
                    "C": "Cardiovascular circulation networks",
                    "D": "Fungal mycelium growth"
                },
                answer: "A"
            }
        ]
    }
];
const DEFAULT_AD_CAMPAIGNS = [
    {
        id: 1,
        title: "Learn React in 10 Days",
        description: "Master the React ecosystem with our free course starting this week.",
        cardDesign: { color: "bg-gradient-to-br from-blue-600 to-cyan-600" },
        status: "active",
        impressions: 1420,
        creditsDistributed: 710,
        createdAt: new Date(Date.now() - 172800000).toISOString()
    }
];
const DEFAULT_ORG = {
    id: 1,
    name: "Acme Learning Group",
    description: "Enterprise training workspace for modern engineering standards.",
    plan: "hosted",
    memberCount: 2,
    credits: 2500
};
const DEFAULT_ORG_MEMBERS = [
    {
        userId: 1,
        displayName: "Jane Doe",
        email: "user@example.com",
        role: "admin",
        creditsUsed: 350,
        creditCap: 1000,
        lastActive: new Date(Date.now() - 600000).toISOString()
    },
    {
        userId: 2,
        displayName: "Alice Smith",
        email: "alice@acme.com",
        role: "member",
        creditsUsed: 150,
        creditCap: 500,
        lastActive: new Date(Date.now() - 1800000).toISOString()
    }
];
const DEFAULT_CREDIT_TRANSACTIONS = [
    {
        id: 1,
        type: "earn",
        amount: 100,
        reason: "Welcome credits",
        createdAt: new Date(Date.now() - 86400000).toISOString()
    }
];
const DEFAULT_NOTIFICATIONS = [
    {
        id: 1,
        title: "Welcome to OpenBALC",
        body: "Thank you for joining our platform. Start by building your first module!",
        read: false,
        createdAt: new Date(Date.now() - 3600000).toISOString()
    }
];
const DEFAULT_EXPERT_QUEUE = [
    {
        id: 1,
        userName: "Jane Doe",
        context: "Need assistance setting up a custom agent for Python Advanced Concepts.",
        status: "open",
        priority: "normal",
        createdAt: new Date(Date.now() - 7200000).toISOString()
    }
];
// --------------------------------------------------------
// Query Keys
// --------------------------------------------------------
export const getListConversationsQueryKey = () => ["listConversations"];
export const getGetConversationQueryKey = (id) => ["getConversation", id];
export const getGetMessagesQueryKey = (conversationId) => ["getMessages", conversationId];
export const getListNotificationsQueryKey = () => ["listNotifications"];
export const getListModulesQueryKey = () => ["listModules"];
export const getListPublicModulesQueryKey = () => ["listPublicModules"];
export const getListAdCampaignsQueryKey = () => ["listAdCampaigns"];
export const getAdminListAdCampaignsQueryKey = () => ["adminListAdCampaigns"];
export const getListNotesQueryKey = () => ["listNotes"];
export const getGetNoteQueryKey = (id) => ["getNote", id];
export const getListTestsQueryKey = () => ["listTests"];
export const getGetModuleSourcesQueryKey = (id) => ["getModuleSources", id];
export const getGetModuleContentQueryKey = (id) => ["getModuleContent", id];
export const getGetOrgQueryKey = () => ["getOrg"];
export const getListOrgMembersQueryKey = () => ["listOrgMembers"];
export const getListExpertQueueQueryKey = () => ["listExpertQueue"];
export const getGetMeQueryKey = () => ["getMe"];
export const getGetCreditsBalanceQueryKey = () => ["getCreditsBalance"];
export const getGetBufferModeQueryKey = () => ["getBufferMode"];
export const getListCreditTransactionsQueryKey = () => ["listCreditTransactions"];
// --------------------------------------------------------
// Auth / Me Hooks
// --------------------------------------------------------
export function useGetMe(options) {
    return useQuery({
        queryKey: getGetMeQueryKey(),
        queryFn: () => getStorageItem("openbalc_user", DEFAULT_USER),
        ...options
    });
}
export function useUpdateMe(options) {
    return useMutation({
        mutationFn: async ({ data }) => {
            const user = getStorageItem("openbalc_user", DEFAULT_USER);
            const updated = { ...user, ...data };
            setStorageItem("openbalc_user", updated);
            return updated;
        },
        ...options
    });
}
export function useCompleteOnboarding(options) {
    return useMutation({
        mutationFn: async ({ data }) => {
            const user = getStorageItem("openbalc_user", DEFAULT_USER);
            const updated = { ...user, ...data, onboardingComplete: true };
            setStorageItem("openbalc_user", updated);
            return updated;
        },
        ...options
    });
}
export function useGetCreditsBalance(options) {
    return useQuery({
        queryKey: getGetCreditsBalanceQueryKey(),
        queryFn: () => {
            const user = getStorageItem("openbalc_user", DEFAULT_USER);
            const txs = getStorageItem("openbalc_credit_transactions", DEFAULT_CREDIT_TRANSACTIONS);
            const used = txs
                .filter(t => t.type === "spend" && new Date(t.createdAt).getMonth() === new Date().getMonth())
                .reduce((sum, t) => sum + t.amount, 0);
            return {
                balance: user.credits,
                usedThisMonth: used
            };
        },
        ...options
    });
}
export function useListCreditTransactions(options) {
    return useQuery({
        queryKey: getListCreditTransactionsQueryKey(),
        queryFn: () => getStorageItem("openbalc_credit_transactions", DEFAULT_CREDIT_TRANSACTIONS),
        ...options
    });
}
export function useGetBufferMode(options) {
    return useQuery({
        queryKey: getGetBufferModeQueryKey(),
        queryFn: () => {
            const user = getStorageItem("openbalc_user", DEFAULT_USER);
            return { mode: user.bufferMode };
        },
        ...options
    });
}
export function useUpdateBufferMode(options) {
    return useMutation({
        mutationFn: async ({ data }) => {
            const user = getStorageItem("openbalc_user", DEFAULT_USER);
            const updated = { ...user, bufferMode: data.mode };
            setStorageItem("openbalc_user", updated);
            return { mode: data.mode };
        },
        ...options
    });
}
// --------------------------------------------------------
// Conversations Hooks
// --------------------------------------------------------
export function useListConversations(options) {
    return useQuery({
        queryKey: getListConversationsQueryKey(),
        queryFn: () => getStorageItem("openbalc_conversations", DEFAULT_CONVERSATIONS),
        ...options
    });
}
export function useGetConversation(id, options) {
    return useQuery({
        queryKey: getGetConversationQueryKey(id),
        queryFn: () => {
            const convs = getStorageItem("openbalc_conversations", DEFAULT_CONVERSATIONS);
            const found = convs.find(c => c.id === id);
            if (!found)
                throw new Error("Conversation not found");
            return found;
        },
        ...options
    });
}
export function useGetMessages(conversationId, options) {
    return useQuery({
        queryKey: getGetMessagesQueryKey(conversationId),
        queryFn: () => {
            const msgs = getStorageItem("openbalc_messages", DEFAULT_MESSAGES);
            return msgs[String(conversationId)] || [];
        },
        ...options
    });
}
export function useCreateConversation(options) {
    return useMutation({
        mutationFn: async ({ data }) => {
            const convs = getStorageItem("openbalc_conversations", DEFAULT_CONVERSATIONS);
            const newId = convs.length > 0 ? Math.max(...convs.map(c => c.id)) + 1 : 1;
            const newConv = {
                id: newId,
                title: data.title || "New conversation",
                pinned: false,
                lastMessage: "",
                taggedModuleIds: data.taggedModuleIds || [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            convs.push(newConv);
            setStorageItem("openbalc_conversations", convs);
            // Create empty message array
            const msgs = getStorageItem("openbalc_messages", DEFAULT_MESSAGES);
            msgs[String(newId)] = [
                {
                    id: 1000 + newId,
                    conversationId: newId,
                    role: "assistant",
                    content: data.taggedModuleIds && data.taggedModuleIds.length > 0
                        ? `Hello! Let's talk about the tagged module(s). Feel free to ask any questions!`
                        : `Hello! I'm here to chat. Ask me anything!`,
                    sources: [],
                    createdAt: new Date().toISOString()
                }
            ];
            setStorageItem("openbalc_messages", msgs);
            return newConv;
        },
        ...options
    });
}
export function useDeleteConversation(options) {
    return useMutation({
        mutationFn: async ({ id }) => {
            const convs = getStorageItem("openbalc_conversations", DEFAULT_CONVERSATIONS);
            const filtered = convs.filter(c => c.id !== id);
            setStorageItem("openbalc_conversations", filtered);
            const msgs = getStorageItem("openbalc_messages", DEFAULT_MESSAGES);
            delete msgs[String(id)];
            setStorageItem("openbalc_messages", msgs);
            return { success: true };
        },
        ...options
    });
}
export function useUpdateConversation(options) {
    return useMutation({
        mutationFn: async ({ id, data }) => {
            const convs = getStorageItem("openbalc_conversations", DEFAULT_CONVERSATIONS);
            const idx = convs.findIndex(c => c.id === id);
            if (idx !== -1) {
                convs[idx] = { ...convs[idx], ...data, updatedAt: new Date().toISOString() };
                setStorageItem("openbalc_conversations", convs);
                return convs[idx];
            }
            throw new Error("Conversation not found");
        },
        ...options
    });
}
export function useSendMessage(options) {
    return useMutation({
        mutationFn: async ({ id, data }) => {
            const msgs = getStorageItem("openbalc_messages", DEFAULT_MESSAGES);
            const conversationMsgs = msgs[String(id)] || [];
            const newMsgId = conversationMsgs.length > 0 ? Math.max(...conversationMsgs.map(m => m.id)) + 1 : 1;
            // Check for module references via '@' mention
            const sources = [];
            const modules = getStorageItem("openbalc_modules", DEFAULT_MODULES);
            modules.forEach(m => {
                if (data.content.includes(`@${m.title}`)) {
                    sources.push(m.title);
                }
            });
            const userMsg = {
                id: newMsgId,
                conversationId: id,
                role: "user",
                content: data.content,
                sources: [],
                createdAt: new Date().toISOString()
            };
            conversationMsgs.push(userMsg);
            // Simple AI reply simulation
            const replyContent = data.webSearch
                ? `[Web Search Active] I searched for details related to your query. Based on that and the context: "${data.content.replace(/@\w+/g, "").trim()}", here is what I found. Let me know if you need more details!`
                : `Interesting question! Let's explore "${data.content.replace(/@\w+/g, "").trim()}". Based on your learning profile and modules, here is a structured breakdown. Let me know if you would like me to generate a quick practice test on this topic.`;
            const aiMsg = {
                id: newMsgId + 1,
                conversationId: id,
                role: "assistant",
                content: replyContent,
                sources: sources,
                createdAt: new Date(Date.now() + 1000).toISOString()
            };
            conversationMsgs.push(aiMsg);
            msgs[String(id)] = conversationMsgs;
            setStorageItem("openbalc_messages", msgs);
            // Update last message and credits
            const convs = getStorageItem("openbalc_conversations", DEFAULT_CONVERSATIONS);
            const convIdx = convs.findIndex(c => c.id === id);
            if (convIdx !== -1) {
                convs[convIdx].lastMessage = data.content;
                convs[convIdx].updatedAt = new Date().toISOString();
                setStorageItem("openbalc_conversations", convs);
            }
            const user = getStorageItem("openbalc_user", DEFAULT_USER);
            if (user.credits >= 2) {
                user.credits -= 2;
                setStorageItem("openbalc_user", user);
                const txs = getStorageItem("openbalc_credit_transactions", DEFAULT_CREDIT_TRANSACTIONS);
                txs.unshift({
                    id: txs.length + 1,
                    type: "spend",
                    amount: 2,
                    reason: "Chat Message processing",
                    createdAt: new Date().toISOString()
                });
                setStorageItem("openbalc_credit_transactions", txs);
            }
            return aiMsg;
        },
        ...options
    });
}
// --------------------------------------------------------
// Notifications Hooks
// --------------------------------------------------------
export function useListNotifications(options) {
    return useQuery({
        queryKey: getListNotificationsQueryKey(),
        queryFn: () => getStorageItem("openbalc_notifications", DEFAULT_NOTIFICATIONS),
        ...options
    });
}
export function useMarkAllNotificationsRead(options) {
    return useMutation({
        mutationFn: async () => {
            const notifs = getStorageItem("openbalc_notifications", DEFAULT_NOTIFICATIONS);
            const updated = notifs.map(n => ({ ...n, read: true }));
            setStorageItem("openbalc_notifications", updated);
            return updated;
        },
        ...options
    });
}
// --------------------------------------------------------
// Modules Hooks
// --------------------------------------------------------
export function useListModules(params, options) {
    return useQuery({
        queryKey: getListModulesQueryKey(),
        queryFn: () => getStorageItem("openbalc_modules", DEFAULT_MODULES),
        ...options
    });
}
export function useListPublicModules(params, options) {
    return useQuery({
        queryKey: getListPublicModulesQueryKey(),
        queryFn: () => {
            const mods = getStorageItem("openbalc_modules", DEFAULT_MODULES);
            let filtered = mods.filter(m => m.visibility === "public");
            if (params?.search) {
                const query = params.search.toLowerCase();
                filtered = filtered.filter(m => m.title.toLowerCase().includes(query) || m.description?.toLowerCase().includes(query));
            }
            if (params?.sort === "most_used") {
                filtered.sort((a, b) => b.useCount - a.useCount);
            }
            else if (params?.sort === "stars") {
                filtered.sort((a, b) => b.starCount - a.starCount);
            }
            else {
                filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            }
            return filtered;
        },
        ...options
    });
}
export function useGetModule(id, options) {
    return useQuery({
        queryKey: ["getModule", id],
        queryFn: () => {
            const mods = getStorageItem("openbalc_modules", DEFAULT_MODULES);
            const found = mods.find(m => m.id === id);
            if (!found)
                throw new Error("Module not found");
            return found;
        },
        ...options
    });
}
export function useCreateModule(options) {
    return useMutation({
        mutationFn: async ({ data }) => {
            const mods = getStorageItem("openbalc_modules", DEFAULT_MODULES);
            const newId = mods.length > 0 ? Math.max(...mods.map(m => m.id)) + 1 : 1;
            const newMod = {
                id: newId,
                title: data.title,
                description: data.description || "",
                subject: data.subject || "General Study",
                method: data.method || "topic",
                visibility: "private",
                status: data.method === "topic" ? "active" : "processing",
                creditsValue: 0,
                chapterCount: data.method === "topic" ? 2 : 0,
                sourceCount: 0,
                starCount: 0,
                useCount: 0,
                isStarred: false,
                processingPct: data.method === "topic" ? 100 : 10,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            mods.push(newMod);
            setStorageItem("openbalc_modules", mods);
            // Create empty sources list
            const srcs = getStorageItem("openbalc_module_sources", DEFAULT_SOURCES);
            srcs[String(newId)] = [];
            setStorageItem("openbalc_module_sources", srcs);
            // Create content if topic method
            const content = getStorageItem("openbalc_module_content", DEFAULT_CONTENT);
            if (data.method === "topic") {
                content[String(newId)] = [
                    {
                        id: newId * 100 + 1,
                        moduleId: newId,
                        chapter: "Chapter 1",
                        topic: `Core concepts of ${data.title}`,
                        content: `Here is a comprehensive breakdown of the core concepts relating to ${data.title}. This includes fundamental principles, frameworks, and key methodologies used in the industry today.`,
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: newId * 100 + 2,
                        moduleId: newId,
                        chapter: "Chapter 2",
                        topic: `Practical applications of ${data.title}`,
                        content: `In this section, we review the practical execution and industry applications of ${data.title}. We look at practical code frameworks, design architectures, and common real-world usage scenarios.`,
                        createdAt: new Date().toISOString()
                    }
                ];
            }
            else {
                content[String(newId)] = [];
            }
            setStorageItem("openbalc_module_content", content);
            return newMod;
        },
        ...options
    });
}
export function useDeleteModule(options) {
    return useMutation({
        mutationFn: async ({ id }) => {
            const mods = getStorageItem("openbalc_modules", DEFAULT_MODULES);
            const filtered = mods.filter(m => m.id !== id);
            setStorageItem("openbalc_modules", filtered);
            return { success: true };
        },
        ...options
    });
}
export function usePublishModule(options) {
    return useMutation({
        mutationFn: async ({ id }) => {
            const mods = getStorageItem("openbalc_modules", DEFAULT_MODULES);
            const idx = mods.findIndex(m => m.id === id);
            if (idx !== -1) {
                mods[idx].visibility = "public";
                setStorageItem("openbalc_modules", mods);
                return mods[idx];
            }
            throw new Error("Module not found");
        },
        ...options
    });
}
export function useStarModule(options) {
    return useMutation({
        mutationFn: async ({ id }) => {
            const mods = getStorageItem("openbalc_modules", DEFAULT_MODULES);
            const idx = mods.findIndex(m => m.id === id);
            if (idx !== -1) {
                const current = mods[idx].isStarred;
                mods[idx].isStarred = !current;
                mods[idx].starCount += !current ? 1 : -1;
                setStorageItem("openbalc_modules", mods);
                return mods[idx];
            }
            throw new Error("Module not found");
        },
        ...options
    });
}
export function useGetModuleSources(id, options) {
    return useQuery({
        queryKey: getGetModuleSourcesQueryKey(id),
        queryFn: () => {
            const srcs = getStorageItem("openbalc_module_sources", DEFAULT_SOURCES);
            return srcs[String(id)] || [];
        },
        ...options
    });
}
export function useGetModuleContent(id, options) {
    return useQuery({
        queryKey: getGetModuleContentQueryKey(id),
        queryFn: () => {
            const content = getStorageItem("openbalc_module_content", DEFAULT_CONTENT);
            return content[String(id)] || [];
        },
        ...options
    });
}
export function useAddModuleSource(options) {
    return useMutation({
        mutationFn: async ({ id, data }) => {
            const srcs = getStorageItem("openbalc_module_sources", DEFAULT_SOURCES);
            const moduleSrcs = srcs[String(id)] || [];
            const newId = moduleSrcs.length > 0 ? Math.max(...moduleSrcs.map(s => s.id)) + 1 : 1;
            const newSrc = {
                id: newId,
                moduleId: id,
                type: data.type,
                name: data.name,
                url: data.url || null,
                processed: true,
                createdAt: new Date().toISOString()
            };
            moduleSrcs.push(newSrc);
            srcs[String(id)] = moduleSrcs;
            setStorageItem("openbalc_module_sources", srcs);
            // Generate simulation chapters from source
            const content = getStorageItem("openbalc_module_content", DEFAULT_CONTENT);
            const moduleContent = content[String(id)] || [];
            const nextChNum = moduleContent.length > 0 ? Math.max(...moduleContent.map(c => parseInt(c.chapter.replace("Chapter ", "")) || 0)) + 1 : 1;
            moduleContent.push({
                id: id * 100 + nextChNum,
                moduleId: id,
                chapter: `Chapter ${nextChNum}`,
                topic: `Summary of ${data.name}`,
                content: `This chapter covers content ingested from the source "${data.name}". It is organized as an outline summarizing key facts, definitions, and references found in the document.`,
                createdAt: new Date().toISOString()
            });
            content[String(id)] = moduleContent;
            setStorageItem("openbalc_module_content", content);
            // Update module source count and status
            const mods = getStorageItem("openbalc_modules", DEFAULT_MODULES);
            const mIdx = mods.findIndex(m => m.id === id);
            if (mIdx !== -1) {
                mods[mIdx].sourceCount += 1;
                mods[mIdx].chapterCount += 1;
                mods[mIdx].status = "active";
                mods[mIdx].processingPct = 100;
                setStorageItem("openbalc_modules", mods);
            }
            return newSrc;
        },
        ...options
    });
}
// --------------------------------------------------------
// Ad Portal Hooks
// --------------------------------------------------------
export function useListAdCampaigns(options) {
    return useQuery({
        queryKey: getListAdCampaignsQueryKey(),
        queryFn: () => getStorageItem("openbalc_ad_campaigns", DEFAULT_AD_CAMPAIGNS),
        ...options
    });
}
export function useRegisterAdBusiness(options) {
    return useMutation({
        mutationFn: async ({ data }) => {
            // Simulating business registration
            return { success: true, business: data };
        },
        ...options
    });
}
export function useCreateAdCampaign(options) {
    return useMutation({
        mutationFn: async ({ data }) => {
            const campaigns = getStorageItem("openbalc_ad_campaigns", DEFAULT_AD_CAMPAIGNS);
            const newId = campaigns.length > 0 ? Math.max(...campaigns.map(c => c.id)) + 1 : 1;
            const newCampaign = {
                id: newId,
                title: data.title,
                description: data.description,
                cardDesign: data.cardDesign,
                status: "pending",
                impressions: 0,
                creditsDistributed: 0,
                createdAt: new Date().toISOString()
            };
            campaigns.unshift(newCampaign);
            setStorageItem("openbalc_ad_campaigns", campaigns);
            return newCampaign;
        },
        ...options
    });
}
export function useAdminListAdCampaigns(options) {
    return useQuery({
        queryKey: getAdminListAdCampaignsQueryKey(),
        queryFn: () => getStorageItem("openbalc_ad_campaigns", DEFAULT_AD_CAMPAIGNS),
        ...options
    });
}
export function useApproveAdCampaign(options) {
    return useMutation({
        mutationFn: async ({ id }) => {
            const campaigns = getStorageItem("openbalc_ad_campaigns", DEFAULT_AD_CAMPAIGNS);
            const idx = campaigns.findIndex(c => c.id === id);
            if (idx !== -1) {
                campaigns[idx].status = "active";
                setStorageItem("openbalc_ad_campaigns", campaigns);
                return campaigns[idx];
            }
            throw new Error("Campaign not found");
        },
        ...options
    });
}
export function useRejectAdCampaign(options) {
    return useMutation({
        mutationFn: async ({ id, rejectReason }) => {
            const campaigns = getStorageItem("openbalc_ad_campaigns", DEFAULT_AD_CAMPAIGNS);
            const idx = campaigns.findIndex(c => c.id === id);
            if (idx !== -1) {
                campaigns[idx].status = "rejected";
                campaigns[idx].rejectReason = rejectReason;
                setStorageItem("openbalc_ad_campaigns", campaigns);
                return campaigns[idx];
            }
            throw new Error("Campaign not found");
        },
        ...options
    });
}
// --------------------------------------------------------
// Notes Hooks
// --------------------------------------------------------
export function useListNotes(options) {
    return useQuery({
        queryKey: getListNotesQueryKey(),
        queryFn: () => getStorageItem("openbalc_notes", DEFAULT_NOTES),
        ...options
    });
}
export function useCreateNote(options) {
    return useMutation({
        mutationFn: async ({ data }) => {
            const notes = getStorageItem("openbalc_notes", DEFAULT_NOTES);
            const newId = notes.length > 0 ? Math.max(...notes.map(n => n.id)) + 1 : 1;
            const newNote = {
                id: newId,
                title: data.title,
                content: data.content || "",
                color: data.color || "#6366f1",
                pinned: data.pinned || false,
                starred: false,
                sourceTitle: data.sourceTitle || null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            notes.push(newNote);
            setStorageItem("openbalc_notes", notes);
            return newNote;
        },
        ...options
    });
}
export function useUpdateNote(options) {
    return useMutation({
        mutationFn: async ({ id, data }) => {
            const notes = getStorageItem("openbalc_notes", DEFAULT_NOTES);
            const idx = notes.findIndex(n => n.id === id);
            if (idx !== -1) {
                notes[idx] = { ...notes[idx], ...data, updatedAt: new Date().toISOString() };
                setStorageItem("openbalc_notes", notes);
                return notes[idx];
            }
            throw new Error("Note not found");
        },
        ...options
    });
}
export function useDeleteNote(options) {
    return useMutation({
        mutationFn: async ({ id }) => {
            const notes = getStorageItem("openbalc_notes", DEFAULT_NOTES);
            const filtered = notes.filter(n => n.id !== id);
            setStorageItem("openbalc_notes", filtered);
            return { success: true };
        },
        ...options
    });
}
// --------------------------------------------------------
// Tests Hooks
// --------------------------------------------------------
export function useListTests(options) {
    return useQuery({
        queryKey: getListTestsQueryKey(),
        queryFn: () => getStorageItem("openbalc_tests", DEFAULT_TESTS),
        ...options
    });
}
export function useCreateTest(options) {
    return useMutation({
        mutationFn: async ({ data }) => {
            const tests = getStorageItem("openbalc_tests", DEFAULT_TESTS);
            const newId = tests.length > 0 ? Math.max(...tests.map(t => t.id)) + 1 : 1;
            // Simulate generating 2 questions
            const questions = [
                {
                    id: newId * 10 + 1,
                    type: "mcq",
                    question: `Regarding "${data.title}": Which of the following is a primary consideration for beginner learners?`,
                    options: {
                        "A": "Starting with complex, custom neural architectures right away.",
                        "B": "Focusing on core basics, definitions, and simple algorithms.",
                        "C": "Deploying systems to high-concurrency cloud environments immediately.",
                        "D": "Leaving hyperparameter tuning entirely to manual intuition without benchmarks."
                    },
                    answer: "B"
                },
                {
                    id: newId * 10 + 2,
                    type: "mcq",
                    question: `Which difficulty tier best matches standard setups of "${data.title}"?`,
                    options: {
                        "A": "Easy - simple formulas only.",
                        "B": "Medium - intermediate configurations and models.",
                        "C": "Hard - research level mathematics.",
                        "D": "Varies by case - matching the user's focus."
                    },
                    answer: "D"
                }
            ];
            const newTest = {
                id: newId,
                moduleId: null,
                title: data.title,
                difficulty: data.difficulty || "medium",
                questionCount: questions.length,
                createdAt: new Date().toISOString(),
                bestScore: null,
                questions: questions
            };
            tests.unshift(newTest);
            setStorageItem("openbalc_tests", tests);
            return newTest;
        },
        ...options
    });
}
export function useGetTest(id, options) {
    return useQuery({
        queryKey: ["getTest", id],
        queryFn: () => {
            const tests = getStorageItem("openbalc_tests", DEFAULT_TESTS);
            const found = tests.find(t => t.id === id);
            if (!found)
                throw new Error("Test not found");
            return found;
        },
        ...options
    });
}
export function useDeleteTest(options) {
    return useMutation({
        mutationFn: async ({ id }) => {
            const tests = getStorageItem("openbalc_tests", DEFAULT_TESTS);
            const filtered = tests.filter(t => t.id !== id);
            setStorageItem("openbalc_tests", filtered);
            return { success: true };
        },
        ...options
    });
}
export function useSubmitTestAttempt(options) {
    return useMutation({
        mutationFn: async ({ id, data }) => {
            const tests = getStorageItem("openbalc_tests", DEFAULT_TESTS);
            const tIdx = tests.findIndex(t => t.id === id);
            if (tIdx === -1)
                throw new Error("Test not found");
            const test = tests[tIdx];
            let correct = 0;
            test.questions.forEach((q) => {
                if (data.answers[q.id] === q.answer) {
                    correct += 1;
                }
            });
            const score = (correct / test.questions.length) * 100;
            if (test.bestScore === null || score > test.bestScore) {
                tests[tIdx].bestScore = score;
                setStorageItem("openbalc_tests", tests);
            }
            // Record transaction reward (earn 10 credits for passing score of 80%+)
            if (score >= 80) {
                const user = getStorageItem("openbalc_user", DEFAULT_USER);
                user.credits += 10;
                setStorageItem("openbalc_user", user);
                const txs = getStorageItem("openbalc_credit_transactions", DEFAULT_CREDIT_TRANSACTIONS);
                txs.unshift({
                    id: txs.length + 1,
                    type: "earn",
                    amount: 10,
                    reason: `High score on test: ${test.title}`,
                    createdAt: new Date().toISOString()
                });
                setStorageItem("openbalc_credit_transactions", txs);
                const notifs = getStorageItem("openbalc_notifications", DEFAULT_NOTIFICATIONS);
                notifs.unshift({
                    id: notifs.length + 1,
                    title: "Credits earned!",
                    body: `You scored ${Math.round(score)}% and earned 10 credits!`,
                    read: false,
                    createdAt: new Date().toISOString()
                });
                setStorageItem("openbalc_notifications", notifs);
            }
            return { score };
        },
        ...options
    });
}
// --------------------------------------------------------
// Dashboard / Summary Hooks
// --------------------------------------------------------
export function useGetDashboardSummary(options) {
    return useQuery({
        queryKey: ["getDashboardSummary"],
        queryFn: () => {
            const mods = getStorageItem("openbalc_modules", DEFAULT_MODULES);
            const convs = getStorageItem("openbalc_conversations", DEFAULT_CONVERSATIONS);
            const user = getStorageItem("openbalc_user", DEFAULT_USER);
            const txs = getStorageItem("openbalc_credit_transactions", DEFAULT_CREDIT_TRANSACTIONS);
            const weeklyQuestions = txs
                .filter(t => t.type === "spend" && new Date(t.createdAt).getTime() > Date.now() - 7 * 86400000)
                .length;
            return {
                moduleCount: mods.length,
                conversationCount: convs.length,
                credits: user.credits,
                weeklyQuestions: weeklyQuestions,
                recentModules: mods.slice(0, 4),
                recentConversations: convs.slice(0, 3)
            };
        },
        ...options
    });
}
export function useGetRecentActivity(options) {
    return useQuery({
        queryKey: ["getRecentActivity"],
        queryFn: () => {
            const txs = getStorageItem("openbalc_credit_transactions", DEFAULT_CREDIT_TRANSACTIONS);
            const mods = getStorageItem("openbalc_modules", DEFAULT_MODULES);
            const activities = [];
            mods.forEach(m => {
                activities.push({
                    id: `mod_${m.id}`,
                    description: `Created module: ${m.title}`,
                    createdAt: m.createdAt
                });
            });
            txs.forEach(t => {
                activities.push({
                    id: `tx_${t.id}`,
                    description: `${t.type === "earn" ? "Earned" : "Spent"} ${t.amount} credits for "${t.reason}"`,
                    createdAt: t.createdAt
                });
            });
            activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            return activities;
        },
        ...options
    });
}
export function useGetTrendingModules(options) {
    return useQuery({
        queryKey: ["getTrendingModules"],
        queryFn: () => {
            const mods = getStorageItem("openbalc_modules", DEFAULT_MODULES);
            return [...mods].sort((a, b) => b.useCount - a.useCount);
        },
        ...options
    });
}
// --------------------------------------------------------
// Org Hooks
// --------------------------------------------------------
export function useGetOrg(options) {
    return useQuery({
        queryKey: getGetOrgQueryKey(),
        queryFn: () => getStorageItem("openbalc_org", DEFAULT_ORG),
        ...options
    });
}
export function useCreateOrg(options) {
    return useMutation({
        mutationFn: async ({ data }) => {
            const newOrg = {
                id: 2,
                name: data.name,
                description: data.description || "",
                plan: data.plan || "hosted",
                memberCount: 1,
                credits: 1000
            };
            setStorageItem("openbalc_org", newOrg);
            const newMembers = [
                {
                    userId: 1,
                    displayName: "Jane Doe",
                    email: "user@example.com",
                    role: "admin",
                    creditsUsed: 0,
                    creditCap: 1000,
                    lastActive: new Date().toISOString()
                }
            ];
            setStorageItem("openbalc_org_members", newMembers);
            return newOrg;
        },
        ...options
    });
}
export function useListOrgMembers(options) {
    return useQuery({
        queryKey: getListOrgMembersQueryKey(),
        queryFn: () => getStorageItem("openbalc_org_members", DEFAULT_ORG_MEMBERS),
        ...options
    });
}
export function useInviteOrgMember(options) {
    return useMutation({
        mutationFn: async ({ data }) => {
            const members = getStorageItem("openbalc_org_members", DEFAULT_ORG_MEMBERS);
            const newMember = {
                userId: members.length + 1,
                displayName: data.email.split("@")[0],
                email: data.email,
                role: data.role || "member",
                creditsUsed: 0,
                creditCap: 500,
                lastActive: null
            };
            members.push(newMember);
            setStorageItem("openbalc_org_members", members);
            const org = getStorageItem("openbalc_org", DEFAULT_ORG);
            org.memberCount += 1;
            setStorageItem("openbalc_org", org);
            return newMember;
        },
        ...options
    });
}
export function useGetOrgAnalytics(params, options) {
    return useQuery({
        queryKey: ["getOrgAnalytics", params?.period],
        queryFn: () => {
            const days = params?.period === "7d" ? 7 : params?.period === "90d" ? 90 : 30;
            const questionsPerDay = [];
            for (let i = days - 1; i >= 0; i--) {
                const date = new Date(Date.now() - i * 86400000);
                questionsPerDay.push({
                    date: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
                    count: Math.floor(Math.random() * 15) + 2
                });
            }
            return {
                totalCreditsUsed: questionsPerDay.reduce((sum, d) => sum + d.count * 2, 0),
                questionsPerDay,
                topMembers: [
                    { displayName: "Jane Doe", questionsAsked: 48 },
                    { displayName: "Alice Smith", questionsAsked: 18 }
                ],
                topModules: [
                    { title: "Introduction to Machine Learning", accessCount: 34 }
                ]
            };
        },
        ...options
    });
}
export function useListExpertQueue(params, options) {
    return useQuery({
        queryKey: getListExpertQueueQueryKey(),
        queryFn: () => {
            const queue = getStorageItem("openbalc_expert_queue", DEFAULT_EXPERT_QUEUE);
            return queue.filter(q => q.status === (params?.status || "open"));
        },
        ...options
    });
}
export function useReplyExpertTicket(options) {
    return useMutation({
        mutationFn: async ({ data }) => {
            const queue = getStorageItem("openbalc_expert_queue", DEFAULT_EXPERT_QUEUE);
            const idx = queue.findIndex(q => q.id === data.ticketId);
            if (idx !== -1) {
                queue[idx].status = data.resolve ? "resolved" : "in_progress";
                queue[idx].reply = data.reply;
                setStorageItem("openbalc_expert_queue", queue);
                return queue[idx];
            }
            throw new Error("Ticket not found");
        },
        ...options
    });
}
