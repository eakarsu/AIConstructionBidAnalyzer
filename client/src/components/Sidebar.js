import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const navItems = [
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
  { path: '/ai-analysis', icon: '\ud83e\udd16', label: 'AI Analysis' },
  { path: '/ai-lab', icon: '\ud83e\uddea', label: 'AI Lab' },
  { path: '/reports', icon: '\ud83d\udccb', label: 'Reports' },
  { path: '/bid-bond-readiness', icon: '\ud83d\udccb', label: 'Bid Bond Readiness' },
,
  // // === Batch 02 Gaps & Frontend Mounts ===
  { path: '/cf/vision-based-site-inspection', icon: '+', label: 'CF: VisionBasedSiteInspectio' },
  { path: '/cf/supplier-intelligence', icon: '+', label: 'CF: SupplierIntelligence' },
  { path: '/cf/agentic-contract-negotiation', icon: '+', label: 'CF: AgenticContractNegotiati' },
  { path: '/cf/real-time-cost-tracking-with-variance-alerts', icon: '+', label: 'CF: RealTimeCostTrackingWith' },
  { path: '/cf/liability-insurance-recommendation-engine', icon: '+', label: 'CF: LiabilityInsuranceRecomm' },
  { path: '/cf/subcontractor-performance-scoring', icon: '+', label: 'CF: SubcontractorPerformance' },
  { path: '/gap/no-photo-site-vision-ai-for-progress-or-safety-inspection', icon: '+', label: 'Gap: NoPhotoSiteVisionAiForPr' },
  { path: '/gap/contractors-subcontractors-lack-ai-scoring-or-performance-pr', icon: '+', label: 'Gap: ContractorsSubcontractor' },
  { path: '/gap/no-agentic-bid-negotiation-flow', icon: '+', label: 'Gap: NoAgenticBidNegotiationF' },
  { path: '/gap/no-supplier-directory-vendor-management-portal', icon: '+', label: 'Gap: NoSupplierDirectoryVendo' },
  { path: '/gap/no-rfq-automation-or-vendor-outreach-workflow', icon: '+', label: 'Gap: NoRfqAutomationOrVendorO' },
  { path: '/gap/no-equipment-rental-marketplace-or-availability-tracker', icon: '+', label: 'Gap: NoEquipmentRentalMarketp' },
  { path: '/gap/no-calendar-integration', icon: '+', label: 'Gap: NoCalendarIntegration' },
  { path: '/gap/limited-mobile-field-app-surfaces', icon: '+', label: 'Gap: LimitedMobileFieldAppSur' }
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
          <Link
            key={item.path}
            to={item.path}
            className={location.pathname === item.path ? 'active' : ''}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
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
