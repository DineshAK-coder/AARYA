import { Router, RequestHandler } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { getMe } from './auth.controller';

const router = Router();

/**
 * GET /api/auth/me
 * Returns the authenticated user's profile and company details.
 */
router.get('/me', authMiddleware, getMe as RequestHandler);

export default router;
