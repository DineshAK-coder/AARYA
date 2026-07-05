import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { supabaseAdmin } from '../../../config/supabase';
import { generateEmbedding } from '../../../utils/llmClassifier';

export const searchDecisionMemory = tool(
  async (input, config) => {
    const companyId = config?.configurable?.companyId;
    if (!companyId) {
      return JSON.stringify({
        success: false,
        error: 'Authentication failed: companyId is missing in execution context.',
      });
    }

    try {
      const { query, threshold, limit } = input;

      // 1. Generate embedding for the search query using Google's text-embedding-004 model
      const queryEmbedding = await generateEmbedding(query);

      // 2. Call the match_decisions database function via RPC
      const { data: matches, error } = await supabaseAdmin.rpc('match_decisions', {
        p_query_embedding: `[${queryEmbedding.join(',')}]`,
        p_match_threshold: threshold || 0.5,
        p_match_count: limit || 5,
        p_company_id: companyId,
      });

      if (error) {
        return JSON.stringify({
          success: false,
          error: `Database similarity search error: ${error.message}`,
        });
      }

      const formattedMatches = (matches || []).map((match: any) => ({
        id: match.id,
        context: match.context,
        aiRecommendation: match.ai_recommendation,
        founderDecision: match.founder_decision,
        similarity: Number(match.similarity.toFixed(4)),
      }));

      return JSON.stringify({
        success: true,
        data: formattedMatches,
      });
    } catch (err: any) {
      return JSON.stringify({
        success: false,
        error: `Unexpected error during decision similarity search: ${err.message || String(err)}`,
      });
    }
  },
  {
    name: 'search_decision_memory',
    description: 'Searches the AI decision memory ledger for past similar decisions, recommendations, and contexts using semantic similarity search.',
    schema: z.object({
      query: z.string().min(3, 'Query must be at least 3 characters'),
      threshold: z.number().min(0).max(1).optional().default(0.5),
      limit: z.number().int().min(1).max(50).optional().default(5),
    }),
  }
);

