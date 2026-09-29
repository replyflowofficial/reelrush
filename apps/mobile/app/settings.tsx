import React, { useCallback, useState } from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import {
  ArrowLeft,
  Check,
  Code2,
  Database,
  HardDrive,
  Info,
  Laptop,
  Moon,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Trash2,
  Wifi,
  Zap,
} from 'lucide-react-native';
import { ThemeMode } from '@reelrush/shared';
import { useApp } from '../src/context/AppContext';
import { clearLocalTempCache } from '../src/services/storage';
import { APP_VERSION, getBackendBaseUrl } from '../src/services/config';
import { ScalePressable } from '../src/components/ScalePressable';

const THEME_OPTIONS: Array<{
  mode: ThemeMode;
  label: string;
  icon: typeof Sun;
}> = [
  { mode: 'light', label: 'Light', icon: Sun },
  { mode: 'dark', label: 'Dark', icon: Moon },
  { mode: 'system', label: 'System', icon: Laptop },
];

export default function SettingsScreen() {
  const router = useRouter();
  const {
    settings,
    isDark,
    updateTheme,
    updateSetting,
    history,
    wipeHistory,
  } = useApp();

  const [statusToast, setStatusToast] = useState<string | null>(null);

  const showFeedback = useCallback((msg: string) => {
    setStatusToast(msg);
    setTimeout(() => {
      setStatusToast((prev) => (prev === msg ? null : prev));
    }, 2600);
  }, []);

  const handleClearHistory = useCallback(async () => {
    await wipeHistory();
    showFeedback('Download history cleared.');
  }, [showFeedback, wipeHistory]);

  const handleClearTempData = useCallback(async () => {
    const removed = await clearLocalTempCache();
    showFeedback(
      removed > 0
        ? `Cleared ${removed} temporary cached ${
            removed === 1 ? 'file' : 'files'
          }.`
        : 'Temporary cache is already clean.'
    );
  }, [showFeedback]);

  return (
    <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <View className="px-5 pt-3 pb-3 flex-row items-center justify-between border-b border-zinc-200/70 dark:border-zinc-900">
        <View className="flex-row items-center gap-3">
          <ScalePressable
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            className="w-10 h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 items-center justify-center"
          >
            <ArrowLeft
              size={18}
              color={isDark ? '#FAFAFA' : '#09090B'}
              strokeWidth={2.1}
            />
          </ScalePressable>

          <View>
            <Text className="text-lg font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              Settings
            </Text>
            <Text className="text-xs text-zinc-500 dark:text-zinc-400">
              Preferences & storage
            </Text>
          </View>
        </View>

        <View className="px-2.5 py-1 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex-row items-center gap-1">
          <ShieldCheck
            size={12}
            color={isDark ? '#F43F5E' : '#E11D48'}
            strokeWidth={2.2}
          />
          <Text className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">
            100% Ad-Free
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-5 pb-12"
        showsVerticalScrollIndicator={false}
      >
        {/* Feedback Banner */}
        {statusToast && (
          <Animated.View
            entering={FadeIn.duration(180)}
            className="mb-4 px-4 py-3 rounded-xl bg-zinc-900 dark:bg-zinc-100 flex-row items-center gap-2"
          >
            <Check
              size={15}
              color={isDark ? '#09090B' : '#FAFAFA'}
              strokeWidth={2.4}
            />
            <Text className="text-xs font-semibold text-zinc-50 dark:text-zinc-950">
              {statusToast}
            </Text>
          </Animated.View>
        )}

        {/* Section 1: Appearance */}
        <Animated.View
          entering={FadeInDown.duration(220)}
          className="mb-5"
        >
          <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2.5 px-1">
            Appearance
          </Text>

          <View className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2 flex-row items-center gap-2">
            {THEME_OPTIONS.map((option) => {
              const IconComponent = option.icon;
              const isSelected = settings.theme === option.mode;

              return (
                <ScalePressable
                  key={option.mode}
                  onPress={() => void updateTheme(option.mode)}
                  className={`flex-1 py-3 rounded-xl flex-row items-center justify-center gap-2 ${
                    isSelected
                      ? 'bg-zinc-950 dark:bg-zinc-100'
                      : 'bg-transparent'
                  }`}
                >
                  <IconComponent
                    size={15}
                    color={
                      isSelected
                        ? isDark
                          ? '#09090B'
                          : '#FAFAFA'
                        : isDark
                          ? '#A1A1AA'
                          : '#52525B'
                    }
                    strokeWidth={2.1}
                  />
                  <Text
                    className={`text-xs font-semibold ${
                      isSelected
                        ? 'text-zinc-50 dark:text-zinc-950'
                        : 'text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    {option.label}
                  </Text>
                </ScalePressable>
              );
            })}
          </View>
        </Animated.View>

        {/* Section 2: Downloads */}
        <Animated.View
          entering={FadeInDown.delay(40).duration(220)}
          className="mb-5"
        >
          <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2.5 px-1">
            Downloads
          </Text>

          <View className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {/* Ask before downloading */}
            <View className="p-4 flex-row items-center justify-between">
              <View className="flex-row items-center gap-3 flex-1 pr-4">
                <View className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 items-center justify-center">
                  <SlidersHorizontal
                    size={16}
                    color={isDark ? '#FAFAFA' : '#18181B'}
                    strokeWidth={2}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                    Ask before downloading
                  </Text>
                  <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                    Show video preview and details before saving to device
                  </Text>
                </View>
              </View>

              <Switch
                value={settings.askBeforeDownloading}
                onValueChange={(val) =>
                  void updateSetting('askBeforeDownloading', val)
                }
                trackColor={{
                  false: isDark ? '#27272A' : '#E4E4E7',
                  true: '#E11D48',
                }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Wi-Fi only toggle */}
            <View className="p-4 flex-row items-center justify-between">
              <View className="flex-row items-center gap-3 flex-1 pr-4">
                <View className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 items-center justify-center">
                  <Wifi
                    size={16}
                    color={isDark ? '#FAFAFA' : '#18181B'}
                    strokeWidth={2}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                    Wi-Fi only
                  </Text>
                  <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                    Prevent video downloads over cellular data
                  </Text>
                </View>
              </View>

              <Switch
                value={settings.wifiOnly}
                onValueChange={(val) => void updateSetting('wifiOnly', val)}
                trackColor={{
                  false: isDark ? '#27272A' : '#E4E4E7',
                  true: '#E11D48',
                }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </Animated.View>

        {/* Section 3: Storage */}
        <Animated.View
          entering={FadeInDown.delay(80).duration(220)}
          className="mb-5"
        >
          <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2.5 px-1">
            Storage
          </Text>

          <View className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800/80">
            <ScalePressable
              onPress={() => void handleClearHistory()}
              className="p-4 flex-row items-center justify-between"
            >
              <View className="flex-row items-center gap-3">
                <View className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 items-center justify-center">
                  <Database
                    size={16}
                    color={isDark ? '#FAFAFA' : '#18181B'}
                    strokeWidth={2}
                  />
                </View>
                <View>
                  <Text className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                    Clear history
                  </Text>
                  <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                    {history.length === 0
                      ? 'History is empty'
                      : `${history.length} saved ${
                          history.length === 1 ? 'entry' : 'entries'
                        }`}
                  </Text>
                </View>
              </View>

              <View className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 flex-row items-center gap-1">
                <Trash2 size={12} color={isDark ? '#F43F5E' : '#E11D48'} />
                <Text className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                  Clear
                </Text>
              </View>
            </ScalePressable>

            <ScalePressable
              onPress={() => void handleClearTempData()}
              className="p-4 flex-row items-center justify-between"
            >
              <View className="flex-row items-center gap-3">
                <View className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 items-center justify-center">
                  <HardDrive
                    size={16}
                    color={isDark ? '#FAFAFA' : '#18181B'}
                    strokeWidth={2}
                  />
                </View>
                <View>
                  <Text className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                    Clear temporary data
                  </Text>
                  <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                    Remove cached video files from app temp storage
                  </Text>
                </View>
              </View>

              <View className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <Text className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Clean
                </Text>
              </View>
            </ScalePressable>
          </View>
        </Animated.View>

        {/* Section 4: About */}
        <Animated.View
          entering={FadeInDown.delay(120).duration(220)}
          className="mb-6"
        >
          <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2.5 px-1">
            About
          </Text>

          <View className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800/80">
            <View className="p-4 flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 items-center justify-center">
                  <Info
                    size={16}
                    color={isDark ? '#FAFAFA' : '#18181B'}
                    strokeWidth={2}
                  />
                </View>
                <View>
                  <Text className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                    ReelRush
                  </Text>
                  <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                    API: {getBackendBaseUrl()}
                  </Text>
                </View>
              </View>
              <Text className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                v{APP_VERSION}
              </Text>
            </View>

            <View className="p-4 flex-row items-start gap-3">
              <View className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 items-center justify-center mt-0.5">
                <Code2
                  size={16}
                  color={isDark ? '#FAFAFA' : '#18181B'}
                  strokeWidth={2}
                />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-zinc-950 dark:text-zinc-50 mb-1">
                  yt-dlp Attribution & License
                </Text>
                <Text className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Powered by yt-dlp (Unlicense / Public Domain). ReelRush
                  processes publicly accessible links temporarily without
                  storing media in cloud storage. Only download content you have
                  permission to save.
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Brand Footer Section */}
        <Animated.View
          entering={FadeInDown.delay(160).duration(240)}
          className="items-center py-6"
        >
          <View className="w-11 h-11 rounded-2xl bg-zinc-950 dark:bg-zinc-100 items-center justify-center mb-2.5">
            <Zap
              size={20}
              color={isDark ? '#09090B' : '#FAFAFA'}
              strokeWidth={2.3}
            />
          </View>
          <Text className="text-base font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            ReelRush
          </Text>
          <Text className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">
            Fast. Clean. No Ads.
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
