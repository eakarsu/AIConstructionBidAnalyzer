# Feature Expansion Plan

Target product: Construction Bid + Safety + Compliance Platform

## 1. Plan/Spec Upload
- Upload drawings, spec books, addenda, RFIs, and bid instructions.
- Backend tables: `plan_uploads`, `spec_documents`, `document_extractions`.
- UI entry points: Documents, Projects.

## 2. Bid Risk Analysis
- Detect missing scope, ambiguous terms, schedule risk, compliance risk, and unusual cost exposure.
- Backend tables: `bid_risk_reviews`, `bid_risk_findings`.
- UI entry points: Bids, Risk Assessments, AI Analysis.

## 3. Cost Estimate Review
- Compare estimate line items to historical costs, material quotes, labor assumptions, and contingency.
- Backend tables: `estimate_reviews`, `estimate_variances`.
- UI entry points: Cost Estimates, Materials, Labor.

## 4. Permit Checklist
- Generate permit requirements by project type, jurisdiction, phase, and trade.
- Backend tables: `permit_checklists`, `permit_requirements`, `permit_status_events`.
- UI entry points: Compliance, Timelines.

## 5. Safety Plan Generator
- Create project-specific safety plans, hazard controls, toolbox talk items, and inspection tasks.
- Backend tables: `safety_plans`, `safety_hazards`, `safety_inspections`.
- UI entry points: Compliance, Reports.

## 6. Subcontractor Comparison
- Score subcontractors by bid, availability, insurance, performance, safety history, and scope fit.
- Backend tables: `subcontractor_scores`, `subcontractor_evaluations`.
- UI entry points: Subcontractors, Bid Comparisons.

## 7. Change Order Tracker
- Track change order reason, source document, cost impact, schedule impact, approval state, and owner.
- Backend tables: `change_order_impacts`, `change_order_approvals`.
- UI entry points: Change Orders, Timelines.

## 8. Project Risk Dashboard
- Show bid margin risk, permit blockers, safety exposure, subcontractor risk, and open change impacts.
- Backend views: `project_risk_metrics`, `bid_readiness_metrics`.
- UI entry points: Dashboard, Reports.
