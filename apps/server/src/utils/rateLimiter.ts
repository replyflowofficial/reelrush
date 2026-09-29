import { Request, Response, NextFunction } from 'express';
import { USER_FRIENDLY_ERRORS } from '@reelrush/shared';
import { config } from './config';

interface RateRecord {
  timestamps: number[];
}

const clientBuckets = new Map<string, RateRecord>();

// Clean up stale rate-limit entries every 2 minutes
const cleanupTimer = setInterval(() => {
  const cutoff = Date.now() - config.rateLimitWindowMs;
  for (const [ip, record] of clientBuckets.entries()) {
    record.timestamps = record.timestamps.filter((t) => t > cutoff);
    if (record.timestamps.length === 0) {
      clientBuckets.delete(ip);
    }
  }
}, 120_000);

if (cleanupTimer.unref) {
  cleanupTimer.unref();
}

export function rateLimiterMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const forwarded = req.headers['x-forwarded-for'];
  const clientIp =
    (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : null) ||
    req.ip ||
    req.socket.remoteAddress ||
    'unknown';

  const now = Date.now();
  const windowStart = now - config.rateLimitWindowMs;

  const existing = clientBuckets.get(clientIp) || { timestamps: [] };
  existing.timestamps = existing.timestamps.filter((t) => t > windowStart);

  if (existing.timestamps.length >= config.rateLimitMaxRequests) {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: USER_FRIENDLY_ERRORS.RATE_LIMITED,
      },
    });
    return;
  }

  existing.timestamps.push(now);
  clientBuckets.set(clientIp, existing);
  next();
}
