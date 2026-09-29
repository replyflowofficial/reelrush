import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Network from 'expo-network';
import { Platform } from 'react-native';
import { USER_FRIENDLY_ERRORS } from '@reelrush/shared';
import { ClientApiError, resolveDownloadStreamUrl } from './api';

export interface DeviceDownloadOptions {
  downloadUrl: string;
  shortcode: string;
  wifiOnly: boolean;
  onProgress?: (progressPercent: number) => void;
}

export interface DeviceDownloadResult {
  localUri: string;
  savedToGallery: boolean;
}

/**
 * Checks whether storage / gallery permission is currently granted.
 */
export async function checkMediaLibraryPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  try {
    const status = await MediaLibrary.getPermissionsAsync(true);
    if (status.granted) return true;
  } catch {
    // Fallback for devices that don't support writeOnly flag
  }
  try {
    const status = await MediaLibrary.getPermissionsAsync(false);
    return status.granted;
  } catch {
    return false;
  }
}

/**
 * Requests storage / gallery permission across Android 9–14+ and iOS.
 */
export async function ensureMediaLibraryPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return true;

  const alreadyGranted = await checkMediaLibraryPermission();
  if (alreadyGranted) return true;

  try {
    const writeOnlyPerm = await MediaLibrary.requestPermissionsAsync(true);
    if (writeOnlyPerm.granted) return true;
  } catch {
    // Fallback to standard permission request
  }

  try {
    const fullPerm = await MediaLibrary.requestPermissionsAsync(false);
    return fullPerm.granted;
  } catch {
    return false;
  }
}

/**
 * Downloads the processed MP4 stream from the backend to the user's device
 * and saves it to the native photo/video library (or triggers browser download on web).
 */
export async function downloadVideoToDevice({
  downloadUrl,
  shortcode,
  wifiOnly,
  onProgress,
}: DeviceDownloadOptions): Promise<DeviceDownloadResult> {
  // 1. Check Wi-Fi Only preference if enabled
  if (wifiOnly && Platform.OS !== 'web') {
    const netState = await Network.getNetworkStateAsync();
    if (!netState.isConnected) {
      throw new ClientApiError('NETWORK_ERROR');
    }
    if (netState.type !== Network.NetworkStateType.WIFI) {
      throw new ClientApiError(
        'NETWORK_ERROR',
        'Wi-Fi Only is enabled in Settings. Connect to Wi-Fi to download.'
      );
    }
  }

  const streamUrl = resolveDownloadStreamUrl(downloadUrl);
  const safeShortcode = shortcode.replace(/[^A-Za-z0-9_-]/g, '') || 'video';
  const filename = `reelrush-${safeShortcode}-${Date.now()}.mp4`;

  // Web fallback for browser testing
  if (Platform.OS === 'web') {
    onProgress?.(35);
    const response = await fetch(streamUrl);
    if (!response.ok) {
      throw new ClientApiError('YTDLP_FAILURE');
    }
    onProgress?.(75);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    onProgress?.(100);
    return {
      localUri: objectUrl,
      savedToGallery: true,
    };
  }

  // Native iOS & Android download + MediaLibrary save
  const granted = await ensureMediaLibraryPermission();
  if (!granted) {
    throw new ClientApiError(
      'YTDLP_FAILURE',
      'Storage permission is required to save videos to your gallery. Please allow access.'
    );
  }

  const baseDir =
    FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
  const targetLocalUri = `${baseDir}${filename}`;

  const downloadResumable = FileSystem.createDownloadResumable(
    streamUrl,
    targetLocalUri,
    {},
    (downloadProgress) => {
      const { totalBytesWritten, totalBytesExpectedToWrite } = downloadProgress;
      if (totalBytesExpectedToWrite > 0) {
        const pct = Math.min(
          100,
          Math.max(
            0,
            Math.round((totalBytesWritten / totalBytesExpectedToWrite) * 100)
          )
        );
        onProgress?.(pct);
      }
    }
  );

  const downloadResult = await downloadResumable.downloadAsync();
  if (!downloadResult || downloadResult.status !== 200) {
    throw new ClientApiError(
      'YTDLP_FAILURE',
      USER_FRIENDLY_ERRORS.YTDLP_FAILURE
    );
  }

  onProgress?.(98);

  // Save directly into the user's Camera Roll / Gallery
  await MediaLibrary.saveToLibraryAsync(downloadResult.uri);

  onProgress?.(100);

  return {
    localUri: downloadResult.uri,
    savedToGallery: true,
  };
}
