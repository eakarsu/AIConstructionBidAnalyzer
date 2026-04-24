const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
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
app.use('/api/ai', require('./routes/ai'));

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
