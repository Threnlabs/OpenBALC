import { Topic, Source } from "../types";

export function getDefaultTopics(): Topic[] {
  return [
    // School
    {
      id: "1", subject: "Accountancy", chapter: "Financial Statements", category: "school",
      sections: [
        { id: "1-1", name: "Trading Account" },
        { id: "1-2", name: "Profit & Loss Account" },
        { id: "1-3", name: "Balance Sheet" },
        { id: "1-4", name: "Adjustments" },
      ],
    },
    {
      id: "2", subject: "Accountancy", chapter: "Depreciation", category: "school",
      sections: [
        { id: "2-1", name: "Straight Line Method" },
        { id: "2-2", name: "Written Down Value" },
        { id: "2-3", name: "Disposal of Assets" },
      ],
    },
    {
      id: "3", subject: "Accountancy", chapter: "Partnership Accounts", category: "school",
      sections: [
        { id: "3-1", name: "Admission of Partner" },
        { id: "3-2", name: "Retirement" },
        { id: "3-3", name: "Dissolution" },
      ],
    },
    { id: "4", subject: "Accountancy", chapter: "Company Accounts", category: "school",
      sections: [
        { id: "4-1", name: "Issue of Shares" },
        { id: "4-2", name: "Debentures" },
      ],
    },
    { id: "5", subject: "Accountancy", chapter: "Cash Flow Statement", category: "school",
      sections: [
        { id: "5-1", name: "Operating Activities" },
        { id: "5-2", name: "Investing Activities" },
        { id: "5-3", name: "Financing Activities" },
      ],
    },
    { id: "6", subject: "Business Studies", chapter: "Marketing Management", category: "school",
      sections: [
        { id: "6-1", name: "4 Ps of Marketing" },
        { id: "6-2", name: "Consumer Behaviour" },
      ],
    },
    { id: "7", subject: "Business Studies", chapter: "Financial Management", category: "school",
      sections: [
        { id: "7-1", name: "Capital Structure" },
        { id: "7-2", name: "Working Capital" },
      ],
    },
    { id: "8", subject: "Business Studies", chapter: "Planning", category: "school" },
    { id: "9", subject: "Economics", chapter: "National Income", category: "school",
      sections: [
        { id: "9-1", name: "GDP & GNP" },
        { id: "9-2", name: "Methods of Calculation" },
      ],
    },
    { id: "10", subject: "Economics", chapter: "Money & Banking", category: "school" },
    { id: "11", subject: "Economics", chapter: "Demand & Supply", category: "school" },
    { id: "12", subject: "Mathematics", chapter: "Matrices", category: "school" },
    { id: "13", subject: "Mathematics", chapter: "Linear Programming", category: "school" },
    // College
    { id: "14", subject: "Financial Accounting", chapter: "Journal Entries", category: "college" },
    { id: "15", subject: "Cost Accounting", chapter: "Marginal Costing", category: "college" },
    { id: "16", subject: "Cost Accounting", chapter: "Standard Costing", category: "college" },
    { id: "17", subject: "Taxation", chapter: "Income Tax Basics", category: "college" },
    { id: "18", subject: "Taxation", chapter: "GST", category: "college",
      sections: [
        { id: "18-1", name: "GST Registration" },
        { id: "18-2", name: "Input Tax Credit" },
        { id: "18-3", name: "GST Returns" },
      ],
    },
    { id: "19", subject: "Auditing", chapter: "Audit Procedures", category: "college" },
    // Professional
    { id: "20", subject: "Advanced Accounting", chapter: "Amalgamation", category: "professional" },
    { id: "21", subject: "Corporate Law", chapter: "Company Formation", category: "professional" },
    { id: "22", subject: "Strategic Management", chapter: "SWOT Analysis", category: "professional" },
    { id: "23", subject: "Financial Reporting", chapter: "Ind AS", category: "professional" },
  ];
}

const MOCK_ANSWERS: Record<string, { answer: string; sources: Source[] }> = {
  default: {
    answer: `## Here's what you need to know

This is a **great question**! Let me break it down for you step by step.

### Key Concepts
1. **First**, understand the foundational principle behind this topic
2. **Second**, apply the relevant formula or framework
3. **Third**, verify your answer using cross-checks

### Example
Let's say we have the following scenario:
- Opening balance: ₹50,000
- Transactions during the year: ₹25,000 (debit), ₹15,000 (credit)

> **Pro tip:** Always start by identifying the type of account (Real, Personal, or Nominal) before applying rules.

The final answer would be calculated as:
\`Balance = Opening + Debits - Credits = 50,000 + 25,000 - 15,000 = ₹60,000\`

### Common Mistakes
- Forgetting to consider adjustments
- Mixing up debit and credit rules
- Not reading the question carefully

Hope this helps! Feel free to ask follow-up questions. 📚`,
    sources: [
      { 
        chunk_id: 101, 
        subject: "Accountancy", 
        chapter: "Financial Statements",
        content: "### Financial Statements Overview\n\nFinancial statements are formal records of the financial activities and position of a business, person, or other entity.\n\nRelevant information is presented in a structured manner and in a form which is easy to understand. They typically include:\n- **Balance Sheet**: Reports on a company's assets, liabilities, and owners' equity.\n- **Income Statement**: Reports on a company's income, expenses, and profits over a period of time."
      },
      { 
        chunk_id: 102, 
        subject: "Accountancy", 
        chapter: "Journal Entries",
        content: "### Journal Entries Principles\n\nA journal entry is the act of keeping or making records of any transactions either economic or non-economic.\n\nThe fundamental rule is **Debit what comes in, Credit what goes out**. For every debit, there must be a corresponding credit."
      },
    ],
  },
};



// Mock AI summarization for pinning an AI response into a board note.
export async function mockSummarizePin(payload: {
  aiAnswer: string;
  context: { role: string; content: string }[];
}): Promise<{ title: string; content: string }> {
  await new Promise((r) => setTimeout(r, 800));
  // Naive summary: first heading or first sentence as title
  const firstLine = payload.aiAnswer
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0) || "Pinned Note";
  const title = firstLine.replace(/^#+\s*/, "").slice(0, 60);

  // Pull a few bullet-style takeaways
  const bullets = payload.aiAnswer
    .split("\n")
    .filter((l) => /^[-*\d]/.test(l.trim()))
    .slice(0, 4)
    .map((l) => l.replace(/^[-*\d.)\s]+/, "").trim())
    .filter(Boolean);

  const lastUserQ = [...payload.context].reverse().find((m) => m.role === "user")?.content || "";

  const content = [
    lastUserQ ? `**Q:** ${lastUserQ.slice(0, 140)}` : "",
    "",
    "**Key takeaways:**",
    ...(bullets.length ? bullets.map((b) => `- ${b}`) : ["- Review the highlighted explanation in chat."]),
  ]
    .filter(Boolean)
    .join("\n");

  return { title, content };
}
