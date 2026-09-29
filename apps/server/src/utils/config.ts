import dotenv from 'dotenv';
import os from 'os';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const config = {
  port: parsePositiveInt(process.env.PORT, 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  ytDlpPath: process.env.YTDLP_PATH?.trim() || undefined,
  maxConcurrentDownloads: parsePositiveInt(
    process.env.MAX_CONCURRENT_DOWNLOADS,
    3
  ),
  maxFileSizeMb: parsePositiveInt(process.env.MAX_FILE_SIZE_MB, 150),
  get maxFileSizeBytes(): number {
    return this.maxFileSizeMb * 1024 * 1024;
  },
  downloadTimeoutMs: parsePositiveInt(process.env.DOWNLOAD_TIMEOUT_MS, 60000),
  tempFileTtlMs: parsePositiveInt(process.env.TEMP_FILE_TTL_MS, 600000),
  rateLimitWindowMs: parsePositiveInt(process.env.RATE_LIMIT_WINDOW_MS, 60000),
  rateLimitMaxRequests: parsePositiveInt(
    process.env.RATE_LIMIT_MAX_REQUESTS,
    15
  ),
  tempBaseDir: path.join(os.tmpdir(), 'reelrush-temp'),
};
