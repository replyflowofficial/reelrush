import fs from 'fs';
import fsp from 'fs/promises';
import { Request, Response, NextFunction } from 'express';
import {
  downloadRequestSchema,
  ErrorCode,
  USER_FRIENDLY_ERRORS,
} from '@reelrush/shared';
import { ytDlpService } from '../services/ytDlpService';
import { AppError } from '../utils/appError';

/**
 * POST /api/download
 * Validates the Instagram URL, invokes ytDlpService to fetch metadata & prepare temporary MP4,
 * and returns job metadata + temporary stream endpoint.
 */
export async function createDownloadHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = downloadRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const customCode: ErrorCode =
        firstIssue?.code === 'custom' &&
        (firstIssue.params as { errorCode?: ErrorCode } | undefined)?.errorCode
          ? (firstIssue.params as { errorCode: ErrorCode }).errorCode
          : firstIssue?.code === 'too_small'
            ? 'EMPTY_URL'
            : 'INVALID_URL';
      throw new AppError(
        customCode,
        400,
        firstIssue?.message || USER_FRIENDLY_ERRORS.INVALID_URL
      );
    }

    const jobInfo = await ytDlpService.processDownload(parsed.data.url);

    res.status(200).json({
      success: true,
      data: jobInfo,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/download/:id/status
 * Returns current job progress and metadata.
 */
export async function getDownloadStatusHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const jobId = String(req.params.id || '');
    const job = ytDlpService.getJob(jobId);

    if (!job) {
      throw new AppError('PRIVATE_OR_UNAVAILABLE', 404);
    }

    res.status(200).json({
      success: true,
      data: ytDlpService.toPublicJobInfo(job),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/download/:id
 * Streams the temporary MP4 video file to the client and cleans up the temporary file afterward.
 */
export async function streamDownloadFileHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const jobId = String(req.params.id || '');
    const job = ytDlpService.getJob(jobId);

    if (!job || !job.filePath) {
      throw new AppError('PRIVATE_OR_UNAVAILABLE', 404);
    }

    let stats: fs.Stats;
    try {
      stats = await fsp.stat(job.filePath);
    } catch {
      await ytDlpService.cleanupJob(jobId);
      throw new AppError('PRIVATE_OR_UNAVAILABLE', 404);
    }

    const safeShortcode = job.metadata.shortcode.replace(
      /[^A-Za-z0-9_-]/g,
      ''
    );
    const filename = `reelrush-${safeShortcode || job.id.slice(0, 8)}.mp4`;

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', stats.size.toString());
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Accept-Ranges', 'bytes');

    const readStream = fs.createReadStream(job.filePath);

    readStream.on('error', () => {
      if (!res.headersSent) {
        res.status(502).json({
          success: false,
          error: {
            code: 'YTDLP_FAILURE',
            message: USER_FRIENDLY_ERRORS.YTDLP_FAILURE,
          },
        });
      } else {
        res.destroy();
      }
      void ytDlpService.cleanupJob(jobId);
    });

    // Clean up the temporary file shortly after successful transfer completion
    res.on('finish', () => {
      const cleanupDelay = setTimeout(() => {
        void ytDlpService.cleanupJob(jobId);
      }, 5000);
      if (cleanupDelay.unref) {
        cleanupDelay.unref();
      }
    });

    req.on('close', () => {
      readStream.destroy();
    });

    readStream.pipe(res);
  } catch (err) {
    next(err);
  }
}
