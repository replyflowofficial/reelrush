import { z } from 'zod';
import {
  ErrorCode,
  InstagramMediaType,
  USER_FRIENDLY_ERRORS,
} from './types';

/**
 * Strictly allowed Instagram hostnames to prevent SSRF or arbitrary domain execution.
 */
export const ALLOWED_INSTAGRAM_HOSTS = new Set([
  'instagram.com',
  'www.instagram.com',
]);

/**
 * Valid shortcode characters in Instagram URLs (Base64URL alphabet: A-Z, a-z, 0-9, _, -)
 */
const SHORTCODE_REGEX = /^[A-Za-z0-9_-]{5,45}$/;

export interface ParsedInstagramUrl {
  originalUrl: string;
  normalizedUrl: string;
  shortcode: string;
  mediaType: InstagramMediaType;
  pathType: 'reel' | 'p' | 'tv';
}

export type UrlValidationResult =
  | {
      valid: true;
      data: ParsedInstagramUrl;
    }
  | {
      valid: false;
      errorCode: ErrorCode;
      errorMessage: string;
    };

/**
 * Checks whether a hostname looks like a private/loopback IP or localhost.
 */
export function isPrivateOrLocalHost(hostname: string): boolean {
  const lower = hostname.toLowerCase().trim();
  if (
    lower === 'localhost' ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal') ||
    lower === '0.0.0.0' ||
    lower === '127.0.0.1' ||
    lower === '::1' ||
    lower === '[::1]'
  ) {
    return true;
  }

  // IPv4 literal check
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(lower)) {
    return true;
  }

  // IPv6 literal check
  if (lower.includes(':')) {
    return true;
  }

  return false;
}

/**
 * Extracts the first candidate Instagram URL from arbitrary text
 * (such as Android/iOS share-sheet text or clipboard text).
 */
