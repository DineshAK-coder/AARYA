import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../config/supabase';
import { AuthenticatedRequest } from '../../types';
import { AppError } from '../../middleware/error.middleware';

// ============================================================
// Auth Controller
// ============================================================
// The primary auth flow (sign-up / sign-in / token refresh) is
// handled entirely by the Supabase Auth SDK on the client side.
//
// This controller provides server-side profile utilities:
//   GET  /api/auth/me            – Returns the authenticated user's profile.
//   POST /api/auth/complete-profile – Links a newly signed-up user to a company.
//     Used when a user signs up organically (not via invite) and has not
//     yet created or joined a company.
// ============================================================

// ============================================================
// GET /api/auth/me
// Returns authenticated user + company info.
// ============================================================
export async function getMe(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, company_id, role, created_at, companies(id, name, subscription_status)')
      .eq('id', req.user!.id)
      .single();

    if (error || !user) {
      throw new AppError(404, 'User profile not found.', 'PROFILE_NOT_FOUND');
    }

    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}
