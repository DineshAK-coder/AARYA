import { Request } from 'express';


// ============================================================
// DATABASE ENUMS
// ============================================================

export type SubscriptionStatus = 'free' | 'pro' | 'enterprise';
export type UserRole = 'owner' | 'admin' | 'viewer';
export type TransactionType = 'income' | 'expense' | 'transfer';

// ============================================================
// DATABASE ROW TYPES
// ============================================================

export interface Company {
  id: string;
  name: string;
  subscription_status: SubscriptionStatus;
  created_at: string;
}

export interface User {
  id: string;
  company_id: string;
  role: UserRole;
  created_at: string;
}

export interface FinancialTransaction {
  id: string;
  company_id: string;
  amount: number;
  transaction_type: TransactionType;
  due_date: string | null;
  description: string | null;
  created_at: string;
}

export interface FinancialStateSnapshot {
  id: string;
  company_id: string;
  runway_months: number | null;
  net_cash_flow: number | null;
  snapshot_date: string;
  created_at: string;
}

export interface DecisionMemoryLog {
  id: string;
  company_id: string;
  context: string;
  ai_recommendation: string;
  founder_decision: string | null;
  embedding?: number[] | null;
  created_at: string;
}

// ============================================================
// AUTH / REQUEST EXTENSIONS
// ============================================================

/** Authenticated user context attached to every protected request. */
export interface AuthUser {
  id: string;
  company_id: string;
  role: UserRole;
}

/** Express Request extended with authenticated user data. */
export interface AuthenticatedRequest extends Request {
  /**
   * Set by authMiddleware. Typed as optional so that AuthenticatedRequest
   * is assignable to Express's RequestHandler (which uses plain Request).
   * In any route protected by authMiddleware, req.user is always present —
   * use req.user! (non-null assertion) in controller code.
   */
  user?: AuthUser;
}

// ============================================================
// INGESTION TYPES
// ============================================================

/**
 * Maps canonical schema fields to actual CSV/Excel column header names.
 * amount, transaction_type, and due_date are required.
 * description is optional (nullable column).
 */
export interface ColumnMappings {
  amount: string;
  transaction_type: string;
  due_date: string;
  description?: string | null;
}

/** A single row after normalisation into our canonical schema. */
export interface ParsedTransactionRow {
  amount: number;
  transaction_type: TransactionType;
  due_date: string | null;
  description: string | null;
}

/** Result of a bulk insert operation. */
export interface IngestionResult {
  inserted: number;
  errors: Array<{ row: number; message: string }>;
  mapping_source?: 'manual' | 'fuzzy' | 'llm';
  detected_mappings?: ColumnMappings;
}

/** Result of column auto-detection. */
export interface DetectionResult {
  mappings: ColumnMappings;
  source: 'fuzzy' | 'llm';
  confidence: Partial<Record<keyof ColumnMappings, number>>;
}

// ============================================================
// API RESPONSE WRAPPERS
// ============================================================

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ============================================================
// PAGINATION
// ============================================================

export interface PaginationQuery {
  limit?: number;
  offset?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}
