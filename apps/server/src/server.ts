import cors from 'cors';
import express, { Request, Response, NextFunction } from 'express';
import { USER_FRIENDLY_ERRORS } from '@reelrush/shared';
import downloadRoutes from './routes/downloadRoutes';
import { ytDlpService } from './services/ytDlpService';
import { AppError } from './utils/appError';
import { config } from './utils/config';
import {
  ensureTempBaseDir,
  sweepExpiredTempDirs,
} from './utils/fileCleanup';

export const app = express();

// Disable X-Powered-By header
app.disable('x-powered-by');

// Basic security headers
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept'],
  })
);

// Strict body size limit to prevent payload abuse
app.use(express.json({ limit: '16kb' }));

// Health check endpoint
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    const cmd = await ytDlpService.checkAvailability();
    res.status(200).json({
      status: 'ok',
      service: 'reelrush-server',
      ytDlpAvailable: true,
      ytDlpVersion: cmd.version,
      stats: ytDlpService.getStats(),
    });
  } catch {
    res.status(503).json({
      status: 'degraded',
      service: 'reelrush-server',
      ytDlpAvailable: false,
      stats: ytDlpService.getStats(),
    });
  }
});

// Mount API routes
app.use('/api', downloadRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'INVALID_URL',
      message: 'Endpoint not found.',
    },
  });
});

// Global error handler — never leaks stack traces or raw system errors
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  // Handle malformed JSON body
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_URL',
        message: USER_FRIENDLY_ERRORS.INVALID_URL,
      },
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: {
      code: 'YTDLP_FAILURE',
      message: USER_FRIENDLY_ERRORS.YTDLP_FAILURE,
    },
  });
});

async function bootstrap() {
  await ensureTempBaseDir();
  await sweepExpiredTempDirs();

  // Periodic background sweep of expired temporary directories every 60 seconds
  const sweepTimer = setInterval(() => {
    void sweepExpiredTempDirs();
  }, 60_000);

  if (sweepTimer.unref) {
    sweepTimer.unref();
  }

  app.listen(config.port, '0.0.0.0', async () => {
    let ytDlpStatus = 'checking...';
    try {
      const resolved = await ytDlpService.checkAvailability();
      ytDlpStatus = `ready (v${resolved.version} via ${resolved.executable})`;
    } catch {
      ytDlpStatus = 'not found (install yt-dlp or set YTDLP_PATH)';
    }

    console.log(
      `[ReelRush Server] Listening on http://0.0.0.0:${config.port} | yt-dlp: ${ytDlpStatus}`
    );
  });
}

if (require.main === module) {
  void bootstrap();
}
