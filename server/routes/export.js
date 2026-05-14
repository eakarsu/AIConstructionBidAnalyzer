/**
 * PDF export endpoints using pdfkit
 * GET /api/export/bid-comparison/:project_id
 * GET /api/export/cost-estimate/:project_id
 */

const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// Graceful pdfkit loading
let PDFDocument = null;
try {
  PDFDocument = require('pdfkit');
} catch (e) {
  console.warn('[Export] pdfkit not installed — PDF export endpoints will return 503.');
}

const checkPdfKit = (res) => {
  if (!PDFDocument) {
    res.status(503).json({ error: 'PDF generation not available. Install pdfkit: npm install pdfkit' });
    return false;
  }
  return true;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function initDoc(res, filename) {
  const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);
  return doc;
}

function drawHeader(doc, title, subtitle) {
  doc.fontSize(22).font('Helvetica-Bold').fillColor('#1a1a2e').text(title, { align: 'center' });
  doc.fontSize(12).font('Helvetica').fillColor('#555555').text(subtitle, { align: 'center' });
  doc.moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(562, doc.y).strokeColor('#cccccc').lineWidth(1).stroke();
  doc.moveDown();
}

function drawSection(doc, heading) {
  doc.moveDown(0.5);
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#2c3e50').text(heading);
  doc.moveTo(50, doc.y).lineTo(562, doc.y).strokeColor('#aaaaaa').lineWidth(0.5).stroke();
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica').fillColor('#333333');
}

function kv(doc, label, value, indent = 0) {
  const x = 50 + indent;
  doc.font('Helvetica-Bold').fillColor('#444').text(`${label}: `, x, doc.y, { continued: true, width: 500 - indent });
  doc.font('Helvetica').fillColor('#222').text(String(value ?? 'N/A'));
}

