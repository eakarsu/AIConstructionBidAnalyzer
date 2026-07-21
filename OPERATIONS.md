# Controlled bid analysis operations

The authoritative path is `/api/controlled-bids`: organization roles protect bid packages, revisioned document metadata preserves addenda, scope quantities normalize deterministically, omissions/variance are explicit, risks have owners, and estimator approval uses optimistic versioning and an immutable audit trail. Generated `/api/gap-*` routes and navigation are quarantined; AI recommendations cannot approve a confidential bid.

Configure `.env.example`, bootstrap dependencies once, run migrations explicitly, then use `start.sh`. Startup does not install, seed, create databases, start PostgreSQL, or terminate ports. The existing seed is available only through the production-refusing guarded script.

OCR/BIM, document storage, estimating/cost databases, subcontractor and procurement systems require provider adapters. Adapters must retain source document/revision/locator, use `cb_connector_runs` idempotency keys, sanitize failures, and never overwrite an issued revision. Historical estimate validation and estimator sign-off remain required before production use.
