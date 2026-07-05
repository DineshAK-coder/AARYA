import { Response } from 'express';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import {
  streamText,
  stepCountIs,
  convertToModelMessages,
  toUIMessageStream,
  pipeUIMessageStreamToResponse
} from 'ai';
import { AuthenticatedRequest } from '../../types/index.js';
import { getTools } from '../../services/aiTools.js';

// Initialize the Google Generative AI provider using Vercel AI SDK
const googleProvider = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

/**
 * POST /api/chat
 * Streams AI CFO copilot response with automatic database tool invocation and timeout protection.
 */
export async function handleChat(req: AuthenticatedRequest, res: Response): Promise<void> {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    console.warn('[ChatController] Request timed out after 35 seconds. Aborting stream.');
    abortController.abort();
  }, 35000);

  res.on('close', () => clearTimeout(timeoutId));
  res.on('finish', () => clearTimeout(timeoutId));

  try {
    const { messages } = req.body;
    const companyId = req.user!.company_id;

    if (!messages || !Array.isArray(messages)) {
      clearTimeout(timeoutId);
      res.status(400).json({ success: false, error: 'Invalid messages array.' });
      return;
    }

    const tools = getTools(companyId);

    // Convert the UI messages (sent by frontend useChat hook) to ModelMessages expected by streamText
    const modelMessages = await convertToModelMessages(messages, { tools });

    const result = streamText({
      model: googleProvider('gemini-1.5-flash'),
      abortSignal: abortController.signal,
      system: `You are AARYA, an India-first AI CFO copilot for SMEs and startups.
You provide clear, founder-friendly financial decision insights in plain English.
Do not use generic chatbot filler. Keep answers concise, highly analytical, strategic, and explainable.

You have access to real-time database tools to fetch the company's financials:
- get_cash_flow: Retrieves total income, total expenses, net cash flow, derived monthly burn rate, runway months, calculation explanation, and supporting transactions. No parameter required!
- get_receivables_and_payables: Retrieves pending customer invoices (receivables) and outstanding bills (payables), highlighting overdue accounts.
- generate_founder_summary: Comprehensive founder analysis with revenue, expenses, net cash flow, receivables, payables, identified risks, and strategic CFO recommendations.

### CRITICAL RULES FOR FINANCIAL ANALYSIS:
1. **Always Call Tools FIRST**: When asked about real company financials (cash flow, burn rate, runway, dues, ledger, business health, who owes money), ALWAYS invoke the appropriate tool FIRST (\`get_cash_flow\`, \`get_receivables_and_payables\`, or \`generate_founder_summary\`) before forming your answer. Never guess or hallucinate database metrics.
2. **Never Ask for Burn Rate**: The \`get_cash_flow\` tool automatically derives the monthly burn rate from transaction history. NEVER ask the user to input their monthly burn rate when calculating cash flow or runway!
3. **Hypothetical / Sample Math Scenarios**: If the user provides sample or hypothetical figures (e.g. "Here are sample revenue figures: Income 5000, Expense 3000. Give me an analysis"), DO NOT call database tools! Directly analyze the user's provided numbers with clear CFO strategic reasoning.
4. **Explainability & Formula Breakdown**: When reporting cash flow, burn rate, or runway, always explain how the calculation was performed step-by-step using the \`calculation_explanation\` and cite specific transactions from \`supporting_transactions\` (e.g., date, amount, description).
5. **Execution Transparency Footer**: At the end of EVERY response, you MUST include an explicit transparency block on a new line:
   - If a tool was executed: \`**Tool Executed:** <tool_name> (analyzed <records> records in <duration>ms)\`
   - If NO tool was executed (e.g., sample math, greeting): \`**Tool Executed:** None (Hypothetical calculation / General inquiry)\``,
      messages: modelMessages,
      tools,
      stopWhen: stepCountIs(5), // limit the maximum tool steps in this version of the SDK
    });

    // Transform streamText parts into UIMessageChunks stream as expected by DefaultChatTransport
    const uiMessageStream = toUIMessageStream({
      stream: result.stream,
      tools,
      onError: (err: unknown) => {
        console.error('[toUIMessageStream] Streaming Error:', err);
        return err instanceof Error ? err.message : String(err);
      },
    });

    // Pipe the UI message stream directly to the Express response
    pipeUIMessageStreamToResponse({
      response: res,
      stream: uiMessageStream,
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.error('[ChatController] Error:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err?.message || 'Chat service failed.' });
    }
  }
}

