/**
 * Site photo review for progress and safety inspection.
 *
 * Replaces `no_photo_site_vision_ai_for_progress_or_safety_inspection`.
 *
 * The credential-free part is the **review workflow**: photos are logged with
 * capture time, site and author, a reviewer records findings against them, and
 * the record is immutable once signed off. Image *understanding* needs a
 * vision model key — that is reported as not configured rather than invented.
 *
 *   POST /api/site-photos                 log a captured photo
 *   GET  /api/site-photos                 list photos for a site
 *   POST /api/site-photos/:id/findings    record a human finding
 *   POST /api/site-photos/:id/analyze     request model analysis (gated)
 */
const express = require('express');
const crypto = require('crypto');

function createSitePhotoReviewRouter(authMiddleware, pool) {
  const router = express.Router();

  const schema = `
    CREATE TABLE IF NOT EXISTS site_photos (
      id SERIAL PRIMARY KEY,
      site_name TEXT NOT NULL,
      storage_ref TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      captured_at TIMESTAMP NOT NULL,
      kind TEXT NOT NULL DEFAULT 'progress',
      recorded_by TEXT,
      signed_off_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS site_photo_findings (
      id SERIAL PRIMARY KEY,
      photo_id INTEGER NOT NULL REFERENCES site_photos(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'observation',
      note TEXT NOT NULL,
      recorded_by TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`;

  let ready = false;
  async function ensure() { if (!ready) { await pool.query(schema); ready = true; } }

  const KINDS = ['progress', 'safety', 'quality', 'damage'];

  router.post('/site-photos', authMiddleware, async (req, res) => {
    try {
      await ensure();
      const { siteName, storageRef, contentHash, capturedAt, kind, content } = req.body || {};
      if (!siteName || !String(siteName).trim()) return res.status(400).json({ error: 'siteName is required' });
      if (!storageRef && !content) {
        return res.status(400).json({ error: 'storageRef (or content to hash) is required' });
      }
      const captured = new Date(capturedAt ?? Date.now());
      if (Number.isNaN(captured.getTime())) return res.status(400).json({ error: 'capturedAt must be a valid timestamp' });

      // Provenance: the hash binds the record to the exact bytes captured.
      const hash = contentHash ?? (content ? crypto.createHash('sha256').update(String(content)).digest('hex') : null);
      if (!hash) return res.status(400).json({ error: 'contentHash is required when only storageRef is supplied' });

      const r = await pool.query(
        `INSERT INTO site_photos (site_name, storage_ref, content_hash, captured_at, kind, recorded_by)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [String(siteName).trim(), storageRef ?? `inline:${hash.slice(0, 16)}`, hash, captured,
         KINDS.includes(kind) ? kind : 'progress', req.user?.email ?? null],
      );
      res.status(201).json({ photo: r.rows[0], kind: r.rows[0].kind });
    } catch (e) { res.status(500).json({ error: e.message || 'Failed to log photo' }); }
  });

  router.get('/site-photos', authMiddleware, async (req, res) => {
    try {
      await ensure();
      const { siteName, kind } = req.query;
      const where = [];
      const args = [];
      if (siteName) { args.push(siteName); where.push(`site_name = $${args.length}`); }
      if (kind) { args.push(kind); where.push(`kind = $${args.length}`); }
      const sql = 'SELECT * FROM site_photos' + (where.length ? ` WHERE ${where.join(' AND ')}` : '') +
        ' ORDER BY captured_at DESC LIMIT 200';
      res.json({ photos: (await pool.query(sql, args)).rows, kinds: KINDS });
    } catch (e) { res.status(500).json({ error: e.message || 'Failed to list photos' }); }
  });

  router.post('/site-photos/:id/findings', authMiddleware, async (req, res) => {
    try {
      await ensure();
      const photo = (await pool.query('SELECT * FROM site_photos WHERE id = $1', [req.params.id])).rows[0];
      if (!photo) return res.status(404).json({ error: 'Photo not found' });
      if (photo.signed_off_at) {
        return res.status(409).json({ error: 'This photo is signed off; findings can no longer be added.' });
      }
      const { category, severity, note } = req.body || {};
      if (!category || !String(category).trim()) return res.status(400).json({ error: 'category is required' });
      if (!note || !String(note).trim()) return res.status(400).json({ error: 'note is required' });

      const r = await pool.query(
        `INSERT INTO site_photo_findings (photo_id, category, severity, note, recorded_by)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [photo.id, String(category).trim(),
         ['observation', 'minor', 'major', 'stop_work'].includes(severity) ? severity : 'observation',
         String(note).trim(), req.user?.email ?? null],
      );
      res.status(201).json({ finding: r.rows[0] });
    } catch (e) { res.status(500).json({ error: e.message || 'Failed to record finding' }); }
  });

  router.post('/site-photos/:id/analyze', authMiddleware, async (_req, res) => {
    const key = process.env.VISION_API_KEY;
    if (!key) {
      return res.status(503).json({
        error:
          'No vision provider is configured (VISION_API_KEY). Record findings manually — ' +
          'this endpoint never returns an invented description of an image it has not read.',
        provider: { name: process.env.VISION_PROVIDER ?? 'none', connected: false },
      });
    }
    return res.status(501).json({
      error: `Vision provider "${process.env.VISION_PROVIDER}" is configured but its adapter is not implemented.`,
      provider: { name: process.env.VISION_PROVIDER, connected: true },
    });
  });

  return router;
}

module.exports = createSitePhotoReviewRouter;
