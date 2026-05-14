# Audit Note — AIConstructionBidAnalyzer

Source: `_AUDIT/reports/batch_02.md`

## Maturity: SUBSTANTIVE (17 routes, 8 AI endpoints, deps installed)

## Original audit recommendations

### Gaps — missing AI counterparts
- None significant. AI endpoints map well to core routes.

### Gaps — missing non-AI features
- No photo/document vision module.
- No supplier directory or vendor management portal.
- No RFQ automation.
- No integrated payment/billing workflow.
- No equipment rental marketplace.

### Custom Feature Suggestions
- Vision-based site inspection.
- Supplier intelligence.
- Agentic contract negotiation.
- Real-time cost tracking with variance alerts.
- Liability insurance recommendation engine.
- Subcontractor performance scoring.

## Categorization
- **MECHANICAL:** None — gaps require new database models (suppliers, RFQs, photos) plus product framing.
- **NEEDS-PRODUCT-DECISION:** all six suggestions.
- **NEEDS-CREDS:** integrations to insurance / payment / supplier APIs.

## Implementations applied
- None this round. The project is substantive (17 routes, 8 AI endpoints), and all
  outstanding audit items are non-mechanical (require new schema, vision pipelines,
  or product decisions).

## Backlog (prioritized)

### High priority
- **Photo upload + vision analysis** — new model `SitePhoto`, route `/api/site-photos`, AI route `/api/ai/analyze-site-photo`.
- **Supplier/vendor model** — new model `Supplier`, route `/api/suppliers`.
- **Subcontractor performance scoring** — leverage `subcontractors.js` + new metrics; AI route `/api/ai/score-subcontractor`.

### Medium priority
- **RFQ automation** — RFQ lifecycle routes; outbound notifications to suppliers via email/webhooks.
- **Real-time cost tracking** — variance alerts via SSE.

### Low priority
- Insurance recommendation engine.
- Agentic contract negotiation (multi-step).
- Equipment rental marketplace.

## Apply pass 3 (frontend)

LEFT-AS-IS. FE already covers all backend AI endpoints. `client/src/pages/AIAnalysisPage.js` wires the 8 endpoints in `server/routes/ai.js` (analyze-bid, estimate-cost, assess-risk, check-compliance, analyze-scope, estimate-timeline, compare-bids, optimize-materials). `client/src/pages/AILabPage.js` wires the 4 endpoints in `server/routes/aiNew.js` (subcontractor-analysis, value-engineering, cash-flow-projection, dispute-analyzer). Auth uses `Authorization: Bearer ${localStorage.getItem('token')}`; AI-not-configured errors render gracefully. No changes needed.
