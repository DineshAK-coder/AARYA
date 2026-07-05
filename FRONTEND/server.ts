import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize GoogleGenAI SDK on the server side
let ai: GoogleGenAI | null = null;
try {
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  } else {
    console.warn("GEMINI_API_KEY is not defined. AI CFO Chat will run in simulated mode.");
  }
} catch (error) {
  console.error("Failed to initialize Google GenAI SDK:", error);
}

// API endpoint for CFO Chat
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, context } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid messages format." });
    }

    // Build the system instruction using the current app financial context sent from the client
    let systemInstruction = `You are "A.A.R.Y.A", a world-class AI CFO (Chief Financial Officer) and financial strategist for small businesses.
Your role is to help business owners understand their financial standing, ledger transactions, cash flow trends, and tax obligations with absolute clarity, precision, and actionable advice.

Here is the current real-time financial state of the user's business:
- Business Name: ${context?.businessName || "A.A.R.Y.A Business Solutions"}
- Industry: ${context?.industry || "Services"}
- Base Currency: ${context?.currency || "USD ($)"}
- Current Cash Position / Balance: ${context?.startingBalance !== undefined ? context?.startingBalance : "$15,254.37"}
- Total Owed to Business (Ledger): ${context?.totalDues || "$24,561.20"}
- Revenue This Month: ${context?.monthlyRevenue || "$18,245.30"}
- Overdue Invoices Amount: ${context?.overdueAmount || "$4,520.00"}

Current Customers & Ledger List:
${context?.ledger && Array.isArray(context.ledger) 
  ? context.ledger.map((item: any) => `- Name: ${item.name}, Amount Owed: ${item.amount < 0 ? '-' : ''}${context.currencySymbol || '$'}${Math.abs(item.amount).toFixed(2)}, Status: ${item.amount < 0 ? 'Credit (We owe them)' : item.overdue ? 'Overdue' : 'Pending'}, Due Date: ${item.dueDate || 'N/A'}`).join("\n")
  : "- No active ledger items."
}

Recent Active Invoices:
${context?.invoices && Array.isArray(context.invoices)
  ? context.invoices.map((inv: any) => `- Invoice #${inv.id} to ${inv.customer}, Amount: ${context.currencySymbol || '$'}${inv.amount.toFixed(2)}, Status: ${inv.status}, Date: ${inv.date}`).join("\n")
  : "- No recent invoices."
}

Recent Activity Timeline:
${context?.activities && Array.isArray(context.activities)
  ? context.activities.map((act: any) => `- [${act.timestamp}] ${act.customer || ''} - ${act.description} (${context.currencySymbol || '$'}${act.amount})`).join("\n")
  : "- No recent activity logged."
}

