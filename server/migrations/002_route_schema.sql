-- ============================================================
-- AIConstructionBidAnalyzer Migration 002: route/UI schema
--
-- 001_schema.sql describes a smaller schema than the API routes
-- (and the client pages they serve) actually use, so a database
-- created from migrations alone answered every create with
-- "column/table does not exist" and only the demo seed worked.
--
-- This migration aligns the existing tables with the names the
-- routes use and adds the tables that 001 never created. It never
-- drops a table or a column; renames only happen when the old name
-- is present and the new one is not, so it is safe to re-run.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------------
-- 1. Tables 001 named differently than the routes
--    labor -> labor_costs, compliance -> compliance_checks
-- ------------------------------------------------------------------
DO $migration$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'labor')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'labor_costs') THEN
    ALTER TABLE labor RENAME TO labor_costs;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'compliance')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'compliance_checks') THEN
    ALTER TABLE compliance RENAME TO compliance_checks;
  END IF;
END
$migration$;

CREATE TABLE IF NOT EXISTS labor_costs (
  id SERIAL PRIMARY KEY,
  role VARCHAR(255) NOT NULL,
  hourly_rate DECIMAL(10,2),
  overtime_rate DECIMAL(10,2),
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  estimated_hours DECIMAL(10,2),
  actual_hours DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS compliance_checks (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  regulation VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  description TEXT,
  checked_by VARCHAR(255),
  check_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ------------------------------------------------------------------
-- 2. Columns 001 named differently than the routes
--    Rows are preserved; the old name is only renamed when the new
--    name does not already exist.
-- ------------------------------------------------------------------
DO $migration$
DECLARE
  mapping record;
BEGIN
  FOR mapping IN
    SELECT * FROM (VALUES
      ('contractors', 'name', 'company_name'),
      ('materials', 'unit_cost', 'unit_price'),
      ('labor_costs', 'trade', 'role'),
      ('labor_costs', 'hours_estimated', 'estimated_hours'),
      ('labor_costs', 'hours_actual', 'actual_hours'),
      ('change_orders', 'cost_impact', 'amount'),
      ('change_orders', 'schedule_impact_days', 'impact_days'),
      ('risk_assessments', 'risk_category', 'risk_type'),
      ('risk_assessments', 'risk_description', 'description'),
      ('risk_assessments', 'probability', 'likelihood'),
      ('risk_assessments', 'mitigation_strategy', 'mitigation')
    ) AS m(table_name, old_column, new_column)
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = mapping.table_name AND column_name = mapping.old_column)
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = mapping.table_name AND column_name = mapping.new_column) THEN
      EXECUTE format('ALTER TABLE %I RENAME COLUMN %I TO %I', mapping.table_name, mapping.old_column, mapping.new_column);
    END IF;
  END LOOP;
END
$migration$;

-- ------------------------------------------------------------------
-- 3. Columns the routes write that 001 never defined
--    (legacy 001 columns are kept; nothing is dropped)
-- ------------------------------------------------------------------
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS years_experience INTEGER;
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS location VARCHAR(255);

ALTER TABLE materials ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10,2);
ALTER TABLE materials ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE materials ADD COLUMN IF NOT EXISTS in_stock BOOLEAN DEFAULT true;

ALTER TABLE labor_costs ADD COLUMN IF NOT EXISTS role VARCHAR(255);
ALTER TABLE labor_costs ADD COLUMN IF NOT EXISTS overtime_rate DECIMAL(10,2);
ALTER TABLE labor_costs ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(10,2);
ALTER TABLE labor_costs ADD COLUMN IF NOT EXISTS actual_hours DECIMAL(10,2) DEFAULT 0;

ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2);
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2);
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS availability VARCHAR(50) DEFAULT 'available';

