import { Router } from 'express';
import {
  createDownloadHandler,
  getDownloadStatusHandler,
  streamDownloadFileHandler,
} from '../controllers/downloadController';
import { rateLimiterMiddleware } from '../utils/rateLimiter';

const router = Router();

// Create download job & extract metadata via yt-dlp
router.post('/download', rateLimiterMiddleware, createDownloadHandler);

// Check job status
router.get('/download/:id/status', getDownloadStatusHandler);

// Stream temporary video file & auto-cleanup
router.get('/download/:id', streamDownloadFileHandler);

export default router;
