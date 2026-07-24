const pool = require('./db');
const bcrypt = require('bcryptjs');

function requireDemoPassword() {
  const password = process.env.DEMO_PASSWORD || process.env.SEED_DEMO_PASSWORD || process.env.DEMO_SEED_PASSWORD || '';
  if (password.length < 12 || password.length > 1024) throw new Error('DEMO_PASSWORD must contain 12-1024 characters');
  return password;
}

const seed = async () => {
  try {
    console.log('Dropping existing tables...');
    await pool.query(`
      DROP TABLE IF EXISTS ai_analyses CASCADE;
      DROP VIEW IF EXISTS bid_readiness_metrics CASCADE;
      DROP VIEW IF EXISTS project_risk_metrics CASCADE;
      DROP TABLE IF EXISTS change_order_approvals CASCADE;
      DROP TABLE IF EXISTS change_order_impacts CASCADE;
      DROP TABLE IF EXISTS subcontractor_evaluations CASCADE;
      DROP TABLE IF EXISTS subcontractor_scores CASCADE;
      DROP TABLE IF EXISTS safety_inspections CASCADE;
      DROP TABLE IF EXISTS safety_hazards CASCADE;
      DROP TABLE IF EXISTS safety_plans CASCADE;
      DROP TABLE IF EXISTS permit_status_events CASCADE;
      DROP TABLE IF EXISTS permit_requirements CASCADE;
      DROP TABLE IF EXISTS permit_checklists CASCADE;
      DROP TABLE IF EXISTS estimate_variances CASCADE;
      DROP TABLE IF EXISTS estimate_reviews CASCADE;
      DROP TABLE IF EXISTS bid_risk_findings CASCADE;
      DROP TABLE IF EXISTS bid_risk_reviews CASCADE;
      DROP TABLE IF EXISTS document_extractions CASCADE;
      DROP TABLE IF EXISTS spec_documents CASCADE;
      DROP TABLE IF EXISTS plan_uploads CASCADE;
      DROP TABLE IF EXISTS audit_logs CASCADE;
      DROP TABLE IF EXISTS notifications CASCADE;
      DROP TABLE IF EXISTS approvals CASCADE;
      DROP TABLE IF EXISTS tasks CASCADE;
      DROP TABLE IF EXISTS timelines CASCADE;
      DROP TABLE IF EXISTS bid_comparisons CASCADE;
      DROP TABLE IF EXISTS compliance_checks CASCADE;
      DROP TABLE IF EXISTS cost_estimates CASCADE;
      DROP TABLE IF EXISTS risk_assessments CASCADE;
      DROP TABLE IF EXISTS change_orders CASCADE;
      DROP TABLE IF EXISTS subcontractors CASCADE;
      DROP TABLE IF EXISTS documents CASCADE;
      DROP TABLE IF EXISTS labor_costs CASCADE;
      DROP TABLE IF EXISTS materials CASCADE;
      DROP TABLE IF EXISTS contractors CASCADE;
      DROP TABLE IF EXISTS bids CASCADE;
      DROP TABLE IF EXISTS projects CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);

    console.log('Creating tables...');
    await pool.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        location VARCHAR(255),
        budget DECIMAL(15,2),
        status VARCHAR(50) DEFAULT 'planning',
        start_date DATE,
        end_date DATE,
        project_type VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE bids (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        bid_amount DECIMAL(15,2) NOT NULL,
        contractor_name VARCHAR(255),
        status VARCHAR(50) DEFAULT 'submitted',
        submission_date DATE,
        scope TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE contractors (
        id SERIAL PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL,
        contact_name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        specialty VARCHAR(255),
        rating DECIMAL(3,2),
        license_number VARCHAR(100),
        years_experience INTEGER,
        location VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE materials (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        unit VARCHAR(50),
        unit_price DECIMAL(10,2),
        supplier VARCHAR(255),
        description TEXT,
        in_stock BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE labor_costs (
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

      CREATE TABLE documents (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100),
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        file_url VARCHAR(500),
        uploaded_by VARCHAR(255),
        description TEXT,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE subcontractors (
        id SERIAL PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL,
        specialty VARCHAR(255),
        contact_name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        rating DECIMAL(3,2),
        hourly_rate DECIMAL(10,2),
        availability VARCHAR(50) DEFAULT 'available',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE change_orders (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        amount DECIMAL(15,2),
        status VARCHAR(50) DEFAULT 'pending',
        requested_by VARCHAR(255),
        reason TEXT,
        impact_days INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE risk_assessments (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        risk_type VARCHAR(100),
        severity VARCHAR(50),
        likelihood VARCHAR(50),
        description TEXT,
        mitigation TEXT,
        status VARCHAR(50) DEFAULT 'identified',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE cost_estimates (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        category VARCHAR(100),
        description TEXT,
        estimated_amount DECIMAL(15,2),
        actual_amount DECIMAL(15,2) DEFAULT 0,
        variance DECIMAL(15,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE compliance_checks (
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

      CREATE TABLE bid_comparisons (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        bid_ids JSONB,
        comparison_notes TEXT,
        recommendation TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE timelines (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        phase VARCHAR(255) NOT NULL,
        start_date DATE,
        end_date DATE,
        status VARCHAR(50) DEFAULT 'not_started',
        dependencies TEXT,
        progress_percent INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE ai_analyses (
        id SERIAL PRIMARY KEY,
        feature VARCHAR(100),
        input_data JSONB,
        output_data JSONB,
        model_used VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE tasks (
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

      CREATE TABLE approvals (
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

      CREATE TABLE notifications (
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

      CREATE TABLE audit_logs (
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

      CREATE TABLE plan_uploads (
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

      CREATE TABLE spec_documents (
        id SERIAL PRIMARY KEY,
        plan_upload_id INTEGER REFERENCES plan_uploads(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        spec_section VARCHAR(100),
        trade VARCHAR(100),
        revision VARCHAR(50),
        status VARCHAR(50) DEFAULT 'indexed',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE document_extractions (
        id SERIAL PRIMARY KEY,
        plan_upload_id INTEGER REFERENCES plan_uploads(id) ON DELETE CASCADE,
        extraction_type VARCHAR(100),
        extracted_value TEXT,
        confidence DECIMAL(5,2),
        source_page INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE bid_risk_reviews (
        id SERIAL PRIMARY KEY,
        bid_id INTEGER REFERENCES bids(id) ON DELETE CASCADE,
        reviewer VARCHAR(255),
        overall_score INTEGER,
        status VARCHAR(50) DEFAULT 'draft',
        summary TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE bid_risk_findings (
        id SERIAL PRIMARY KEY,
        review_id INTEGER REFERENCES bid_risk_reviews(id) ON DELETE CASCADE,
        finding_type VARCHAR(100),
        severity VARCHAR(50),
        scope_area VARCHAR(100),
        description TEXT,
        recommendation TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE estimate_reviews (
        id SERIAL PRIMARY KEY,
        cost_estimate_id INTEGER REFERENCES cost_estimates(id) ON DELETE CASCADE,
        reviewer VARCHAR(255),
        status VARCHAR(50) DEFAULT 'open',
        variance_score INTEGER,
        summary TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE estimate_variances (
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

      CREATE TABLE permit_checklists (
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

      CREATE TABLE permit_requirements (
        id SERIAL PRIMARY KEY,
        checklist_id INTEGER REFERENCES permit_checklists(id) ON DELETE CASCADE,
        requirement VARCHAR(255),
        authority VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE permit_status_events (
        id SERIAL PRIMARY KEY,
        checklist_id INTEGER REFERENCES permit_checklists(id) ON DELETE CASCADE,
        event_type VARCHAR(100),
        status VARCHAR(50),
        event_date DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE safety_plans (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        plan_name VARCHAR(255) NOT NULL,
        generated_by VARCHAR(255),
        status VARCHAR(50) DEFAULT 'draft',
        summary TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE safety_hazards (
        id SERIAL PRIMARY KEY,
        safety_plan_id INTEGER REFERENCES safety_plans(id) ON DELETE CASCADE,
        hazard VARCHAR(255),
        severity VARCHAR(50),
        control TEXT,
        toolbox_talk TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE safety_inspections (
        id SERIAL PRIMARY KEY,
        safety_plan_id INTEGER REFERENCES safety_plans(id) ON DELETE CASCADE,
        inspection_date DATE,
        inspector VARCHAR(255),
        status VARCHAR(50),
        findings TEXT,
        corrective_action TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE subcontractor_scores (
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

      CREATE TABLE subcontractor_evaluations (
        id SERIAL PRIMARY KEY,
        score_id INTEGER REFERENCES subcontractor_scores(id) ON DELETE CASCADE,
        evaluator VARCHAR(255),
        evaluation_area VARCHAR(100),
        rating INTEGER,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE change_order_impacts (
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

      CREATE TABLE change_order_approvals (
        id SERIAL PRIMARY KEY,
        impact_id INTEGER REFERENCES change_order_impacts(id) ON DELETE CASCADE,
        approver VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        decision_date DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('Tables created. Seeding data...');

    // --- USERS ---
    const salt = await bcrypt.genSalt(10);
    const passwords = await Promise.all([
      bcrypt.hash(requireDemoPassword(), salt),
      bcrypt.hash(requireDemoPassword(), salt),
      bcrypt.hash(requireDemoPassword(), salt),
      bcrypt.hash(requireDemoPassword(), salt),
    ]);
    await pool.query(`
      INSERT INTO users (name, email, password, role) VALUES
      ('Admin User', 'admin@constructionbid.com', $1, 'admin'),
      ('Sarah Johnson', 'sarah@constructionbid.com', $2, 'manager'),
      ('Mike Chen', 'mike@constructionbid.com', $3, 'estimator'),
      ('Lisa Rodriguez', 'lisa@constructionbid.com', $4, 'viewer'),
      ('James Wilson', 'james@constructionbid.com', $1, 'manager'),
      ('Emily Davis', 'emily@constructionbid.com', $2, 'estimator'),
      ('Robert Taylor', 'robert@constructionbid.com', $3, 'user'),
      ('Amanda White', 'amanda@constructionbid.com', $4, 'user'),
      ('David Brown', 'david@constructionbid.com', $1, 'estimator'),
      ('Jennifer Martinez', 'jennifer@constructionbid.com', $2, 'user'),
      ('Chris Anderson', 'chris@constructionbid.com', $3, 'manager'),
      ('Patricia Thomas', 'patricia@constructionbid.com', $4, 'user'),
      ('Daniel Jackson', 'daniel@constructionbid.com', $1, 'user'),
      ('Michelle Lee', 'michelle@constructionbid.com', $2, 'estimator'),
      ('Kevin Harris', 'kevin@constructionbid.com', $3, 'viewer')
    `, [passwords[0], passwords[1], passwords[2], passwords[3]]);
    console.log('Users seeded.');

    // --- PROJECTS ---
    await pool.query(`
      INSERT INTO projects (name, description, location, budget, status, start_date, end_date, project_type) VALUES
      ('Downtown Office Tower', 'Construction of a 25-story Class A office building with underground parking', 'Chicago, IL', 85000000, 'in_progress', '2025-03-01', '2027-06-30', 'commercial'),
      ('Riverside Medical Center', 'New 200-bed hospital facility with emergency department and surgical suites', 'Houston, TX', 120000000, 'planning', '2025-06-15', '2028-01-31', 'healthcare'),
      ('Sunset Ridge Residential', '150-unit luxury condominium development with amenities center', 'Denver, CO', 45000000, 'in_progress', '2025-01-10', '2026-12-15', 'residential'),
      ('Interstate 405 Bridge Replacement', 'Replacement of aging highway bridge with modern seismic-rated structure', 'Portland, OR', 32000000, 'bidding', '2025-09-01', '2027-03-31', 'infrastructure'),
      ('Lincoln Elementary School', 'New K-5 elementary school for 600 students with gymnasium and library', 'Austin, TX', 28000000, 'planning', '2025-07-01', '2027-01-15', 'education'),
      ('Harbor Point Shopping Center', 'Open-air retail center with 45 tenant spaces and food court', 'San Diego, CA', 55000000, 'in_progress', '2025-02-15', '2026-09-30', 'commercial'),
      ('Greenfield Water Treatment Plant', 'Municipal water treatment facility serving 50,000 residents', 'Phoenix, AZ', 40000000, 'approved', '2025-08-01', '2027-08-31', 'infrastructure'),
      ('Parkview Senior Living', '120-unit assisted living facility with memory care wing', 'Nashville, TN', 35000000, 'in_progress', '2025-04-01', '2026-11-30', 'healthcare'),
      ('Metro Airport Terminal Expansion', 'Expansion of Terminal B adding 12 gates and passenger amenities', 'Atlanta, GA', 175000000, 'planning', '2025-10-01', '2028-06-30', 'infrastructure'),
      ('Oak Valley High School Renovation', 'Complete renovation of existing high school including HVAC and seismic upgrades', 'Sacramento, CA', 22000000, 'in_progress', '2025-05-15', '2026-08-01', 'education'),
      ('Hilltop Data Center', 'Tier IV data center with redundant power and cooling systems', 'Ashburn, VA', 95000000, 'bidding', '2025-11-01', '2027-05-31', 'commercial'),
      ('Riverfront Hotel & Convention Center', '350-room hotel with 40,000 sq ft convention space', 'Minneapolis, MN', 110000000, 'planning', '2026-01-15', '2028-03-31', 'hospitality'),
      ('Highway 101 Interchange Upgrade', 'Reconstruction of freeway interchange with new ramps and signals', 'San Jose, CA', 48000000, 'approved', '2025-07-15', '2027-04-30', 'infrastructure'),
      ('Community Recreation Center', 'Multi-purpose recreation facility with pool, courts, and fitness center', 'Boise, ID', 18000000, 'in_progress', '2025-03-15', '2026-06-30', 'public'),
      ('Industrial Warehouse Complex', 'Three 100,000 sq ft warehouses with loading docks and office space', 'Memphis, TN', 25000000, 'completed', '2024-06-01', '2025-09-30', 'industrial'),
      ('Bayshore Condominiums Phase II', '200-unit waterfront condominium with marina access', 'Tampa, FL', 62000000, 'bidding', '2025-12-01', '2027-10-31', 'residential')
    `);
    console.log('Projects seeded.');

    // --- BIDS ---
    await pool.query(`
      INSERT INTO bids (project_id, bid_amount, contractor_name, status, submission_date, scope, notes) VALUES
      (1, 82500000, 'Turner Construction Co.', 'under_review', '2025-02-15', 'Full building construction including MEP and finishes', 'Competitive bid, strong track record with office towers'),
      (1, 87200000, 'Skanska USA Building', 'submitted', '2025-02-18', 'Full construction with premium facade system', 'Higher price but includes enhanced curtain wall system'),
      (1, 79800000, 'Clark Construction Group', 'shortlisted', '2025-02-12', 'Base building construction, MEP by separate contract', 'Lowest bid, excludes some MEP scope'),
      (2, 115000000, 'DPR Construction', 'submitted', '2025-05-20', 'Complete hospital construction including medical gas and clean rooms', 'Specialized healthcare construction experience'),
      (2, 122000000, 'Brasfield & Gorrie', 'under_review', '2025-05-22', 'Full scope hospital construction with 5-year warranty', 'Extended warranty included in bid'),
      (3, 43500000, 'Lennar Corporation', 'accepted', '2024-12-10', 'Full residential development including amenities', 'Includes landscaping and amenity center'),
      (3, 46200000, 'Toll Brothers', 'rejected', '2024-12-15', 'Premium residential construction with upgraded finishes', 'Over budget but superior finish quality'),
      (4, 30500000, 'Granite Construction', 'shortlisted', '2025-08-10', 'Complete bridge demolition and new construction', 'Experienced bridge contractor'),
      (4, 33200000, 'Kiewit Corporation', 'submitted', '2025-08-15', 'Bridge replacement with temporary bypass road', 'Includes traffic management plan'),
      (5, 26800000, 'Hensel Phelps', 'under_review', '2025-06-01', 'New school construction including playground equipment', 'LEED Gold certified approach'),
      (6, 52000000, 'Whiting-Turner Contracting', 'accepted', '2025-01-20', 'Retail center shell and core with tenant improvement allowance', 'Strong retail construction portfolio'),
      (7, 38500000, 'Black & Veatch', 'shortlisted', '2025-07-10', 'Complete water treatment facility with commissioning', 'Water infrastructure specialist'),
      (8, 33000000, 'Robins & Morton', 'accepted', '2025-03-10', 'Full senior living construction with medical systems', 'Healthcare facility experience'),
      (9, 168000000, 'PCL Construction', 'submitted', '2025-09-15', 'Terminal expansion with active airport operations coordination', 'Aviation construction specialist'),
      (10, 20500000, 'McCarthy Building Companies', 'accepted', '2025-04-25', 'Complete school renovation while maintaining partial occupancy', 'Phased construction approach'),
      (11, 91000000, 'Holder Construction', 'under_review', '2025-10-10', 'Data center construction with critical power systems', 'Mission critical facility experience'),
      (12, 105000000, 'Mortenson Construction', 'submitted', '2025-12-20', 'Hotel and convention center full construction', 'Hospitality construction specialist')
    `);
    console.log('Bids seeded.');

    // --- CONTRACTORS ---
    await pool.query(`
      INSERT INTO contractors (company_name, contact_name, email, phone, specialty, rating, license_number, years_experience, location) VALUES
      ('Turner Construction Co.', 'John Mitchell', 'jmitchell@turner.com', '(212) 555-0101', 'Commercial Buildings', 4.8, 'GC-2024-11234', 45, 'New York, NY'),
      ('Skanska USA Building', 'Maria Fernandez', 'mfernandez@skanska.com', '(917) 555-0202', 'Mixed-Use Development', 4.7, 'GC-2024-11235', 38, 'New York, NY'),
      ('Clark Construction Group', 'Robert Williams', 'rwilliams@clarkconstruction.com', '(301) 555-0303', 'Office & Government', 4.6, 'GC-2024-11236', 35, 'Bethesda, MD'),
      ('DPR Construction', 'Susan Chang', 'schang@dpr.com', '(650) 555-0404', 'Healthcare & Technology', 4.9, 'GC-2024-11237', 30, 'Redwood City, CA'),
      ('Hensel Phelps', 'Tom Baker', 'tbaker@henselphelps.com', '(970) 555-0505', 'Education & Government', 4.7, 'GC-2024-11238', 40, 'Greeley, CO'),
      ('Granite Construction', 'Dave Peterson', 'dpeterson@graniteconstruction.com', '(831) 555-0606', 'Infrastructure & Bridges', 4.5, 'GC-2024-11239', 50, 'Watsonville, CA'),
      ('Kiewit Corporation', 'Karen Smith', 'ksmith@kiewit.com', '(402) 555-0707', 'Heavy Civil & Infrastructure', 4.8, 'GC-2024-11240', 55, 'Omaha, NE'),
      ('Whiting-Turner Contracting', 'James O''Brien', 'jobrien@whiting-turner.com', '(410) 555-0808', 'Commercial & Retail', 4.6, 'GC-2024-11241', 42, 'Baltimore, MD'),
      ('Black & Veatch', 'Linda Torres', 'ltorres@bv.com', '(913) 555-0909', 'Water & Utilities', 4.7, 'GC-2024-11242', 48, 'Overland Park, KS'),
      ('Robins & Morton', 'Michael Davis', 'mdavis@robinsmorton.com', '(205) 555-1010', 'Healthcare & Senior Living', 4.5, 'GC-2024-11243', 28, 'Birmingham, AL'),
      ('PCL Construction', 'Andrew Lee', 'alee@pcl.com', '(303) 555-1111', 'Aviation & Transportation', 4.8, 'GC-2024-11244', 35, 'Denver, CO'),
      ('McCarthy Building Companies', 'Rachel Green', 'rgreen@mccarthy.com', '(314) 555-1212', 'Education & Healthcare', 4.6, 'GC-2024-11245', 32, 'St. Louis, MO'),
      ('Holder Construction', 'Brian Miller', 'bmiller@holder.com', '(404) 555-1313', 'Data Centers & Mission Critical', 4.7, 'GC-2024-11246', 25, 'Atlanta, GA'),
      ('Mortenson Construction', 'Amy Nelson', 'anelson@mortenson.com', '(612) 555-1414', 'Hospitality & Sports', 4.8, 'GC-2024-11247', 30, 'Minneapolis, MN'),
      ('Brasfield & Gorrie', 'Steven Brown', 'sbrown@brasfieldgorrie.com', '(205) 555-1515', 'Healthcare & Commercial', 4.5, 'GC-2024-11248', 60, 'Birmingham, AL'),
      ('Toll Brothers', 'Diane Wright', 'dwright@tollbrothers.com', '(215) 555-1616', 'Luxury Residential', 4.4, 'GC-2024-11249', 55, 'Fort Washington, PA')
    `);
    console.log('Contractors seeded.');

    // --- MATERIALS ---
    await pool.query(`
      INSERT INTO materials (name, category, unit, unit_price, supplier, description, in_stock) VALUES
      ('Portland Cement Type I/II', 'Concrete', 'bag (94lb)', 12.50, 'LafargeHolcim', 'General purpose portland cement for structural concrete', true),
      ('Ready-Mix Concrete 4000 PSI', 'Concrete', 'cubic yard', 145.00, 'CEMEX', 'Structural grade ready-mix concrete, 4000 PSI at 28 days', true),
      ('#4 Rebar (Grade 60)', 'Steel', 'ton', 850.00, 'Nucor Steel', '1/2 inch deformed reinforcing bar, ASTM A615 Grade 60', true),
      ('W12x26 Structural Steel Beam', 'Steel', 'linear foot', 28.50, 'Steel Dynamics', 'Wide flange beam for structural framing', true),
      ('2x4x8 Pressure Treated Lumber', 'Lumber', 'piece', 6.75, 'Weyerhaeuser', 'Ground contact rated pressure treated lumber', true),
      ('3/4" CDX Plywood', 'Lumber', 'sheet (4x8)', 42.00, 'Georgia-Pacific', 'Exterior grade structural plywood sheathing', true),
      ('Type X 5/8" Drywall', 'Interior Finishes', 'sheet (4x8)', 14.50, 'USG Corporation', 'Fire-rated gypsum board for walls and ceilings', true),
      ('30-Year Architectural Shingles', 'Roofing', 'bundle', 35.00, 'GAF Materials', 'Dimensional asphalt shingles with algae resistance', true),
      ('Low-E Double Pane Window', 'Windows', 'unit', 350.00, 'Andersen Windows', 'Energy Star rated vinyl frame window with Low-E coating', false),
      ('12" PVC Schedule 40 Pipe', 'Plumbing', 'linear foot', 18.75, 'Charlotte Pipe', 'Municipal grade PVC pipe for water/sewer', true),
      ('3/4" Copper Pipe Type L', 'Plumbing', 'linear foot', 5.25, 'Mueller Industries', 'Copper tubing for domestic water supply', true),
      ('EMT 3/4" Conduit', 'Electrical', 'stick (10ft)', 4.80, 'Allied Tube & Conduit', 'Electrical metallic tubing for wire protection', true),
      ('12/2 NM-B Romex Wire', 'Electrical', 'roll (250ft)', 85.00, 'Southwire', 'Non-metallic sheathed cable for residential wiring', true),
      ('R-30 Fiberglass Batt Insulation', 'Insulation', 'roll', 48.00, 'Owens Corning', 'Unfaced fiberglass batt insulation for attics', true),
      ('Spray Foam Insulation (Closed Cell)', 'Insulation', 'board foot', 1.50, 'BASF', 'Closed cell spray polyurethane foam insulation', false),
      ('Porcelain Floor Tile 12x24', 'Flooring', 'sq ft', 4.25, 'Daltile', 'Commercial grade porcelain tile with slip resistance', true),
      ('Commercial Carpet Tile', 'Flooring', 'sq ft', 3.50, 'Shaw Contract', 'Modular carpet tile for commercial applications', true)
    `);
    console.log('Materials seeded.');

    // --- LABOR COSTS ---
    await pool.query(`
      INSERT INTO labor_costs (role, hourly_rate, overtime_rate, project_id, estimated_hours, actual_hours) VALUES
      ('Project Superintendent', 75.00, 112.50, 1, 4160, 2800),
      ('General Carpenter', 42.00, 63.00, 1, 8320, 5600),
      ('Journeyman Electrician', 55.00, 82.50, 1, 6240, 4100),
      ('Plumber', 52.00, 78.00, 2, 5200, 0),
      ('Iron Worker', 48.00, 72.00, 1, 4160, 3200),
      ('Concrete Finisher', 38.00, 57.00, 3, 3120, 2400),
      ('HVAC Technician', 50.00, 75.00, 2, 4160, 0),
      ('Heavy Equipment Operator', 45.00, 67.50, 4, 2080, 800),
      ('Laborer', 28.00, 42.00, 3, 10400, 7500),
      ('Sheet Metal Worker', 46.00, 69.00, 6, 3120, 2100),
      ('Painter', 35.00, 52.50, 3, 4160, 1200),
      ('Tile Setter', 40.00, 60.00, 8, 2080, 1500),
      ('Roofer', 38.00, 57.00, 6, 1560, 800),
      ('Mason/Bricklayer', 44.00, 66.00, 1, 3120, 2000),
      ('Welder (Certified)', 55.00, 82.50, 4, 2080, 600),
      ('Crane Operator', 58.00, 87.00, 1, 2080, 1400)
    `);
    console.log('Labor costs seeded.');

    // --- DOCUMENTS ---
    await pool.query(`
      INSERT INTO documents (name, type, project_id, file_url, uploaded_by, description, status) VALUES
      ('Architectural Drawings Set', 'blueprint', 1, '/docs/project1/arch-drawings.pdf', 'Sarah Johnson', 'Complete architectural drawing set including floor plans, elevations, and sections', 'active'),
      ('Structural Engineering Report', 'report', 1, '/docs/project1/structural-report.pdf', 'Mike Chen', 'Structural analysis and design report for office tower', 'active'),
      ('Environmental Impact Assessment', 'assessment', 2, '/docs/project2/eia-report.pdf', 'Lisa Rodriguez', 'Full environmental impact assessment for medical center site', 'under_review'),
      ('Geotechnical Survey', 'survey', 4, '/docs/project4/geotech-survey.pdf', 'James Wilson', 'Soil boring report and foundation recommendations for bridge', 'active'),
      ('MEP Specifications', 'specification', 1, '/docs/project1/mep-specs.pdf', 'Emily Davis', 'Mechanical, electrical, and plumbing specifications', 'active'),
      ('Construction Schedule', 'schedule', 3, '/docs/project3/schedule.pdf', 'Robert Taylor', 'Detailed CPM schedule for residential development', 'active'),
      ('Safety Plan', 'plan', 1, '/docs/project1/safety-plan.pdf', 'Amanda White', 'Site-specific safety and health plan', 'approved'),
      ('Cost Estimate Report', 'estimate', 5, '/docs/project5/cost-estimate.pdf', 'David Brown', 'Detailed cost estimate for school construction', 'active'),
      ('Bid Package - General Trades', 'bid_package', 6, '/docs/project6/bid-package-general.pdf', 'Jennifer Martinez', 'Bid documents for general construction trades', 'active'),
      ('Survey & Site Plan', 'survey', 3, '/docs/project3/site-plan.pdf', 'Chris Anderson', 'Topographic survey and site development plan', 'active'),
      ('Building Permit Application', 'permit', 5, '/docs/project5/permit-app.pdf', 'Patricia Thomas', 'Building permit application with supporting documents', 'submitted'),
      ('Stormwater Management Plan', 'plan', 7, '/docs/project7/swm-plan.pdf', 'Daniel Jackson', 'Stormwater pollution prevention plan', 'approved'),
      ('ADA Compliance Report', 'report', 10, '/docs/project10/ada-report.pdf', 'Michelle Lee', 'ADA compliance review for school renovation', 'active'),
      ('Fire Protection Drawings', 'blueprint', 8, '/docs/project8/fire-protection.pdf', 'Kevin Harris', 'Fire sprinkler and alarm system drawings', 'active'),
      ('Contract Agreement', 'contract', 6, '/docs/project6/contract.pdf', 'Sarah Johnson', 'General construction contract (AIA A101)', 'executed'),
      ('Change Order Log', 'log', 1, '/docs/project1/co-log.xlsx', 'Mike Chen', 'Running log of all change orders', 'active')
    `);
    console.log('Documents seeded.');

    // --- SUBCONTRACTORS ---
    await pool.query(`
      INSERT INTO subcontractors (company_name, specialty, contact_name, email, phone, rating, hourly_rate, availability) VALUES
      ('Ace Electrical Systems', 'Electrical', 'Frank Morrison', 'frank@aceelectrical.com', '(312) 555-2001', 4.7, 85.00, 'available'),
      ('ProFlow Plumbing Inc.', 'Plumbing', 'Rita Sanchez', 'rita@proflow.com', '(713) 555-2002', 4.5, 78.00, 'available'),
      ('Summit HVAC Solutions', 'HVAC', 'Paul Henderson', 'paul@summithvac.com', '(303) 555-2003', 4.8, 90.00, 'busy'),
      ('Ironclad Structural Steel', 'Structural Steel', 'Victor Petrov', 'victor@ironclad.com', '(402) 555-2004', 4.6, 72.00, 'available'),
      ('Pacific Drywall & Acoustics', 'Drywall/Acoustics', 'Nancy Kim', 'nancy@pacificdrywall.com', '(503) 555-2005', 4.4, 55.00, 'available'),
      ('Guardian Fire Protection', 'Fire Protection', 'Mark Sullivan', 'mark@guardianfire.com', '(404) 555-2006', 4.9, 95.00, 'busy'),
      ('EcoRoof Systems', 'Roofing', 'Angela Torres', 'angela@ecoroof.com', '(512) 555-2007', 4.3, 62.00, 'available'),
      ('Precision Concrete Works', 'Concrete', 'Hank Williams', 'hank@precisionconcrete.com', '(602) 555-2008', 4.7, 58.00, 'available'),
      ('Atlas Elevator Co.', 'Elevators', 'Christine Park', 'christine@atlaselevator.com', '(212) 555-2009', 4.8, 110.00, 'busy'),
      ('Premier Painting Contractors', 'Painting', 'Oscar Reyes', 'oscar@premierpainting.com', '(615) 555-2010', 4.2, 45.00, 'available'),
      ('Metro Glass & Glazing', 'Curtain Wall/Glazing', 'Steve Harper', 'steve@metroglass.com', '(206) 555-2011', 4.6, 88.00, 'available'),
      ('Solid Foundation Piling', 'Deep Foundations', 'Karen O''Neill', 'karen@solidfoundation.com', '(617) 555-2012', 4.7, 75.00, 'available'),
      ('TechConnect Low Voltage', 'Low Voltage/Data', 'Dennis Cho', 'dennis@techconnect.com', '(408) 555-2013', 4.5, 70.00, 'available'),
      ('Green Landscape Architects', 'Landscaping', 'Maria Gonzalez', 'maria@greenlandscape.com', '(858) 555-2014', 4.4, 48.00, 'available'),
      ('SafeGuard Demolition', 'Demolition', 'Bruce Wagner', 'bruce@safeguarddemo.com', '(216) 555-2015', 4.3, 55.00, 'available'),
      ('Apex Masonry Inc.', 'Masonry', 'Tony Romano', 'tony@apexmasonry.com', '(718) 555-2016', 4.6, 65.00, 'busy')
    `);
    console.log('Subcontractors seeded.');

    // --- CHANGE ORDERS ---
    await pool.query(`
      INSERT INTO change_orders (project_id, title, description, amount, status, requested_by, reason, impact_days) VALUES
      (1, 'Additional Parking Level', 'Add one additional underground parking level to accommodate increased tenant demand', 2500000, 'approved', 'Building Owner', 'Increased parking requirement from city planning', 45),
      (1, 'Upgraded Lobby Finishes', 'Replace standard lobby finishes with premium marble and custom millwork', 850000, 'approved', 'Architect', 'Owner requested premium finish upgrade', 15),
      (1, 'Rooftop Terrace Addition', 'Add landscaped rooftop terrace with outdoor seating and green roof system', 1200000, 'pending', 'Building Owner', 'Tenant amenity enhancement', 30),
      (3, 'Unit Mix Modification', 'Convert 10 two-bedroom units to studio units per market demand', -200000, 'approved', 'Developer', 'Market analysis showed higher studio demand', 20),
      (3, 'Pool Heater Upgrade', 'Upgrade pool heating system to solar-assisted heat pump', 75000, 'approved', 'Sustainability Consultant', 'Energy efficiency improvement', 5),
      (6, 'Food Court Expansion', 'Expand food court area by 3,000 sq ft with additional grease interceptor', 450000, 'under_review', 'Retail Leasing Agent', 'Additional food tenant interest', 25),
      (6, 'EV Charging Stations', 'Install 50 Level 2 EV charging stations in parking area', 225000, 'approved', 'Building Owner', 'Local ordinance requirement and tenant demand', 10),
      (8, 'Memory Care Wing Expansion', 'Expand memory care wing by 15 additional rooms', 1800000, 'pending', 'Facility Operator', 'Increased demand for memory care beds', 60),
      (10, 'Seismic Brace Upgrade', 'Upgrade seismic bracing to meet revised 2025 building code', 380000, 'approved', 'Structural Engineer', 'Code compliance - new seismic requirements', 12),
      (10, 'Fiber Optic Infrastructure', 'Add fiber optic backbone throughout entire campus', 165000, 'approved', 'School District IT', 'Technology infrastructure modernization', 8),
      (14, 'Aquatic Center Depth Change', 'Modify pool depth to accommodate competitive diving requirements', 95000, 'under_review', 'Parks & Recreation Dept', 'Community request for diving capability', 14),
      (1, 'Emergency Generator Upgrade', 'Upgrade from 500kW to 750kW emergency generator for full building backup', 320000, 'approved', 'MEP Engineer', 'Revised emergency power requirements', 7),
      (4, 'Wider Bridge Deck', 'Increase bridge deck width by 4 feet for future bike lane', 1500000, 'pending', 'City Transportation Dept', 'Future bicycle infrastructure plan', 35),
      (2, 'Helipad Addition', 'Add rooftop helipad for medical emergency transport', 950000, 'under_review', 'Hospital Administration', 'Emergency transport capability enhancement', 20),
      (7, 'UV Disinfection System', 'Add UV disinfection as additional treatment step', 680000, 'approved', 'Environmental Engineer', 'Enhanced water quality treatment per new EPA guidance', 18)
    `);
    console.log('Change orders seeded.');

    // --- RISK ASSESSMENTS ---
    await pool.query(`
      INSERT INTO risk_assessments (project_id, risk_type, severity, likelihood, description, mitigation, status) VALUES
      (1, 'schedule', 'high', 'medium', 'Steel delivery delays due to supply chain disruptions', 'Pre-order structural steel 6 months ahead; identify alternative suppliers', 'mitigated'),
      (1, 'financial', 'high', 'low', 'Construction material cost escalation exceeding contingency', 'Lock in material prices with suppliers; include escalation clause in contracts', 'monitoring'),
      (2, 'regulatory', 'critical', 'medium', 'Healthcare facility licensing requirements may change during construction', 'Engage healthcare regulatory consultant; maintain communication with licensing board', 'identified'),
      (2, 'safety', 'high', 'low', 'Working near active hospital operations poses safety risks', 'Implement infection control risk assessment (ICRA) protocols', 'mitigated'),
      (3, 'environmental', 'medium', 'high', 'Seasonal flooding risk at riverside construction site', 'Install temporary flood barriers; schedule foundation work during dry season', 'mitigated'),
      (4, 'technical', 'critical', 'medium', 'Unknown soil conditions may require design modifications for bridge foundations', 'Conduct additional geotechnical investigation; design for worst-case scenario', 'monitoring'),
      (4, 'schedule', 'high', 'high', 'Weather delays during winter construction season in Pacific Northwest', 'Build weather contingency into schedule; plan indoor work during rainy season', 'identified'),
      (5, 'financial', 'medium', 'medium', 'School construction often faces scope changes from district stakeholders', 'Clearly define scope with school board sign-off; establish change order procedures', 'monitoring'),
      (6, 'schedule', 'medium', 'low', 'Tenant fit-out coordination may delay overall completion', 'Phase tenant improvements; establish tenant construction guidelines', 'identified'),
      (7, 'environmental', 'critical', 'low', 'Potential contamination discovery during excavation at treatment plant site', 'Conduct Phase II environmental assessment; budget for remediation contingency', 'monitoring'),
      (9, 'safety', 'critical', 'medium', 'Active airport operations create unique safety hazards during terminal expansion', 'Implement FOD prevention program; coordinate with airport operations daily', 'identified'),
      (11, 'technical', 'high', 'medium', 'Power grid capacity may be insufficient for data center requirements', 'Early coordination with utility provider; consider on-site power generation', 'monitoring'),
      (12, 'financial', 'high', 'medium', 'Hotel market conditions could change during long construction period', 'Phase construction to allow partial opening; secure financing commitments early', 'identified'),
      (14, 'schedule', 'medium', 'medium', 'Community input process may delay design finalization', 'Front-load community engagement; establish decision deadlines', 'mitigated'),
      (1, 'safety', 'high', 'medium', 'High-rise construction poses fall hazard risks for workers', 'Implement comprehensive fall protection plan; daily safety inspections', 'mitigated'),
      (3, 'regulatory', 'medium', 'low', 'Zoning variance for building height may face community opposition', 'Engage community early; prepare variance justification documentation', 'monitoring')
    `);
    console.log('Risk assessments seeded.');

    // --- COST ESTIMATES ---
    await pool.query(`
      INSERT INTO cost_estimates (project_id, category, description, estimated_amount, actual_amount, variance) VALUES
      (1, 'Structural', 'Concrete and structural steel for 25-story frame', 18500000, 17800000, -700000),
      (1, 'MEP', 'Mechanical, electrical, plumbing systems', 22000000, 23100000, 1100000),
      (1, 'Facade', 'Curtain wall and exterior cladding system', 12000000, 12500000, 500000),
      (1, 'Interior Finishes', 'Lobby, common areas, and base building finishes', 8500000, 8200000, -300000),
      (2, 'Medical Equipment Infrastructure', 'Medical gas, clean rooms, and specialized systems', 15000000, 0, 0),
      (2, 'Building Shell', 'Structure, envelope, and core systems', 45000000, 0, 0),
      (3, 'Site Development', 'Grading, utilities, roads, and landscaping', 5500000, 5200000, -300000),
      (3, 'Residential Units', 'Construction of 150 condominium units', 32000000, 30500000, -1500000),
      (4, 'Demolition', 'Existing bridge demolition and removal', 3200000, 2800000, -400000),
      (4, 'Substructure', 'New bridge foundations and abutments', 8500000, 9200000, 700000),
      (5, 'Classroom Construction', 'Standard classroom build-out for 24 rooms', 12000000, 0, 0),
      (6, 'Tenant Improvement Allowance', 'TI allowance for 45 retail spaces', 9000000, 7500000, -1500000),
      (7, 'Process Equipment', 'Water treatment process equipment and installation', 18000000, 0, 0),
      (8, 'Specialized Medical Systems', 'Nurse call, medical gas, emergency power', 4500000, 4200000, -300000),
      (10, 'HVAC Replacement', 'Complete HVAC system replacement', 5500000, 5800000, 300000),
      (14, 'Aquatics', 'Swimming pool and aquatic center construction', 4200000, 3900000, -300000)
    `);
    console.log('Cost estimates seeded.');

    // --- COMPLIANCE CHECKS ---
    await pool.query(`
      INSERT INTO compliance_checks (project_id, regulation, status, description, checked_by, check_date, notes) VALUES
      (1, 'IBC 2021 - Structural', 'passed', 'International Building Code structural requirements verification', 'James Wilson', '2025-02-01', 'All structural calculations verified by third-party reviewer'),
      (1, 'ADA Accessibility', 'passed', 'Americans with Disabilities Act compliance review', 'Emily Davis', '2025-02-10', 'All common areas and required units meet ADA standards'),
      (1, 'OSHA 29 CFR 1926', 'passed', 'Construction safety standards compliance', 'Robert Taylor', '2025-03-05', 'Site safety plan approved; weekly inspections scheduled'),
      (2, 'OSHPD/Healthcare Facility Standards', 'in_progress', 'Office of Statewide Health Planning and Development review', 'Amanda White', '2025-05-15', 'Awaiting OSHPD plan review approval'),
      (2, 'Joint Commission Standards', 'pending', 'Healthcare facility accreditation standards', 'David Brown', NULL, 'Pre-construction phase - review scheduled for design completion'),
      (3, 'EPA Stormwater NPDES', 'passed', 'National Pollutant Discharge Elimination System permit', 'Jennifer Martinez', '2025-01-20', 'SWPPP approved and implemented'),
      (4, 'AASHTO Bridge Design', 'in_progress', 'American Association of State Highway Officials bridge standards', 'Chris Anderson', '2025-08-20', 'Design review in progress with state DOT'),
      (5, 'State Education Building Standards', 'passed', 'State requirements for educational facility construction', 'Patricia Thomas', '2025-06-10', 'All educational specifications met'),
      (6, 'Fire Code NFPA 101', 'passed', 'Life Safety Code compliance for retail occupancy', 'Daniel Jackson', '2025-02-25', 'Fire protection systems meet all NFPA requirements'),
      (7, 'EPA Safe Drinking Water Act', 'in_progress', 'Water treatment facility regulatory compliance', 'Michelle Lee', '2025-07-20', 'Treatment process design under EPA review'),
      (8, 'State Assisted Living Regulations', 'passed', 'State licensing requirements for assisted living facilities', 'Kevin Harris', '2025-03-15', 'Facility design meets all state licensing criteria'),
      (10, 'DSA (Div. of State Architect)', 'in_progress', 'California Division of State Architect approval for school projects', 'Sarah Johnson', '2025-05-01', 'Plan review submitted to DSA'),
      (1, 'Energy Code ASHRAE 90.1', 'passed', 'Energy efficiency compliance per ASHRAE 90.1-2019', 'Mike Chen', '2025-02-15', 'Building envelope and systems exceed minimum requirements'),
      (11, 'Uptime Institute Tier IV', 'pending', 'Data center Tier IV certification requirements', 'Lisa Rodriguez', NULL, 'Design documentation being prepared for review'),
      (3, 'Local Zoning Ordinance', 'passed', 'Municipal zoning compliance verification', 'James Wilson', '2024-12-20', 'Zoning variance approved by city council'),
      (14, 'State Pool/Aquatic Safety Code', 'in_progress', 'Swimming pool safety and construction standards', 'Emily Davis', '2025-04-01', 'Pool design review with health department')
    `);
    console.log('Compliance checks seeded.');

    // --- BID COMPARISONS ---
    await pool.query(`
      INSERT INTO bid_comparisons (project_id, bid_ids, comparison_notes, recommendation) VALUES
      (1, '[1, 2, 3]', 'Three competitive bids received for office tower. Turner offers best value with middle pricing. Clark is lowest but excludes MEP scope which adds risk. Skanska highest but includes premium facade.', 'Recommend Turner Construction - best balance of price, scope coverage, and experience with similar projects.'),
      (2, '[4, 5]', 'Two bids for medical center. DPR has specialized healthcare experience and lower price. Brasfield & Gorrie offers extended warranty but at premium price.', 'Recommend DPR Construction - healthcare specialization and competitive pricing outweigh the extended warranty benefit.'),
      (3, '[6, 7]', 'Two residential development bids. Lennar is within budget with complete scope. Toll Brothers exceeds budget but offers superior finish quality.', 'Recommend Lennar Corporation - meets budget requirements while delivering quality construction.'),
      (4, '[8, 9]', 'Two bridge construction bids. Granite is lower and experienced. Kiewit includes temporary bypass road which adds value for traffic management.', 'Both strong contenders. Recommend Granite with negotiation to include traffic management plan.'),
      (1, '[1, 3]', 'Focused comparison between Turner and Clark. Clark''s exclusion of MEP scope could result in coordination issues and cost overruns.', 'Turner preferred due to comprehensive scope coverage reducing coordination risk.'),
      (6, '[11]', 'Single bid evaluation for retail center. Whiting-Turner is sole bidder with strong retail portfolio.', 'Recommend acceptance - pricing aligns with market rates and contractor has excellent retail track record.'),
      (2, '[4, 5]', 'Re-evaluation after scope clarification. Both bids now include identical scope. Price difference of $7M warrants detailed analysis.', 'Maintain recommendation for DPR - healthcare experience justifies selection even at marginally higher coordination complexity.'),
      (4, '[8, 9]', 'Final comparison with updated pricing. Both contractors revised bids after scope clarification for wider bridge deck change.', 'Granite remains preferred contractor. Negotiate temporary traffic bypass as add-alternate.'),
      (9, '[14]', 'Single bid for airport terminal. PCL is sole qualified bidder with aviation construction experience.', 'Recommend PCL - sole bidder but pricing is within industry benchmarks for aviation construction.'),
      (10, '[15]', 'School renovation bid evaluation. McCarthy has strong education sector experience and phased approach.', 'Recommend McCarthy - phased construction approach minimizes disruption to school operations.'),
      (11, '[16]', 'Data center bid review. Holder has mission critical construction expertise.', 'Recommend Holder Construction - specialized data center experience critical for Tier IV facility.'),
      (12, '[17]', 'Hotel/convention center bid evaluation. Mortenson brings hospitality construction specialization.', 'Recommend Mortenson - hospitality portfolio and convention center experience align with project needs.'),
      (5, '[10]', 'School construction bid review. Hensel Phelps proposes LEED Gold certification approach.', 'Recommend Hensel Phelps - LEED Gold approach adds long-term operational savings.'),
      (8, '[13]', 'Senior living facility bid. Robins & Morton has healthcare facility expertise.', 'Recommend Robins & Morton - senior living and healthcare experience essential for specialized requirements.'),
      (7, '[12]', 'Water treatment plant bid analysis. Black & Veatch is industry leader in water infrastructure.', 'Recommend Black & Veatch - water treatment specialization and infrastructure expertise unmatched.')
    `);
    console.log('Bid comparisons seeded.');

    // --- TIMELINES ---
    await pool.query(`
      INSERT INTO timelines (project_id, phase, start_date, end_date, status, dependencies, progress_percent) VALUES
      (1, 'Site Preparation & Excavation', '2025-03-01', '2025-05-31', 'completed', 'None', 100),
      (1, 'Foundation & Substructure', '2025-04-15', '2025-08-31', 'in_progress', 'Site Preparation', 75),
      (1, 'Structural Steel Erection', '2025-07-01', '2026-03-31', 'in_progress', 'Foundation', 30),
      (1, 'Building Envelope', '2025-10-01', '2026-06-30', 'not_started', 'Structural Steel (partial)', 0),
      (1, 'MEP Rough-In', '2025-09-01', '2026-08-31', 'not_started', 'Structural Steel (partial)', 0),
      (3, 'Site Grading & Utilities', '2025-01-10', '2025-04-30', 'completed', 'None', 100),
      (3, 'Foundation & Slab', '2025-03-15', '2025-07-31', 'completed', 'Site Grading', 100),
      (3, 'Framing & Structure', '2025-06-01', '2025-11-30', 'in_progress', 'Foundation', 60),
      (3, 'Interior Finishes', '2025-09-01', '2026-06-30', 'in_progress', 'Framing (partial)', 20),
      (6, 'Demolition & Site Clearing', '2025-02-15', '2025-04-15', 'completed', 'None', 100),
      (6, 'Foundation & Structure', '2025-04-01', '2025-09-30', 'in_progress', 'Site Clearing', 80),
      (6, 'Shell & Core Completion', '2025-08-01', '2026-01-31', 'in_progress', 'Foundation', 25),
      (8, 'Site Work & Foundations', '2025-04-01', '2025-07-31', 'completed', 'None', 100),
      (8, 'Building Structure', '2025-06-15', '2025-12-31', 'in_progress', 'Foundations', 55),
      (8, 'Interior Build-Out', '2025-10-01', '2026-07-31', 'not_started', 'Structure (partial)', 0),
      (10, 'Phase 1 - West Wing Renovation', '2025-05-15', '2025-10-31', 'in_progress', 'None', 65),
      (10, 'Phase 2 - East Wing Renovation', '2025-09-01', '2026-03-31', 'not_started', 'Phase 1 (partial)', 0)
    `);
    console.log('Timelines seeded.');

    // --- TASKS ---
    await pool.query(`
      INSERT INTO tasks (title, project_id, owner, due_date, priority, status, category, description) VALUES
      ('Finalize structural steel addendum', 1, 'Mike Chen', '2025-07-15', 'critical', 'in_progress', 'Bid Addendum', 'Issue final steel clarifications to all shortlisted bidders before pricing cutoff.'),
      ('Collect subcontractor W-9 and insurance certificates', 1, 'Sarah Johnson', '2025-07-18', 'high', 'open', 'Compliance', 'Confirm current COI, W-9, and license documents for preferred subcontractors.'),
      ('Review medical gas scope exclusions', 2, 'Emily Davis', '2025-07-22', 'critical', 'blocked', 'Scope Review', 'Compare DPR and Brasfield medical gas allowances against owner requirements.'),
      ('Validate unit mix revision pricing', 3, 'David Brown', '2025-07-19', 'medium', 'open', 'Cost Review', 'Confirm savings from revised studio/two-bedroom split and update comparison worksheet.'),
      ('Prepare traffic control add alternate', 4, 'James Wilson', '2025-07-25', 'high', 'in_progress', 'Procurement', 'Draft add alternate language for temporary bypass road and lane closure sequencing.'),
      ('School board approval package', 5, 'Patricia Thomas', '2025-07-28', 'high', 'open', 'Approval Package', 'Compile budget, schedule, alternates, and compliance summary for board meeting.'),
      ('Retail tenant allowance reconciliation', 6, 'Jennifer Martinez', '2025-07-21', 'medium', 'in_progress', 'Finance', 'Reconcile tenant improvement allowances against lease commitments and bid assumptions.'),
      ('Water treatment equipment long-lead check', 7, 'Michelle Lee', '2025-07-30', 'critical', 'open', 'Long Lead', 'Confirm lead times for UV disinfection and membrane filtration equipment.'),
      ('Memory care wing code review', 8, 'Kevin Harris', '2025-08-02', 'high', 'open', 'Compliance', 'Validate egress, fire protection, and nurse call requirements for expanded wing.'),
      ('Airport stakeholder coordination log', 9, 'Chris Anderson', '2025-08-05', 'medium', 'open', 'Coordination', 'Set up recurring stakeholder log for airport operations, TSA, and airline representatives.'),
      ('HVAC phasing checklist', 10, 'Sarah Johnson', '2025-07-17', 'high', 'completed', 'Field Planning', 'Confirm temporary classroom ventilation plan during west wing renovation.'),
      ('Utility interconnect kickoff', 11, 'Robert Taylor', '2025-08-08', 'critical', 'open', 'Utility', 'Schedule meeting with utility provider for dual-feed power requirements.'),
      ('Hotel financing contingency review', 12, 'Amanda White', '2025-08-12', 'medium', 'open', 'Finance', 'Review lender contingency requirements before final GMP negotiation.'),
      ('Aquatic center health department comments', 14, 'Lisa Rodriguez', '2025-07-26', 'medium', 'blocked', 'Permitting', 'Waiting for health department comments on pool depth and diving configuration.'),
      ('Community center value engineering memo', 14, 'Daniel Jackson', '2025-08-01', 'low', 'open', 'Value Engineering', 'Summarize pool equipment and locker room finish alternates.')
    `);
    console.log('Tasks seeded.');

    // --- APPROVALS ---
    await pool.query(`
      INSERT INTO approvals (title, project_id, approval_type, requester, approver, due_date, status, amount, notes) VALUES
      ('Award recommendation - Downtown Office Tower', 1, 'Bid Award', 'Sarah Johnson', 'Executive Committee', '2025-07-20', 'pending', 82500000, 'Recommend Turner based on complete scope and lower coordination risk.'),
      ('Change order approval - Rooftop Terrace', 1, 'Change Order', 'Building Owner', 'Project Executive', '2025-07-24', 'pending', 1200000, 'Amenity request requires schedule and waterproofing review.'),
      ('Healthcare equipment allowance release', 2, 'Budget Release', 'Hospital Administration', 'Finance Director', '2025-07-29', 'needs_changes', 15000000, 'Approver requested split by medical department.'),
      ('Residential unit mix revision', 3, 'Scope Change', 'Developer', 'Design Review Board', '2025-07-18', 'approved', -200000, 'Approved after updated market demand memo.'),
      ('Bridge deck widening addendum', 4, 'Design Change', 'City Transportation Dept', 'DOT Program Manager', '2025-08-04', 'pending', 1500000, 'Requires confirmation of future bike lane funding.'),
      ('Elementary school GMP package', 5, 'GMP Approval', 'Estimating Team', 'School Board', '2025-08-10', 'pending', 28000000, 'Board packet prepared for August session.'),
      ('Retail EV charging change order', 6, 'Change Order', 'Building Owner', 'Asset Manager', '2025-07-22', 'approved', 225000, 'Approved due to local ordinance and tenant demand.'),
      ('Water plant UV system addition', 7, 'Change Order', 'Environmental Engineer', 'Public Works Director', '2025-07-31', 'approved', 680000, 'EPA guidance supports additional treatment stage.'),
      ('Memory care wing expansion request', 8, 'Scope Change', 'Facility Operator', 'Owner Representative', '2025-08-09', 'pending', 1800000, 'Review resident count, staffing, and licensing impact.'),
      ('Airport terminal preliminary budget', 9, 'Budget Approval', 'Aviation Team', 'Airport Authority', '2025-08-15', 'pending', 175000000, 'Initial authorization for terminal expansion procurement.'),
      ('High school fiber backbone', 10, 'Technology Change', 'School District IT', 'Program Director', '2025-07-27', 'approved', 165000, 'Approved as technology modernization allowance.'),
      ('Data center utility deposit', 11, 'Payment Approval', 'Robert Taylor', 'CFO', '2025-08-11', 'pending', 950000, 'Utility requires deposit to reserve redundant service capacity.'),
      ('Hotel convention center design release', 12, 'Design Approval', 'Amanda White', 'Development Partner', '2025-08-18', 'pending', 110000000, 'Release required before final lender package.'),
      ('Aquatic center depth modification', 14, 'Design Change', 'Parks & Recreation Dept', 'City Council', '2025-08-03', 'needs_changes', 95000, 'Council requested safety and operational staffing memo.'),
      ('Safety plan acceptance - Office Tower', 1, 'Safety Approval', 'Amanda White', 'Safety Director', '2025-07-16', 'approved', NULL, 'Site-specific safety plan accepted with weekly audit requirement.')
    `);
    console.log('Approvals seeded.');

    // --- NOTIFICATIONS ---
    await pool.query(`
      INSERT INTO notifications (title, message, project_id, severity, category, recipient, read_at) VALUES
      ('Bid award approval due', 'Downtown Office Tower award recommendation is due in 3 days.', 1, 'warning', 'Approval', 'Sarah Johnson', NULL),
      ('Critical task blocked', 'Medical gas scope review is blocked by missing owner equipment schedule.', 2, 'critical', 'Task', 'Emily Davis', NULL),
      ('Change order approved', 'Retail EV charging stations change order was approved.', 6, 'success', 'Change Order', 'Jennifer Martinez', NOW()),
      ('Compliance review pending', 'OSHPD review remains in progress for Riverside Medical Center.', 2, 'warning', 'Compliance', 'Amanda White', NULL),
      ('Long-lead equipment alert', 'Water treatment UV equipment lead time must be confirmed this week.', 7, 'critical', 'Procurement', 'Michelle Lee', NULL),
      ('Task completed', 'HVAC phasing checklist was completed for Oak Valley High School.', 10, 'success', 'Task', 'Sarah Johnson', NOW()),
      ('Approval needs changes', 'Healthcare equipment allowance release requires department-level breakdown.', 2, 'warning', 'Approval', 'Finance Director', NULL),
      ('New bid comparison ready', 'Bridge replacement final comparison is ready for DOT review.', 4, 'info', 'Bid Comparison', 'James Wilson', NULL),
      ('Permit comment expected', 'Aquatic center health department comments are expected before August 3.', 14, 'info', 'Permitting', 'Lisa Rodriguez', NULL),
      ('Safety risk reminder', 'High-rise fall protection controls require daily field verification.', 1, 'critical', 'Safety', 'Amanda White', NULL),
      ('Budget variance watch', 'Office tower MEP actuals are tracking $1.1M above estimate.', 1, 'warning', 'Finance', 'Mike Chen', NULL),
      ('Utility coordination required', 'Data center utility interconnect kickoff must be scheduled.', 11, 'critical', 'Utility', 'Robert Taylor', NULL),
      ('Owner review scheduled', 'Hotel convention center design release review is scheduled for next week.', 12, 'info', 'Owner Review', 'Amanda White', NOW()),
      ('Document package updated', 'School board approval package received updated compliance attachment.', 5, 'info', 'Documents', 'Patricia Thomas', NULL),
      ('Scope approval complete', 'Residential unit mix revision has been approved.', 3, 'success', 'Scope', 'David Brown', NOW())
    `);
    console.log('Notifications seeded.');

    // --- AUDIT LOGS ---
    await pool.query(`
      INSERT INTO audit_logs (user_id, user_email, action, entity_type, entity_id, metadata, ip_address, created_at) VALUES
      (1, 'admin@constructionbid.com', 'POST', 'projects', '1', '{"summary":"Created Downtown Office Tower project record"}', '127.0.0.1', NOW() - INTERVAL '15 days'),
      (2, 'sarah@constructionbid.com', 'PUT', 'bids', '1', '{"summary":"Updated Turner Construction bid status to under review"}', '127.0.0.1', NOW() - INTERVAL '14 days'),
      (3, 'mike@constructionbid.com', 'POST', 'cost-estimates', '1', '{"summary":"Added structural cost estimate"}', '127.0.0.1', NOW() - INTERVAL '13 days'),
      (4, 'lisa@constructionbid.com', 'POST', 'risk-assessments', '3', '{"summary":"Logged healthcare regulatory risk"}', '127.0.0.1', NOW() - INTERVAL '12 days'),
      (5, 'james@constructionbid.com', 'PUT', 'timelines', '2', '{"summary":"Updated foundation progress to 75 percent"}', '127.0.0.1', NOW() - INTERVAL '11 days'),
      (6, 'emily@constructionbid.com', 'POST', 'approvals', '1', '{"summary":"Submitted bid award recommendation"}', '127.0.0.1', NOW() - INTERVAL '10 days'),
      (7, 'robert@constructionbid.com', 'POST', 'tasks', '12', '{"summary":"Created utility interconnect kickoff task"}', '127.0.0.1', NOW() - INTERVAL '9 days'),
      (8, 'amanda@constructionbid.com', 'POST', 'notifications', '10', '{"summary":"Created safety risk reminder notification"}', '127.0.0.1', NOW() - INTERVAL '8 days'),
      (9, 'david@constructionbid.com', 'PUT', 'change-orders', '4', '{"summary":"Approved unit mix modification change order"}', '127.0.0.1', NOW() - INTERVAL '7 days'),
      (10, 'jennifer@constructionbid.com', 'POST', 'documents', '16', '{"summary":"Uploaded change order log"}', '127.0.0.1', NOW() - INTERVAL '6 days'),
      (11, 'chris@constructionbid.com', 'POST', 'bid-comparisons', '9', '{"summary":"Created airport terminal bid review"}', '127.0.0.1', NOW() - INTERVAL '5 days'),
      (12, 'patricia@constructionbid.com', 'PUT', 'compliance', '8', '{"summary":"Marked education standards check as passed"}', '127.0.0.1', NOW() - INTERVAL '4 days'),
      (13, 'daniel@constructionbid.com', 'POST', 'materials', '17', '{"summary":"Added fire-rated gypsum board material"}', '127.0.0.1', NOW() - INTERVAL '3 days'),
      (14, 'michelle@constructionbid.com', 'POST', 'approvals', '8', '{"summary":"Submitted UV system change order approval"}', '127.0.0.1', NOW() - INTERVAL '2 days'),
      (15, 'kevin@constructionbid.com', 'PUT', 'tasks', '9', '{"summary":"Updated memory care code review priority"}', '127.0.0.1', NOW() - INTERVAL '1 day')
    `);
    console.log('Audit logs seeded.');

    // --- FEATURE EXPANSION PLAN MODULES ---
    await pool.query(`
      INSERT INTO plan_uploads (project_id, upload_name, document_type, file_url, uploaded_by, status, extracted_summary)
      SELECT id, name || ' - Plan Set ' || LPAD(id::text, 2, '0'),
             CASE WHEN id % 4 = 0 THEN 'Drawing Set' WHEN id % 4 = 1 THEN 'Spec Book' WHEN id % 4 = 2 THEN 'Addendum' ELSE 'Bid Instructions' END,
             '/uploads/plans/project-' || id || '.pdf',
             CASE WHEN id % 3 = 0 THEN 'Mike Chen' WHEN id % 3 = 1 THEN 'Sarah Johnson' ELSE 'Emily Davis' END,
             CASE WHEN id % 5 = 0 THEN 'needs_review' ELSE 'extracted' END,
             'Extracted scope notes, drawing references, bid alternates, and trade-specific requirements for ' || name || '.'
      FROM projects
      WHERE id <= 15;

      INSERT INTO spec_documents (plan_upload_id, title, spec_section, trade, revision, status)
      SELECT id,
             'Section ' || (id + 3000) || ' - ' || CASE WHEN id % 5 = 0 THEN 'Concrete' WHEN id % 5 = 1 THEN 'MEP' WHEN id % 5 = 2 THEN 'Structural Steel' WHEN id % 5 = 3 THEN 'Sitework' ELSE 'Finishes' END,
             (id + 3000)::text,
             CASE WHEN id % 5 = 0 THEN 'Concrete' WHEN id % 5 = 1 THEN 'MEP' WHEN id % 5 = 2 THEN 'Steel' WHEN id % 5 = 3 THEN 'Civil' ELSE 'Architectural' END,
             'Rev ' || CHR(65 + (id % 4)),
             CASE WHEN id % 6 = 0 THEN 'conflict_detected' ELSE 'indexed' END
      FROM plan_uploads;

      INSERT INTO document_extractions (plan_upload_id, extraction_type, extracted_value, confidence, source_page)
      SELECT id,
             CASE WHEN id % 4 = 0 THEN 'allowance' WHEN id % 4 = 1 THEN 'alternate' WHEN id % 4 = 2 THEN 'exclusion' ELSE 'deadline' END,
             CASE WHEN id % 4 = 0 THEN 'Allowance requires owner confirmation before GMP.'
                  WHEN id % 4 = 1 THEN 'Add alternate for phasing and premium materials detected.'
                  WHEN id % 4 = 2 THEN 'Potential missing scope around temporary utilities.'
                  ELSE 'Bid response deadline and addendum acknowledgement extracted.' END,
             84 + (id % 12),
             3 + id
      FROM plan_uploads;
    `);
    console.log('Plan/spec extraction data seeded.');

    await pool.query(`
      INSERT INTO bid_risk_reviews (bid_id, reviewer, overall_score, status, summary)
      SELECT id,
             CASE WHEN id % 3 = 0 THEN 'Sarah Johnson' WHEN id % 3 = 1 THEN 'Mike Chen' ELSE 'David Brown' END,
             45 + ((id * 7) % 50),
             CASE WHEN id % 5 = 0 THEN 'needs_review' WHEN id % 4 = 0 THEN 'approved' ELSE 'open' END,
             'Structured review for missing scope, ambiguous bid terms, schedule exposure, and cost risk on bid #' || id || '.'
      FROM bids
      WHERE id <= 15;

      INSERT INTO bid_risk_findings (review_id, finding_type, severity, scope_area, description, recommendation)
      SELECT id,
             CASE WHEN id % 4 = 0 THEN 'missing_scope' WHEN id % 4 = 1 THEN 'ambiguous_terms' WHEN id % 4 = 2 THEN 'schedule_risk' ELSE 'cost_exposure' END,
             CASE WHEN id % 5 = 0 THEN 'critical' WHEN id % 3 = 0 THEN 'high' WHEN id % 3 = 1 THEN 'medium' ELSE 'low' END,
             CASE WHEN id % 4 = 0 THEN 'MEP Coordination' WHEN id % 4 = 1 THEN 'General Conditions' WHEN id % 4 = 2 THEN 'Schedule' ELSE 'Allowances' END,
             'Finding identifies a bid risk requiring estimator review before award recommendation.',
             'Clarify scope in addendum, request bidder confirmation, and update comparison assumptions.'
      FROM bid_risk_reviews;
    `);
    console.log('Bid risk review data seeded.');

    await pool.query(`
      INSERT INTO estimate_reviews (cost_estimate_id, reviewer, status, variance_score, summary)
      SELECT id,
             CASE WHEN id % 3 = 0 THEN 'Emily Davis' WHEN id % 3 = 1 THEN 'Mike Chen' ELSE 'Michelle Lee' END,
             CASE WHEN id % 4 = 0 THEN 'variance_flagged' ELSE 'reviewed' END,
             40 + ((id * 9) % 55),
             'Reviewed estimate line items against historical unit costs, material quotes, labor assumptions, and contingency.'
      FROM cost_estimates
      WHERE id <= 15;

      INSERT INTO estimate_variances (review_id, category, estimated_amount, benchmark_amount, variance_amount, severity, recommendation)
      SELECT er.id,
             ce.category,
             ce.estimated_amount,
             ROUND((ce.estimated_amount * (0.92 + ((er.id % 5) * 0.04)))::numeric, 2),
             ROUND((ce.estimated_amount - (ce.estimated_amount * (0.92 + ((er.id % 5) * 0.04))))::numeric, 2),
             CASE WHEN er.id % 5 = 0 THEN 'critical' WHEN er.id % 3 = 0 THEN 'high' ELSE 'medium' END,
             'Validate quantity takeoff, supplier quote freshness, labor productivity factor, and contingency rationale.'
      FROM estimate_reviews er
      JOIN cost_estimates ce ON ce.id = er.cost_estimate_id;
    `);
    console.log('Estimate review data seeded.');

    await pool.query(`
      INSERT INTO permit_checklists (project_id, jurisdiction, trade, phase, status, due_date, owner)
      SELECT id,
             SPLIT_PART(location, ',', 1) || ' Building Department',
             CASE WHEN id % 5 = 0 THEN 'Electrical' WHEN id % 5 = 1 THEN 'Structural' WHEN id % 5 = 2 THEN 'Civil' WHEN id % 5 = 3 THEN 'Fire/Life Safety' ELSE 'Plumbing' END,
             CASE WHEN id % 3 = 0 THEN 'Foundation' WHEN id % 3 = 1 THEN 'Core/Shell' ELSE 'Closeout' END,
             CASE WHEN id % 6 = 0 THEN 'blocked' WHEN id % 4 = 0 THEN 'submitted' ELSE 'open' END,
             DATE '2025-08-01' + (id * INTERVAL '3 days'),
             CASE WHEN id % 3 = 0 THEN 'Patricia Thomas' WHEN id % 3 = 1 THEN 'Lisa Rodriguez' ELSE 'James Wilson' END
      FROM projects
      WHERE id <= 15;

      INSERT INTO permit_requirements (checklist_id, requirement, authority, status, notes)
      SELECT id,
             CASE WHEN id % 4 = 0 THEN 'Stamped trade drawings' WHEN id % 4 = 1 THEN 'Plan check fee receipt' WHEN id % 4 = 2 THEN 'Energy compliance worksheet' ELSE 'Fire marshal sign-off' END,
             jurisdiction,
             CASE WHEN id % 5 = 0 THEN 'blocked' WHEN id % 4 = 0 THEN 'complete' ELSE 'pending' END,
             'Requirement generated from project type, jurisdiction, phase, and trade.'
      FROM permit_checklists;

      INSERT INTO permit_status_events (checklist_id, event_type, status, event_date, notes)
      SELECT id,
             CASE WHEN id % 3 = 0 THEN 'submission' WHEN id % 3 = 1 THEN 'comment_received' ELSE 'resubmission' END,
             status,
             DATE '2025-07-15' + (id * INTERVAL '2 days'),
             'Permit status event recorded for dashboard tracking.'
      FROM permit_checklists;
    `);
    console.log('Permit checklist data seeded.');

    await pool.query(`
      INSERT INTO safety_plans (project_id, plan_name, generated_by, status, summary)
      SELECT id,
             name || ' - Site Safety Plan',
             CASE WHEN id % 3 = 0 THEN 'Amanda White' WHEN id % 3 = 1 THEN 'Kevin Harris' ELSE 'Robert Taylor' END,
             CASE WHEN id % 5 = 0 THEN 'field_review' WHEN id % 4 = 0 THEN 'approved' ELSE 'draft' END,
             'Project-specific safety plan covering hazards, toolbox talks, inspections, and corrective actions.'
      FROM projects
      WHERE id <= 15;

      INSERT INTO safety_hazards (safety_plan_id, hazard, severity, control, toolbox_talk)
      SELECT id,
             CASE WHEN id % 5 = 0 THEN 'Falls from elevation' WHEN id % 5 = 1 THEN 'Crane and lift operations' WHEN id % 5 = 2 THEN 'Hot work' WHEN id % 5 = 3 THEN 'Confined space' ELSE 'Traffic control' END,
             CASE WHEN id % 5 = 0 THEN 'critical' WHEN id % 3 = 0 THEN 'high' ELSE 'medium' END,
             'Use pre-task planning, competent person inspection, barricades, PPE verification, and documented sign-off.',
             'Daily talk covers hazard recognition, stop-work authority, emergency contacts, and required controls.'
      FROM safety_plans;

      INSERT INTO safety_inspections (safety_plan_id, inspection_date, inspector, status, findings, corrective_action)
      SELECT id,
             DATE '2025-07-20' + (id * INTERVAL '2 days'),
             CASE WHEN id % 3 = 0 THEN 'Amanda White' WHEN id % 3 = 1 THEN 'Kevin Harris' ELSE 'Safety Coordinator' END,
             CASE WHEN id % 6 = 0 THEN 'failed' WHEN id % 4 = 0 THEN 'passed' ELSE 'open' END,
             'Inspection covers site access, housekeeping, PPE, lift plans, fall protection, and hot work controls.',
             'Assign corrective actions to field superintendent and verify closure before next shift.'
      FROM safety_plans;
    `);
    console.log('Safety plan data seeded.');

    await pool.query(`
      INSERT INTO subcontractor_scores (subcontractor_id, bid_id, overall_score, availability_score, insurance_score, performance_score, safety_score, scope_fit_score, status)
      SELECT s.id,
             ((s.id - 1) % 15) + 1,
             60 + ((s.id * 3) % 35),
             55 + ((s.id * 5) % 40),
             70 + ((s.id * 2) % 25),
             60 + ((s.id * 4) % 35),
             65 + ((s.id * 6) % 30),
             58 + ((s.id * 7) % 38),
             CASE WHEN s.id % 5 = 0 THEN 'review_required' ELSE 'scored' END
      FROM subcontractors s
      WHERE s.id <= 15;

      INSERT INTO subcontractor_evaluations (score_id, evaluator, evaluation_area, rating, notes)
      SELECT id,
             CASE WHEN id % 3 = 0 THEN 'Sarah Johnson' WHEN id % 3 = 1 THEN 'Mike Chen' ELSE 'James Wilson' END,
             CASE WHEN id % 4 = 0 THEN 'Insurance' WHEN id % 4 = 1 THEN 'Performance' WHEN id % 4 = 2 THEN 'Safety History' ELSE 'Scope Fit' END,
             3 + (id % 3),
             'Evaluation captures bid fit, availability, documentation quality, safety history, and recent performance.'
      FROM subcontractor_scores;
    `);
    console.log('Subcontractor scoring data seeded.');

    await pool.query(`
      INSERT INTO change_order_impacts (change_order_id, cost_impact, schedule_impact_days, source_document, risk_level, status, owner, summary)
      SELECT id,
             amount,
             impact_days,
             'CO-' || LPAD(id::text, 4, '0') || '-source.pdf',
             CASE WHEN ABS(COALESCE(amount, 0)) > 1000000 OR impact_days > 30 THEN 'critical'
                  WHEN ABS(COALESCE(amount, 0)) > 300000 OR impact_days > 10 THEN 'high'
                  ELSE 'medium' END,
             CASE WHEN status = 'approved' THEN 'approved' WHEN status = 'pending' THEN 'pending_owner' ELSE 'under_review' END,
             requested_by,
             'Impact review tracks source document, cost impact, schedule impact, approval state, and responsible owner.'
      FROM change_orders
      WHERE id <= 15;

      INSERT INTO change_order_approvals (impact_id, approver, status, decision_date, notes)
      SELECT id,
             CASE WHEN id % 3 = 0 THEN 'Project Executive' WHEN id % 3 = 1 THEN 'Owner Representative' ELSE 'Finance Director' END,
             CASE WHEN status = 'approved' THEN 'approved' WHEN id % 4 = 0 THEN 'needs_changes' ELSE 'pending' END,
             CASE WHEN status = 'approved' THEN DATE '2025-07-20' + (id * INTERVAL '1 day') ELSE NULL END,
             'Approval record linked to quantified change order impact.'
      FROM change_order_impacts;
    `);
    console.log('Change order impact data seeded.');

    await pool.query(`
      CREATE VIEW project_risk_metrics AS
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

      CREATE VIEW bid_readiness_metrics AS
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
    `);
    console.log('Project risk and bid readiness metric views created.');

    // --- AI ANALYSES ---
    await pool.query(`
      INSERT INTO ai_analyses (feature, input_data, output_data, model_used) VALUES
      ('analyze-bid', '{"bid_id": 1, "project": "Downtown Office Tower", "amount": 82500000}', '{"result": "Bid is competitive and within 3% of market average for Class A office construction in Chicago metro area. Recommend detailed scope review."}', 'anthropic/claude-haiku-4.5'),
      ('estimate-cost', '{"project": "Riverside Medical Center", "type": "healthcare", "sqft": 250000}', '{"result": "Estimated total cost: $115M-$130M. Healthcare construction in Houston averages $460-$520/sqft. Recommend 8-10% contingency for healthcare regulatory changes."}', 'anthropic/claude-haiku-4.5'),
      ('assess-risk', '{"project_id": 4, "type": "bridge", "location": "Portland, OR"}', '{"result": "Key risks: seasonal weather delays (high), unknown soil conditions (medium), traffic management complexity (high). Overall risk score: 7.2/10."}', 'anthropic/claude-haiku-4.5'),
      ('check-compliance', '{"project": "Lincoln Elementary School", "state": "TX", "type": "education"}', '{"result": "Must comply with Texas Education Agency standards, IBC 2021, ADA, and local Austin building codes. Fire suppression required per NFPA 13."}', 'anthropic/claude-haiku-4.5'),
      ('analyze-scope', '{"project": "Harbor Point Shopping Center", "scope": "retail construction"}', '{"result": "Scope appears comprehensive. Recommend clarifying tenant improvement responsibilities, common area maintenance scope, and parking lot maintenance boundaries."}', 'anthropic/claude-haiku-4.5'),
      ('estimate-timeline', '{"project": "Greenfield Water Treatment Plant", "budget": 40000000}', '{"result": "Estimated duration: 24-30 months. Critical path: permitting (4mo) > excavation (3mo) > process equipment installation (8mo) > commissioning (4mo)."}', 'anthropic/claude-haiku-4.5'),
      ('compare-bids', '{"bids": [1, 2, 3], "project": "Downtown Office Tower"}', '{"result": "Turner offers best value at $82.5M with comprehensive scope. Clark is $2.7M lower but excludes MEP coordination. Skanska premium is justified only if facade upgrade is prioritized."}', 'anthropic/claude-haiku-4.5'),
      ('optimize-materials', '{"project": "Sunset Ridge Residential", "category": "structural"}', '{"result": "Recommend switching from traditional stick framing to panelized wall systems for 15% labor savings. Consider engineered lumber for longer spans to reduce beam sizes."}', 'anthropic/claude-haiku-4.5'),
      ('analyze-bid', '{"bid_id": 4, "project": "Riverside Medical Center", "amount": 115000000}', '{"result": "DPR bid aligns with industry benchmarks for healthcare construction. Their clean room experience adds value. Recommend negotiating equipment procurement timeline."}', 'anthropic/claude-haiku-4.5'),
      ('assess-risk', '{"project_id": 1, "type": "commercial", "stories": 25}', '{"result": "High-rise risks: wind loading during steel erection (critical), crane logistics in urban setting (high), occupied building adjacency (medium). Recommend enhanced safety protocols."}', 'anthropic/claude-haiku-4.5'),
      ('estimate-cost', '{"project": "Community Recreation Center", "type": "public", "sqft": 45000}', '{"result": "Estimated cost: $16M-$20M. Aquatic center portion is cost driver at $350-$400/sqft. Standard recreation space at $250-$300/sqft. Recommend value engineering pool systems."}', 'anthropic/claude-haiku-4.5'),
      ('check-compliance', '{"project_id": 11, "type": "data_center", "tier": "IV"}', '{"result": "Tier IV requires 2N redundancy for power and cooling. Must meet NFPA 75 for IT equipment protection. Local utility coordination essential for dual power feeds."}', 'anthropic/claude-haiku-4.5'),
      ('optimize-materials', '{"project": "Oak Valley High School", "focus": "energy_efficiency"}', '{"result": "Recommend high-performance glazing (U-0.25) for 30% HVAC reduction. LED lighting with daylight harvesting saves $45K/year. Cool roof membrane reduces cooling load by 15%."}', 'anthropic/claude-haiku-4.5'),
      ('estimate-timeline', '{"project": "Metro Airport Terminal Expansion", "gates": 12}', '{"result": "Estimated 32-36 months. Night work required for active airside operations. Critical: FAA coordination (ongoing), utility relocations (6mo), gate equipment (12mo lead time)."}', 'anthropic/claude-haiku-4.5'),
      ('analyze-scope', '{"project": "Industrial Warehouse Complex", "units": 3}', '{"result": "Warehouse scope well-defined. Clarify: dock leveler specifications, clear height requirements, fire suppression type (ESFR vs standard), and office finish level."}', 'anthropic/claude-haiku-4.5')
    `);
    console.log('AI analyses seeded.');

    console.log('\nSeeding completed successfully!');
    console.log('Demo login users provisioned from the local environment.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
};

seed();
