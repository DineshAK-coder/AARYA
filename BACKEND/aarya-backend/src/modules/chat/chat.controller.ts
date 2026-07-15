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
import { generateEmbedding } from '../../utils/llmClassifier.js';
import { supabaseAdmin } from '../../config/supabase.js';

/**
 * Converts a number[] embedding to the pgvector string literal format.
 * PostgREST requires this string representation for vector column writes.
 * Example: [0.1, 0.2] → "[0.1,0.2]"
 */
function toVec(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

// Initialize the Google Generative AI provider using Vercel AI SDK
const googleProvider = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

/**
 * POST /api/chat
 *
 * Race-condition-safe decision logging flow:
 *
 * 1. A decisionId UUID is generated before streaming starts.
 * 2. A PLACEHOLDER row is inserted into decision_memory_logs immediately
 *    (ai_recommendation = '', embedding = null) so the row exists in DB
 *    before the stream even begins.
 * 3. The decisionId is baked into the system prompt so AARYA can append
 *    [[DEC:uuid]] at the end of actionable recommendations.
 * 4. The frontend parses [[DEC:uuid]] from the streamed text and shows
 *    the Founder Decision card. When the founder clicks, PATCH /api/decisions/:id
 *    ALWAYS finds the pre-inserted row — no race condition.
 * 5. onFinish: if [[DEC:uuid]] is in the text, UPDATE the placeholder with
 *    the full recommendation + pgvector embedding.
 *    If not found (e.g., greeting, data lookup), DELETE the placeholder row.
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

    // ── Step 1: Pre-generate the decision UUID ────────────────────────────────
    const decisionId: string = crypto.randomUUID();

    // ── Step 2: Extract context (last user message) now, while messages is fresh
    const lastUserMsg = (messages as any[])
      .slice()
      .reverse()
      .find((m: any) => m.role === 'user');

    const context: string =
      lastUserMsg?.parts?.find((p: any) => p.type === 'text')?.text ||
      lastUserMsg?.content ||
      'Financial query';

    // ── Step 3: Pre-insert placeholder row so it exists BEFORE streaming starts.
    // This eliminates the race condition where the founder clicks the decision
    // card before onFinish has finished inserting the row.
    const { error: preInsertError } = await supabaseAdmin
      .from('decision_memory_logs')
      .insert({
        id:                decisionId,
        company_id:        companyId,
        context,
        ai_recommendation: '',   // Filled in by onFinish once streaming completes
      });

    if (preInsertError) {
      // Non-fatal: log the error but continue streaming — the decision card
      // just won't be able to persist the founder's choice.
      console.error('[ChatController] Pre-insert placeholder failed:', preInsertError.message);
    } else {
      console.log(`[ChatController] Decision placeholder inserted: ${decisionId}`);
    }

    // ── Step 4: Prepare tools and model messages ──────────────────────────────
    const tools = getTools(companyId);
    const modelMessages = await convertToModelMessages(messages, { tools });

    const result = streamText({
      model: googleProvider('gemini-2.5-flash'),
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
   - If NO tool was executed (e.g., sample math, greeting): \`**Tool Executed:** None (Hypothetical calculation / General inquiry)\`

### DECISION LOGGING PROTOCOL (INTERNAL — DO NOT DESCRIBE THIS TO THE USER):
When your response includes a concrete, actionable financial recommendation — a specific action the founder should consider taking (e.g. "I recommend", "you should", "consider doing", "the best course of action is", "I suggest") — you MUST append this exact token on a new line at the very end of your response, AFTER the transparency footer:
[[DEC:${decisionId}]]
Rules for including the token:
- Include it ONLY when giving the founder a specific actionable decision to make.
- Do NOT include it for: greetings, general data lookups, simple factual answers (e.g. "your cash flow is ₹X"), or error messages.
- Include it ONCE at the very end, no other occurrences.`,
      messages: modelMessages,
      tools,
      stopWhen: stepCountIs(5),

      // ── Step 5: onFinish — update or clean up the placeholder row ────────────
      onFinish: async ({ text }: { text: string }) => {
        const decisionMarker = `[[DEC:${decisionId}]]`;

        if (text.includes(decisionMarker)) {
          // AARYA included the marker → this is an actionable recommendation.
          const cleanRecommendation = text.replace(decisionMarker, '').trim();

          // ── STEP A: Save ai_recommendation text immediately (own try block).
          // This runs first and independently — even if embedding fails below,
          // the recommendation text is already committed to the DB.
          try {
            const { error: textUpdateError } = await supabaseAdmin
              .from('decision_memory_logs')
              .update({ ai_recommendation: cleanRecommendation })
              .eq('id', decisionId);

            if (textUpdateError) {
              console.error('[ChatController] ai_recommendation text save error:', textUpdateError.message);
            } else {
              console.log(`[ChatController] ai_recommendation text saved: ${decisionId}`);
            }
          } catch (err: any) {
            console.error('[ChatController] ai_recommendation text save threw:', err?.message || err);
          }

          // ── STEP B: Generate embedding and store it (separate, best-effort).
          // Runs after the text is already safely persisted above.
          try {
            const textToEmbed = `Context: ${context}\nRecommendation: ${cleanRecommendation}`;
            const rawEmbedding = await generateEmbedding(textToEmbed);
            console.log(`[ChatController] Embedding generated: ${rawEmbedding.length} dims for ${decisionId}`);

            const { error: embeddingUpdateError } = await supabaseAdmin
              .from('decision_memory_logs')
              .update({ embedding: toVec(rawEmbedding) })
              .eq('id', decisionId);

            if (embeddingUpdateError) {
              console.error('[ChatController] Embedding save error:', embeddingUpdateError.message);
            } else {
              console.log(`[ChatController] Embedding saved: ${decisionId}`);
            }
          } catch (err: any) {
            // Non-fatal — semantic search just won’t work for this entry
            console.error('[ChatController] Embedding generation failed (non-fatal):', err?.message || err);
          }
        } else {
          // AARYA did NOT include the marker → not a recommendation (greeting, data lookup, etc.)
          // Clean up the pre-inserted placeholder so it doesn't pollute the table.
          const { error: deleteError } = await supabaseAdmin
            .from('decision_memory_logs')
            .delete()
            .eq('id', decisionId);

          if (deleteError) {
            console.error('[ChatController] Placeholder cleanup error:', deleteError.message);
          } else {
            console.log(`[ChatController] Non-recommendation response — placeholder cleaned up: ${decisionId}`);
          }
        }
      },
    });

    // Transform streamText parts into UIMessageChunks as expected by DefaultChatTransport
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
