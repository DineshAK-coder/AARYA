import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, ColumnMappings } from '../../types';
import { AppError } from '../../middleware/error.middleware';
import { ingestTransactions, listTransactions } from './transactions.service';

// ============================================================
// Transactions Controller
// ============================================================

// ---- Zod schema for manual column_mappings payload ----
const ColumnMappingsSchema = z.object({
  amount:           z.string().min(1),
  transaction_type: z.string().min(1),
  due_date:         z.string().min(1),
  description:      z.string().optional().nullable(),
});

// ============================================================
// POST /api/upload-transactions
// ============================================================
// Hybrid CSV/Excel ingestion endpoint.
//
// Request: multipart/form-data
//   - file          (required) CSV or Excel file
//   - column_mappings (optional) JSON string, e.g.:
//       { "amount": "Total", "transaction_type": "Type",
//         "due_date": "Date", "description": "Memo" }
//
// Scenario A: column_mappings provided → manual mapping
// Scenario B: column_mappings absent   → auto-detect (fuzzy + LLM fallback)
// ============================================================
export async function uploadTransactions(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Multer puts the file on req.file
    if (!req.file) {
      throw new AppError(400, 'No file uploaded. Include a CSV or Excel file in the "file" field.', 'FILE_MISSING');
    }

    // Parse optional column_mappings from the multipart form field
    let manualMappings: ColumnMappings | undefined;

    if (req.body.column_mappings) {
      let rawMappings: unknown;
      try {
        rawMappings = typeof req.body.column_mappings === 'string'
          ? JSON.parse(req.body.column_mappings)
          : req.body.column_mappings;
      } catch {
        throw new AppError(400, 'column_mappings must be a valid JSON string.', 'INVALID_JSON');
      }

      const parse = ColumnMappingsSchema.safeParse(rawMappings);
      if (!parse.success) {
        throw new AppError(
          400,
          `column_mappings validation error: ${parse.error.issues[0].message}`,
          'VALIDATION_ERROR'
        );
      }
      manualMappings = parse.data as ColumnMappings;
    }

    const result = await ingestTransactions(req.file, req.user!.company_id, manualMappings);

    const statusCode = result.errors.length > 0 ? 207 : 201; // 207 = Multi-Status (partial success)

    res.status(statusCode).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================
// GET /api/transactions
// List transactions for the authenticated company with pagination + filters.
// ============================================================
export async function getTransactions(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const QuerySchema = z.object({
      limit:            z.coerce.number().int().min(1).max(500).optional(),
      offset:           z.coerce.number().int().min(0).optional(),
      transaction_type: z.enum(['income', 'expense', 'transfer']).optional(),
      from_date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'from_date must be YYYY-MM-DD').optional(),
      to_date:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'to_date must be YYYY-MM-DD').optional(),
    });

    const parse = QuerySchema.safeParse(req.query);
    if (!parse.success) {
      throw new AppError(400, parse.error.issues[0].message, 'VALIDATION_ERROR');
    }

    const result = await listTransactions(req.user!.company_id, parse.data);

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
