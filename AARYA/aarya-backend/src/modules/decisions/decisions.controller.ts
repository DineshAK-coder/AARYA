import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../config/supabase';
import { generateEmbedding } from '../../utils/llmClassifier';
import { AuthenticatedRequest } from '../../types';
import { AppError } from '../../middleware/error.middleware';

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
  founder_decision: z.string().min(1, 'founder_decision cannot be empty.'),
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
        embedding,
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
      p_query_embedding: `[${queryEmbedding.join(',')}]`,
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

    const { data: updated, error } = await supabaseAdmin
      .from('decision_memory_logs')
      .update({ founder_decision: parse.data.founder_decision })
      .eq('id', id)
      .eq('company_id', req.user!.company_id) // Explicit company_id guard (belt + braces on top of RLS)
      .select('id, context, ai_recommendation, founder_decision, created_at')
      .single();

    if (error || !updated) {
      throw new AppError(
        404,
        'Decision log not found or you do not have permission to update it.',
        'NOT_FOUND'
      );
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}
