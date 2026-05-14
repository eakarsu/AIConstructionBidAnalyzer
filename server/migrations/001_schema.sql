-- ============================================================
-- AIConstructionBidAnalyzer Full Schema Migration 001
-- ============================================================

-- Users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  location VARCHAR(255),
  budget DECIMAL(15,2),
  status VARCHAR(50) DEFAULT 'planning',
  start_date DATE,
  end_date DATE,
  project_type VARCHAR(100),
  last_analysis_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Contractors
CREATE TABLE IF NOT EXISTS contractors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  license_number VARCHAR(100),
  license_expiry DATE,
  specialty VARCHAR(255),
  rating DECIMAL(3,2),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Bids
CREATE TABLE IF NOT EXISTS bids (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  contractor_id INTEGER REFERENCES contractors(id),
  bid_amount DECIMAL(15,2),
  contractor_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'submitted',
  submission_date DATE,
  scope TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Materials
CREATE TABLE IF NOT EXISTS materials (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  unit VARCHAR(50),
  unit_cost DECIMAL(10,2),
  quantity DECIMAL(10,2),
  supplier VARCHAR(255),
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Labor
CREATE TABLE IF NOT EXISTS labor (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  trade VARCHAR(100),
  worker_name VARCHAR(255),
  hourly_rate DECIMAL(8,2),
  hours_estimated DECIMAL(8,2),
  hours_actual DECIMAL(8,2),
  total_cost DECIMAL(12,2),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Subcontractors
CREATE TABLE IF NOT EXISTS subcontractors (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  company_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  specialty VARCHAR(255),
  quote_amount DECIMAL(15,2),
  status VARCHAR(50) DEFAULT 'pending',
  license_number VARCHAR(100),
  insurance_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Change Orders
CREATE TABLE IF NOT EXISTS change_orders (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  reason TEXT,
  cost_impact DECIMAL(12,2),
  schedule_impact_days INTEGER,
  status VARCHAR(50) DEFAULT 'pending',
  requested_by VARCHAR(255),
  approved_by VARCHAR(255),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Risk Assessments
CREATE TABLE IF NOT EXISTS risk_assessments (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  risk_category VARCHAR(100),
  risk_description TEXT,
  probability VARCHAR(50),
  impact VARCHAR(50),
  severity VARCHAR(50),
  mitigation_strategy TEXT,
  status VARCHAR(50) DEFAULT 'open',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Cost Estimates
CREATE TABLE IF NOT EXISTS cost_estimates (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  category VARCHAR(100),
  line_item VARCHAR(255),
  quantity DECIMAL(10,2),
  unit VARCHAR(50),
  unit_cost DECIMAL(10,2),
  total_cost DECIMAL(12,2),
  contingency_pct DECIMAL(5,2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Compliance
CREATE TABLE IF NOT EXISTS compliance (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  compliance_type VARCHAR(100),
  regulation VARCHAR(255),
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  due_date DATE,
  completed_at TIMESTAMP,
  responsible_party VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Bid Comparisons
CREATE TABLE IF NOT EXISTS bid_comparisons (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  comparison_data JSONB,
  recommended_bid_id INTEGER REFERENCES bids(id),
  analysis_summary TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Timelines
CREATE TABLE IF NOT EXISTS timelines (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  phase_name VARCHAR(255),
  start_date DATE,
  end_date DATE,
  duration_days INTEGER,
  status VARCHAR(50) DEFAULT 'planned',
  milestones JSONB,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100),
  file_path VARCHAR(500),
  file_url VARCHAR(500),
  file_size INTEGER,
  mime_type VARCHAR(100),
  uploaded_by VARCHAR(255),
  description TEXT,
  status VARCHAR(50) DEFAULT 'active',
  ai_extracted_text TEXT,
  ai_analysis JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- AI Analyses (Central storage for all AI results)
CREATE TABLE IF NOT EXISTS ai_analyses (
  id SERIAL PRIMARY KEY,
  analysis_type VARCHAR(100) NOT NULL,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  bid_id INTEGER REFERENCES bids(id) ON DELETE SET NULL,
  input_data_json JSONB,
  result_json JSONB,
  model_used VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_analyses_project_id ON ai_analyses(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_bid_id ON ai_analyses(bid_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_type ON ai_analyses(analysis_type);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_created_at ON ai_analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bids_project_id ON bids(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_change_orders_project_id ON change_orders(project_id);
