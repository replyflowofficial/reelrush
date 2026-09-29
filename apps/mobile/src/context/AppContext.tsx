import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { useColorScheme as useNWColorScheme } from 'nativewind';
import { AppSettings, HistoryItem, ThemeMode } from '@reelrush/shared';
import {
  clearAllHistory,
  DEFAULT_SETTINGS,
  loadHistory,
  loadSettings,
  removeHistoryItem,
  saveHistoryItem,
  saveSettings,
} from '../services/storage';

interface AppContextValue {
  settings: AppSettings;
  isDark: boolean;
  isHydrated: boolean;
  updateTheme: (theme: ThemeMode) => Promise<void>;
  updateSetting: <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => Promise<void>;
  history: HistoryItem[];
  recordHistoryItem: (item: HistoryItem) => Promise<void>;
  deleteHistoryEntry: (id: string) => Promise<void>;
  wipeHistory: () => Promise<void>;
  refreshHistory: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useRNColorScheme();
  const { setColorScheme } = useNWColorScheme();

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate persisted settings and download history on startup
  useEffect(() => {
    let mounted = true;
    async function hydrate() {
      const [loadedSettings, loadedHistory] = await Promise.all([
        loadSettings(),
        loadHistory(),
      ]);
      if (!mounted) return;
      setSettings(loadedSettings);
      setHistory(loadedHistory);
      setIsHydrated(true);
    }
    void hydrate();
    return () => {
      mounted = false;
    };
  }, []);

  const isDark = useMemo(() => {
    if (settings.theme === 'dark') return true;
    if (settings.theme === 'light') return false;
    return systemColorScheme === 'dark';
  }, [settings.theme, systemColorScheme]);

  // Sync resolved theme with NativeWind
  useEffect(() => {
    try {
      setColorScheme(isDark ? 'dark' : 'light');
    } catch {
      // Ignore if NativeWind color scheme setter is unavailable in current environment
    }
  }, [isDark, setColorScheme]);

  const updateSetting = useCallback(
    async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value };
        void saveSettings(next);
        return next;
      });
    },
    []
  );

  const updateTheme = useCallback(
    async (theme: ThemeMode) => {
      await updateSetting('theme', theme);
    },
    [updateSetting]
  );

  const recordHistoryItem = useCallback(async (item: HistoryItem) => {
    const next = await saveHistoryItem(item);
    setHistory(next);
  }, []);

  const deleteHistoryEntry = useCallback(async (id: string) => {
    const next = await removeHistoryItem(id);
    setHistory(next);
  }, []);

  const wipeHistory = useCallback(async () => {
    await clearAllHistory();
    setHistory([]);
  }, []);

  const refreshHistory = useCallback(async () => {
    const loaded = await loadHistory();
    setHistory(loaded);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      settings,
      isDark,
      isHydrated,
      updateTheme,
      updateSetting,
      history,
      recordHistoryItem,
      deleteHistoryEntry,
      wipeHistory,
      refreshHistory,
    }),
    [
      settings,
      isDark,
      isHydrated,
      updateTheme,
      updateSetting,
      history,
      recordHistoryItem,
      deleteHistoryEntry,
      wipeHistory,
      refreshHistory,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return ctx;
}
