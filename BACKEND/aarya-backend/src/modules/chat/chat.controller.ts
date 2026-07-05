import { Response } from 'express';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, stepCountIs } from 'ai';
import { AuthenticatedRequest } from '../../types';
import { getTools } from '../../services/aiTools';

// Initialize the Google Generative AI provider using Vercel AI SDK
const googleProvider = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

/**
 * POST /api/chat
 * Streams AI CFO copilot response with automatic database tool invocation.
 */
export async function handleChat(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { messages } = req.body;
    const companyId = req.user!.company_id;

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ success: false, error: 'Invalid messages array.' });
      return;
    }

    // Set headers for streaming text response
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    const result = streamText({
      model: googleProvider('gemini-1.5-flash'),
      system: `You are AARYA, an India-first AI CFO copilot for SMEs and startups. 
You provide clear, founder-friendly financial decision insights in plain English. 
Do not use generic chatbot filler. Keep answers concise, highly analytical, and strategic.
You have access to real-time tools to fetch the company's financials from the database:
- get_cash_visibility: Retrieves liquidity status and cash runway.
- get_receivables_and_payables: Retrieves outstanding invoices and payables.
- generate_founder_summary: Summarizes highlights, risks, and attention items.

Always fetch data using the tools when asked about financial state, dues, ledger, cash flow, burn rate, or business health. Do not hallucinate metrics.`,
      messages,
      tools: getTools(companyId),
      stopWhen: stepCountIs(5), // limit the maximum tool steps in this version of the SDK
    });

    // Stream the text directly to the response
    result.pipeTextStreamToResponse(res);
  } catch (err: any) {
    console.error('[ChatController] Error:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err?.message || 'Chat service failed.' });
    }
  }
}