export function extractInstagramUrlFromText(text: string): string | null {
  if (!text || typeof text !== 'string') {
    return null;
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  // Match explicit http/https Instagram URLs or bare instagram.com/... links
  const urlPattern =
    /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:(?:[A-Za-z0-9_.]+\/)?(?:reel|reels|p|tv)\/[A-Za-z0-9_-]+)\/?(?:\?[^\s"'<>]*)?/i;

  const match = trimmed.match(urlPattern);
  if (!match) {
    return null;
  }

  let candidate = match[0];
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  const validation = validateAndNormalizeInstagramUrl(candidate);
  return validation.valid ? validation.data.normalizedUrl : null;
}

/**
 * Strictly validates and normalizes a public Instagram Reel / Post / TV URL.
 */
export function validateAndNormalizeInstagramUrl(
  rawInput: string
): UrlValidationResult {
  if (!rawInput || typeof rawInput !== 'string' || !rawInput.trim()) {
    return {
      valid: false,
      errorCode: 'EMPTY_URL',
      errorMessage: USER_FRIENDLY_ERRORS.EMPTY_URL,
    };
  }

  let candidate = rawInput.trim();

  // If the user pasted shared text containing a URL + caption, try extracting URL if it contains spaces
  if (/\s/.test(candidate)) {
    const urlMatch = candidate.match(/https?:\/\/[^\s"'<>]+/i);
    if (urlMatch) {
      candidate = urlMatch[0];
    }
  }

  // Auto-prepend https:// if user pasted instagram.com/reel/... without protocol
  if (/^(?:www\.)?instagram\.com\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return {
      valid: false,
      errorCode: 'INVALID_URL',
      errorMessage: USER_FRIENDLY_ERRORS.INVALID_URL,
    };
  }

  // Only allow http: or https:
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return {
      valid: false,
      errorCode: 'INVALID_URL',
      errorMessage: USER_FRIENDLY_ERRORS.INVALID_URL,
    };
  }

  // Reject embedded credentials or custom ports (SSRF hardening)
  if (parsed.username || parsed.password || parsed.port) {
    return {
      valid: false,
      errorCode: 'INVALID_URL',
      errorMessage: USER_FRIENDLY_ERRORS.INVALID_URL,
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Reject private/localhost IPs and non-Instagram domains
  if (
    isPrivateOrLocalHost(hostname) ||
    !ALLOWED_INSTAGRAM_HOSTS.has(hostname)
  ) {
    return {
      valid: false,
      errorCode: 'INVALID_URL',
      errorMessage: USER_FRIENDLY_ERRORS.INVALID_URL,
    };
  }

  // Parse path segments:
  // Supported structures:
  // /reel/<shortcode>
  // /reels/<shortcode>
  // /p/<shortcode>
  // /tv/<shortcode>
  // /<username>/reel/<shortcode>
  // /<username>/p/<shortcode>
  // /share/reel/<shortcode>
  // /share/p/<shortcode>
  const segments = parsed.pathname
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);

  if (segments.length < 2) {
    return {
      valid: false,
      errorCode: 'INVALID_URL',
      errorMessage: USER_FRIENDLY_ERRORS.INVALID_URL,
    };
  }

  let rawType: string | undefined;
  let shortcode: string | undefined;

  const first = segments[0].toLowerCase();
  if (
    first === 'reel' ||
    first === 'reels' ||
    first === 'p' ||
    first === 'tv'
  ) {
    rawType = first;
    shortcode = segments[1];
  } else if (segments.length >= 3) {
    const second = segments[1].toLowerCase();
    if (
      second === 'reel' ||
      second === 'reels' ||
      second === 'p' ||
      second === 'tv'
    ) {
      rawType = second;
      shortcode = segments[2];
    }
  }

  if (!rawType || !shortcode || !SHORTCODE_REGEX.test(shortcode)) {
    return {
      valid: false,
      errorCode: 'INVALID_URL',
      errorMessage: USER_FRIENDLY_ERRORS.INVALID_URL,
    };
  }

  let pathType: 'reel' | 'p' | 'tv' = 'reel';
  let mediaType: InstagramMediaType = 'Reel';

  if (rawType === 'reel' || rawType === 'reels') {
    pathType = 'reel';
    mediaType = 'Reel';
  } else if (rawType === 'p') {
    pathType = 'p';
    mediaType = 'Video';
  } else if (rawType === 'tv') {
    pathType = 'tv';
    mediaType = 'TV';
  }

  // Canonical, query-stripped normalized URL
  const normalizedUrl = `https://www.instagram.com/${pathType}/${shortcode}/`;

  return {
    valid: true,
    data: {
      originalUrl: rawInput.trim(),
      normalizedUrl,
      shortcode,
      mediaType,
      pathType,
    },
  };
}

/**
 * Zod schema for POST /api/download request body
 */
export const downloadRequestSchema = z.object({
  url: z
    .string({
      required_error: USER_FRIENDLY_ERRORS.EMPTY_URL,
      invalid_type_error: USER_FRIENDLY_ERRORS.INVALID_URL,
    })
    .min(1, USER_FRIENDLY_ERRORS.EMPTY_URL)
    .max(2048, USER_FRIENDLY_ERRORS.INVALID_URL)
    .transform((val, ctx) => {
      const result = validateAndNormalizeInstagramUrl(val);
      if (!result.valid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: result.errorMessage,
          params: { errorCode: result.errorCode },
        });
        return z.NEVER;
      }
      return result.data;
    }),
});

export type ValidatedDownloadRequest = z.infer<typeof downloadRequestSchema>;

/**
 * Formats duration in seconds to M:SS or H:MM:SS
 */
export function formatDuration(seconds?: number): string | undefined {
  if (
    seconds === undefined ||
    seconds === null ||
    !Number.isFinite(seconds) ||
    seconds < 0
  ) {
    return undefined;
  }

  const totalSeconds = Math.round(seconds);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(
      2,
      '0'
    )}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}