ALTER TABLE change_orders ADD COLUMN IF NOT EXISTS amount DECIMAL(15,2);
ALTER TABLE change_orders ADD COLUMN IF NOT EXISTS impact_days INTEGER DEFAULT 0;

ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS risk_type VARCHAR(100);
ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS likelihood VARCHAR(50);
ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS mitigation TEXT;
ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE cost_estimates ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE cost_estimates ADD COLUMN IF NOT EXISTS estimated_amount DECIMAL(15,2);
ALTER TABLE cost_estimates ADD COLUMN IF NOT EXISTS actual_amount DECIMAL(15,2) DEFAULT 0;
ALTER TABLE cost_estimates ADD COLUMN IF NOT EXISTS variance DECIMAL(15,2) DEFAULT 0;

ALTER TABLE compliance_checks ADD COLUMN IF NOT EXISTS checked_by VARCHAR(255);
ALTER TABLE compliance_checks ADD COLUMN IF NOT EXISTS check_date DATE;

ALTER TABLE bid_comparisons ADD COLUMN IF NOT EXISTS bid_ids JSONB;
ALTER TABLE bid_comparisons ADD COLUMN IF NOT EXISTS comparison_notes TEXT;
ALTER TABLE bid_comparisons ADD COLUMN IF NOT EXISTS recommendation TEXT;

ALTER TABLE timelines ADD COLUMN IF NOT EXISTS phase VARCHAR(255);
ALTER TABLE timelines ADD COLUMN IF NOT EXISTS dependencies TEXT;
ALTER TABLE timelines ADD COLUMN IF NOT EXISTS progress_percent INTEGER DEFAULT 0;

-- ai_analyses is written in two shapes: the feature/input_data/output_data
-- shape used by routes/ai.js and the analysis_type/input_data_json/result_json
-- shape used by the other AI routes (and read by routes/export.js). Support both.
ALTER TABLE ai_analyses ADD COLUMN IF NOT EXISTS analysis_type VARCHAR(100);
ALTER TABLE ai_analyses ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE ai_analyses ADD COLUMN IF NOT EXISTS bid_id INTEGER REFERENCES bids(id) ON DELETE SET NULL;
ALTER TABLE ai_analyses ADD COLUMN IF NOT EXISTS input_data_json JSONB;
ALTER TABLE ai_analyses ADD COLUMN IF NOT EXISTS result_json JSONB;
ALTER TABLE ai_analyses ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE ai_analyses ADD COLUMN IF NOT EXISTS feature VARCHAR(100);
ALTER TABLE ai_analyses ADD COLUMN IF NOT EXISTS input_data JSONB;
ALTER TABLE ai_analyses ADD COLUMN IF NOT EXISTS output_data JSONB;
ALTER TABLE ai_analyses ALTER COLUMN analysis_type DROP NOT NULL;

