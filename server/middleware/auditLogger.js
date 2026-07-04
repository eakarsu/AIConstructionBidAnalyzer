const pool = require('../db');

const entityFromPath = (path) => {
  const parts = path.split('/').filter(Boolean);
  return parts[1] || 'unknown';
};

const auditLogger = (req, res, next) => {
  const watchedMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (!watchedMethods.includes(req.method) || req.path.startsWith('/api/auth')) {
    return next();
  }

  res.on('finish', async () => {
    if (res.statusCode >= 400) return;

    try {
      await pool.query(
        `INSERT INTO audit_logs (user_id, user_email, action, entity_type, entity_id, metadata, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          req.user?.id || null,
          req.user?.email || null,
          req.method,
          entityFromPath(req.originalUrl),
          req.params?.id || req.body?.id || null,
          JSON.stringify({
            path: req.originalUrl,
            status: res.statusCode,
            body: req.method === 'DELETE' ? null : req.body,
          }),
          req.ip,
        ]
      );
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Audit log skipped:', err.message);
      }
    }
  });

  next();
};

module.exports = auditLogger;
