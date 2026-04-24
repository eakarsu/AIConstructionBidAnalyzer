import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const featureCards = [
  { path: '/projects', icon: '\ud83d\udccb', title: 'Projects', desc: 'Manage construction projects, timelines, and budgets', api: '/api/projects' },
  { path: '/bids', icon: '\ud83d\udcb0', title: 'Bids', desc: 'Track and analyze bid submissions from contractors', api: '/api/bids' },
  { path: '/contractors', icon: '\ud83d\udc77', title: 'Contractors', desc: 'Contractor database with ratings and specialties', api: '/api/contractors' },
  { path: '/materials', icon: '\ud83c\udfd7\ufe0f', title: 'Materials', desc: 'Material costs, suppliers, and inventory tracking', api: '/api/materials' },
  { path: '/labor', icon: '\ud83d\udcbc', title: 'Labor Costs', desc: 'Labor rates, hours, and workforce planning', api: '/api/labor' },
  { path: '/documents', icon: '\ud83d\udcc4', title: 'Documents', desc: 'Project documents, contracts, and specifications', api: '/api/documents' },
  { path: '/subcontractors', icon: '\ud83d\udd28', title: 'Subcontractors', desc: 'Subcontractor management and availability', api: '/api/subcontractors' },
  { path: '/change-orders', icon: '\ud83d\udcdd', title: 'Change Orders', desc: 'Track scope changes and their cost impact', api: '/api/change-orders' },
  { path: '/risk-assessments', icon: '\u26a0\ufe0f', title: 'Risk Assessment', desc: 'Identify and mitigate project risks', api: '/api/risk-assessments' },
  { path: '/cost-estimates', icon: '\ud83d\udcb5', title: 'Cost Estimates', desc: 'Detailed cost breakdowns and variance analysis', api: '/api/cost-estimates' },
  { path: '/compliance', icon: '\u2705', title: 'Compliance', desc: 'Regulatory compliance checks and audits', api: '/api/compliance' },
  { path: '/bid-comparisons', icon: '\ud83d\udcc8', title: 'Bid Comparisons', desc: 'Side-by-side bid analysis and recommendations', api: '/api/bid-comparisons' },
  { path: '/timelines', icon: '\ud83d\udcc5', title: 'Timelines', desc: 'Project phases, milestones, and scheduling', api: '/api/timelines' },
];

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
  const totalMaterials = counts['/api/materials'] || 0;

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
          <div className="stat-icon purple">{'\ud83c\udfd7\ufe0f'}</div>
          <div className="stat-info">
            <h3>{totalMaterials}</h3>
            <p>Materials</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p className="loading-text">Loading dashboard...</p>
        </div>
      ) : (
        <div className="dashboard-grid">
          {featureCards.map((card) => (
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
          <div
            className="dashboard-card"
            onClick={() => navigate('/ai-analysis')}
          >
            <span className="card-icon">{'\ud83e\udd16'}</span>
            <h3>AI Analysis</h3>
            <p>AI-powered bid analysis, cost estimation, and risk assessment</p>
            <div className="card-count">8 AI tools</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
