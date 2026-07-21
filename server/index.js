const express = require('express');
const cors = require('cors');
require('dotenv').config();
require('./config/runtime').validateRuntime();

const app = express();

// Middleware
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(require('./middleware/auditLogger'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/controlled-bids', require('./routes/controlledBids'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/bids', require('./routes/bids'));
app.use('/api/contractors', require('./routes/contractors'));
app.use('/api/materials', require('./routes/materials'));
app.use('/api/labor', require('./routes/labor'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/subcontractors', require('./routes/subcontractors'));
app.use('/api/change-orders', require('./routes/changeOrders'));
app.use('/api/risk-assessments', require('./routes/riskAssessments'));
app.use('/api/cost-estimates', require('./routes/costEstimates'));
app.use('/api/compliance', require('./routes/compliance'));
app.use('/api/bid-comparisons', require('./routes/bidComparisons'));
app.use('/api/timelines', require('./routes/timelines'));
app.use('/api/bid-bond-readiness', require('./routes/bidBondReadiness'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/approvals', require('./routes/approvals'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/audit-logs', require('./routes/auditLogs'));
app.use('/api/feature-expansion', require('./routes/featureExpansion'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/ai', require('./routes/aiNew'));






app.use('/api/ai', require('./routes/subPerformance'));
app.use('/api/ai', require('./routes/insuranceRecommend'));
app.use('/api/ai', require('./routes/varianceAlerts'));
app.use('/api/ai', require('./routes/agenticNegotiation'));
app.use('/api/ai', require('./routes/supplierIntel'));
app.use('/api/ai', require('./routes/siteVision'));
app.use('/api/export', require('./routes/export'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
