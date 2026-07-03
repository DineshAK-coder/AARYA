-- ============================================================
-- AARYA AI CFO – Initial Database Migration
-- File: 001_initial_schema.sql
-- Run this entire file in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================

-- uuid-ossp: robust UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- vector: pgvector for AI embedding storage & similarity search
-- Enable this first in: Database → Extensions → search "vector" → toggle ON
CREATE EXTENSION IF NOT EXISTS "vector";


-- ============================================================
-- ENUMS
-- ============================================================

-- Subscription tiers for companies
DO $$ BEGIN
    CREATE TYPE public.subscription_status_enum AS ENUM ('free', 'pro', 'enterprise');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- User roles within a company (owner > admin > viewer)
DO $$ BEGIN
    CREATE TYPE public.user_role_enum AS ENUM ('owner', 'admin', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Financial transaction classification
DO $$ BEGIN
    CREATE TYPE public.transaction_type_enum AS ENUM ('income', 'expense', 'transfer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================
-- TABLE: companies
-- Core multi-tenant anchor. One row = one SME customer.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.companies (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name                TEXT        NOT NULL,
    subscription_status public.subscription_status_enum NOT NULL DEFAULT 'free',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.companies                    IS 'Root tenant table. Every other table references this via company_id.';
COMMENT ON COLUMN public.companies.id                 IS 'Primary key – unique tenant identifier.';
COMMENT ON COLUMN public.companies.subscription_status IS 'Billing tier: free | pro | enterprise.';


-- ============================================================
-- TABLE: users
-- Mirrors auth.users from Supabase Auth. One user = one company.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.users (
    id          UUID      PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id  UUID      NOT NULL    REFERENCES public.companies(id) ON DELETE CASCADE,
    role        public.user_role_enum NOT NULL DEFAULT 'owner',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.users            IS 'Application user profiles. id matches Supabase Auth UID.';
COMMENT ON COLUMN public.users.role       IS 'owner: full control | admin: can mutate data | viewer: read-only.';
COMMENT ON COLUMN public.users.company_id IS 'FK to companies. A user can belong to exactly one company.';


-- ============================================================
-- TABLE: financial_transactions
-- Raw ledger data uploaded by users (CSV/Excel or manual).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id       UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    amount           NUMERIC(15, 2) NOT NULL,
    transaction_type public.transaction_type_enum NOT NULL,
    due_date         DATE,
    description      TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.financial_transactions                  IS 'Raw financial ledger entries per company.';
COMMENT ON COLUMN public.financial_transactions.amount           IS 'Always stored as a positive value. Sign is conveyed by transaction_type.';
COMMENT ON COLUMN public.financial_transactions.transaction_type IS 'income | expense | transfer.';
COMMENT ON COLUMN public.financial_transactions.due_date         IS 'Date the transaction is due or occurred.';


-- ============================================================
-- TABLE: financial_state_snapshots
-- Periodic AI-computed financial health summaries.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.financial_state_snapshots (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id     UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    runway_months  NUMERIC(10, 2),
    net_cash_flow  NUMERIC(15, 2),
    snapshot_date  DATE        NOT NULL DEFAULT CURRENT_DATE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.financial_state_snapshots               IS 'Periodic snapshots of the company financial health computed by the AI layer.';
COMMENT ON COLUMN public.financial_state_snapshots.runway_months IS 'Estimated months before cash runs out at current burn rate.';
COMMENT ON COLUMN public.financial_state_snapshots.net_cash_flow IS 'Net inflow minus outflow for the snapshot period.';


-- ============================================================
-- TABLE: decision_memory_logs
-- AI memory ledger. Stores context, recommendations, outcomes
-- and their vector embeddings for semantic retrieval.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.decision_memory_logs (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id        UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    context           TEXT        NOT NULL,
    ai_recommendation TEXT        NOT NULL,
    founder_decision  TEXT,
    -- Google text-embedding-004 outputs 768-dimensional vectors
    embedding         vector(768),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.decision_memory_logs              IS 'AI decision history with pgvector embeddings for semantic similarity search.';
COMMENT ON COLUMN public.decision_memory_logs.context      IS 'The financial situation or question posed to the AI.';
COMMENT ON COLUMN public.decision_memory_logs.embedding    IS '768-dimensional vector from Google text-embedding-004.';
COMMENT ON COLUMN public.decision_memory_logs.founder_decision IS 'The actual decision taken by the founder (logged for learning).';


-- ============================================================
-- INDEXES
-- ============================================================

-- FK traversal speed
CREATE INDEX IF NOT EXISTS idx_users_company_id    ON public.users (company_id);
CREATE INDEX IF NOT EXISTS idx_ft_company_id       ON public.financial_transactions (company_id);
CREATE INDEX IF NOT EXISTS idx_ft_due_date         ON public.financial_transactions (due_date);
CREATE INDEX IF NOT EXISTS idx_ft_type             ON public.financial_transactions (transaction_type);
CREATE INDEX IF NOT EXISTS idx_fss_company_id      ON public.financial_state_snapshots (company_id);
CREATE INDEX IF NOT EXISTS idx_fss_snapshot_date   ON public.financial_state_snapshots (snapshot_date);
CREATE INDEX IF NOT EXISTS idx_dml_company_id      ON public.decision_memory_logs (company_id);

-- IVFFlat index for approximate nearest-neighbour (ANN) cosine similarity search.
-- lists=100 is suitable for up to ~1M vectors; tune upward if data grows significantly.
-- NOTE: For accurate results early on, you may fall back to sequential scan (no index)
--       until you have at least ~1,000 embeddings.
CREATE INDEX IF NOT EXISTS idx_dml_embedding_ivfflat
    ON public.decision_memory_logs
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);


-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- get_my_company_id()
-- Returns the company_id for the currently authenticated Supabase Auth user.
-- Used inside RLS policies to avoid per-row sub-query repetition.
-- SECURITY DEFINER with a locked search_path prevents search-path injection.
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT company_id
    FROM   public.users
    WHERE  id = auth.uid();
$$;

COMMENT ON FUNCTION public.get_my_company_id() IS
    'Returns the company_id of the currently authenticated user. Used in RLS policies.';


-- create_company_and_owner(p_company_name, p_user_id)
-- Atomically creates a new company and registers the caller as its owner.
-- Called by the backend (service_role) during the onboarding flow.
CREATE OR REPLACE FUNCTION public.create_company_and_owner(
    p_company_name TEXT,
    p_user_id      UUID
)
RETURNS public.companies
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_company public.companies;
BEGIN
    -- Create the company tenant record
    INSERT INTO public.companies (name)
    VALUES (p_company_name)
    RETURNING * INTO v_company;

    -- Register the user as owner of that company
    INSERT INTO public.users (id, company_id, role)
    VALUES (p_user_id, v_company.id, 'owner');

    RETURN v_company;
END;
$$;

COMMENT ON FUNCTION public.create_company_and_owner(TEXT, UUID) IS
    'Atomic onboarding: creates a company and assigns the given user as owner.';


-- match_decisions(query_embedding, threshold, count, company_id)
-- Semantic similarity search over decision_memory_logs using cosine distance.
-- Returns rows with similarity score above match_threshold, most similar first.
CREATE OR REPLACE FUNCTION public.match_decisions(
    p_query_embedding vector(768),
    p_match_threshold FLOAT,
    p_match_count     INT,
    p_company_id      UUID
)
RETURNS TABLE (
    id                UUID,
    context           TEXT,
    ai_recommendation TEXT,
    founder_decision  TEXT,
    similarity        FLOAT
)
LANGUAGE SQL
STABLE
AS $$
    SELECT
        dml.id,
        dml.context,
        dml.ai_recommendation,
        dml.founder_decision,
        1 - (dml.embedding <=> p_query_embedding) AS similarity
    FROM public.decision_memory_logs dml
    WHERE dml.company_id = p_company_id
      AND dml.embedding  IS NOT NULL
      AND 1 - (dml.embedding <=> p_query_embedding) > p_match_threshold
    ORDER BY dml.embedding <=> p_query_embedding
    LIMIT p_match_count;
$$;

COMMENT ON FUNCTION public.match_decisions(vector, float, int, uuid) IS
    'Cosine similarity search on decision_memory_logs. Returns most relevant past decisions.';


-- ============================================================
-- TRIGGER: auto-create user record for invited users
-- When an admin invites a user via Supabase Admin API
-- (supabaseAdmin.auth.admin.inviteUserByEmail), company_id and
-- role are embedded in the invite metadata. This trigger reads
-- that metadata and inserts a row into public.users automatically.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_invited_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only act when invite metadata contains a company_id
    IF (NEW.raw_user_meta_data ->> 'company_id') IS NOT NULL THEN
        INSERT INTO public.users (id, company_id, role)
        VALUES (
            NEW.id,
            (NEW.raw_user_meta_data ->> 'company_id')::UUID,
            COALESCE(
                (NEW.raw_user_meta_data ->> 'role')::public.user_role_enum,
                'viewer'::public.user_role_enum
            )
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_invited_user();

COMMENT ON FUNCTION public.handle_invited_user() IS
    'Auto-creates public.users row when a user accepts a Supabase Auth invite with company_id metadata.';


-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
-- All tables: authenticated users can ONLY access rows where
-- company_id matches their own company (from public.users).
-- The service_role key bypasses RLS entirely – never expose it
-- to the client. The backend uses it for bulk inserts only.
-- ============================================================

ALTER TABLE public.companies                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_state_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_memory_logs      ENABLE ROW LEVEL SECURITY;


-- ----------------------------------------------------------------
-- companies policies
-- ----------------------------------------------------------------

CREATE POLICY "companies__select__own"
    ON public.companies
    FOR SELECT TO authenticated
    USING (id = public.get_my_company_id());

CREATE POLICY "companies__update__owner_only"
    ON public.companies
    FOR UPDATE TO authenticated
    USING (
        id = public.get_my_company_id()
        AND EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'owner'
        )
    )
    WITH CHECK (id = public.get_my_company_id());


-- ----------------------------------------------------------------
-- users policies
-- ----------------------------------------------------------------

CREATE POLICY "users__select__same_company"
    ON public.users
    FOR SELECT TO authenticated
    USING (company_id = public.get_my_company_id());

CREATE POLICY "users__update__own_row"
    ON public.users
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (
        id = auth.uid()
        -- Prevent self-role escalation: users cannot promote themselves
        AND role <= (SELECT role FROM public.users WHERE id = auth.uid())
    );


-- ----------------------------------------------------------------
-- financial_transactions policies
-- ----------------------------------------------------------------

CREATE POLICY "ft__select__same_company"
    ON public.financial_transactions
    FOR SELECT TO authenticated
    USING (company_id = public.get_my_company_id());

CREATE POLICY "ft__insert__same_company"
    ON public.financial_transactions
    FOR INSERT TO authenticated
    WITH CHECK (company_id = public.get_my_company_id());

CREATE POLICY "ft__update__admin_plus"
    ON public.financial_transactions
    FOR UPDATE TO authenticated
    USING (
        company_id = public.get_my_company_id()
        AND EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    )
    WITH CHECK (company_id = public.get_my_company_id());

CREATE POLICY "ft__delete__admin_plus"
    ON public.financial_transactions
    FOR DELETE TO authenticated
    USING (
        company_id = public.get_my_company_id()
        AND EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    );


-- ----------------------------------------------------------------
-- financial_state_snapshots policies
-- ----------------------------------------------------------------

CREATE POLICY "fss__select__same_company"
    ON public.financial_state_snapshots
    FOR SELECT TO authenticated
    USING (company_id = public.get_my_company_id());

CREATE POLICY "fss__insert__admin_plus"
    ON public.financial_state_snapshots
    FOR INSERT TO authenticated
    WITH CHECK (
        company_id = public.get_my_company_id()
        AND EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "fss__update__admin_plus"
    ON public.financial_state_snapshots
    FOR UPDATE TO authenticated
    USING (
        company_id = public.get_my_company_id()
        AND EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    )
    WITH CHECK (company_id = public.get_my_company_id());

CREATE POLICY "fss__delete__admin_plus"
    ON public.financial_state_snapshots
    FOR DELETE TO authenticated
    USING (
        company_id = public.get_my_company_id()
        AND EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    );


-- ----------------------------------------------------------------
-- decision_memory_logs policies
-- ----------------------------------------------------------------

CREATE POLICY "dml__select__same_company"
    ON public.decision_memory_logs
    FOR SELECT TO authenticated
    USING (company_id = public.get_my_company_id());

CREATE POLICY "dml__insert__same_company"
    ON public.decision_memory_logs
    FOR INSERT TO authenticated
    WITH CHECK (company_id = public.get_my_company_id());

CREATE POLICY "dml__update__same_company"
    ON public.decision_memory_logs
    FOR UPDATE TO authenticated
    USING  (company_id = public.get_my_company_id())
    WITH CHECK (company_id = public.get_my_company_id());

CREATE POLICY "dml__delete__same_company"
    ON public.decision_memory_logs
    FOR DELETE TO authenticated
    USING (company_id = public.get_my_company_id());


-- ============================================================
-- DONE
-- All tables, indexes, functions, triggers, and RLS policies
-- have been applied. Verify in:
--   Dashboard → Authentication → Policies
-- ============================================================
