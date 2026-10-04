BEGIN;

CREATE TABLE IF NOT EXISTS cb_cost_catalog_versions (
  id BIGSERIAL PRIMARY KEY,
  organization_id BIGINT NOT NULL REFERENCES cb_organizations(id),
  version_label TEXT NOT NULL,
  currency CHAR(3) NOT NULL,
  source_filename TEXT NOT NULL,
  source_sha256 CHAR(64) NOT NULL,
  source_content BYTEA NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved')),
  imported_by BIGINT NOT NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by BIGINT,
  reviewed_at TIMESTAMPTZ,
  UNIQUE (organization_id, version_label)
);

CREATE TABLE IF NOT EXISTS cb_cost_catalog_items (
  catalog_version_id BIGINT NOT NULL REFERENCES cb_cost_catalog_versions(id),
  code TEXT NOT NULL,
  description TEXT NOT NULL,
  unit TEXT NOT NULL,
  unit_cost NUMERIC(16,4) NOT NULL CHECK (unit_cost >= 0),
  source_line INTEGER NOT NULL CHECK (source_line >= 2),
  PRIMARY KEY (catalog_version_id, code)
);

CREATE INDEX IF NOT EXISTS cb_cost_catalog_org_status_idx
  ON cb_cost_catalog_versions(organization_id, status, imported_at DESC);

CREATE OR REPLACE FUNCTION cb_guard_cost_catalog_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'cost catalog versions are immutable'; END IF;
  IF OLD.status <> 'draft' OR NEW.status <> 'approved' OR NEW.reviewed_by IS NULL OR
     NEW.reviewed_by = OLD.imported_by OR NEW.reviewed_at IS NULL OR
     NEW.organization_id IS DISTINCT FROM OLD.organization_id OR
     NEW.version_label IS DISTINCT FROM OLD.version_label OR
     NEW.currency IS DISTINCT FROM OLD.currency OR
     NEW.source_filename IS DISTINCT FROM OLD.source_filename OR
     NEW.source_sha256 IS DISTINCT FROM OLD.source_sha256 OR
     NEW.source_content IS DISTINCT FROM OLD.source_content OR
     NEW.imported_by IS DISTINCT FROM OLD.imported_by OR
     NEW.imported_at IS DISTINCT FROM OLD.imported_at THEN
    RAISE EXCEPTION 'only independent catalog approval may update a version';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS cb_cost_catalog_version_guard ON cb_cost_catalog_versions;
CREATE TRIGGER cb_cost_catalog_version_guard BEFORE UPDATE OR DELETE ON cb_cost_catalog_versions
  FOR EACH ROW EXECUTE FUNCTION cb_guard_cost_catalog_version();

CREATE OR REPLACE FUNCTION cb_prevent_cost_catalog_item_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'cost catalog rows are immutable';
END;
$$;
DROP TRIGGER IF EXISTS cb_cost_catalog_item_guard ON cb_cost_catalog_items;
CREATE TRIGGER cb_cost_catalog_item_guard BEFORE UPDATE OR DELETE ON cb_cost_catalog_items
  FOR EACH ROW EXECUTE FUNCTION cb_prevent_cost_catalog_item_mutation();

COMMIT;
