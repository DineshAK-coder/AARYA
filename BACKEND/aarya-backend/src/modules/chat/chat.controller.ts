import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { AuthenticatedRequest } from '../../types';
import { AppError } from '../../middleware/error.middleware';
import { compiledGraph } from './agent.graph';

// Zod Schema to validate chat payloads
const ChatPayloadSchema = z.object({
  messages: z.array(
    z.object({
      sender: z.enum(['user', 'agent']),
      text: z.string().min(1, 'Message text cannot be empty.'),
    })
  ).min(1, 'At least one message is required.'),
});

/**
 * POST /api/chat
 * Securely handles the virtual CFO chat requests by executing the compiled LangGraph.
 */
export async function executeChat(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const startTime = Date.now();
  let status: 'Success' | 'Failure' = 'Success';
  let lastUserQuestion = '';
  let invokedTools: string[] = [];

  try {
    // 1. Verify Authentication
    const companyId = req.user?.company_id;
    if (!companyId) {
      throw new AppError(401, 'Authentication credentials missing from request session.', 'UNAUTHORIZED');
    }

    // 2. Validate Payload
    const parse = ChatPayloadSchema.safeParse(req.body);
    if (!parse.success) {
      throw new AppError(400, `Chat request validation failed: ${parse.error.issues[0].message}`, 'VALIDATION_ERROR');
    }

    const { messages } = parse.data;

    // Extract the latest user question for logging telemetry
    const lastUserMessage = [...messages].reverse().find((m) => m.sender === 'user');
    lastUserQuestion = lastUserMessage ? lastUserMessage.text : '';

    // 3. Format message history to LangChain message models
    const formattedMessages = messages.map((m) => {
      if (m.sender === 'user') {
        return new HumanMessage({ content: m.text });
      } else {
        return new AIMessage({ content: m.text });
      }
    });

    // 4. Invoke Compiled State Graph with multi-tenant company ID context
    const result = await compiledGraph.invoke(
      { messages: formattedMessages },
      { configurable: { companyId } }
    );

    // 5. Retrieve final answer from the graph state output
    const outputMessages = result.messages || [];
    const lastOutputMessage = outputMessages[outputMessages.length - 1];
    const replyText = lastOutputMessage?.content as string || 'I was unable to retrieve a response.';

    // Extract names of all tools called during execution trace
    for (const msg of outputMessages) {
      const toolCalls = (msg as any).tool_calls;
      if (toolCalls && toolCalls.length > 0) {
        for (const call of toolCalls) {
          invokedTools.push(call.name);
        }
      }
    }

    // 6. Return response to the frontend client
    res.json({
      success: true,
      reply: replyText,
    });

  } catch (err: any) {
    status = 'Failure';
    next(err);
  } finally {
    const durationMs = Date.now() - startTime;

    // 7. Write standard output JSON log matching AARYA specification
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        event: 'AI_REQUEST',
        question: lastUserQuestion.trim(),
        tools: invokedTools,
        durationMs,
        status,
      })
    );
  }
}
