import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Resolves the backend API base URL.
 * Priority:
 * 1. EXPO_PUBLIC_BACKEND_URL env variable
 * 2. app.json extra.backendUrl
 * 3. Platform-intelligent local default:
 *    - Android Emulator: http://10.0.2.2:4000
 *    - iOS Simulator / Web: http://localhost:4000
 */
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

  if (Platform.OS === 'android') {
    // If running on a physical device via Expo Go / Dev Client, extract LAN host IP if available
    const debuggerHost =
      Constants.expoConfig?.hostUri ||
      Constants.manifest2?.extra?.expoGo?.debuggerHost;
    if (debuggerHost) {
      const hostIp = debuggerHost.split(':')[0];
      if (hostIp && hostIp !== 'localhost' && hostIp !== '127.0.0.1') {
        return `http://${hostIp}:4000`;
      }
    }
    return 'http://10.0.2.2:4000';
  }

  return 'http://localhost:4000';
}

export const APP_VERSION = '1.0.0';
