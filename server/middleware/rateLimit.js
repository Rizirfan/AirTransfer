import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for HTTP API endpoints
 * Limits to 100 requests per 15 minutes per IP
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});

/**
 * In-memory socket connection rate limiter to prevent connection spam
 */
const socketConnectionCounts = new Map();

export function checkSocketRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxConnections = 30; // 30 events per minute

  if (!socketConnectionCounts.has(ip)) {
    socketConnectionCounts.set(ip, []);
  }

  const timestamps = socketConnectionCounts.get(ip);
  // Remove timestamps outside window
  const validTimestamps = timestamps.filter(ts => now - ts < windowMs);
  
  if (validTimestamps.length >= maxConnections) {
    return false; // Rate limit exceeded
  }

  validTimestamps.push(now);
  socketConnectionCounts.set(ip, validTimestamps);
  return true;
}

// Clean up socket rate limit map periodically
setInterval(() => {
  const now = Date.now();
  const windowMs = 60 * 1000;
  for (const [ip, timestamps] of socketConnectionCounts.entries()) {
    const valid = timestamps.filter(ts => now - ts < windowMs);
    if (valid.length === 0) {
      socketConnectionCounts.delete(ip);
    } else {
      socketConnectionCounts.set(ip, valid);
    }
  }
}, 5 * 60 * 1000);
