/**
 * Supplier directory, RFQ automation and equipment availability.
 *
 * Replaces three gaps with no implementation:
 *   - no_supplier_directory_vendor_management_portal
 *   - no_rfq_automation_or_vendor_outreach_workflow
 *   - no_equipment_rental_marketplace_or_availability_tracker
 *
 * Deterministic: an RFQ is a numbered request to named suppliers with a
 * closing date, and equipment availability is a date-overlap check against
 * recorded reservations. Nothing is inferred.
 */
const express = require('express');

function createSupplierRfqRouter(authMiddleware, pool) {
  const router = express.Router();

  const schema = `
    CREATE TABLE IF NOT EXISTS suppliers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      contact_email TEXT,
      trades TEXT[] NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS rfqs (
      id SERIAL PRIMARY KEY,
      rfq_number TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      scope TEXT,
      closes_at TIMESTAMP NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_by TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS rfq_invitations (
      id SERIAL PRIMARY KEY,
      rfq_id INTEGER NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
      supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'invited',
      quote_cents INTEGER,
      responded_at TIMESTAMP,
      UNIQUE (rfq_id, supplier_id)
    );
    CREATE TABLE IF NOT EXISTS equipment_reservations (
      id SERIAL PRIMARY KEY,
      equipment_id INTEGER NOT NULL,
      equipment_name TEXT NOT NULL,
      starts_on DATE NOT NULL,
      ends_on DATE NOT NULL,
      reserved_for TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      CHECK (ends_on >= starts_on)
    )`;

  let ready = false;
  async function ensure() { if (!ready) { await pool.query(schema); ready = true; } }

  /* ------------------------ supplier directory ---------------------- */

  router.get('/suppliers', authMiddleware, async (_req, res) => {
    try {
      await ensure();
      const rows = (await pool.query('SELECT * FROM suppliers ORDER BY name LIMIT 500')).rows;
      res.json({ suppliers: rows });
    } catch (e) { res.status(500).json({ error: e.message || 'Failed to list suppliers' }); }
  });

  router.post('/suppliers', authMiddleware, async (req, res) => {
    try {
      await ensure();
      const { name, contactEmail, trades } = req.body || {};
      if (!name || !String(name).trim()) return res.status(400).json({ error: 'name is required' });
      const r = await pool.query(
        `INSERT INTO suppliers (name, contact_email, trades) VALUES ($1,$2,$3) RETURNING *`,
        [String(name).trim(), contactEmail ?? null, Array.isArray(trades) ? trades.map(String) : []],
      );
      res.status(201).json({ supplier: r.rows[0] });
    } catch (e) { res.status(500).json({ error: e.message || 'Failed to create supplier' }); }
  });

  /* --------------------------- RFQ workflow ------------------------- */

  router.post('/rfqs', authMiddleware, async (req, res) => {
    try {
      await ensure();
      const { title, scope, closesAt, supplierIds } = req.body || {};
      if (!title || !String(title).trim()) return res.status(400).json({ error: 'title is required' });
      const close = new Date(closesAt);
      if (Number.isNaN(close.getTime())) return res.status(400).json({ error: 'closesAt must be a valid timestamp' });
      if (close.getTime() <= Date.now()) return res.status(400).json({ error: 'closesAt must be in the future' });
      if (!Array.isArray(supplierIds) || supplierIds.length === 0) {
        return res.status(400).json({ error: 'supplierIds must be a non-empty array' });
      }

      const seq = (await pool.query('SELECT COUNT(*)::int AS n FROM rfqs')).rows[0].n + 1;
      const rfqNumber = `RFQ-${String(seq).padStart(4, '0')}`;

      const rfq = (await pool.query(
        `INSERT INTO rfqs (rfq_number, title, scope, closes_at, created_by)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [rfqNumber, String(title).trim(), scope ?? null, close, req.user?.email ?? null],
      )).rows[0];

      const invited = [];
      const missing = [];
      for (const sid of supplierIds) {
        const s = (await pool.query('SELECT id, name FROM suppliers WHERE id = $1', [sid])).rows[0];
        if (!s) { missing.push(sid); continue; }
        await pool.query(
          `INSERT INTO rfq_invitations (rfq_id, supplier_id) VALUES ($1,$2)
           ON CONFLICT (rfq_id, supplier_id) DO NOTHING`,
          [rfq.id, s.id],
        );
        invited.push({ supplierId: s.id, supplierName: s.name });
      }

      res.status(201).json({
        rfq,
        invited,
        missingSupplierIds: missing,
        note: 'Invitations are recorded here; sending them to a supplier is the caller\'s delivery concern.',
      });
    } catch (e) { res.status(500).json({ error: e.message || 'Failed to create RFQ' }); }
  });

  /** Compare quotes on a closed RFQ. Ranking is by price only, stated plainly. */
  router.get('/rfqs/:id/responses', authMiddleware, async (req, res) => {
    try {
      await ensure();
      const rfq = (await pool.query('SELECT * FROM rfqs WHERE id = $1', [req.params.id])).rows[0];
      if (!rfq) return res.status(404).json({ error: 'RFQ not found' });

      const rows = (await pool.query(
        `SELECT i.*, s.name AS supplier_name FROM rfq_invitations i
           JOIN suppliers s ON s.id = i.supplier_id
          WHERE i.rfq_id = $1 ORDER BY i.quote_cents ASC NULLS LAST`,
        [req.params.id],
      )).rows;

      const quoted = rows.filter((r) => r.quote_cents != null);
      res.json({
        rfq,
        responses: rows,
        responded: quoted.length,
        invitedCount: rows.length,
        lowestQuoteCents: quoted.length ? Number(quoted[0].quote_cents) : null,
        assumptions: [
          'Quotes are ranked by recorded price only; no quality or risk weighting is applied.',
          'Suppliers that have not responded are listed without a quote rather than ranked last by default.',
          'Outreach delivery is not performed here; invitations are recorded only.',
        ],
      });
    } catch (e) { res.status(500).json({ error: e.message || 'Failed to read RFQ' }); }
  });

  /* ------------------- equipment availability ---------------------- */

  router.post('/equipment/availability', authMiddleware, async (req, res) => {
    try {
      await ensure();
      const { equipmentId, equipmentName, startsOn, endsOn, reservedFor } = req.body || {};
      if (!equipmentId || !equipmentName) {
        return res.status(400).json({ error: 'equipmentId and equipmentName are required' });
      }
      const from = new Date(`${startsOn}T00:00:00Z`);
      const to = new Date(`${endsOn}T00:00:00Z`);
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
        return res.status(400).json({ error: 'startsOn and endsOn must be YYYY-MM-DD' });
      }
      if (to < from) return res.status(400).json({ error: 'endsOn must not precede startsOn' });

      // Date-overlap check against recorded reservations.
      const conflicts = (await pool.query(
        `SELECT * FROM equipment_reservations
          WHERE equipment_id = $1 AND starts_on <= $3 AND ends_on >= $2`,
        [equipmentId, from.toISOString().slice(0, 10), to.toISOString().slice(0, 10)],
      )).rows;

      if (conflicts.length) {
        return res.status(409).json({
          available: false,
          conflicts,
          note: 'The requested window overlaps an existing reservation.',
        });
      }

      const r = await pool.query(
        `INSERT INTO equipment_reservations (equipment_id, equipment_name, starts_on, ends_on, reserved_for)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [equipmentId, String(equipmentName).trim(), from.toISOString().slice(0, 10), to.toISOString().slice(0, 10), reservedFor ?? null],
      );
      res.status(201).json({
        available: true,
        reservation: r.rows[0],
        assumptions: [
          'Availability is a date-range overlap check against recorded reservations only.',
          'No maintenance windows or transport time are modelled.',
        ],
      });
    } catch (e) { res.status(500).json({ error: e.message || 'Failed to check availability' }); }
  });

  return router;
}

module.exports = createSupplierRfqRouter;
