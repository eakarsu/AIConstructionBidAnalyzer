import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const featureCards = [
  { group: 'Core App', path: '/projects', icon: '\ud83d\udccb', title: 'Projects', desc: 'Manage construction projects, timelines, and budgets', api: '/api/projects' },
  { group: 'Core App', path: '/bids', icon: '\ud83d\udcb0', title: 'Bids', desc: 'Track and analyze bid submissions from contractors', api: '/api/bids' },
  { group: 'Core App', path: '/contractors', icon: '\ud83d\udc77', title: 'Contractors', desc: 'Contractor database with ratings and specialties', api: '/api/contractors' },
  { group: 'Core App', path: '/materials', icon: '\ud83c\udfd7\ufe0f', title: 'Materials', desc: 'Material costs, suppliers, and inventory tracking', api: '/api/materials' },
  { group: 'Core App', path: '/labor', icon: '\ud83d\udcbc', title: 'Labor Costs', desc: 'Labor rates, hours, and workforce planning', api: '/api/labor' },
  { group: 'Core App', path: '/documents', icon: '\ud83d\udcc4', title: 'Documents', desc: 'Project documents, contracts, and specifications', api: '/api/documents' },
  { group: 'Core App', path: '/subcontractors', icon: '\ud83d\udd28', title: 'Subcontractors', desc: 'Subcontractor management and availability', api: '/api/subcontractors' },
  { group: 'Core App', path: '/change-orders', icon: '\ud83d\udcdd', title: 'Change Orders', desc: 'Track scope changes and their cost impact', api: '/api/change-orders' },
  { group: 'Core App', path: '/risk-assessments', icon: '\u26a0\ufe0f', title: 'Risk Assessment', desc: 'Identify and mitigate project risks', api: '/api/risk-assessments' },
  { group: 'Core App', path: '/cost-estimates', icon: '\ud83d\udcb5', title: 'Cost Estimates', desc: 'Detailed cost breakdowns and variance analysis', api: '/api/cost-estimates' },
  { group: 'Core App', path: '/compliance', icon: '\u2705', title: 'Compliance', desc: 'Regulatory compliance checks and audits', api: '/api/compliance' },
  { group: 'Core App', path: '/bid-comparisons', icon: '\ud83d\udcc8', title: 'Bid Comparisons', desc: 'Side-by-side bid analysis and recommendations', api: '/api/bid-comparisons' },
  { group: 'Core App', path: '/timelines', icon: '\ud83d\udcc5', title: 'Timelines', desc: 'Project phases, milestones, and scheduling', api: '/api/timelines' },
  { group: 'Operations', path: '/tasks', icon: '\ud83d\udccc', title: 'Tasks', desc: 'Operational task queue for bid, scope, compliance, and field follow-up', api: '/api/tasks' },
  { group: 'Operations', path: '/approvals', icon: '\u2705', title: 'Approvals', desc: 'Bid awards, change orders, budgets, design releases, and safety approvals', api: '/api/approvals' },
  { group: 'Operations', path: '/notifications', icon: '\ud83d\udd14', title: 'Notifications', desc: 'Actionable alerts for deadlines, blocked tasks, risks, and approvals', api: '/api/notifications' },
  { group: 'Operations', path: '/audit-trail', icon: '\ud83d\udcc8', title: 'Audit Trail', desc: 'System history for create, update, delete, and approval activity', api: '/api/audit-logs' },
  { group: 'Feature Expansion Plan', path: '/plan-spec-upload', icon: '\ud83d\udcc4', title: 'Documents: Extraction', desc: 'Drawing, spec, addendum, and bid instruction extraction records', api: '/api/feature-expansion/plan-spec-upload' },
  { group: 'Feature Expansion Plan', path: '/bid-risk-analysis', icon: '\u26a0\ufe0f', title: 'Bids: Risk Review', desc: 'Structured missing-scope, schedule, compliance, and cost-risk findings', api: '/api/feature-expansion/bid-risk-analysis' },
  { group: 'Feature Expansion Plan', path: '/cost-estimate-review', icon: '\ud83d\udcb5', title: 'Costs: Estimate Review', desc: 'Historical cost, quote, labor, and contingency variance review', api: '/api/feature-expansion/cost-estimate-review' },
  { group: 'Feature Expansion Plan', path: '/permit-checklists', icon: '\ud83c\udfdb\ufe0f', title: 'Compliance: Permits', desc: 'Jurisdiction, trade, phase, requirement, and status-event tracking', api: '/api/feature-expansion/permit-checklists' },
  { group: 'Feature Expansion Plan', path: '/safety-plans', icon: '\ud83e\uddba', title: 'Compliance: Safety', desc: 'Hazards, toolbox talks, inspections, and corrective actions', api: '/api/feature-expansion/safety-plans' },
  { group: 'Feature Expansion Plan', path: '/subcontractor-scoring', icon: '\ud83d\udee0\ufe0f', title: 'Subs: Scoring', desc: 'Data-backed availability, insurance, performance, safety, and scope-fit scoring', api: '/api/feature-expansion/subcontractor-scoring' },
  { group: 'Feature Expansion Plan', path: '/change-order-impacts', icon: '\ud83d\udcdd', title: 'Change Orders: Impact', desc: 'Change order cost, schedule, source document, risk, and approval impact', api: '/api/feature-expansion/change-order-impacts' },
  { group: 'Feature Expansion Plan', path: '/project-risk-dashboard', icon: '\ud83d\udcca', title: 'Projects: Risk Metrics', desc: 'Computed project risk and bid readiness metrics', api: '/api/feature-expansion/project-risk-dashboard' },
];

