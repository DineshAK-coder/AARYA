import Fuse from 'fuse.js';
import { classifyColumnsWithLLM } from './llmClassifier';
import { ColumnMappings, DetectionResult, ParsedTransactionRow, TransactionType } from '../types';
import { AppError } from '../middleware/error.middleware';

// ============================================================
// Column Mapper Utility
// ============================================================
// Implements a two-stage auto-detection pipeline:
//   Stage 1 – Fuzzy matching (Fuse.js, no API cost)
//   Stage 2 – LLM fallback via Google Gemini (if Stage 1 is insufficient)
// ============================================================

// ---- Known synonyms for each canonical schema field ----
const SYNONYM_MAP: Record<keyof ColumnMappings, string[]> = {
  amount: [
    'amount', 'total', 'value', 'sum', 'price', 'cost', 'revenue',
    'payment', 'debit', 'credit', 'money', 'charge', 'fee', 'salary',
    'income', 'expense', 'net', 'gross', 'subtotal',
  ],
  transaction_type: [
    'type', 'category', 'kind', 'transaction_type', 'transactiontype',
    'nature', 'classification', 'label', 'class', 'mode', 'direction',
    'flow', 'txtype', 'tx_type',
  ],
  due_date: [
    'date', 'due_date', 'duedate', 'due', 'transaction_date',
    'transactiondate', 'payment_date', 'paymentdate', 'invoice_date',
    'invoicedate', 'period', 'time', 'created', 'createdat', 'posted',
    'valuedate', 'value_date',
  ],
  description: [
    'description', 'note', 'notes', 'memo', 'details', 'narration',
    'particulars', 'remark', 'remarks', 'info', 'information',
    'reference', 'ref', 'narrative', 'text', 'comment', 'comments',
    'purpose', 'reason',
  ],
};

// Threshold: Fuse score is 0 (perfect) → 1 (no match). Lower is better.
// A score below FUZZY_THRESHOLD means we're confident enough to use the match.
const FUZZY_THRESHOLD = 0.35;

// ---- Normalise a string for comparison ----
function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\s_\-./\\]+/g, '') // remove separators
    .trim();
}

// ---- Try to fuzzy-match a set of synonyms against the uploaded file headers ----
function fuzzyMatchField(
  headers: string[],
  synonyms: string[]
): { header: string; score: number } | null {
  const normalisedHeaders = headers.map((h) => ({
    original: h,
    normalised: normalise(h),
  }));

  const normalisedSynonyms = synonyms.map(normalise);

  // Stage 1a: Exact match on normalised string (score = 0)
  for (const { original, normalised: normHeader } of normalisedHeaders) {
    if (normalisedSynonyms.includes(normHeader)) {
      return { header: original, score: 0 };
    }
  }

  // Stage 1b: Fuse.js fuzzy match
  const fuse = new Fuse(normalisedHeaders, {
    keys: ['normalised'],
    threshold: FUZZY_THRESHOLD,
    includeScore: true,
    minMatchCharLength: 2,
  });

  let bestMatch: { header: string; score: number } | null = null;

  for (const synonym of normalisedSynonyms) {
    const results = fuse.search(synonym);
    if (results.length > 0) {
      const score = results[0].score ?? 1;
      if (!bestMatch || score < bestMatch.score) {
        bestMatch = { header: results[0].item.original, score };
      }
    }
  }

  return bestMatch && bestMatch.score < FUZZY_THRESHOLD ? bestMatch : null;
}

// ============================================================
// autoDetectMappings
// ============================================================

/**
 * Two-stage column auto-detection:
 *   1. Fuzzy match each canonical field against the file headers.
 *   2. If any required field (amount, transaction_type, due_date) is
 *      unmatched, fall back to a Gemini LLM call.
 *
 * @param headers    Raw header names from the uploaded file.
 * @param sampleRows First 3–5 data rows (for LLM context).
 */
