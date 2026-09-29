export type InstagramMediaType = 'Reel' | 'Video' | 'TV';

export type DownloadStepState =
  | 'preparing'
  | 'fetching'
  | 'processing'
  | 'downloading'
  | 'completed'
  | 'failed';

export type ErrorCode =
  | 'EMPTY_URL'
  | 'INVALID_URL'
  | 'PRIVATE_OR_UNAVAILABLE'
  | 'YTDLP_FAILURE'
  | 'NETWORK_ERROR'
  | 'RATE_LIMITED'
  | 'FILE_TOO_LARGE'
  | 'TIMEOUT'
  | 'SERVER_BUSY';

export interface VideoMetadata {
  shortcode: string;
  originalUrl: string;
  normalizedUrl: string;
  title: string;
  author?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  formattedDuration?: string;
  resolution?: string;
  width?: number;
  height?: number;
  filesizeBytes?: number;
  mediaType: InstagramMediaType;
}

export interface DownloadJobInfo {
  id: string;
  status: DownloadStepState;
  progress: number;
  url: string;
  normalizedUrl: string;
  metadata: VideoMetadata;
  downloadUrl: string;
  expiresAt: string;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface HistoryItem {
  id: string;
  url: string;
  normalizedUrl: string;
  shortcode: string;
  thumbnailUrl?: string;
  title: string;
  author?: string;
  createdAt: string;
  durationSeconds?: number;
  formattedDuration?: string;
  resolution?: string;
  mediaType: InstagramMediaType;
  status: 'completed' | 'failed';
  localUri?: string;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export interface AppSettings {
  theme: ThemeMode;
  askBeforeDownloading: boolean;
  wifiOnly: boolean;
}

export const USER_FRIENDLY_ERRORS: Record<ErrorCode, string> = {
  EMPTY_URL: 'Please enter or paste an Instagram link.',
  INVALID_URL: "That doesn't look like an Instagram link.",
  PRIVATE_OR_UNAVAILABLE: "This video isn't available for download.",
  YTDLP_FAILURE: "Couldn't fetch this video. Try again.",
  NETWORK_ERROR: 'Check your internet connection and try again.',
  RATE_LIMITED: 'Too many requests. Try again in a moment.',
  FILE_TOO_LARGE: 'This video exceeds the maximum allowed file size.',
  TIMEOUT: "Couldn't fetch this video in time. Try again.",
  SERVER_BUSY: 'Server is busy processing other videos. Try again shortly.',
};
