import { Router, RequestHandler } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { upload } from '../../middleware/upload.middleware';
import { uploadTransactions, getTransactions } from './transactions.controller';

const router = Router();

/**
 * POST /api/upload-transactions
 * Hybrid CSV/Excel ingestion.
 * Accepts multipart/form-data with:
 *   - file: the CSV or Excel file
 *   - column_mappings (optional): JSON string with manual header-to-schema mappings
 */
router.post(
  '/upload-transactions',
  authMiddleware,
  upload.single('file'),
  uploadTransactions as RequestHandler
);

/**
 * GET /api/transactions
 * List transactions with optional filters:
 *   ?limit=50&offset=0&transaction_type=income&from_date=2024-01-01&to_date=2024-12-31
 */
router.get('/transactions', authMiddleware, getTransactions as RequestHandler);

export default router;