export async function autoDetectMappings(
  headers: string[],
  sampleRows: Record<string, string>[]
): Promise<DetectionResult> {
  const partialMappings: Partial<ColumnMappings> = {};
  const confidence: Partial<Record<keyof ColumnMappings, number>> = {};
  const unmatched: (keyof ColumnMappings)[] = [];

  const canonicalFields = Object.keys(SYNONYM_MAP) as (keyof ColumnMappings)[];

  for (const field of canonicalFields) {
    const match = fuzzyMatchField(headers, SYNONYM_MAP[field]);
    if (match) {
      partialMappings[field] = match.header;
      confidence[field] = parseFloat((1 - match.score).toFixed(3));
    } else {
      unmatched.push(field);
    }
  }

  const requiredFields: (keyof ColumnMappings)[] = ['amount', 'transaction_type', 'due_date'];
  const missingRequired = requiredFields.filter((f) => unmatched.includes(f));

  if (missingRequired.length > 0) {
    // Fall back to LLM for the full mapping (it sees all headers + samples)
    const llmResult = await classifyColumnsWithLLM(headers, sampleRows);

    // Merge: LLM fills gaps; fuzzy results take precedence where available
    const mergedMappings: ColumnMappings = {
      amount:           partialMappings.amount           ?? llmResult.amount           ?? '',
      transaction_type: partialMappings.transaction_type ?? llmResult.transaction_type ?? '',
      due_date:         partialMappings.due_date         ?? llmResult.due_date         ?? '',
      description:      partialMappings.description      ?? llmResult.description      ?? null,
    };

    // Validate that required fields are resolved
    const stillMissing = requiredFields.filter((f) => !mergedMappings[f]);
    if (stillMissing.length > 0) {
      throw new AppError(
        422,
        `Could not auto-detect columns for: ${stillMissing.join(', ')}. ` +
        'Please provide column_mappings manually.',
        'COLUMN_DETECTION_FAILED'
      );
    }

    return { mappings: mergedMappings, source: 'llm', confidence };
  }

  return {
    mappings: partialMappings as ColumnMappings,
    source: 'fuzzy',
    confidence,
  };
}

// ============================================================
// Row transformation helpers
// ============================================================

/**
 * Normalise a raw CSV transaction_type string to our enum values.
 * Falls back to 'expense' for unknown values.
 */
export function normaliseTransactionType(raw: string): TransactionType {
  const v = raw.toLowerCase().trim();

  const incomeTerms  = ['income', 'revenue', 'credit', 'inflow', 'receipt', 'sales', 'gain', 'receivable', 'cr'];
  const expenseTerms = ['expense', 'debit', 'outflow', 'payment', 'cost', 'spend', 'loss', 'outgoing', 'payable', 'dr'];
  const transferTerms = ['transfer', 'move', 'shift', 'between'];

  if (incomeTerms.some((t)  => v.includes(t))) return 'income';
  if (expenseTerms.some((t) => v.includes(t))) return 'expense';
  if (transferTerms.some((t) => v.includes(t))) return 'transfer';

  return 'expense'; // safe default
}

/**
 * Parse a raw string amount into a positive number.
 * Handles currency symbols, thousands separators, and negative amounts.
 * Negative amounts indicate expense direction (the sign is preserved as-is
 * unless overridden by a transaction_type column).
 */
export function parseAmount(raw: string): { value: number; isNegative: boolean } {
  // Strip currency symbols and whitespace
  const cleaned = raw.replace(/[£$€¥₹,\s]/g, '').trim();
  const value   = parseFloat(cleaned);

  if (isNaN(value)) {
    throw new Error(`Cannot parse amount: "${raw}"`);
  }

  return { value: Math.abs(value), isNegative: value < 0 };
}

/**
 * Parse an ISO-ish or ambiguous date string into YYYY-MM-DD.
 * Accepts formats: YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, DD-MM-YYYY, etc.
 */
export function parseDate(raw: string): string | null {
  if (!raw || raw.trim() === '') return null;

  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) return raw.trim();

  // Try native Date parsing
  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  return null;
}

/**
 * Transform a raw CSV row into a validated ParsedTransactionRow using the provided mappings.
 * Throws a descriptive error if a required field is missing or invalid.
 */
export function transformRow(
  row: Record<string, string>,
  mappings: ColumnMappings,
  rowIndex: number
): ParsedTransactionRow {
  // ---- amount ----
  const rawAmount = row[mappings.amount];
  if (!rawAmount && rawAmount !== '0') {
    throw new Error(`Row ${rowIndex}: amount column "${mappings.amount}" is empty.`);
  }

  let amount: number;
  let isNegative: boolean;
  try {
    ({ value: amount, isNegative } = parseAmount(rawAmount));
  } catch {
    throw new Error(`Row ${rowIndex}: ${rawAmount} is not a valid amount.`);
  }

  // ---- transaction_type ----
  let transaction_type: TransactionType;
  if (mappings.transaction_type && row[mappings.transaction_type]) {
    transaction_type = normaliseTransactionType(row[mappings.transaction_type]);
  } else {
    // Infer from sign of amount
    transaction_type = isNegative ? 'expense' : 'income';
  }

  // ---- due_date ----
  const rawDate = row[mappings.due_date];
  const due_date = parseDate(rawDate ?? '');

  // ---- description (optional) ----
  const description =
    mappings.description && row[mappings.description]
      ? row[mappings.description].trim() || null
      : null;

  return { amount, transaction_type, due_date, description };
}
