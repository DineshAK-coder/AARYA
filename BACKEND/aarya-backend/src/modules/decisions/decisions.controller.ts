import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../config/supabase.js';
import { generateEmbedding } from '../../utils/llmClassifier.js';
import { AuthenticatedRequest } from '../../types/index.js';
import { AppError } from '../../middleware/error.middleware.js';

/**
 * Converts a number[] embedding to the pgvector string literal format.
 * PostgREST (the Supabase REST layer) requires this string representation
 * for vector columns in both INSERT and UPDATE operations.
 * Example: [0.1, 0.2] → "[0.1,0.2]"
 */
function toVec(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

// ============================================================
// Decisions Controller – AI Memory Ledger
// ============================================================
// GET  /api/decisions            – List decision logs (paginated)
// POST /api/decisions            – Store a new AI decision + generate embedding
// POST /api/decisions/search     – Semantic similarity search
// PATCH /api/decisions/:id       – Log the founder's actual decision (outcome)
// ============================================================

// ---- Validation schemas ----

const CreateDecisionSchema = z.object({
  context:          z.string().min(10, 'context must be at least 10 characters.'),
  ai_recommendation: z.string().min(1),
  founder_decision: z.string().optional().nullable(),
});

const UpdateDecisionSchema = z.object({
  founder_decision:  z.string().min(1, 'founder_decision cannot be empty.'),
  // Optional: sent by the frontend to persist the recommendation text + generate
  // embedding at decision-time (reliable fallback if onFinish embedding failed).
  ai_recommendation: z.string().optional(),
});

const SearchSchema = z.object({
  query:           z.string().min(3, 'Search query must be at least 3 characters.'),
  threshold:       z.coerce.number().min(0).max(1).optional().default(0.5),
  limit:           z.coerce.number().int().min(1).max(50).optional().default(10),
});

const ListQuerySchema = z.object({
  limit:  z.coerce.number().int().min(1).max(200).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

// ============================================================
// GET /api/decisions
// ============================================================
export async function listDecisions(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parse = ListQuerySchema.safeParse(req.query);
    if (!parse.success) throw new AppError(400, parse.error.issues[0].message, 'VALIDATION_ERROR');

    const { limit, offset } = parse.data;

    const { data, error, count } = await supabaseAdmin
      .from('decision_memory_logs')
      .select('id, context, ai_recommendation, founder_decision, created_at', { count: 'exact' })
      .eq('company_id', req.user!.company_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new AppError(500, error.message, 'DB_ERROR');

    res.json({ success: true, data: { data: data ?? [], total: count ?? 0, limit, offset } });
  } catch (err) {
    next(err);
  }
}

// ============================================================
// POST /api/decisions
// Store a new AI decision and generate its embedding vector.
// ============================================================
export async function createDecision(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parse = CreateDecisionSchema.safeParse(req.body);
    if (!parse.success) throw new AppError(400, parse.error.issues[0].message, 'VALIDATION_ERROR');

    const { context, ai_recommendation, founder_decision } = parse.data;

    // Generate embedding from context + recommendation combined
    // This makes semantic search find relevant past decisions by topic.
    const textToEmbed = `Context: ${context}\nRecommendation: ${ai_recommendation}`;
    const embedding = await generateEmbedding(textToEmbed);

    const { data: log, error } = await supabaseAdmin
      .from('decision_memory_logs')
      .insert({
        company_id:       req.user!.company_id,
        context,
        ai_recommendation,
        founder_decision: founder_decision ?? null,
        embedding:        toVec(embedding),
      })
      .select('id, context, ai_recommendation, founder_decision, created_at')
      .single();

    if (error) throw new AppError(500, error.message, 'DB_ERROR');

    res.status(201).json({ success: true, data: log });
  } catch (err) {
    next(err);
  }
}

// ============================================================
// POST /api/decisions/search
// Semantic similarity search using pgvector cosine distance.
// ============================================================
export async function searchDecisions(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parse = SearchSchema.safeParse(req.body);
    if (!parse.success) throw new AppError(400, parse.error.issues[0].message, 'VALIDATION_ERROR');

    const { query, threshold, limit } = parse.data;

    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(query);

    // Call the match_decisions database function (defined in migration)
    const { data, error } = await supabaseAdmin.rpc('match_decisions', {
      p_query_embedding: toVec(queryEmbedding),
      p_match_threshold: threshold,
      p_match_count:     limit,
      p_company_id:      req.user!.company_id,
    });

    if (error) throw new AppError(500, error.message, 'DB_ERROR');

    res.json({ success: true, data: data ?? [] });
  } catch (err) {
    next(err);
  }
}

// ============================================================
// PATCH /api/decisions/:id
// Log what the founder actually decided (for outcome tracking).
// ============================================================
export async function updateFounderDecision(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const parse = UpdateDecisionSchema.safeParse(req.body);
    if (!parse.success) throw new AppError(400, parse.error.issues[0].message, 'VALIDATION_ERROR');

    const { founder_decision, ai_recommendation } = parse.data;

    // ── 1. Always update founder_decision (+ ai_recommendation text if provided)
    const textPayload: Record<string, unknown> = { founder_decision };
    if (ai_recommendation) textPayload.ai_recommendation = ai_recommendation;

    const { data: updated, error } = await supabaseAdmin
      .from('decision_memory_logs')
      .update(textPayload)
      .eq('id', id)
      .eq('company_id', req.user!.company_id)
      .select('id, context, ai_recommendation, founder_decision, created_at')
      .single();

    if (error || !updated) {
      throw new AppError(
        404,
        'Decision log not found or you do not have permission to update it.',
        'NOT_FOUND'
      );
    }

    // ── 2. Generate + store embedding via RPC (bypasses PostgREST vector type issues)
    // Use ai_recommendation from the PATCH body if provided, otherwise use the
    // value already stored in the DB row (updated.ai_recommendation).
    const embeddingSource = (ai_recommendation ?? updated.ai_recommendation ?? '').trim();
    if (embeddingSource.length > 10) {
      try {
        const contextText = updated.context ?? '';
        const textToEmbed = `Context: ${contextText}\nRecommendation: ${embeddingSource}`;
        console.log(`[DecisionsController] Generating embedding for ${id}, text length: ${textToEmbed.length}`);
        const rawEmbedding = await generateEmbedding(textToEmbed);
        console.log(`[DecisionsController] Embedding generated: ${rawEmbedding.length} dims for ${id}`);

        const { error: rpcError } = await supabaseAdmin.rpc('update_decision_embedding', {
          p_id:         id,
          p_company_id: req.user!.company_id,
          p_embedding:  `[${rawEmbedding.join(',')}]`,
        });

        if (rpcError) {
          console.error('[DecisionsController] RPC embedding update error:', JSON.stringify(rpcError));
        } else {
          console.log(`[DecisionsController] Embedding stored via RPC for decision: ${id}`);
        }
      } catch (embErr: any) {
        console.error('[DecisionsController] Embedding generation failed (non-fatal):', embErr?.message || embErr);
      }
    } else {
      console.warn(`[DecisionsController] Skipping embedding for ${id} — ai_recommendation too short ("${embeddingSource.slice(0, 50)}")`);
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}
