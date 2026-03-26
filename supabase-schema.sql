-- =============================================================================
-- Supabase Schema for Sales Portal
-- Run this in the Supabase SQL Editor to create the required tables.
-- =============================================================================

-- Pipeline configuration: which Pipedrive pipelines to monitor
CREATE TABLE IF NOT EXISTS pipeline_config (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pipeline_id   INTEGER NOT NULL UNIQUE,
  pipeline_name TEXT,
  selected         BOOLEAN NOT NULL DEFAULT TRUE,
  is_top_of_funnel BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Spending capacity tier thresholds (singleton row)
-- Separate thresholds for deal-value-based and revenue-based classification
CREATE TABLE IF NOT EXISTS tier_settings (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  -- Deal-value thresholds (when org revenue is unavailable)
  deal_enterprise     NUMERIC NOT NULL DEFAULT 100000,
  deal_mid_market     NUMERIC NOT NULL DEFAULT 25000,
  deal_smb            NUMERIC NOT NULL DEFAULT 5000,

  -- Org-revenue thresholds (preferred when revenue field exists)
  rev_enterprise      NUMERIC NOT NULL DEFAULT 50000000,
  rev_mid_market      NUMERIC NOT NULL DEFAULT 10000000,
  rev_smb             NUMERIC NOT NULL DEFAULT 1000000,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default row
INSERT INTO tier_settings (deal_enterprise, deal_mid_market, deal_smb, rev_enterprise, rev_mid_market, rev_smb)
VALUES (100000, 25000, 5000, 50000000, 10000000, 1000000)
ON CONFLICT DO NOTHING;

-- Index for quick lookups by pipeline_id
CREATE INDEX IF NOT EXISTS idx_pipeline_config_pipeline_id ON pipeline_config (pipeline_id);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pipeline_config_updated_at
  BEFORE UPDATE ON pipeline_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ─── Migration: add is_top_of_funnel flag ────────────────────────────────────
-- Run this once if the table already exists:
--   ALTER TABLE pipeline_config ADD COLUMN IF NOT EXISTS is_top_of_funnel BOOLEAN NOT NULL DEFAULT FALSE;
-- ──────────────────────────────────────────────────────────────────────────────

-- Enable Row Level Security (allow all for now — tighten per your auth setup)
ALTER TABLE pipeline_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to pipeline_config"
  ON pipeline_config
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Partner organizations
CREATE TABLE IF NOT EXISTS partners (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name            TEXT NOT NULL,
  contact_email   TEXT,
  api_key         TEXT,
  default_stage   TEXT,
  sheet_tab       TEXT,
  back_sync       BOOLEAN NOT NULL DEFAULT FALSE,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_partners_updated_at
  BEFORE UPDATE ON partners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to partners"
  ON partners
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- RBAC: Application Roles
-- =============================================================================
CREATE TABLE IF NOT EXISTS app_roles (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text NOT NULL UNIQUE,          -- snake_case identifier
  label       text NOT NULL,                 -- Human-readable label
  description text NOT NULL DEFAULT '',
  is_system   boolean NOT NULL DEFAULT false, -- true = cannot be deleted (e.g. super_admin)
  sort_order  int  NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_roles_read" ON app_roles FOR SELECT USING (true);
CREATE POLICY "app_roles_write" ON app_roles FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER trg_app_roles_updated_at
  BEFORE UPDATE ON app_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Seed default roles
INSERT INTO app_roles (name, label, description, is_system, sort_order) VALUES
  ('super_admin',          'Super Admin',          'Top-level system administrator with full access.',                     true,  0),
  ('sales_admin',          'Sales Admin',          'Manages sales teams, pipelines, partners, and user assignments.',      false, 1),
  ('sales_executive',      'Sales Executive',      'Views dashboards, pipeline analytics, and deal performance.',          false, 2),
  ('leadership_executive', 'Leadership Executive', 'Read-only executive view of dashboards and high-level KPIs.',          false, 3),
  ('internal_caller',      'Internal Caller',      'Internal sales caller — creates leads and manages contacts.',          false, 4),
  ('external_caller',      'External Caller',      'External/partner sales caller — limited to assigned pipelines only.',  false, 5)
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- RBAC: Authorized Application Users
-- =============================================================================
CREATE TABLE IF NOT EXISTS app_users (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email       text NOT NULL UNIQUE,
  name        text NOT NULL,
  role_id     uuid NOT NULL REFERENCES app_roles(id),
  is_active   boolean NOT NULL DEFAULT true,
  last_login  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_app_users_email    ON app_users (email);
CREATE INDEX idx_app_users_role_id  ON app_users (role_id);

ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_users_all" ON app_users FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER trg_app_users_updated_at
  BEFORE UPDATE ON app_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- RBAC: Role → Permission Mapping
-- =============================================================================
CREATE TABLE IF NOT EXISTS app_role_permissions (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id     uuid NOT NULL REFERENCES app_roles(id) ON DELETE CASCADE,
  permission  text NOT NULL,
  UNIQUE (role_id, permission)
);

ALTER TABLE app_role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_role_permissions_read" ON app_role_permissions FOR SELECT USING (true);

-- =============================================================================
-- RBAC: Per-User Permission Overrides (additive only)
-- =============================================================================
CREATE TABLE IF NOT EXISTS app_user_permissions (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  permission  text NOT NULL,
  granted_by  uuid REFERENCES app_users(id),
  granted_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, permission)
);

CREATE INDEX idx_app_user_permissions_user ON app_user_permissions (user_id);

ALTER TABLE app_user_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_user_permissions_all" ON app_user_permissions
  FOR ALL USING (true) WITH CHECK (true);

-- =============================================================================
-- RBAC: Seed Role ↔ Permission Mappings
-- =============================================================================

-- Helper function to get role id by name
CREATE OR REPLACE FUNCTION _role_id(rname text) RETURNS uuid
  LANGUAGE sql STABLE AS $$
    SELECT id FROM app_roles WHERE name = rname LIMIT 1;
  $$;

-- ── Super Admin: ALL permissions ─────────────────────
INSERT INTO app_role_permissions (role_id, permission) VALUES
  -- Portal access
  (_role_id('super_admin'), 'portal:admin'),
  (_role_id('super_admin'), 'portal:caller'),
  -- Dashboard
  (_role_id('super_admin'), 'dashboard:view'),
  -- Pipelines
  (_role_id('super_admin'), 'pipeline:view'),
  (_role_id('super_admin'), 'pipeline:edit'),
  -- Deals
  (_role_id('super_admin'), 'deals:view'),
  (_role_id('super_admin'), 'deals:edit'),
  (_role_id('super_admin'), 'deals:delete'),
  -- Prospects
  (_role_id('super_admin'), 'prospects:view'),
  (_role_id('super_admin'), 'prospects:edit'),
  -- Partners
  (_role_id('super_admin'), 'partners:view'),
  (_role_id('super_admin'), 'partners:edit'),
  (_role_id('super_admin'), 'partners:delete'),
  -- Settings
  (_role_id('super_admin'), 'settings:view'),
  (_role_id('super_admin'), 'settings:edit'),
  -- Users & Roles
  (_role_id('super_admin'), 'users:view'),
  (_role_id('super_admin'), 'users:edit'),
  (_role_id('super_admin'), 'roles:view'),
  (_role_id('super_admin'), 'roles:edit'),
  (_role_id('super_admin'), 'roles:manage_permissions'),
  -- Caller features
  (_role_id('super_admin'), 'leads:view'),
  (_role_id('super_admin'), 'leads:create'),
  (_role_id('super_admin'), 'leads:edit'),
  (_role_id('super_admin'), 'contacts:view'),
  (_role_id('super_admin'), 'contacts:edit'),
  (_role_id('super_admin'), 'caller_stats:view'),
  -- Pipeline assignment admin
  (_role_id('super_admin'), 'pipeline_assignments:view'),
  (_role_id('super_admin'), 'pipeline_assignments:edit')
ON CONFLICT DO NOTHING;

-- ── Sales Admin: admin portal + user/pipeline management ──
INSERT INTO app_role_permissions (role_id, permission) VALUES
  (_role_id('sales_admin'), 'portal:admin'),
  (_role_id('sales_admin'), 'portal:caller'),
  (_role_id('sales_admin'), 'dashboard:view'),
  (_role_id('sales_admin'), 'pipeline:view'),
  (_role_id('sales_admin'), 'pipeline:edit'),
  (_role_id('sales_admin'), 'deals:view'),
  (_role_id('sales_admin'), 'deals:edit'),
  (_role_id('sales_admin'), 'prospects:view'),
  (_role_id('sales_admin'), 'prospects:edit'),
  (_role_id('sales_admin'), 'partners:view'),
  (_role_id('sales_admin'), 'partners:edit'),
  (_role_id('sales_admin'), 'settings:view'),
  (_role_id('sales_admin'), 'users:view'),
  (_role_id('sales_admin'), 'users:edit'),
  (_role_id('sales_admin'), 'roles:view'),
  (_role_id('sales_admin'), 'leads:view'),
  (_role_id('sales_admin'), 'leads:create'),
  (_role_id('sales_admin'), 'leads:edit'),
  (_role_id('sales_admin'), 'contacts:view'),
  (_role_id('sales_admin'), 'contacts:edit'),
  (_role_id('sales_admin'), 'caller_stats:view'),
  (_role_id('sales_admin'), 'pipeline_assignments:view'),
  (_role_id('sales_admin'), 'pipeline_assignments:edit')
ON CONFLICT DO NOTHING;

-- ── Sales Executive: admin portal, view-heavy + deals ──
INSERT INTO app_role_permissions (role_id, permission) VALUES
  (_role_id('sales_executive'), 'portal:admin'),
  (_role_id('sales_executive'), 'dashboard:view'),
  (_role_id('sales_executive'), 'pipeline:view'),
  (_role_id('sales_executive'), 'deals:view'),
  (_role_id('sales_executive'), 'deals:edit'),
  (_role_id('sales_executive'), 'prospects:view'),
  (_role_id('sales_executive'), 'prospects:edit'),
  (_role_id('sales_executive'), 'partners:view'),
  (_role_id('sales_executive'), 'caller_stats:view')
ON CONFLICT DO NOTHING;

-- ── Leadership Executive: read-only admin dashboards ──
INSERT INTO app_role_permissions (role_id, permission) VALUES
  (_role_id('leadership_executive'), 'portal:admin'),
  (_role_id('leadership_executive'), 'dashboard:view'),
  (_role_id('leadership_executive'), 'pipeline:view'),
  (_role_id('leadership_executive'), 'deals:view'),
  (_role_id('leadership_executive'), 'prospects:view'),
  (_role_id('leadership_executive'), 'partners:view')
ON CONFLICT DO NOTHING;

-- ── Internal Caller: full caller features ──
INSERT INTO app_role_permissions (role_id, permission) VALUES
  (_role_id('internal_caller'), 'portal:caller'),
  (_role_id('internal_caller'), 'leads:view'),
  (_role_id('internal_caller'), 'leads:create'),
  (_role_id('internal_caller'), 'leads:edit'),
  (_role_id('internal_caller'), 'contacts:view'),
  (_role_id('internal_caller'), 'contacts:edit'),
  (_role_id('internal_caller'), 'caller_stats:view')
ON CONFLICT DO NOTHING;

-- ── External Caller: limited caller features (no contact edit) ──
INSERT INTO app_role_permissions (role_id, permission) VALUES
  (_role_id('external_caller'), 'portal:caller'),
  (_role_id('external_caller'), 'leads:view'),
  (_role_id('external_caller'), 'leads:create'),
  (_role_id('external_caller'), 'caller_stats:view')
ON CONFLICT DO NOTHING;

DROP FUNCTION IF EXISTS _role_id(text);

-- =============================================================================
-- RBAC: User ↔ Pipeline Assignments
-- Determines which Pipedrive pipelines a sales user can enter deals into.
-- If a user has NO rows here, they can enter deals into ALL pipelines
-- (unrestricted — applies to admins). If rows exist, they are restricted
-- to only those pipelines.
-- =============================================================================
CREATE TABLE IF NOT EXISTS app_user_pipelines (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  pipeline_id   integer NOT NULL,                    -- Pipedrive pipeline ID
  pipeline_name text,                                -- Cached human-readable name
  assigned_by   uuid REFERENCES app_users(id),
  assigned_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, pipeline_id)
);

CREATE INDEX idx_app_user_pipelines_user ON app_user_pipelines (user_id);
CREATE INDEX idx_app_user_pipelines_pipeline ON app_user_pipelines (pipeline_id);

ALTER TABLE app_user_pipelines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_user_pipelines_all" ON app_user_pipelines
  FOR ALL USING (true) WITH CHECK (true);