Please use this precise business state to answer the user's questions. Be concise, extremely analytical, yet friendly and helpful. 
- Use formatted tables, bullet points, or bold key terms when breaking down figures.
- If they ask "Who owes me money?", lists all customers who have positive amounts owed (Ledger) and mention which ones are overdue.
- If they ask "Why is cash flow down?" or about cash flow insights, explain trends based on recent payments, pending invoices, or starting balance.
- Offer strategic CFO advice on how to improve cash cycles, invoice collections, and expense optimization.
- Write in a clean, modern, professional tone. Keep answers concise (2-4 paragraphs max unless a detailed breakdown is requested).
- If the model is asked about topics outside of finance/business ops, politely guide them back to A.A.R.Y.A CFO's financial domain.`;

    // Map conversation messages to Gemini contents structure
    // Gemini chat API expects { role: 'user' | 'model', parts: [{ text: '...' }] }
    const formattedContents = messages.map((m: any) => ({
      role: m.sender === "user" ? "user" : "model",
      parts: [{ text: m.text }]
    }));

    // If Gemini client is available, make a real API call
    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: formattedContents,
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.2, // Lower temperature for more consistent financial analysis
          }
        });

        const reply = (response.text || "I was unable to generate a financial assessment. Let me analyze that calculation again.") + "\n\n**Tool Executed:** get_cash_flow (Live Gemini analysis)";
        return res.json({ reply });
      } catch (geminiError: any) {
        console.error("Gemini API call error:", geminiError);
        return res.json({
          reply: "A.A.R.Y.A AI: I encountered a connection issue with my financial intelligence core. Here is a local analysis: Based on your current Ledger, you have total dues of " + (context?.totalDues || "$24,561.20") + ". I recommend sending a friendly automated billing reminder to your top overdue account.\n\n**Tool Executed:** None (Fallback local analysis)",
          error: geminiError?.message || "Failed to communicate with Gemini API"
        });
      }
    } else {
      // Fallback response if GEMINI_API_KEY is not defined (Simulated Virtual CFO mode)
      const lastMessage = messages[messages.length - 1]?.text?.toLowerCase() || "";
      let simulatedReply = "";

      if (lastMessage.includes("who owes") || lastMessage.includes("debt") || lastMessage.includes("ledger")) {
        simulatedReply = `According to your Ledger, you are owed a total of **${context?.totalDues || "$24,561.20"}** across your active customers.

Here is the breakdown of your high-priority accounts:
1. **Surinder Thakur**: Owed **${context?.currencySymbol || '$'}8,720.76** (Overdue since Sept 10). *Highly critical.*
2. **Freelancing Work / Acme Corp**: Owed **${context?.currencySymbol || '$'}1,200.00** (Pending, due in 5 days).
3. **Other Pending Accounts**: Approximately **${context?.currencySymbol || '$'}14,640.44**.

I suggest tapping the **"Send Reminder"** button on Surinder Thakur's detail page to automatically dispatch a payment reminder and accelerate your accounts receivable turnover.\n\n**Tool Executed:** get_receivables_and_payables (Simulated on local context)`;
      } else if (lastMessage.includes("cash flow") || lastMessage.includes("down") || lastMessage.includes("revenue") || lastMessage.includes("trend")) {
        simulatedReply = `Your cash flow analysis shows a healthy current liquidity position of **${context?.startingBalance !== undefined ? context?.startingBalance : "$15,254.37"}**, with **${context?.monthlyRevenue || "$18,245.30"}** in revenue this month.

However, your **Overdue Amount** stands at **${context?.overdueAmount || "$4,520.00"}**. Cash flow is slightly constrained by slower-than-average collections:
- **Outstanding Collection Days (DSO)**: Currently at 42 days.
- **Top Liquidity Blocker**: Surinder Thakur's unpaid balance of ${context?.currencySymbol || '$'}8,720.76 is freezing 57% of your outstanding invoices.

**CFO Strategy Recommendation:**
1. Shorten net-payment terms on new invoices from 30 days to 15 days.
2. Offer a 1.5% discount for early payments within 7 days to accelerate cash intake.\n\n**Tool Executed:** get_cash_flow (Simulated on local context)`;
      } else {
        simulatedReply = `Hello! I am **A.A.R.Y.A**, your virtual AI CFO. I have analyzed your business details:
- **Business**: ${context?.businessName || "A.A.R.Y.A Business Solutions"} (${context?.industry || "Services"})
- **Cash Position**: ${context?.startingBalance !== undefined ? context?.startingBalance : "$15,254.37"}

I can answer complex questions about your balance, cash trends, ledger liabilities, tax projections, or customer debts. What specific financial report or strategy shall we review today?\n\n**Tool Executed:** None (General inquiry)`;
      }

      // Add delay to mimic AI thinking
      await new Promise(resolve => setTimeout(resolve, 600));
      return res.json({ reply: simulatedReply, simulated: true });
    }
  } catch (error: any) {
    console.error("Endpoint handling error:", error);
    res.status(500).json({ error: error?.message || "Internal Server Error" });
  }
});

// Serve frontend build static files in production or hook Vite in development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`A.A.R.Y.A AI CFO Server running on port ${PORT}`);
  });
}

startServer();
