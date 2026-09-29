import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { AppSettings, HistoryItem } from '@reelrush/shared';

const HISTORY_STORAGE_KEY = '@reelrush:history:v1';
const SETTINGS_STORAGE_KEY = '@reelrush:settings:v2';
const MAX_HISTORY_ITEMS = 100;

export const DEFAULT_SETTINGS: AppSettings = {
  // Clean light theme as default per design specification
  theme: 'light',
  askBeforeDownloading: false,
  wifiOnly: false,
};

export async function loadHistory(): Promise<HistoryItem[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveHistoryItem(item: HistoryItem): Promise<HistoryItem[]> {
  try {
    const current = await loadHistory();
    // Deduplicate by shortcode or normalizedUrl so re-downloading updates the top entry
    const filtered = current.filter(
      (existing) =>
        existing.id !== item.id &&
        existing.normalizedUrl !== item.normalizedUrl
    );
    const updated = [item, ...filtered].slice(0, MAX_HISTORY_ITEMS);
    await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export async function removeHistoryItem(id: string): Promise<HistoryItem[]> {
  try {
    const current = await loadHistory();
    const updated = current.filter((item) => item.id !== id);
    await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export async function clearAllHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(HISTORY_STORAGE_KEY);
  } catch {
    // Ignore storage removal error
  }
}

export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      theme:
        parsed.theme === 'light' ||
        parsed.theme === 'dark' ||
        parsed.theme === 'system'
          ? parsed.theme
          : DEFAULT_SETTINGS.theme,
      askBeforeDownloading:
        typeof parsed.askBeforeDownloading === 'boolean'
          ? parsed.askBeforeDownloading
          : DEFAULT_SETTINGS.askBeforeDownloading,
      wifiOnly:
        typeof parsed.wifiOnly === 'boolean'
          ? parsed.wifiOnly
          : DEFAULT_SETTINGS.wifiOnly,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(
  nextSettings: AppSettings
): Promise<AppSettings> {
  try {
    await AsyncStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify(nextSettings)
    );
  } catch {
    // Ignore write error
  }
  return nextSettings;
}

/**
 * Clears temporary downloaded video caches from the local device cache directory.
 */
export async function clearLocalTempCache(): Promise<number> {
  if (Platform.OS === 'web' || !FileSystem.cacheDirectory) {
    return 0;
  }

  let removedCount = 0;
  try {
    const files = await FileSystem.readDirectoryAsync(
      FileSystem.cacheDirectory
    );
    const targetFiles = files.filter(
      (f) => f.startsWith('reelrush-') && f.endsWith('.mp4')
    );

    await Promise.all(
      targetFiles.map(async (filename) => {
        try {
          await FileSystem.deleteAsync(
            `${FileSystem.cacheDirectory}${filename}`,
            { idempotent: true }
          );
          removedCount += 1;
        } catch {
          // Ignore individual file error
        }
      })
    );
  } catch {
    // Ignore cache directory read error
  }

  return removedCount;
}
