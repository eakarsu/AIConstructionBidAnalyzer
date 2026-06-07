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

// // === Batch 02 Gaps & Frontend Mounts ===
import CfVisionBasedSiteInspection from './pages/CfVisionBasedSiteInspection';
import CfSupplierIntelligence from './pages/CfSupplierIntelligence';
import CfAgenticContractNegotiation from './pages/CfAgenticContractNegotiation';
import CfRealTimeCostTrackingWithVarianceAlerts from './pages/CfRealTimeCostTrackingWithVarianceAlerts';
import CfLiabilityInsuranceRecommendationEngine from './pages/CfLiabilityInsuranceRecommendationEngine';
import CfSubcontractorPerformanceScoring from './pages/CfSubcontractorPerformanceScoring';
import GapNoPhotoSiteVisionAiForProgressOrSafetyInspection from './pages/GapNoPhotoSiteVisionAiForProgressOrSafetyInspection';
import GapContractorsSubcontractorsLackAiScoringOrPerformancePr from './pages/GapContractorsSubcontractorsLackAiScoringOrPerformancePr';
import GapNoAgenticBidNegotiationFlow from './pages/GapNoAgenticBidNegotiationFlow';
import GapNoSupplierDirectoryVendorManagementPortal from './pages/GapNoSupplierDirectoryVendorManagementPortal';
import GapNoRfqAutomationOrVendorOutreachWorkflow from './pages/GapNoRfqAutomationOrVendorOutreachWorkflow';
import GapNoEquipmentRentalMarketplaceOrAvailabilityTracker from './pages/GapNoEquipmentRentalMarketplaceOrAvailabilityTracker';
import GapNoCalendarIntegration from './pages/GapNoCalendarIntegration';
import GapLimitedMobileFieldAppSurfaces from './pages/GapLimitedMobileFieldAppSurfaces';

import CodexCustomVizFeature from './pages/CodexCustomVizFeature';
import CodexOperationsFeature from './pages/CodexOperationsFeature';

import TimelineView from './pages/TimelineView';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
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
        <Route path="/insights/timeline" element={<ProtectedRoute><TimelineView /></ProtectedRoute>} />
        <Route path="/codex/custom-viz" element={<ProtectedRoute><CodexCustomVizFeature /></ProtectedRoute>} />
        <Route path="/codex/operations" element={<ProtectedRoute><CodexOperationsFeature /></ProtectedRoute>} />

        <Route path="/login" element={<LoginPage />} />
      
        {/* // === Batch 02 Gaps & Frontend Mounts === */}
        <Route path="/cf/vision-based-site-inspection" element={<CfVisionBasedSiteInspection />} />
        <Route path="/cf/supplier-intelligence" element={<CfSupplierIntelligence />} />
        <Route path="/cf/agentic-contract-negotiation" element={<CfAgenticContractNegotiation />} />
        <Route path="/cf/real-time-cost-tracking-with-variance-alerts" element={<CfRealTimeCostTrackingWithVarianceAlerts />} />
        <Route path="/cf/liability-insurance-recommendation-engine" element={<CfLiabilityInsuranceRecommendationEngine />} />
        <Route path="/cf/subcontractor-performance-scoring" element={<CfSubcontractorPerformanceScoring />} />
        <Route path="/gap/no-photo-site-vision-ai-for-progress-or-safety-inspection" element={<GapNoPhotoSiteVisionAiForProgressOrSafetyInspection />} />
        <Route path="/gap/contractors-subcontractors-lack-ai-scoring-or-performance-pr" element={<GapContractorsSubcontractorsLackAiScoringOrPerformancePr />} />
        <Route path="/gap/no-agentic-bid-negotiation-flow" element={<GapNoAgenticBidNegotiationFlow />} />
        <Route path="/gap/no-supplier-directory-vendor-management-portal" element={<GapNoSupplierDirectoryVendorManagementPortal />} />
        <Route path="/gap/no-rfq-automation-or-vendor-outreach-workflow" element={<GapNoRfqAutomationOrVendorOutreachWorkflow />} />
        <Route path="/gap/no-equipment-rental-marketplace-or-availability-tracker" element={<GapNoEquipmentRentalMarketplaceOrAvailabilityTracker />} />
        <Route path="/gap/no-calendar-integration" element={<GapNoCalendarIntegration />} />
        <Route path="/gap/limited-mobile-field-app-surfaces" element={<GapLimitedMobileFieldAppSurfaces />} />
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
        <Route path="/missing-features" element={<ProtectedRoute><MissingFeaturesHub /></ProtectedRoute>} />
        <Route path="/production-readiness" element={<ProtectedRoute><ProductionReadiness /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}

export default App;
