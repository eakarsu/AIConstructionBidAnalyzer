import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ProjectsPage from './pages/ProjectsPage';
import BidsPage from './pages/BidsPage';
import ContractorsPage from './pages/ContractorsPage';
import MaterialsPage from './pages/MaterialsPage';
import LaborPage from './pages/LaborPage';
import DocumentsPage from './pages/DocumentsPage';
import SubcontractorsPage from './pages/SubcontractorsPage';
import ChangeOrdersPage from './pages/ChangeOrdersPage';
import RiskAssessmentsPage from './pages/RiskAssessmentsPage';
import CostEstimatesPage from './pages/CostEstimatesPage';
import CompliancePage from './pages/CompliancePage';
import BidComparisonsPage from './pages/BidComparisonsPage';
import TimelinesPage from './pages/TimelinesPage';
import AIAnalysisPage from './pages/AIAnalysisPage';
import AILabPage from './pages/AILabPage';
import ReportsPage from './pages/ReportsPage';
import BidBondReadinessPage from './pages/BidBondReadinessPage';
import MissingFeaturesHub from './pages/MissingFeaturesHub';
import ProductionReadiness from './pages/ProductionReadiness';
import WorkflowPage from './pages/WorkflowPage';
import ExpansionFeaturePage from './pages/ExpansionFeaturePage';

// // === Batch 02 Gaps & Frontend Mounts ===
import AIWorkbenchPage from './pages/AIWorkbenchPage';
import CfVisionBasedSiteInspection from './pages/CfVisionBasedSiteInspection';
import CfSupplierIntelligence from './pages/CfSupplierIntelligence';
import CfAgenticContractNegotiation from './pages/CfAgenticContractNegotiation';
import CfRealTimeCostTrackingWithVarianceAlerts from './pages/CfRealTimeCostTrackingWithVarianceAlerts';
import CfLiabilityInsuranceRecommendationEngine from './pages/CfLiabilityInsuranceRecommendationEngine';
import CfSubcontractorPerformanceScoring from './pages/CfSubcontractorPerformanceScoring';

import CodexCustomVizFeature from './pages/CodexCustomVizFeature';
import CodexOperationsFeature from './pages/CodexOperationsFeature';

import TimelineView from './pages/TimelineView';

const isValidStoredToken = (token) => {
  if (!token || token === 'null' || token === 'undefined') return false;

  try {
    const [, payload] = token.split('.');
    if (!payload) return false;

    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(window.atob(normalizedPayload));

    if (decoded.exp && decoded.exp * 1000 < Date.now()) return false;
    return true;
  } catch (err) {
    return false;
  }
};

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!isValidStoredToken(token)) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return <Navigate to="/login" replace />;
  }
  return children;
};

const AppLayout = ({ children }) => {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        {children}
      </div>
    </div>
  );
};

