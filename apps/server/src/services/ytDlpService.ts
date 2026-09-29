import { execFile, spawn } from 'child_process';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import {
  DownloadJobInfo,
  DownloadStepState,
  formatDuration,
  ParsedInstagramUrl,
  VideoMetadata,
} from '@reelrush/shared';
import { AppError } from '../utils/appError';
import { config } from '../utils/config';
import { ensureTempBaseDir, safeRemovePath } from '../utils/fileCleanup';

interface ResolvedCommand {
  executable: string;
  prefixArgs: string[];
  version: string;
}

export interface StoredDownloadJob {
  id: string;
  status: DownloadStepState;
  progress: number;
  url: string;
  normalizedUrl: string;
  metadata: VideoMetadata;
  jobDir: string;
  filePath: string;
  fileSize: number;
  createdAt: number;
  expiresAt: number;
  cleanupTimer?: NodeJS.Timeout;
}

interface RawYtDlpInfo {
  id?: string;
  title?: string;
  description?: string;
  uploader?: string;
  uploader_id?: string;
  channel?: string;
  thumbnail?: string;
  thumbnails?: Array<{ url?: string; width?: number; height?: number }>;
  duration?: number;
  width?: number;
  height?: number;
  resolution?: string;
  filesize?: number;
  filesize_approx?: number;
  ext?: string;
}

const JOB_ID_REGEX = /^[a-f0-9]{24,36}$/;

class YtDlpService {
  private resolvedCommand: ResolvedCommand | null = null;
  private activeDownloads = 0;
  private jobs = new Map<string, StoredDownloadJob>();

  /**
   * Checks whether yt-dlp is available on the host system.
   * Supports direct binary (`yt-dlp`), custom `YTDLP_PATH`, or `python -m yt_dlp`.
   * Always uses execFile with shell: false.
   */
  public async checkAvailability(): Promise<ResolvedCommand> {
    if (this.resolvedCommand) {
      return this.resolvedCommand;
    }

    const candidates: Array<{ executable: string; prefixArgs: string[] }> = [];

    if (config.ytDlpPath) {
      candidates.push({ executable: config.ytDlpPath, prefixArgs: [] });
    }

    candidates.push(
      { executable: 'yt-dlp', prefixArgs: [] },
      { executable: 'yt-dlp.exe', prefixArgs: [] },
      { executable: 'python', prefixArgs: ['-m', 'yt_dlp'] },
      { executable: 'python3', prefixArgs: ['-m', 'yt_dlp'] }
    );

    for (const candidate of candidates) {
      const version = await this.probeCommand(
        candidate.executable,
        candidate.prefixArgs
      );
      if (version) {
        this.resolvedCommand = {
          executable: candidate.executable,
          prefixArgs: candidate.prefixArgs,
          version,
        };
        return this.resolvedCommand;
      }
    }

    throw new AppError('YTDLP_FAILURE', 503);
  }

  private probeCommand(
    executable: string,
    prefixArgs: string[]
  ): Promise<string | null> {
    return new Promise((resolve) => {
      execFile(
        executable,
        [...prefixArgs, '--version'],
        {
          timeout: 8000,
          windowsHide: true,
          shell: false,
        },
        (err, stdout) => {
          if (err || !stdout) {
            resolve(null);
            return;
          }
          const ver = stdout.toString().trim().split(/\r?\n/)[0];
          resolve(ver || null);
        }
      );
    });
  }

  /**
   * Returns current concurrency & job metrics for health checks.
   */
  public getStats() {
    return {
      activeDownloads: this.activeDownloads,
      maxConcurrentDownloads: config.maxConcurrentDownloads,
      cachedJobs: this.jobs.size,
      ytDlpVersion: this.resolvedCommand?.version ?? null,
    };
  }

