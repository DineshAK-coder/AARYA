import { Router, RequestHandler } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { getMe } from './auth.controller.js';

const router = Router();

/**
 * GET /api/auth/me
 * Returns the authenticated user's profile and company details.
 */
router.get('/me', authMiddleware, getMe as RequestHandler);

export default router;
