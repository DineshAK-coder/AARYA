import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../config/supabase';
import { AuthenticatedRequest } from '../../types';
import { AppError } from '../../middleware/error.middleware';

// ============================================================
// Snapshots Controller
// GET  /api/snapshots    – List snapshots (paginated, latest first)
// POST /api/snapshots    – Create a new snapshot (admin+ only)
// ============================================================

// ---- Validation ----

const CreateSnapshotSchema = z.object({
  runway_months: z.number().nonnegative().nullable().optional(),
  net_cash_flow: z.number().nullable().optional(),
  snapshot_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'snapshot_date must be YYYY-MM-DD')
    .optional(),
});

const ListSnapshotsQuerySchema = z.object({
  limit:  z.coerce.number().int().min(1).max(200).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to_date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// ============================================================
// GET /api/snapshots
// ============================================================
export async function listSnapshots(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parse = ListSnapshotsQuerySchema.safeParse(req.query);
    if (!parse.success) {
      throw new AppError(400, parse.error.issues[0].message, 'VALIDATION_ERROR');
    }

    const { limit, offset, from_date, to_date } = parse.data;

    let query = supabaseAdmin
      .from('financial_state_snapshots')
      .select('*', { count: 'exact' })
      .eq('company_id', req.user!.company_id)
      .order('snapshot_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (from_date) query = query.gte('snapshot_date', from_date);
    if (to_date)   query = query.lte('snapshot_date', to_date);

    const { data, error, count } = await query;

    if (error) throw new AppError(500, error.message, 'DB_ERROR');

    res.json({
      success: true,
      data: {
        data:   data ?? [],
        total:  count ?? 0,
        limit,
        offset,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================
// POST /api/snapshots
// ============================================================
export async function createSnapshot(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parse = CreateSnapshotSchema.safeParse(req.body);
    if (!parse.success) {
      throw new AppError(400, parse.error.issues[0].message, 'VALIDATION_ERROR');
    }

    const { data: snapshot, error } = await supabaseAdmin
      .from('financial_state_snapshots')
      .insert({
        company_id:    req.user!.company_id,
        runway_months: parse.data.runway_months ?? null,
        net_cash_flow: parse.data.net_cash_flow ?? null,
        snapshot_date: parse.data.snapshot_date ?? new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    if (error) throw new AppError(500, error.message, 'DB_ERROR');

    res.status(201).json({ success: true, data: snapshot });
  } catch (err) {
    next(err);
  }
}
