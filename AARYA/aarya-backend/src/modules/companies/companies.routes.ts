import { Router, RequestHandler } from 'express';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import {
  onboardNewUser,
  getMyCompany,
  updateMyCompany,
  inviteUser,
  listMembers,
} from './companies.controller';

const router = Router();

/**
 * POST /api/companies/onboard
 * Create a company for a freshly signed-up user (no company yet).
 * Uses a lighter auth check (verifies token only, no profile lookup).
 */
router.post('/onboard', onboardNewUser as RequestHandler);

/**
 * GET /api/companies/me
 * Returns the authenticated user's company.
 */
router.get('/me', authMiddleware, getMyCompany as RequestHandler);

/**
 * PATCH /api/companies/me
 * Update company name or subscription (owner only).
 */
router.patch('/me', authMiddleware, requireRole('owner'), updateMyCompany as RequestHandler);

/**
 * GET /api/companies/members
 * List all users in the company.
 */
router.get('/members', authMiddleware, listMembers as RequestHandler);

/**
 * POST /api/companies/invite
 * Invite a user to join this company via magic-link email (owner/admin only).
 */
router.post('/invite', authMiddleware, requireRole('owner', 'admin'), inviteUser as RequestHandler);

export default router;
