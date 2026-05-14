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
// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-no-photo-site-vision-ai-for-progress-or-safety-inspection', require('./routes/gap_no_photo_site_vision_ai_for_progress_or_safety_inspection'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-contractors-subcontractors-lack-ai-scoring-or-performance-pr', require('./routes/gap_contractors_subcontractors_lack_ai_scoring_or_performance_pr'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-no-agentic-bid-negotiation-flow', require('./routes/gap_no_agentic_bid_negotiation_flow'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-no-supplier-directory-vendor-management-portal', require('./routes/gap_no_supplier_directory_vendor_management_portal'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-no-rfq-automation-or-vendor-outreach-workflow', require('./routes/gap_no_rfq_automation_or_vendor_outreach_workflow'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-no-equipment-rental-marketplace-or-availability-tracker', require('./routes/gap_no_equipment_rental_marketplace_or_availability_tracker'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-no-calendar-integration', require('./routes/gap_no_calendar_integration'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-limited-mobile-field-app-surfaces', require('./routes/gap_limited_mobile_field_app_surfaces'));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