  /**
   * Executes yt-dlp safely using child_process.spawn with argument arrays (never shell string interpolation).
   * Downloads the video to an isolated temporary directory, extracts metadata, and schedules automatic cleanup.
   */
  public async processDownload(
    parsedUrl: ParsedInstagramUrl
  ): Promise<DownloadJobInfo> {
    if (this.activeDownloads >= config.maxConcurrentDownloads) {
      throw new AppError('SERVER_BUSY', 429);
    }

    const cmd = await this.checkAvailability();
    await ensureTempBaseDir();

    const jobId = crypto.randomBytes(16).toString('hex');
    const jobDir = path.join(config.tempBaseDir, jobId);
    await fs.mkdir(jobDir, { recursive: true });

    const initialMetadata: VideoMetadata = {
      shortcode: parsedUrl.shortcode,
      originalUrl: parsedUrl.originalUrl,
      normalizedUrl: parsedUrl.normalizedUrl,
      title: `Instagram ${parsedUrl.mediaType}`,
      mediaType: parsedUrl.mediaType,
    };

    const now = Date.now();
    const jobRecord: StoredDownloadJob = {
      id: jobId,
      status: 'preparing',
      progress: 5,
      url: parsedUrl.originalUrl,
      normalizedUrl: parsedUrl.normalizedUrl,
      metadata: initialMetadata,
      jobDir,
      filePath: '',
      fileSize: 0,
      createdAt: now,
      expiresAt: now + config.tempFileTtlMs,
    };

    this.jobs.set(jobId, jobRecord);
    this.activeDownloads += 1;

    try {
      const outputTemplate = path.join(jobDir, 'video.%(ext)s');

      // Argument array passed directly to spawn (shell: false)
      const ytDlpArgs: string[] = [
        ...cmd.prefixArgs,
        '--no-playlist',
        '--no-exec',
        '--no-warnings',
        '--newline',
        '--progress',
        '--write-info-json',
        '--max-filesize',
        `${config.maxFileSizeMb}M`,
        '--socket-timeout',
        '20',
        '--retries',
        '2',
        '--format',
        'best[ext=mp4]/bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[vcodec!=none]/best',
        '--merge-output-format',
        'mp4',
        '--output',
        outputTemplate,
        '--',
        parsedUrl.normalizedUrl,
      ];

      jobRecord.status = 'fetching';
      jobRecord.progress = 15;

      await this.runYtDlpProcess(cmd.executable, ytDlpArgs, jobRecord);

      jobRecord.status = 'processing';
      jobRecord.progress = 90;

      // Locate downloaded media file and .info.json inside jobDir
      const files = await fs.readdir(jobDir);
      const infoJsonFile = files.find((f) => f.endsWith('.info.json'));
      const mediaFile = files.find(
        (f) =>
          !f.endsWith('.info.json') &&
          !f.endsWith('.part') &&
          !f.endsWith('.ytdl') &&
          (f.endsWith('.mp4') ||
            f.endsWith('.mov') ||
            f.endsWith('.webm') ||
            f.endsWith('.mkv'))
      );

      if (!mediaFile) {
        throw new AppError('PRIVATE_OR_UNAVAILABLE', 404);
      }

      const fullMediaPath = path.join(jobDir, mediaFile);
      const fileStats = await fs.stat(fullMediaPath);

      if (fileStats.size === 0) {
        throw new AppError('YTDLP_FAILURE', 502);
      }

      if (fileStats.size > config.maxFileSizeBytes) {
        throw new AppError('FILE_TOO_LARGE', 413);
      }

      let rawInfo: RawYtDlpInfo = {};
      if (infoJsonFile) {
        try {
          const infoContent = await fs.readFile(
            path.join(jobDir, infoJsonFile),
            'utf-8'
          );
          rawInfo = JSON.parse(infoContent) as RawYtDlpInfo;
        } catch {
          // Non-fatal if info.json cannot be parsed
        }
      }

      const extractedMetadata = this.extractMetadata(
        parsedUrl,
        rawInfo,
        fileStats.size
      );

      jobRecord.filePath = fullMediaPath;
      jobRecord.fileSize = fileStats.size;
      jobRecord.metadata = extractedMetadata;
      jobRecord.status = 'completed';
      jobRecord.progress = 100;
      jobRecord.expiresAt = Date.now() + config.tempFileTtlMs;

      // Schedule automatic TTL cleanup
      this.scheduleJobCleanup(jobId, config.tempFileTtlMs);

      return this.toPublicJobInfo(jobRecord);
    } catch (error) {
      await this.cleanupJob(jobId);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('YTDLP_FAILURE', 502);
    } finally {
      this.activeDownloads = Math.max(0, this.activeDownloads - 1);
    }
  }