function App() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  if (isLoginPage) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    );
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
        <Route path="/bids" element={<ProtectedRoute><BidsPage /></ProtectedRoute>} />
        <Route path="/contractors" element={<ProtectedRoute><ContractorsPage /></ProtectedRoute>} />
        <Route path="/materials" element={<ProtectedRoute><MaterialsPage /></ProtectedRoute>} />
        <Route path="/labor" element={<ProtectedRoute><LaborPage /></ProtectedRoute>} />
        <Route path="/documents" element={<ProtectedRoute><DocumentsPage /></ProtectedRoute>} />
        <Route path="/subcontractors" element={<ProtectedRoute><SubcontractorsPage /></ProtectedRoute>} />
        <Route path="/change-orders" element={<ProtectedRoute><ChangeOrdersPage /></ProtectedRoute>} />
        <Route path="/risk-assessments" element={<ProtectedRoute><RiskAssessmentsPage /></ProtectedRoute>} />
        <Route path="/cost-estimates" element={<ProtectedRoute><CostEstimatesPage /></ProtectedRoute>} />
        <Route path="/compliance" element={<ProtectedRoute><CompliancePage /></ProtectedRoute>} />
        <Route path="/bid-comparisons" element={<ProtectedRoute><BidComparisonsPage /></ProtectedRoute>} />
        <Route path="/timelines" element={<ProtectedRoute><TimelinesPage /></ProtectedRoute>} />
        <Route path="/ai-analysis" element={<ProtectedRoute><AIAnalysisPage /></ProtectedRoute>} />
        <Route path="/ai-lab" element={<ProtectedRoute><AILabPage /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
        <Route path="/bid-bond-readiness" element={<ProtectedRoute><BidBondReadinessPage /></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute><WorkflowPage type="tasks" /></ProtectedRoute>} />
        <Route path="/approvals" element={<ProtectedRoute><WorkflowPage type="approvals" /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><WorkflowPage type="notifications" /></ProtectedRoute>} />
        <Route path="/audit-trail" element={<ProtectedRoute><WorkflowPage type="audit" /></ProtectedRoute>} />
        <Route path="/plan-spec-upload" element={<ProtectedRoute><ExpansionFeaturePage feature="plan-spec-upload" /></ProtectedRoute>} />
        <Route path="/bid-risk-analysis" element={<ProtectedRoute><ExpansionFeaturePage feature="bid-risk-analysis" /></ProtectedRoute>} />
        <Route path="/cost-estimate-review" element={<ProtectedRoute><ExpansionFeaturePage feature="cost-estimate-review" /></ProtectedRoute>} />
        <Route path="/permit-checklists" element={<ProtectedRoute><ExpansionFeaturePage feature="permit-checklists" /></ProtectedRoute>} />
        <Route path="/safety-plans" element={<ProtectedRoute><ExpansionFeaturePage feature="safety-plans" /></ProtectedRoute>} />
        <Route path="/subcontractor-scoring" element={<ProtectedRoute><ExpansionFeaturePage feature="subcontractor-scoring" /></ProtectedRoute>} />
        <Route path="/change-order-impacts" element={<ProtectedRoute><ExpansionFeaturePage feature="change-order-impacts" /></ProtectedRoute>} />
        <Route path="/project-risk-dashboard" element={<ProtectedRoute><ExpansionFeaturePage feature="project-risk-dashboard" /></ProtectedRoute>} />
        <Route path="/missing-features" element={<ProtectedRoute><MissingFeaturesHub /></ProtectedRoute>} />
        <Route path="/production-readiness" element={<ProtectedRoute><ProductionReadiness /></ProtectedRoute>} />

        {/* Unified AI Workbench (replaces the 14 CF/Gap shells) */}
        <Route path="/ai-workbench" element={<ProtectedRoute><AIWorkbenchPage /></ProtectedRoute>} />

        {/* Insights / Codex */}
        <Route path="/insights/timeline" element={<ProtectedRoute><TimelineView /></ProtectedRoute>} />
        <Route path="/codex/custom-viz" element={<ProtectedRoute><CodexCustomVizFeature /></ProtectedRoute>} />
        <Route path="/codex/operations" element={<ProtectedRoute><CodexOperationsFeature /></ProtectedRoute>} />

        {/* CF / Gap feature pages */}
        <Route path="/cf/vision-based-site-inspection" element={<ProtectedRoute><CfVisionBasedSiteInspection /></ProtectedRoute>} />
        <Route path="/cf/supplier-intelligence" element={<ProtectedRoute><CfSupplierIntelligence /></ProtectedRoute>} />
        <Route path="/cf/agentic-contract-negotiation" element={<ProtectedRoute><CfAgenticContractNegotiation /></ProtectedRoute>} />
        <Route path="/cf/real-time-cost-tracking-with-variance-alerts" element={<ProtectedRoute><CfRealTimeCostTrackingWithVarianceAlerts /></ProtectedRoute>} />
        <Route path="/cf/liability-insurance-recommendation-engine" element={<ProtectedRoute><CfLiabilityInsuranceRecommendationEngine /></ProtectedRoute>} />
        <Route path="/cf/subcontractor-performance-scoring" element={<ProtectedRoute><CfSubcontractorPerformanceScoring /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}

export default App;
