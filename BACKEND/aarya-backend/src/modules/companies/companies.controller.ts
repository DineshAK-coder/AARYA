import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../config/supabase.js';
import { AuthenticatedRequest } from '../../types/index.js';
import { AppError } from '../../middleware/error.middleware.js';

// ============================================================
// Companies Controller
// ============================================================
// POST /api/companies          – Create a company (onboarding flow A: founder creates)
// GET  /api/companies/me       – Get the caller's company details
// PATCH /api/companies/me      – Update company name / subscription (owner only)
// POST /api/companies/invite   – Invite a user to join this company (owner/admin only)
// ============================================================

// ---- Validation schemas ----

const CreateCompanySchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters.').max(200),
});

const UpdateCompanySchema = z.object({
  name: z.string().min(2).max(200).optional(),
  subscription_status: z.enum(['free', 'pro', 'enterprise']).optional(),
});

const InviteUserSchema = z.object({
  email: z.string().email('Please provide a valid email address.'),
  role:  z.enum(['admin', 'viewer']).default('viewer'),
});

// ============================================================
// POST /api/companies
// Create a new company and make the caller its owner.
// Called once during onboarding by a user who is signing up as a new founder.
// ============================================================
export async function createCompany(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Check this user doesn't already have a company (shouldn't reach here via authMiddleware,
    // but guard anyway in case they're calling this endpoint directly)
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', req.user!.id)
      .single();

    if (existingUser) {
      throw new AppError(
        409,
        'You already belong to a company. Each user can only be a member of one company.',
        'ALREADY_HAS_COMPANY'
      );
    }

    const parse = CreateCompanySchema.safeParse(req.body);
    if (!parse.success) {
      throw new AppError(400, parse.error.issues[0].message, 'VALIDATION_ERROR');
    }

    // Use the atomic DB function to create company + owner user record in one transaction
    const { data: company, error } = await supabaseAdmin.rpc('create_company_and_owner', {
      p_company_name: parse.data.name,
      p_user_id: req.user!.id,
    });

    if (error) {
      throw new AppError(500, `Failed to create company: ${error.message}`, 'DB_ERROR');
    }

    res.status(201).json({ success: true, data: company });
  } catch (err) {
    next(err);
  }
}

// ============================================================
// POST /api/companies/onboard
// Called by a user who just signed up (no company yet).
// This is a public-ish endpoint – it creates the company for them.
// ============================================================
export async function onboardNewUser(
  req: AuthenticatedRequest & { user?: AuthenticatedRequest['user'] },
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parse = CreateCompanySchema.safeParse(req.body);
    if (!parse.success) {
      throw new AppError(400, parse.error.issues[0].message, 'VALIDATION_ERROR');
    }

    // Get the auth user id from the JWT (verified by a lighter middleware)
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new AppError(401, 'Authorization header required.', 'UNAUTHORIZED');
    }
    const token = authHeader.slice(7);

    const { data: { user: authUser }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !authUser) {
      throw new AppError(401, 'Invalid token.', 'INVALID_TOKEN');
    }

    const { data: company, error } = await supabaseAdmin.rpc('create_company_and_owner', {
      p_company_name: parse.data.name,
      p_user_id: authUser.id,
    });

    if (error) {
      // Postgres duplicate key (23505) means this user already has a company row
      if (error.code === '23505' || error.message?.toLowerCase().includes('duplicate')) {
        throw new AppError(
          409,
          'You already belong to a company. Each user can only be a member of one company.',
          'ALREADY_HAS_COMPANY'
        );
      }
      throw new AppError(500, `Failed to create company: ${error.message}`, 'DB_ERROR');
    }

    res.status(201).json({ success: true, data: company });
  } catch (err) {
    next(err);
  }
}

// ============================================================
// GET /api/companies/me
// Returns the caller's company details.
// ============================================================
export async function getMyCompany(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { data: company, error } = await supabaseAdmin
      .from('companies')
      .select('*')
      .eq('id', req.user!.company_id)
      .single();

    if (error || !company) {
      throw new AppError(404, 'Company not found.', 'COMPANY_NOT_FOUND');
    }

    res.json({ success: true, data: company });
  } catch (err) {
    next(err);
  }
}

// ============================================================
// PATCH /api/companies/me
// Update company details (owner only).
// ============================================================
export async function updateMyCompany(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parse = UpdateCompanySchema.safeParse(req.body);
    if (!parse.success) {
      throw new AppError(400, parse.error.issues[0].message, 'VALIDATION_ERROR');
    }

    const { data: updated, error } = await supabaseAdmin
      .from('companies')
      .update(parse.data)
      .eq('id', req.user!.company_id)
      .select()
      .single();

    if (error) {
      throw new AppError(500, `Update failed: ${error.message}`, 'DB_ERROR');
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

// ============================================================
// POST /api/companies/invite
// Invite a user to join this company by email.
// Uses Supabase Admin Auth to send a magic-link invite email.
// The trigger handle_invited_user() on auth.users auto-creates
// the public.users row when the invitee accepts.
// ============================================================
export async function inviteUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parse = InviteUserSchema.safeParse(req.body);
    if (!parse.success) {
      throw new AppError(400, parse.error.issues[0].message, 'VALIDATION_ERROR');
    }

    const { email, role } = parse.data;

    // Supabase sends a magic link to the email.
    // company_id and role are embedded in user metadata so the
    // handle_invited_user trigger can read them on accept.
    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        company_id: req.user!.company_id,
        role,
      },
    });

    if (error) {
      throw new AppError(
        400,
        `Failed to send invite: ${error.message}`,
        'INVITE_FAILED'
      );
    }

    res.status(202).json({
      success: true,
      data: {
        message: `Invitation sent to ${email}. They will receive a magic link email.`,
        email,
        role,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================
// GET /api/companies/members
// List all users in the caller's company.
// ============================================================
export async function listMembers(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { data: members, error } = await supabaseAdmin
      .from('users')
      .select('id, role, created_at')
      .eq('company_id', req.user!.company_id)
      .order('created_at', { ascending: true });

    if (error) {
      throw new AppError(500, error.message, 'DB_ERROR');
    }

    res.json({ success: true, data: members });
  } catch (err) {
    next(err);
  }
}