function formatCurrency(val) {
  if (val == null) return 'N/A';
  return '$' + Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/export/bid-comparison/:project_id
// ─────────────────────────────────────────────────────────────────────────────
router.get('/bid-comparison/:project_id', auth, async (req, res) => {
  if (!checkPdfKit(res)) return;
  try {
    const { project_id } = req.params;

    // Fetch project
    const projectResult = await pool.query('SELECT * FROM projects WHERE id = $1', [project_id]);
    if (projectResult.rows.length === 0) return res.status(404).json({ error: 'Project not found.' });
    const project = projectResult.rows[0];

    // Fetch bids for this project
    const bidsResult = await pool.query(
      `SELECT b.*, c.company_name as contractor_company
       FROM bids b
       LEFT JOIN contractors c ON b.contractor_id = c.id
       WHERE b.project_id = $1
       ORDER BY b.bid_amount ASC`,
      [project_id]
    );
    const bids = bidsResult.rows;

    // Fetch latest bid comparison analysis if available
    const analysisResult = await pool.query(
      `SELECT result_json, created_at FROM ai_analyses
       WHERE project_id = $1 AND analysis_type = 'compare-bids'
       ORDER BY created_at DESC LIMIT 1`,
      [project_id]
    );

    const doc = initDoc(res, `bid-comparison-project-${project_id}.pdf`);

    drawHeader(doc, 'Bid Comparison Report', `Project: ${project.name}`);

    // Project Summary
    drawSection(doc, 'Project Summary');
    kv(doc, 'Project Name', project.name);
    kv(doc, 'Location', project.location);
    kv(doc, 'Budget', formatCurrency(project.budget));
    kv(doc, 'Status', project.status);
    kv(doc, 'Start Date', project.start_date || 'TBD');
    kv(doc, 'End Date', project.end_date || 'TBD');
    kv(doc, 'Project Type', project.project_type);
    kv(doc, 'Report Generated', new Date().toLocaleString());

    // Bids
    drawSection(doc, `Received Bids (${bids.length})`);

    if (bids.length === 0) {
      doc.text('No bids have been submitted for this project.');
    } else {
      const lowest = bids[0];
      const highest = bids[bids.length - 1];
      const avgAmount = bids.reduce((s, b) => s + Number(b.bid_amount || 0), 0) / bids.length;

      kv(doc, 'Lowest Bid', formatCurrency(lowest.bid_amount) + ` (${lowest.contractor_name || lowest.contractor_company || 'N/A'})`);
      kv(doc, 'Highest Bid', formatCurrency(highest.bid_amount) + ` (${highest.contractor_name || highest.contractor_company || 'N/A'})`);
      kv(doc, 'Average Bid', formatCurrency(avgAmount));
      doc.moveDown();

      bids.forEach((bid, idx) => {
        doc.font('Helvetica-Bold').fillColor('#2c3e50').text(`${idx + 1}. ${bid.contractor_name || bid.contractor_company || 'Unknown Contractor'}`);
        kv(doc, '   Bid Amount', formatCurrency(bid.bid_amount), 10);
        kv(doc, '   Status', bid.status, 10);
        kv(doc, '   Submission Date', bid.submission_date || 'N/A', 10);
        if (bid.scope) {
          doc.font('Helvetica-Bold').fillColor('#444').text('   Scope: ', { continued: true });
          doc.font('Helvetica').fillColor('#222').text(bid.scope, { width: 480 });
        }
        if (bid.notes) {
          doc.font('Helvetica-Bold').fillColor('#444').text('   Notes: ', { continued: true });
          doc.font('Helvetica').fillColor('#222').text(bid.notes, { width: 480 });
        }
        doc.moveDown(0.5);
      });
    }

    // AI Analysis if available
    if (analysisResult.rows.length > 0) {
      drawSection(doc, 'AI Bid Comparison Analysis');
      doc.fontSize(9).fillColor('#555').text(`Analysis generated: ${new Date(analysisResult.rows[0].created_at).toLocaleString()}`);
      doc.moveDown(0.3);
      const aiResult = analysisResult.rows[0].result_json;
      const analysisText = typeof aiResult === 'string' ? aiResult : (aiResult?.result || JSON.stringify(aiResult));
      doc.fontSize(10).fillColor('#222').text(analysisText, { width: 512 });
    }

    doc.end();
  } catch (err) {
    console.error('Export bid-comparison error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate bid comparison PDF.' });
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/export/cost-estimate/:project_id
// ─────────────────────────────────────────────────────────────────────────────
router.get('/cost-estimate/:project_id', auth, async (req, res) => {
  if (!checkPdfKit(res)) return;
  try {
    const { project_id } = req.params;

    const projectResult = await pool.query('SELECT * FROM projects WHERE id = $1', [project_id]);
    if (projectResult.rows.length === 0) return res.status(404).json({ error: 'Project not found.' });
    const project = projectResult.rows[0];

    // Fetch cost estimates
    const estimatesResult = await pool.query(
      'SELECT * FROM cost_estimates WHERE project_id = $1 ORDER BY category, line_item',
      [project_id]
    );
    const estimates = estimatesResult.rows;

    // Fetch AI cost estimate analysis
    const analysisResult = await pool.query(
      `SELECT result_json, created_at FROM ai_analyses
       WHERE project_id = $1 AND analysis_type IN ('estimate-cost', 'value-engineering')
       ORDER BY created_at DESC LIMIT 1`,
      [project_id]
    );

    const doc = initDoc(res, `cost-estimate-project-${project_id}.pdf`);

    drawHeader(doc, 'Cost Estimate Report', `Project: ${project.name}`);

    drawSection(doc, 'Project Information');
    kv(doc, 'Project Name', project.name);
    kv(doc, 'Location', project.location);
    kv(doc, 'Type', project.project_type);
    kv(doc, 'Budget', formatCurrency(project.budget));
    kv(doc, 'Status', project.status);
    kv(doc, 'Report Generated', new Date().toLocaleString());

    // Cost estimate line items grouped by category
    drawSection(doc, `Cost Estimate Line Items (${estimates.length} items)`);

    if (estimates.length === 0) {
      doc.text('No cost estimate line items found for this project.');
    } else {
      // Group by category
      const byCategory = {};
      let grandTotal = 0;
      estimates.forEach((e) => {
        const cat = e.category || 'Uncategorized';
        if (!byCategory[cat]) byCategory[cat] = { items: [], subtotal: 0 };
        byCategory[cat].items.push(e);
        byCategory[cat].subtotal += Number(e.total_cost || 0);
        grandTotal += Number(e.total_cost || 0);
      });

      Object.entries(byCategory).forEach(([category, { items, subtotal }]) => {
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#2c3e50').text(category);
        doc.fontSize(10);
        items.forEach((item) => {
          const qty = item.quantity ? `${item.quantity} ${item.unit || ''}` : 'N/A';
          const unitCost = formatCurrency(item.unit_cost);
          const total = formatCurrency(item.total_cost);
          doc.font('Helvetica').fillColor('#333').text(
            `  ${item.line_item || 'Item'}: Qty ${qty} @ ${unitCost} = ${total}`,
            { width: 510 }
          );
          if (item.notes) {
            doc.fillColor('#888').text(`    Notes: ${item.notes}`, { width: 500 });
          }
        });
        doc.font('Helvetica-Bold').fillColor('#1a1a2e').text(`  Category Subtotal: ${formatCurrency(subtotal)}`, { align: 'right' });
        doc.moveDown(0.5);
      });

      doc.moveTo(50, doc.y).lineTo(562, doc.y).strokeColor('#333').lineWidth(1).stroke();
      doc.moveDown(0.3);
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a1a2e').text(
        `GRAND TOTAL: ${formatCurrency(grandTotal)}`,
        { align: 'right' }
      );

      if (project.budget) {
        const variance = grandTotal - Number(project.budget);
        const varLabel = variance >= 0 ? `Over budget by ${formatCurrency(variance)}` : `Under budget by ${formatCurrency(Math.abs(variance))}`;
        doc.fontSize(10).font('Helvetica').fillColor(variance >= 0 ? '#c0392b' : '#27ae60').text(varLabel, { align: 'right' });
      }
    }

    // AI Analysis if available
    if (analysisResult.rows.length > 0) {
      drawSection(doc, 'AI Cost Analysis');
      doc.fontSize(9).fillColor('#555').text(`Analysis: ${analysisResult.rows[0].created_at ? new Date(analysisResult.rows[0].created_at).toLocaleString() : 'N/A'}`);
      doc.moveDown(0.3);
      const aiResult = analysisResult.rows[0].result_json;
      const analysisText = typeof aiResult === 'string' ? aiResult : (aiResult?.result || JSON.stringify(aiResult));
      doc.fontSize(10).fillColor('#222').text(analysisText, { width: 512 });
    }

    doc.end();
  } catch (err) {
    console.error('Export cost-estimate error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate cost estimate PDF.' });
    }
  }
});

module.exports = router;
