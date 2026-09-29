import Constants from 'expo-constants';

/**
 * Resolves the backend API base URL.
 * Priority:
 * 1. EXPO_PUBLIC_BACKEND_URL env variable
 * 2. app.json extra.backendUrl
 * 3. Live Railway production URL (https://reelrush-production-39f5.up.railway.app)
 */
export const PRODUCTION_BACKEND_URL =
  'https://reelrush-production-39f5.up.railway.app';

export function getBackendBaseUrl(): string {
  const envUrl =
    process.env.EXPO_PUBLIC_BACKEND_URL || process.env.BACKEND_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  const extraUrl = Constants.expoConfig?.extra?.backendUrl as
    | string
    | undefined;
  if (extraUrl && extraUrl.trim()) {
    return extraUrl.trim().replace(/\/+$/, '');
  }

  return PRODUCTION_BACKEND_URL;
}

export const APP_VERSION = '1.0.0';
