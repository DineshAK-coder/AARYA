/// <reference types="vite/client" />
/**
 * AARYA — Centralized API Client
 * ─────────────────────────────────────────────────────────────────────────────
 * All requests to the AARYA backend go through this module so that:
 *  1. The Supabase Auth JWT is automatically attached as "Authorization: Bearer"
 *  2. JSON requests get the correct Content-Type header
 *  3. Multipart/form-data (file uploads) are sent WITHOUT an explicit
 *     Content-Type so the browser can set the correct boundary string itself.
 *  4. The base URL is driven by VITE_API_BASE_URL (falls back to '' which
 *     works perfectly with the Vite dev-server proxy that forwards /api/* to
 *     http://localhost:3001).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createClient, type SupabaseClient, type Session } from '@supabase/supabase-js';

// ─── Supabase Browser Client ────────────────────────────────────────────────
// Only the public anon key is used here — the secret service_role key stays
// exclusively on the backend.
const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string | undefined;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let _supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnon) {
  _supabase = createClient(supabaseUrl, supabaseAnon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
} else {
  console.warn(
    '[apiClient] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing. ' +
    'Auth tokens will not be attached to API requests.'
  );
}

/**
 * Export the browser Supabase client so other modules (AuthView, etc.) can
 * use it for sign-in, sign-up, and session management.
 */
export const supabase = _supabase;

// ─── Base URL ────────────────────────────────────────────────────────────────
// During development the Vite proxy forwards /api/* → http://localhost:3001,
// so the base URL is empty ('').  In production builds, VITE_API_BASE_URL
// should be the deployed backend origin (e.g. https://api.aarya.app).
const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

// ─── Helper: get the current JWT ─────────────────────────────────────────────
async function getJwt(): Promise<string | null> {
  if (!_supabase) return null;
  const { data: { session } } = await _supabase.auth.getSession() as { data: { session: Session | null } };
  return session?.access_token ?? null;
}

// ─── Generic request helper ───────────────────────────────────────────────────
interface RequestOptions {
  /** Additional headers to merge. Do NOT set Content-Type for file uploads. */
  headers?: Record<string, string>;
  /** Signal for AbortController. */
  signal?: AbortSignal;
}

async function request<T = unknown>(
  method: string,
  path: string,
  body?: BodyInit | null,
  options: RequestOptions = {}
): Promise<T> {
  const jwt = await getJwt();

  const headers: Record<string, string> = { ...options.headers };

  if (jwt) {
    headers['Authorization'] = `Bearer ${jwt}`;
  }

  // For plain objects / arrays set JSON Content-Type automatically.
  // For FormData we intentionally omit Content-Type so the browser sets
  // the correct multipart boundary.
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const url = `${BASE_URL}${path}`;

  const response = await fetch(url, {
    method,
    headers,
    body: body ?? undefined,
    signal: options.signal,
    credentials: 'include',   // send cookies when using same-origin proxy
  });

  if (!response.ok) {
    let errorMessage = `API Error ${response.status}: ${response.statusText}`;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.error ?? errorBody.message ?? errorMessage;
    } catch {
      // body is not JSON — keep the status-text message
    }
    throw new Error(errorMessage);
  }

  // Return parsed JSON or empty object for 204 No Content
  if (response.status === 204) return {} as T;
  return response.json() as Promise<T>;
}

// ─── Public API Surface ───────────────────────────────────────────────────────

/** GET /health — no auth required */
export const healthCheck = () =>
  request<{ status: string; service: string; timestamp: string }>(
    'GET', '/health'
  );

/** GET /api/auth/me */
export const getMe = () =>
  request<unknown>('GET', '/api/auth/me');

// ── Company ──────────────────────────────────────────────────────────────────

/** POST /api/companies/onboard */
export const onboardCompany = (payload: { name: string }) =>
  request<unknown>('POST', '/api/companies/onboard', JSON.stringify(payload));

