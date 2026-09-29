import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  extractInstagramUrlFromText,
  formatDuration,
  validateAndNormalizeInstagramUrl,
} from '@reelrush/shared';

describe('Instagram URL Validation & SSRF Hardening', () => {
  it('accepts and normalizes valid Instagram Reel URLs with query params', () => {
    const res = validateAndNormalizeInstagramUrl(
      'https://www.instagram.com/reel/C9xYz123_ab/?igsh=MzRlODBiNWFlZA=='
    );
    assert.equal(res.valid, true);
    if (res.valid) {
      assert.equal(
        res.data.normalizedUrl,
        'https://www.instagram.com/reel/C9xYz123_ab/'
      );
      assert.equal(res.data.shortcode, 'C9xYz123_ab');
      assert.equal(res.data.mediaType, 'Reel');
    }
  });

  it('accepts instagram.com without www and normalizes to www.instagram.com', () => {
    const res = validateAndNormalizeInstagramUrl(
      'https://instagram.com/p/C8abcDEF123/'
    );
    assert.equal(res.valid, true);
    if (res.valid) {
      assert.equal(
        res.data.normalizedUrl,
        'https://www.instagram.com/p/C8abcDEF123/'
      );
      assert.equal(res.data.mediaType, 'Video');
    }
  });

  it('accepts Instagram TV URLs', () => {
    const res = validateAndNormalizeInstagramUrl(
      'https://www.instagram.com/tv/C7tvXYZ987/'
    );
    assert.equal(res.valid, true);
    if (res.valid) {
      assert.equal(
        res.data.normalizedUrl,
        'https://www.instagram.com/tv/C7tvXYZ987/'
      );
      assert.equal(res.data.mediaType, 'TV');
    }
  });

  it('extracts Instagram URL from Android/iOS share-sheet text', () => {
    const sharedText =
      'Check out this Reel by @creator on Instagram: https://www.instagram.com/reel/C9AbCdEf123/?igsh=abc123def';
    const extracted = extractInstagramUrlFromText(sharedText);
    assert.equal(extracted, 'https://www.instagram.com/reel/C9AbCdEf123/');
  });

  it('rejects empty strings', () => {
    const res = validateAndNormalizeInstagramUrl('   ');
    assert.equal(res.valid, false);
    if (!res.valid) {
      assert.equal(res.errorCode, 'EMPTY_URL');
    }
  });

  it('rejects non-Instagram domains and SSRF targets', () => {
    const badUrls = [
      'https://youtube.com/watch?v=1234567',
      'http://127.0.0.1:4000/reel/abc12345',
      'http://localhost/reel/abc12345',
      'https://instagram.com.evil.com/reel/abc12345',
      'https://user:pass@www.instagram.com/reel/abc12345',
      'https://www.instagram.com:8080/reel/abc12345',
      'file:///etc/passwd',
      'https://www.instagram.com/explore/',
    ];

    for (const url of badUrls) {
      const res = validateAndNormalizeInstagramUrl(url);
      assert.equal(res.valid, false, `Expected ${url} to be rejected`);
      if (!res.valid) {
        assert.equal(res.errorCode, 'INVALID_URL');
      }
    }
  });

  it('formats duration accurately', () => {
    assert.equal(formatDuration(14), '0:14');
    assert.equal(formatDuration(85), '1:25');
    assert.equal(formatDuration(3661), '1:01:01');
  });
});

describe('Server API & ytDlpService Integration', () => {
  it('resolves yt-dlp availability via execFile without shell', async () => {
    const { ytDlpService } = await import('../services/ytDlpService');
    const resolved = await ytDlpService.checkAvailability();
    assert.ok(resolved.version.length > 0);
    assert.ok(resolved.executable.length > 0);
  });

  it('serves /api/health and rejects invalid/SSRF URLs on POST /api/download', async () => {
    const { app } = await import('../server');
    const server = app.listen(0);
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
      // 1. Health check
      const healthRes = await fetch(`${baseUrl}/api/health`);
      assert.equal(healthRes.status, 200);
      const healthJson = (await healthRes.json()) as {
        status: string;
        ytDlpAvailable: boolean;
      };
      assert.equal(healthJson.status, 'ok');
      assert.equal(healthJson.ytDlpAvailable, true);

      // 2. Reject non-Instagram URL
      const badRes = await fetch(`${baseUrl}/api/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com/reel/123456' }),
      });
      assert.equal(badRes.status, 400);
      const badJson = (await badRes.json()) as {
        success: boolean;
        error: { code: string; message: string };
      };
      assert.equal(badJson.success, false);
      assert.equal(badJson.error.code, 'INVALID_URL');
      assert.equal(
        badJson.error.message,
        "That doesn't look like an Instagram link."
      );

      // 3. Reject missing job on GET /api/download/:id
      const missingRes = await fetch(
        `${baseUrl}/api/download/00000000000000000000000000000000`
      );
      assert.equal(missingRes.status, 404);
    } finally {
      server.close();
    }
  });
});

