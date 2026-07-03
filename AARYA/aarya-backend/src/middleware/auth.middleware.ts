import { Response, NextFunction } from 'express';
import { supabase, supabaseAdmin } from '../config/supabase';
import { AuthenticatedRequest, UserRole } from '../types';

// ============================================================
// authMiddleware
// ============================================================
// 1. Reads the Bearer token from the Authorization header.
// 2. Verifies it with Supabase Auth (supabase.auth.getUser).
// 3. Looks up the user's company_id and role from public.users.
// 4. Attaches { id, company_id, role } to req.user.
//
// Any route that uses this middleware is guaranteed to have
// req.user populated with trusted data.
// ============================================================

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Authorization header missing or malformed. Expected: Bearer <token>',
    });
    return;
  }

  const token = authHeader.slice(7); // strip "Bearer "

  // Verify the JWT against Supabase Auth
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !authUser) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token. Please sign in again.',
    });
    return;
  }

  // Fetch the user's app profile (company_id + role) from our database
  const { data: dbUser, error: dbError } = await supabaseAdmin
    .from('users')
    .select('company_id, role')
    .eq('id', authUser.id)
    .single();

  if (dbError || !dbUser) {
    res.status(403).json({
      success: false,
      error:
        'User profile not found. Complete onboarding by creating or joining a company first.',
      code: 'PROFILE_MISSING',
    });
    return;
  }

  req.user = {
    id: authUser.id,
    company_id: dbUser.company_id as string,
    role: dbUser.role as UserRole,
  };

  next();
}

// ============================================================
// requireRole
// ============================================================
// Factory that returns middleware enforcing a minimum role.
// Usage: router.delete('/...', authMiddleware, requireRole('admin'), handler)
// ============================================================

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `This action requires one of the following roles: ${allowedRoles.join(', ')}.`,
        code: 'INSUFFICIENT_ROLE',
      });
      return;
    }
    next();
  };
}