const dashboardGroups = ['Core App', 'Operations', 'Feature Expansion Plan'];

const Dashboard = () => {
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchCounts = async () => {
      const headers = { Authorization: `Bearer ${token}` };
      const results = {};
      await Promise.all(
        featureCards.map(async (card) => {
          try {
            const res = await axios.get(card.api, { headers });
            results[card.api] = Array.isArray(res.data) ? res.data.length : 0;
          } catch {
            results[card.api] = 0;
          }
        })
      );
      setCounts(results);
      setLoading(false);
    };
    fetchCounts();
  }, [token]);

  const totalProjects = counts['/api/projects'] || 0;
  const totalBids = counts['/api/bids'] || 0;
  const totalContractors = counts['/api/contractors'] || 0;
  const totalTasks = counts['/api/tasks'] || 0;

  return (
    <div>
      <div className="dashboard-welcome">
        <h1>Welcome back, {user.name || 'User'}</h1>
        <p>Here is an overview of your construction bid management system.</p>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon blue">{'\ud83d\udccb'}</div>
          <div className="stat-info">
            <h3>{totalProjects}</h3>
            <p>Total Projects</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">{'\ud83d\udcb0'}</div>
          <div className="stat-info">
            <h3>{totalBids}</h3>
            <p>Active Bids</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">{'\ud83d\udc77'}</div>
          <div className="stat-info">
            <h3>{totalContractors}</h3>
            <p>Contractors</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">{'\ud83d\udccc'}</div>
          <div className="stat-info">
            <h3>{totalTasks}</h3>
            <p>Open Tasks</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p className="loading-text">Loading dashboard...</p>
        </div>
      ) : (
        <>
          {dashboardGroups.map((group) => (
            <div className="dashboard-section" key={group}>
              <h2>{group}</h2>
              <div className="dashboard-grid">
                {featureCards.filter((card) => card.group === group).map((card) => (
                  <div
                    key={card.path}
                    className="dashboard-card"
                    onClick={() => navigate(card.path)}
                  >
                    <span className="card-icon">{card.icon}</span>
                    <h3>{card.title}</h3>
                    <p>{card.desc}</p>
                    <div className="card-count">
                      {counts[card.api] || 0} items
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="dashboard-section">
            <h2>Reports & AI</h2>
            <div className="dashboard-grid">
          <div
            className="dashboard-card"
            onClick={() => navigate('/ai-analysis')}
          >
            <span className="card-icon">{'\ud83e\udd16'}</span>
            <h3>AI Analysis</h3>
            <p>AI-powered bid analysis, cost estimation, and risk assessment</p>
            <div className="card-count">8 AI tools</div>
          </div>
          <div
            className="dashboard-card"
            onClick={() => navigate('/ai-lab')}
          >
            <span className="card-icon">{'\ud83e\uddea'}</span>
            <h3>AI Lab</h3>
            <p>Subcontractor analysis, value engineering, cash flow, dispute analyzer & more</p>
            <div className="card-count">12 advanced tools</div>
          </div>
          <div
            className="dashboard-card"
            onClick={() => navigate('/reports')}
          >
            <span className="card-icon">{'\ud83d\udccb'}</span>
            <h3>Reports</h3>
            <p>Export PDF reports for bid comparisons and cost estimates</p>
            <div className="card-count">PDF exports</div>
          </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
