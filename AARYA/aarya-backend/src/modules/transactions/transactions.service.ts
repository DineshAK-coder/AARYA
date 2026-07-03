import { supabaseAdmin } from '../../config/supabase';
import { parseFileBuffer, sampleRows } from '../../utils/csvParser';
import { autoDetectMappings, transformRow } from '../../utils/columnMapper';
import {
  ColumnMappings,
  IngestionResult,
  ParsedTransactionRow,
  PaginatedResult,
  FinancialTransaction,
} from '../../types';
import { AppError } from '../../middleware/error.middleware';

// ============================================================
// Transactions Service
// ============================================================
// Contains all business logic for transaction ingestion and retrieval.
// The controller stays thin; all heavy lifting happens here.
// ============================================================

// Maximum rows to insert in a single Supabase batch call
const BATCH_SIZE = 500;

// ============================================================
// ingestTransactions
// ============================================================
// Core hybrid ingestion function called by the upload controller.
// Handles both Scenario A (manual mappings) and Scenario B (auto-detect).
// ============================================================

export async function ingestTransactions(
  file: Express.Multer.File,
  companyId: string,
  manualMappings?: ColumnMappings
): Promise<IngestionResult> {

  // ---- Step 1: Parse the file into headers + rows ----
  let parsedFile: { headers: string[]; rows: Record<string, string>[] };
  try {
    parsedFile = parseFileBuffer(file.buffer, file.mimetype);
  } catch (err) {
    throw new AppError(
      422,
      `File parsing failed: ${err instanceof Error ? err.message : String(err)}`,
      'PARSE_ERROR'
    );
  }

  const { headers, rows } = parsedFile;

  // ---- Step 2: Determine column mappings ----
  let mappings: ColumnMappings;
  let mappingSource: IngestionResult['mapping_source'];

  if (manualMappings) {
    // Scenario A: caller provided explicit mappings – validate them
    validateManualMappings(manualMappings, headers);
    mappings = manualMappings;
    mappingSource = 'manual';
  } else {
    // Scenario B: auto-detect
    const sample = sampleRows(rows, 5);
    const detection = await autoDetectMappings(headers, sample);
    mappings = detection.mappings;
    mappingSource = detection.source;
  }

  // ---- Step 3: Transform rows into canonical schema ----
  const validRows: ParsedTransactionRow[] = [];
  const errors: IngestionResult['errors'] = [];

  for (let i = 0; i < rows.length; i++) {
    try {
      const parsed = transformRow(rows[i], mappings, i + 2); // +2 for 1-indexed + header row
      validRows.push(parsed);
    } catch (err) {
      errors.push({
        row: i + 2,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (validRows.length === 0) {
    throw new AppError(
      422,
      `No valid rows could be parsed. ${errors.length} error(s) found.`,
      'NO_VALID_ROWS'
    );
  }

  // ---- Step 4: Batch insert into Supabase ----
  const insertPayload = validRows.map((row) => ({
    company_id:       companyId,
    amount:           row.amount,
    transaction_type: row.transaction_type,
    due_date:         row.due_date,
    description:      row.description,
  }));

  let insertedCount = 0;

  // Split into batches to avoid Supabase payload size limits
  for (let i = 0; i < insertPayload.length; i += BATCH_SIZE) {
    const batch = insertPayload.slice(i, i + BATCH_SIZE);
    const { error: insertError } = await supabaseAdmin
      .from('financial_transactions')
      .insert(batch);

    if (insertError) {
      throw new AppError(
        500,
        `Database insert failed (batch ${Math.floor(i / BATCH_SIZE) + 1}): ${insertError.message}`,
        'INSERT_ERROR'
      );
    }
    insertedCount += batch.length;
  }

  return {
    inserted: insertedCount,
    errors,
    mapping_source: mappingSource,
    detected_mappings: mappingSource !== 'manual' ? mappings : undefined,
  };
}

// ============================================================
// listTransactions
// ============================================================

export async function listTransactions(
  companyId: string,
  options: {
    limit?: number;
    offset?: number;
    transaction_type?: string;
    from_date?: string;
    to_date?: string;
  }
): Promise<PaginatedResult<FinancialTransaction>> {
  const limit  = Math.min(options.limit  ?? 50, 500);
  const offset = options.offset ?? 0;

  let query = supabaseAdmin
    .from('financial_transactions')
    .select('*', { count: 'exact' })
    .eq('company_id', companyId)
    .order('due_date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (options.transaction_type) {
    query = query.eq('transaction_type', options.transaction_type);
  }
  if (options.from_date) {
    query = query.gte('due_date', options.from_date);
  }
  if (options.to_date) {
    query = query.lte('due_date', options.to_date);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new AppError(500, error.message, 'DB_ERROR');
  }

  return {
    data: (data ?? []) as FinancialTransaction[],
    total: count ?? 0,
    limit,
    offset,
  };
}

// ============================================================
// Helpers
// ============================================================

function validateManualMappings(mappings: ColumnMappings, headers: string[]): void {
  const headerSet = new Set(headers);
  const required: (keyof ColumnMappings)[] = ['amount', 'transaction_type', 'due_date'];

  for (const field of required) {
    const value = mappings[field];
    if (!value) {
      throw new AppError(400, `column_mappings is missing required field: "${field}".`, 'VALIDATION_ERROR');
    }
    if (!headerSet.has(value)) {
      throw new AppError(
        400,
        `column_mappings["${field}"] = "${value}" does not match any column header in the file. ` +
        `Available headers: ${[...headerSet].join(', ')}`,
        'MAPPING_MISMATCH'
      );
    }
  }

  // Validate optional description mapping if provided
  if (mappings.description && !headerSet.has(mappings.description)) {
    throw new AppError(
      400,
      `column_mappings["description"] = "${mappings.description}" is not a valid column header.`,
      'MAPPING_MISMATCH'
    );
  }
}