/** GET /api/companies/me */
export const getCompany = () =>
  request<unknown>('GET', '/api/companies/me');

/** PATCH /api/companies/me */
export const updateCompany = (payload: Record<string, unknown>) =>
  request<unknown>('PATCH', '/api/companies/me', JSON.stringify(payload));

/** GET /api/companies/members */
export const getCompanyMembers = () =>
  request<unknown>('GET', '/api/companies/members');

/** POST /api/companies/invite */
export const inviteMember = (payload: { email: string }) =>
  request<unknown>('POST', '/api/companies/invite', JSON.stringify(payload));

// ── Transactions ──────────────────────────────────────────────────────────────

/**
 * POST /api/upload-transactions
 * Accepts a File and an optional column_mappings JSON object.
 *
 * IMPORTANT: body is FormData — Content-Type is intentionally NOT set so the
 * browser attaches the correct multipart boundary automatically.
 */
export const uploadTransactions = (
  file: File,
  columnMappings?: Record<string, string>
) => {
  const form = new FormData();
  form.append('file', file);
  if (columnMappings && Object.keys(columnMappings).length > 0) {
    form.append('column_mappings', JSON.stringify(columnMappings));
  }
  return request<{
    success: boolean;
    data: {
      inserted: number;
      errors: unknown[];
      mapping_source: string;
      detected_mappings: Record<string, string>;
    };
  }>('POST', '/api/upload-transactions', form);
};

/**
 * GET /api/transactions
 * @param params  Optional query parameters: page, limit, start_date, end_date, type
 */
export const getTransactions = (params?: {
  page?: number;
  limit?: number;
  start_date?: string;
  end_date?: string;
  type?: string;
}) => {
  const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
  return request<unknown>('GET', `/api/transactions${qs}`);
};

// ── Financial State ────────────────────────────────────────────────────────────

/** GET /api/financial-state */
export const getFinancialState = () =>
  request<unknown>('GET', '/api/financial-state');

// ── Snapshots ─────────────────────────────────────────────────────────────────

/** GET /api/snapshots */
export const getSnapshots = (params?: { page?: number; limit?: number }) => {
  const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
  return request<unknown>('GET', `/api/snapshots${qs}`);
};

/** POST /api/snapshots */
export const createSnapshot = (payload: {
  runway_months: number;
  net_cash_flow: number;
  snapshot_date: string;
}) => request<unknown>('POST', '/api/snapshots', JSON.stringify(payload));

// ── AI Decision Memory ─────────────────────────────────────────────────────────

/** GET /api/decisions */
export const getDecisions = () =>
  request<unknown>('GET', '/api/decisions');

/** POST /api/decisions */
export const createDecision = (payload: Record<string, unknown>) =>
  request<unknown>('POST', '/api/decisions', JSON.stringify(payload));

/** POST /api/decisions/search */
export const searchDecisions = (payload: {
  query: string;
  threshold?: number;
  limit?: number;
}) => request<unknown>('POST', '/api/decisions/search', JSON.stringify(payload));

/** PATCH /api/decisions/:id */
export const updateDecision = (id: string, payload: Record<string, unknown>) =>
  request<unknown>('PATCH', `/api/decisions/${id}`, JSON.stringify(payload));

// ── CFO Chat ──────────────────────────────────────────────────────────────────

/**
 * POST /api/chat
 * Note: this endpoint lives on the *frontend* Express server (server.ts) at
 * port 3000 in the current setup, so we call it with path only (no BASE_URL
 * prefix needed — it's same-origin). If you migrate chat to the backend,
 * change this to use request() directly.
 */
export const postChat = (payload: {
  messages: Array<{ sender: string; text: string }>;
  context: Record<string, unknown>;
}) =>
  request<{ reply: string; simulated?: boolean }>('POST', '/api/chat', JSON.stringify({
    messages: payload.messages.map(m => ({
      sender: m.sender,
      text: m.text
    }))
  }));
