import { Router, RequestHandler } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { listSnapshots, createSnapshot } from './snapshots.controller';

const router = Router();

/** GET /api/snapshots — List financial snapshots (all roles) */
router.get('/', authMiddleware, listSnapshots as RequestHandler);

/** POST /api/snapshots — Create a snapshot (admin+) */
router.post('/', authMiddleware, createSnapshot as RequestHandler);

export default router;
