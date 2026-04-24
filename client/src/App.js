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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}

export default App;
