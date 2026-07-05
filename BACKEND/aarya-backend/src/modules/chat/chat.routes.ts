import { Router, RequestHandler } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { executeChat } from './chat.controller';

const router = Router();

/**
 * POST /api/chat
 * Route dedicated to virtual CFO conversations. Protected with multi-tenant auth.
 */
router.post('/', authMiddleware, executeChat as RequestHandler);

export default router;
