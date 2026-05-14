/**
 * Rate limiter middleware — 20 AI calls per hour per user (in-memory store).
 * Falls back gracefully if user ID is unavailable.
 */

const aiCallStore = new Map(); // key: userId, value: { count, windowStart }

const AI_LIMIT = 20;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

function aiRateLimiter(req, res, next) {
  const userId = req.user ? String(req.user.id || req.user.userId || req.user.email) : req.ip;
  const now = Date.now();

  if (!aiCallStore.has(userId)) {
    aiCallStore.set(userId, { count: 1, windowStart: now });
    return next();
  }

  const record = aiCallStore.get(userId);

  if (now - record.windowStart > WINDOW_MS) {
    // Window expired — reset
    aiCallStore.set(userId, { count: 1, windowStart: now });
    return next();
  }

  if (record.count >= AI_LIMIT) {
    const resetAt = new Date(record.windowStart + WINDOW_MS).toISOString();
    return res.status(429).json({
      error: 'AI rate limit exceeded.',
      message: `You may make up to ${AI_LIMIT} AI requests per hour. Limit resets at ${resetAt}.`,
      retryAfter: Math.ceil((record.windowStart + WINDOW_MS - now) / 1000),
    });
  }

  record.count += 1;
  return next();
}

module.exports = { aiRateLimiter };
