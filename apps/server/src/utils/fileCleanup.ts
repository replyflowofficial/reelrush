import fs from 'fs/promises';
import path from 'path';
import { config } from './config';

/**
 * Ensures the root temporary directory exists.
 */
export async function ensureTempBaseDir(): Promise<void> {
  await fs.mkdir(config.tempBaseDir, { recursive: true });
}

/**
 * Safely deletes a directory or file without throwing if it no longer exists.
 */
export async function safeRemovePath(targetPath: string): Promise<void> {
  if (!targetPath) return;

  // Ensure we only ever delete inside tempBaseDir
  const resolvedBase = path.resolve(config.tempBaseDir);
  const resolvedTarget = path.resolve(targetPath);

  if (
    !resolvedTarget.startsWith(resolvedBase) ||
    resolvedTarget === resolvedBase
  ) {
    return;
  }

  try {
    await fs.rm(resolvedTarget, { recursive: true, force: true });
  } catch {
    // Ignore errors if file was already removed or locked briefly
  }
}

/**
 * Periodically sweeps orphaned directories inside tempBaseDir older than tempFileTtlMs.
 */
export async function sweepExpiredTempDirs(): Promise<void> {
  try {
    await ensureTempBaseDir();
    const entries = await fs.readdir(config.tempBaseDir, {
      withFileTypes: true,
    });
    const now = Date.now();

    await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(config.tempBaseDir, entry.name);
        try {
          const stats = await fs.stat(fullPath);
          if (now - stats.mtimeMs > config.tempFileTtlMs) {
            await safeRemovePath(fullPath);
          }
        } catch {
          // Entry already removed
        }
      })
    );
  } catch {
    // Ignore sweep errors
  }
}
