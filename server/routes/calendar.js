/**
 * Calendar integration for bid and project milestones.
 *
 * Replaces `no_calendar_integration`. The useful, credential-free part of a
 * calendar integration is the **iCalendar feed**: a standard RFC 5545 stream
 * any client (Google Calendar, Outlook, Apple Calendar) can subscribe to.
 * Pushing *into* a vendor calendar needs OAuth, so that is reported as not
 * configured rather than faked.
 *
 *   GET  /api/calendar/events.ics   RFC 5545 feed of upcoming milestones
 *   GET  /api/calendar/events       the same events as JSON
 *   POST /api/calendar/events       add a milestone
 */
const express = require('express');

function pad(n) { return String(n).padStart(2, '0'); }

/** RFC 5545 date: YYYYMMDD. */
function icsDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

/** Escape RFC 5545 text values. */
function icsText(v) {
  return String(v ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function createCalendarRouter(authMiddleware, pool) {
  const router = express.Router();

  const schema = `
    CREATE TABLE IF NOT EXISTS calendar_events (
      id SERIAL PRIMARY KEY,
      uid TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT,
      starts_at TIMESTAMP NOT NULL,
      ends_at TIMESTAMP,
      all_day BOOLEAN NOT NULL DEFAULT true,
      location TEXT,
      created_by TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`;

  let ready = false;
  async function ensure() { if (!ready) { await pool.query(schema); ready = true; } }

  router.post('/calendar/events', authMiddleware, async (req, res) => {
    try {
      await ensure();
      const { title, description, startsAt, endsAt, allDay, location } = req.body || {};
      if (!title || !String(title).trim()) return res.status(400).json({ error: 'title is required' });
      const start = new Date(startsAt);
      if (Number.isNaN(start.getTime())) return res.status(400).json({ error: 'startsAt must be a valid timestamp' });
      const end = endsAt ? new Date(endsAt) : null;
      if (end && Number.isNaN(end.getTime())) return res.status(400).json({ error: 'endsAt must be a valid timestamp' });
      if (end && end < start) return res.status(400).json({ error: 'endsAt must not precede startsAt' });

      const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}@bid-analyzer`;
      const r = await pool.query(
        `INSERT INTO calendar_events (uid, title, description, starts_at, ends_at, all_day, location, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [uid, String(title).trim(), description ?? null, start, end,
         allDay !== false, location ?? null, req.user?.email ?? null],
      );
      res.status(201).json({ event: r.rows[0] });
    } catch (e) { res.status(500).json({ error: e.message || 'Failed to create event' }); }
  });

  router.get('/calendar/events', authMiddleware, async (req, res) => {
    try {
      await ensure();
      const rows = (await pool.query(
        'SELECT * FROM calendar_events ORDER BY starts_at ASC LIMIT 500',
      )).rows;
      res.json({
        events: rows,
        vendorPush: {
          configured: false,
          reason: 'Pushing into Google/Outlook calendars requires OAuth credentials; the iCalendar feed is the supported export path.',
        },
      });
    } catch (e) { res.status(500).json({ error: e.message || 'Failed to list events' }); }
  });

  /** RFC 5545 feed — subscribe from any calendar client. */
  router.get('/calendar/events.ics', authMiddleware, async (_req, res) => {
    try {
      await ensure();
      const rows = (await pool.query('SELECT * FROM calendar_events ORDER BY starts_at ASC LIMIT 500')).rows;
      const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

      const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Bid Analyzer//Calendar//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
      ];
      for (const e of rows) {
        lines.push('BEGIN:VEVENT');
        lines.push(`UID:${icsText(e.uid)}`);
        lines.push(`DTSTAMP:${stamp}`);
        const s = icsDate(e.starts_at);
        const t = e.ends_at ? icsDate(e.ends_at) : s;
        lines.push(`DTSTART;VALUE=DATE:${s}`);
        lines.push(`DTEND;VALUE=DATE:${t ?? s}`);
        lines.push(`SUMMARY:${icsText(e.title)}`);
        if (e.description) lines.push(`DESCRIPTION:${icsText(e.description)}`);
        if (e.location) lines.push(`LOCATION:${icsText(e.location)}`);
        lines.push('END:VEVENT');
      }
      lines.push('END:VCALENDAR');

      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="bid-milestones.ics"');
      res.send(lines.join('\r\n'));
    } catch (e) { res.status(500).json({ error: e.message || 'Failed to build feed' }); }
  });

  return router;
}

module.exports = createCalendarRouter;
