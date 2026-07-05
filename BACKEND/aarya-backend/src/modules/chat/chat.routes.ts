import { Router, RequestHandler } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { handleChat } from './chat.controller';

const router = Router();

/**
 * POST /api/chat
 * Streaming AI CFO Agent endpoint with tool-calling.
 */
router.post('/', authMiddleware, handleChat as RequestHandler);

export default router;
