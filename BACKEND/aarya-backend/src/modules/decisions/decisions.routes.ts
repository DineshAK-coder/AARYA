import { Router, RequestHandler } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import {
  listDecisions,
  createDecision,
  searchDecisions,
  updateFounderDecision,
} from './decisions.controller';

const router = Router();

/** GET  /api/decisions           – List AI decision logs (paginated) */
router.get('/', authMiddleware, listDecisions as RequestHandler);

/** POST /api/decisions           – Store a new AI decision + embed it */
router.post('/', authMiddleware, createDecision as RequestHandler);

/** POST /api/decisions/search    – Semantic similarity search */
router.post('/search', authMiddleware, searchDecisions as RequestHandler);

/** PATCH /api/decisions/:id      – Log the founder's actual decision (outcome) */
router.patch('/:id', authMiddleware, updateFounderDecision as RequestHandler);

export default router;
