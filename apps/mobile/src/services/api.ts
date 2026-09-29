import {
  ApiResponse,
  DownloadJobInfo,
  ErrorCode,
  USER_FRIENDLY_ERRORS,
} from '@reelrush/shared';
import { getBackendBaseUrl } from './config';

export class ClientApiError extends Error {
  public readonly code: ErrorCode;

  constructor(code: ErrorCode, message?: string) {
    super(message || USER_FRIENDLY_ERRORS[code]);
    this.name = 'ClientApiError';
    this.code = code;
    Object.setPrototypeOf(this, ClientApiError.prototype);
  }
}

/**
 * Sends the validated Instagram URL to POST /api/download to extract metadata
 * and prepare the temporary video file on the backend.
 */
export async function createDownloadJob(url: string): Promise<DownloadJobInfo> {
  const baseUrl = getBackendBaseUrl();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 65_000);

  try {
    const response = await fetch(`${baseUrl}/api/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ url }),
      signal: controller.signal,
    });

    let payload: ApiResponse<DownloadJobInfo> | null = null;
    try {
      payload = (await response.json()) as ApiResponse<DownloadJobInfo>;
    } catch {
      throw new ClientApiError('YTDLP_FAILURE');
    }

    if (!response.ok || !payload || !payload.success) {
      const errorCode: ErrorCode =
        payload && !payload.success && payload.error?.code
          ? payload.error.code
          : response.status === 429
            ? 'RATE_LIMITED'
            : response.status === 404
              ? 'PRIVATE_OR_UNAVAILABLE'
              : 'YTDLP_FAILURE';

      const errorMessage =
        payload && !payload.success && payload.error?.message
          ? payload.error.message
          : USER_FRIENDLY_ERRORS[errorCode];

      throw new ClientApiError(errorCode, errorMessage);
    }

    return payload.data;
  } catch (error) {
    if (error instanceof ClientApiError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ClientApiError('TIMEOUT');
    }

    throw new ClientApiError('NETWORK_ERROR');
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Resolves a relative download path (e.g. /api/download/:id) into an absolute URL.
 */
export function resolveDownloadStreamUrl(downloadUrl: string): string {
  if (/^https?:\/\//i.test(downloadUrl)) {
    return downloadUrl;
  }
  const baseUrl = getBackendBaseUrl();
  const cleanPath = downloadUrl.startsWith('/')
    ? downloadUrl
    : `/${downloadUrl}`;
  return `${baseUrl}${cleanPath}`;
}
