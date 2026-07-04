import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const navItems = [
  { section: 'Core' },
  { path: '/', icon: '\ud83d\udcca', label: 'Dashboard' },
  { path: '/projects', icon: '\ud83d\udccb', label: 'Projects' },
  { path: '/bids', icon: '\ud83d\udcb0', label: 'Bids' },
  { path: '/contractors', icon: '\ud83d\udc77', label: 'Contractors' },
  { path: '/materials', icon: '\ud83c\udfd7\ufe0f', label: 'Materials' },
  { path: '/labor', icon: '\ud83d\udcbc', label: 'Labor Costs' },
  { path: '/documents', icon: '\ud83d\udcc4', label: 'Documents' },
  { path: '/subcontractors', icon: '\ud83d\udd28', label: 'Subcontractors' },
  { path: '/change-orders', icon: '\ud83d\udcdd', label: 'Change Orders' },
  { path: '/risk-assessments', icon: '\u26a0\ufe0f', label: 'Risk Assessment' },
  { path: '/cost-estimates', icon: '\ud83d\udcb5', label: 'Cost Estimates' },
  { path: '/compliance', icon: '\u2705', label: 'Compliance' },
  { path: '/bid-comparisons', icon: '\ud83d\udcc8', label: 'Bid Comparisons' },
  { path: '/timelines', icon: '\ud83d\udcc5', label: 'Timelines' },
  { section: 'Operations' },
  { path: '/tasks', icon: '\ud83d\udccc', label: 'Tasks' },
  { path: '/approvals', icon: '\u2705', label: 'Approvals' },
  { path: '/notifications', icon: '\ud83d\udd14', label: 'Notifications' },
  { path: '/audit-trail', icon: '\ud83d\udcc8', label: 'Audit Trail' },
  { section: 'Expansion Plan' },
  { path: '/plan-spec-upload', icon: '\ud83d\udcc4', label: 'Documents: Extraction' },
  { path: '/bid-risk-analysis', icon: '\u26a0\ufe0f', label: 'Bids: Risk Review' },
  { path: '/cost-estimate-review', icon: '\ud83d\udcb5', label: 'Costs: Estimate Review' },
  { path: '/permit-checklists', icon: '\ud83c\udfdb\ufe0f', label: 'Compliance: Permits' },
  { path: '/safety-plans', icon: '\ud83e\uddba', label: 'Compliance: Safety' },
  { path: '/subcontractor-scoring', icon: '\ud83d\udee0\ufe0f', label: 'Subs: Scoring' },
  { path: '/change-order-impacts', icon: '\ud83d\udcdd', label: 'Change Orders: Impact' },
  { path: '/project-risk-dashboard', icon: '\ud83d\udcca', label: 'Projects: Risk Metrics' },
  { section: 'Reports & AI' },
  { path: '/reports', icon: '\ud83d\udccb', label: 'Reports' },
  { path: '/bid-bond-readiness', icon: '\ud83d\udccb', label: 'Bid Bond Readiness' },
  { path: '/ai-workbench', icon: '🤖', label: 'AI Workbench' }
];

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <h1>{'\ud83c\udfd7\ufe0f'} BidAnalyzer AI</h1>
        <div className="subtitle">Construction Intelligence</div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          item.section ? (
            <div className="nav-section" key={item.section}>{item.section}</div>
          ) : (
            <Link
              key={item.path}
              to={item.path}
              className={location.pathname === item.path ? 'active' : ''}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">{getInitials(user.name)}</div>
          <div>
            <div className="user-name">{user.name || 'User'}</div>
            <div className="user-email">{user.email || ''}</div>
          </div>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          <span>{'\ud83d\udeaa'}</span> <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