-- ------------------------------------------------------------------
-- 4. Tables 001 never created (the routes and expansion plan use them)
-- ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  owner VARCHAR(255),
  due_date DATE,
  priority VARCHAR(50) DEFAULT 'medium',
  status VARCHAR(50) DEFAULT 'open',
  category VARCHAR(100),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approvals (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  approval_type VARCHAR(100) NOT NULL,
  requester VARCHAR(255),
  approver VARCHAR(255),
  due_date DATE,
  status VARCHAR(50) DEFAULT 'pending',
  amount DECIMAL(15,2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  severity VARCHAR(50) DEFAULT 'info',
  category VARCHAR(100),
  recipient VARCHAR(255),
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  user_email VARCHAR(255),
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(100),
  metadata JSONB,
  ip_address VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plan_uploads (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  upload_name VARCHAR(255) NOT NULL,
  document_type VARCHAR(100),
  file_url VARCHAR(500),
  uploaded_by VARCHAR(255),
  status VARCHAR(50) DEFAULT 'uploaded',
  extracted_summary TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS spec_documents (
  id SERIAL PRIMARY KEY,
  plan_upload_id INTEGER REFERENCES plan_uploads(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  spec_section VARCHAR(100),
  trade VARCHAR(100),
  revision VARCHAR(50),
  status VARCHAR(50) DEFAULT 'indexed',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_extractions (
  id SERIAL PRIMARY KEY,
  plan_upload_id INTEGER REFERENCES plan_uploads(id) ON DELETE CASCADE,
  extraction_type VARCHAR(100),
  extracted_value TEXT,
  confidence DECIMAL(5,2),
  source_page INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bid_risk_reviews (
  id SERIAL PRIMARY KEY,
  bid_id INTEGER REFERENCES bids(id) ON DELETE CASCADE,
  reviewer VARCHAR(255),
  overall_score INTEGER,
  status VARCHAR(50) DEFAULT 'draft',
  summary TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bid_risk_findings (
  id SERIAL PRIMARY KEY,
  review_id INTEGER REFERENCES bid_risk_reviews(id) ON DELETE CASCADE,
  finding_type VARCHAR(100),
  severity VARCHAR(50),
  scope_area VARCHAR(100),
  description TEXT,
  recommendation TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS estimate_reviews (
  id SERIAL PRIMARY KEY,
  cost_estimate_id INTEGER REFERENCES cost_estimates(id) ON DELETE CASCADE,
  reviewer VARCHAR(255),
  status VARCHAR(50) DEFAULT 'open',
  variance_score INTEGER,
  summary TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS estimate_variances (
  id SERIAL PRIMARY KEY,
  review_id INTEGER REFERENCES estimate_reviews(id) ON DELETE CASCADE,
  category VARCHAR(100),
  estimated_amount DECIMAL(15,2),
  benchmark_amount DECIMAL(15,2),
  variance_amount DECIMAL(15,2),
  severity VARCHAR(50),
  recommendation TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permit_checklists (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  jurisdiction VARCHAR(255),
  trade VARCHAR(100),
  phase VARCHAR(100),
  status VARCHAR(50) DEFAULT 'open',
  due_date DATE,
  owner VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permit_requirements (
  id SERIAL PRIMARY KEY,
  checklist_id INTEGER REFERENCES permit_checklists(id) ON DELETE CASCADE,
  requirement VARCHAR(255),
  authority VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permit_status_events (
  id SERIAL PRIMARY KEY,
  checklist_id INTEGER REFERENCES permit_checklists(id) ON DELETE CASCADE,
  event_type VARCHAR(100),
  status VARCHAR(50),
  event_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS safety_plans (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  plan_name VARCHAR(255) NOT NULL,
  generated_by VARCHAR(255),
  status VARCHAR(50) DEFAULT 'draft',
  summary TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS safety_hazards (
  id SERIAL PRIMARY KEY,
  safety_plan_id INTEGER REFERENCES safety_plans(id) ON DELETE CASCADE,
  hazard VARCHAR(255),
  severity VARCHAR(50),
  control TEXT,
  toolbox_talk TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS safety_inspections (
  id SERIAL PRIMARY KEY,
  safety_plan_id INTEGER REFERENCES safety_plans(id) ON DELETE CASCADE,
  inspection_date DATE,
  inspector VARCHAR(255),
  status VARCHAR(50),
  findings TEXT,
  corrective_action TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subcontractor_scores (
  id SERIAL PRIMARY KEY,
  subcontractor_id INTEGER REFERENCES subcontractors(id) ON DELETE CASCADE,
  bid_id INTEGER REFERENCES bids(id) ON DELETE SET NULL,
  overall_score INTEGER,
  availability_score INTEGER,
  insurance_score INTEGER,
  performance_score INTEGER,
  safety_score INTEGER,
  scope_fit_score INTEGER,
  status VARCHAR(50) DEFAULT 'scored',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subcontractor_evaluations (
  id SERIAL PRIMARY KEY,
  score_id INTEGER REFERENCES subcontractor_scores(id) ON DELETE CASCADE,
  evaluator VARCHAR(255),
  evaluation_area VARCHAR(100),
  rating INTEGER,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS change_order_impacts (
  id SERIAL PRIMARY KEY,
  change_order_id INTEGER REFERENCES change_orders(id) ON DELETE CASCADE,
  cost_impact DECIMAL(15,2),
  schedule_impact_days INTEGER,
  source_document VARCHAR(255),
  risk_level VARCHAR(50),
  status VARCHAR(50) DEFAULT 'draft',
  owner VARCHAR(255),
  summary TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS change_order_approvals (
  id SERIAL PRIMARY KEY,
  impact_id INTEGER REFERENCES change_order_impacts(id) ON DELETE CASCADE,
  approver VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  decision_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ------------------------------------------------------------------
-- 5. Metric views used by /api/feature-expansion/project-risk-dashboard
-- ------------------------------------------------------------------

CREATE OR REPLACE VIEW project_risk_metrics AS
SELECT
  p.id AS project_id,
  p.name AS project_name,
  p.status AS project_status,
  COUNT(DISTINCT ra.id) FILTER (WHERE ra.severity IN ('high', 'critical')) AS high_risk_items,
  COUNT(DISTINCT pc.id) FILTER (WHERE pc.status = 'blocked') AS permit_blockers,
  COUNT(DISTINCT sh.id) FILTER (WHERE sh.severity IN ('high', 'critical')) AS safety_exposures,
  COUNT(DISTINCT coi.id) FILTER (WHERE coi.risk_level IN ('high', 'critical') AND coi.status <> 'approved') AS open_change_impacts,
  COALESCE(ROUND(AVG(ss.overall_score)::numeric, 1), 0) AS subcontractor_score,
  LEAST(
    100,
    20
    + (COUNT(DISTINCT ra.id) FILTER (WHERE ra.severity IN ('high', 'critical')) * 10)
    + (COUNT(DISTINCT pc.id) FILTER (WHERE pc.status = 'blocked') * 12)
    + (COUNT(DISTINCT sh.id) FILTER (WHERE sh.severity IN ('high', 'critical')) * 8)
    + (COUNT(DISTINCT coi.id) FILTER (WHERE coi.risk_level IN ('high', 'critical') AND coi.status <> 'approved') * 10)
  ) AS risk_score
FROM projects p
LEFT JOIN risk_assessments ra ON ra.project_id = p.id
LEFT JOIN permit_checklists pc ON pc.project_id = p.id
LEFT JOIN safety_plans sp ON sp.project_id = p.id
LEFT JOIN safety_hazards sh ON sh.safety_plan_id = sp.id
LEFT JOIN change_orders co ON co.project_id = p.id
LEFT JOIN change_order_impacts coi ON coi.change_order_id = co.id
LEFT JOIN bids b ON b.project_id = p.id
LEFT JOIN subcontractor_scores ss ON ss.bid_id = b.id
GROUP BY p.id, p.name, p.status;

CREATE OR REPLACE VIEW bid_readiness_metrics AS
SELECT
  b.id AS bid_id,
  b.project_id,
  p.name AS project_name,
  b.contractor_name,
  b.status AS bid_status,
  COALESCE(MAX(brr.overall_score), 0) AS risk_review_score,
  COUNT(brf.id) FILTER (WHERE brf.finding_type = 'missing_scope') AS missing_scope_findings,
  COUNT(brf.id) FILTER (WHERE brf.severity IN ('high', 'critical')) AS severe_findings,
  CASE
    WHEN COUNT(brf.id) FILTER (WHERE brf.severity = 'critical') > 0 THEN 'not_ready'
    WHEN COUNT(brf.id) FILTER (WHERE brf.severity = 'high') > 0 THEN 'needs_clarification'
    ELSE 'ready'
  END AS readiness_status
FROM bids b
JOIN projects p ON p.id = b.project_id
LEFT JOIN bid_risk_reviews brr ON brr.bid_id = b.id
LEFT JOIN bid_risk_findings brf ON brf.review_id = brr.id
GROUP BY b.id, b.project_id, p.name, b.contractor_name, b.status;

COMMIT;