  /**
   * Spawns yt-dlp process with strict timeout, output parsing, and zero shell execution.
   */
  private runYtDlpProcess(
    executable: string,
    args: string[],
    jobRecord: StoredDownloadJob
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let settled = false;
      let combinedStderr = '';
      let combinedStdout = '';

      const child = spawn(executable, args, {
        shell: false,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      const timeoutHandle = setTimeout(() => {
        if (!settled) {
          settled = true;
          try {
            child.kill('SIGKILL');
          } catch {
            // Ignore kill error
          }
          reject(new AppError('TIMEOUT', 504));
        }
      }, config.downloadTimeoutMs);

      child.stdout.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        combinedStdout += text.slice(-4096);

        // Parse download percentage from yt-dlp progress output: e.g. "[download]  42.5% of 4.12MiB"
        const progressMatches = text.match(/\[download\]\s+(\d+(?:\.\d+)?)%/g);
        if (progressMatches && progressMatches.length > 0) {
          const lastMatch = progressMatches[progressMatches.length - 1];
          const numMatch = lastMatch.match(/(\d+(?:\.\d+)?)%/);
          if (numMatch) {
            const pct = Number.parseFloat(numMatch[1]);
            if (Number.isFinite(pct)) {
              jobRecord.status = 'downloading';
              jobRecord.progress = Math.min(
                88,
                Math.max(20, Math.round(20 + pct * 0.68))
              );
            }
          }
        }

        if (text.includes('File is larger than max-filesize')) {
          if (!settled) {
            settled = true;
            clearTimeout(timeoutHandle);
            try {
              child.kill('SIGKILL');
            } catch {
              // Ignore
            }
            reject(new AppError('FILE_TOO_LARGE', 413));
          }
        }
      });

      child.stderr.on('data', (chunk: Buffer) => {
        combinedStderr += chunk.toString().slice(-4096);
      });

      child.on('error', () => {
        if (!settled) {
          settled = true;
          clearTimeout(timeoutHandle);
          reject(new AppError('YTDLP_FAILURE', 502));
        }
      });

      child.on('close', (code) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutHandle);

        if (code === 0) {
          resolve();
          return;
        }

        const diagnostic = `${combinedStderr}\n${combinedStdout}`.toLowerCase();

        if (diagnostic.includes('larger than max-filesize')) {
          reject(new AppError('FILE_TOO_LARGE', 413));
          return;
        }

        if (
          diagnostic.includes('private') ||
          diagnostic.includes('login required') ||
          diagnostic.includes('not available') ||
          diagnostic.includes('unavailable') ||
          diagnostic.includes('no video formats found') ||
          diagnostic.includes('there is no video in this post') ||
          diagnostic.includes('404') ||
          diagnostic.includes('restricted')
        ) {
          reject(new AppError('PRIVATE_OR_UNAVAILABLE', 404));
          return;
        }

        reject(new AppError('YTDLP_FAILURE', 502));
      });
    });
  }

  private extractMetadata(
    parsedUrl: ParsedInstagramUrl,
    info: RawYtDlpInfo,
    fileSizeBytes: number
  ): VideoMetadata {
    const rawAuthor =
      info.uploader || info.channel || info.uploader_id || undefined;
    const author = rawAuthor
      ? rawAuthor.startsWith('@')
        ? rawAuthor
        : `@${rawAuthor}`
      : undefined;

    let cleanTitle = (info.title || info.description || '').trim();
    // Collapse multi-line captions into a clean single-line title
    cleanTitle = cleanTitle.replace(/\s+/g, ' ').trim();
    if (!cleanTitle || cleanTitle.toLowerCase().startsWith('video by')) {
      cleanTitle = author
        ? `${parsedUrl.mediaType} by ${author}`
        : `Instagram ${parsedUrl.mediaType}`;
    }
    if (cleanTitle.length > 90) {
      cleanTitle = `${cleanTitle.slice(0, 87)}...`;
    }

    let thumbnailUrl = info.thumbnail;
    if (
      !thumbnailUrl &&
      Array.isArray(info.thumbnails) &&
      info.thumbnails.length > 0
    ) {
      const bestThumb = info.thumbnails[info.thumbnails.length - 1];
      thumbnailUrl = bestThumb?.url;
    }

    const durationSeconds =
      typeof info.duration === 'number' && Number.isFinite(info.duration)
        ? Math.round(info.duration)
        : undefined;

    const width =
      typeof info.width === 'number' && info.width > 0 ? info.width : undefined;
    const height =
      typeof info.height === 'number' && info.height > 0
        ? info.height
        : undefined;

    let resolution = info.resolution;
    if (!resolution && width && height) {
      resolution = `${width}x${height}`;
    }
    if (resolution === 'audio only') {
      resolution = undefined;
    }

    return {
      shortcode: parsedUrl.shortcode,
      originalUrl: parsedUrl.originalUrl,
      normalizedUrl: parsedUrl.normalizedUrl,
      title: cleanTitle,
      author,
      thumbnailUrl,
      durationSeconds,
      formattedDuration: formatDuration(durationSeconds),
      resolution,
      width,
      height,
      filesizeBytes: fileSizeBytes,
      mediaType: parsedUrl.mediaType,
    };
  }

  public getJob(jobId: string): StoredDownloadJob | null {
    if (!jobId || !JOB_ID_REGEX.test(jobId)) {
      return null;
    }
    const job = this.jobs.get(jobId);
    if (!job) {
      return null;
    }
    if (Date.now() > job.expiresAt) {
      void this.cleanupJob(jobId);
      return null;
    }
    return job;
  }

  public toPublicJobInfo(job: StoredDownloadJob): DownloadJobInfo {
    return {
      id: job.id,
      status: job.status,
      progress: job.progress,
      url: job.url,
      normalizedUrl: job.normalizedUrl,
      metadata: job.metadata,
      downloadUrl: `/api/download/${job.id}`,
      expiresAt: new Date(job.expiresAt).toISOString(),
    };
  }

  private scheduleJobCleanup(jobId: string, delayMs: number): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    if (job.cleanupTimer) {
      clearTimeout(job.cleanupTimer);
    }

    const timer = setTimeout(() => {
      void this.cleanupJob(jobId);
    }, delayMs);

    if (timer.unref) {
      timer.unref();
    }

    job.cleanupTimer = timer;
  }

  /**
   * Immediately deletes temporary files for a job and removes it from memory.
   */
  public async cleanupJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    if (job.cleanupTimer) {
      clearTimeout(job.cleanupTimer);
    }

    this.jobs.delete(jobId);
    await safeRemovePath(job.jobDir);
  }
}

export const ytDlpService = new YtDlpService();
