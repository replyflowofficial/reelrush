import React, { useCallback, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import {
  ArrowDownToLine,
  ChevronRight,
  ClipboardPaste,
  History,
  Link2,
  Settings,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from 'lucide-react-native';
import {
  extractInstagramUrlFromText,
  validateAndNormalizeInstagramUrl,
} from '@reelrush/shared';
import { useApp } from '../src/context/AppContext';
import { useClipboardDetection } from '../src/hooks/useClipboardDetection';
import { ScalePressable } from '../src/components/ScalePressable';
import { ClipboardSheetCard } from '../src/components/ClipboardSheetCard';
import { ShareHowItWorksCard } from '../src/components/ShareHowItWorksCard';

export default function HomeScreen() {
  const router = useRouter();
  const { isDark, history } = useApp();

  const [inputUrl, setInputUrl] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const {
    detectedUrl,
    dismissDetectedUrl,
    consumeDetectedUrl,
    checkClipboardOnce,
  } = useClipboardDetection(inputUrl);

  // Check clipboard when user opens/focuses Home screen
  useFocusEffect(
    useCallback(() => {
      void checkClipboardOnce();
    }, [checkClipboardOnce])
  );

  const handlePasteFromClipboard = useCallback(async () => {
    setValidationError(null);
    try {
      const text = await Clipboard.getStringAsync();
      if (!text || !text.trim()) {
        setValidationError('Clipboard is empty.');
        return;
      }
      const extracted = extractInstagramUrlFromText(text);
      if (extracted) {
        setInputUrl(extracted);
        dismissDetectedUrl();
      } else {
        setInputUrl(text.trim());
      }
    } catch {
      setValidationError('Could not read clipboard.');
    }
  }, [dismissDetectedUrl]);

  const handleStartDownload = useCallback(
    (rawUrlToProcess?: string) => {
      Keyboard.dismiss();
      const target =
        typeof rawUrlToProcess === 'string' ? rawUrlToProcess : inputUrl;

      const validation = validateAndNormalizeInstagramUrl(target);
      if (!validation.valid) {
        setValidationError(validation.errorMessage);
        return;
      }

      setValidationError(null);
      router.push({
        pathname: '/download',
        params: {
          url: validation.data.normalizedUrl,
          source: 'manual',
        },
      });
    },
    [inputUrl, router]
  );

  const handleDownloadDetectedClipboard = useCallback(
    (url: string) => {
      const consumed = consumeDetectedUrl() || url;
      setInputUrl(consumed);
      setValidationError(null);
      router.push({
        pathname: '/download',
        params: {
          url: consumed,
          source: 'clipboard',
        },
      });
    },
    [consumeDetectedUrl, router]
  );

  return (
    <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        {/* Top Header */}
        <View className="px-5 pt-3 pb-3 flex-row items-center justify-between border-b border-zinc-200/70 dark:border-zinc-900">
          <View className="flex-row items-center gap-2.5">
            <View className="w-9 h-9 rounded-xl bg-zinc-950 dark:bg-zinc-100 items-center justify-center">
              <Zap
                size={18}
                color={isDark ? '#09090B' : '#FAFAFA'}
                strokeWidth={2.3}
              />
            </View>
            <View>
              <Text className="text-lg font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
                ReelRush
              </Text>
              <Text className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                Fast. Clean. No Ads.
              </Text>
            </View>
          </View>

          <View className="flex-row items-center gap-2">
            <ScalePressable
              onPress={() => router.push('/history')}
              accessibilityLabel="Open Download History"
              className="w-10 h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 items-center justify-center relative"
            >
              <History
                size={18}
                color={isDark ? '#E4E4E7' : '#18181B'}
                strokeWidth={2}
              />
              {history.length > 0 && (
                <View className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 items-center justify-center">
                  <Text className="text-[9px] font-bold text-white">
                    {history.length > 9 ? '9+' : history.length}
                  </Text>
                </View>
              )}
            </ScalePressable>

            <ScalePressable
              onPress={() => router.push('/settings')}
              accessibilityLabel="Open Settings"
              className="w-10 h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 items-center justify-center"
            >
              <Settings
                size={18}
                color={isDark ? '#E4E4E7' : '#18181B'}
                strokeWidth={2}
              />
            </ScalePressable>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pt-6 pb-10"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 100% Ad-Free & Private Pill */}
          <Animated.View
            entering={FadeInDown.duration(240)}
            className="flex-row items-center self-start gap-1.5 px-3 py-1 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 mb-4"
          >
            <ShieldCheck
              size={13}
              color={isDark ? '#F43F5E' : '#E11D48'}
              strokeWidth={2.2}
            />
            <Text className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
              100% Ad-Free · Zero Trackers
            </Text>
          </Animated.View>

          {/* Hero Section */}
          <Animated.View
            entering={FadeInDown.delay(40).duration(260)}
            className="mb-6"
          >
            <Text className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 mb-2">
              Download Instagram videos
            </Text>
            <Text className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Paste a link or share directly from Instagram.
            </Text>
          </Animated.View>

          {/* Main Input & Download Card */}
          <Animated.View
            entering={FadeInDown.delay(80).duration(280)}
            className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 mb-5 shadow-sm"
          >
            {/* Large URL Input */}
            <View
              className={`flex-row items-center rounded-xl border px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 ${
                validationError
                  ? 'border-rose-500 dark:border-rose-500'
                  : isInputFocused
                    ? 'border-zinc-950 dark:border-zinc-200'
                    : 'border-zinc-200 dark:border-zinc-800'
              }`}
            >
              <Link2
                size={18}
                color={
                  validationError
                    ? '#E11D48'
                    : isDark
                      ? '#A1A1AA'
                      : '#71717A'
                }
                strokeWidth={2}
              />

              <TextInput
                value={inputUrl}
                onChangeText={(text) => {
                  setInputUrl(text);
                  if (validationError) setValidationError(null);
                }}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                onSubmitEditing={() => handleStartDownload()}
                placeholder="Paste Instagram link"
                placeholderTextColor={isDark ? '#52525B' : '#A1A1AA'}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="go"
                className="flex-1 mx-2.5 py-1.5 text-sm font-medium text-zinc-950 dark:text-zinc-50"
              />

              {inputUrl.length > 0 && (
                <ScalePressable
                  onPress={() => {
                    setInputUrl('');
                    setValidationError(null);
                  }}
                  accessibilityLabel="Clear URL input"
                  className="w-7 h-7 rounded-lg bg-zinc-200/70 dark:bg-zinc-800 items-center justify-center mr-1.5"
                >
                  <X size={14} color={isDark ? '#A1A1AA' : '#52525B'} />
                </ScalePressable>
              )}

              <ScalePressable
                onPress={handlePasteFromClipboard}
                className="px-3 py-1.5 rounded-lg bg-zinc-200/80 dark:bg-zinc-800 flex-row items-center gap-1.5"
              >
                <ClipboardPaste
                  size={13}
                  color={isDark ? '#FAFAFA' : '#18181B'}
                  strokeWidth={2.1}
                />
                <Text className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Paste
                </Text>
              </ScalePressable>
            </View>

            {/* Validation Error Message */}
            {validationError && (
              <Animated.View
                entering={FadeIn.duration(160)}
                className="mt-2.5 px-1 flex-row items-center gap-1.5"
              >
                <View className="w-1.5 h-1.5 rounded-full bg-rose-600 dark:bg-rose-500" />
                <Text className="text-xs font-medium text-rose-600 dark:text-rose-400">
                  {validationError}
                </Text>
              </Animated.View>
            )}

            {/* Primary Download Button */}
            <ScalePressable
              onPress={() => handleStartDownload()}
              className="mt-3.5 py-3.5 rounded-xl bg-zinc-950 dark:bg-zinc-50 flex-row items-center justify-center gap-2"
            >
              <ArrowDownToLine
                size={17}
                color={isDark ? '#09090B' : '#FAFAFA'}
                strokeWidth={2.3}
              />
              <Text className="text-sm font-semibold text-zinc-50 dark:text-zinc-950">
                Download
              </Text>
            </ScalePressable>
          </Animated.View>

          {/* Share from Instagram -> ReelRush Visual Explanation */}
          <Animated.View
            entering={FadeInDown.delay(130).duration(280)}
            className="mb-5"
          >
            <ShareHowItWorksCard />
          </Animated.View>

          {/* Quick Link to History */}
          <Animated.View entering={FadeInDown.delay(170).duration(280)}>
            <ScalePressable
              onPress={() => router.push('/history')}
              className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex-row items-center justify-between"
            >
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 items-center justify-center">
                  <Sparkles
                    size={18}
                    color={isDark ? '#FAFAFA' : '#18181B'}
                    strokeWidth={2}
                  />
                </View>
                <View>
                  <Text className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                    Your Downloads
                  </Text>
                  <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                    {history.length === 0
                      ? 'No videos downloaded yet'
                      : `${history.length} saved ${
                          history.length === 1 ? 'video' : 'videos'
                        } in local history`}
                  </Text>
                </View>
              </View>

              <ChevronRight
                size={18}
                color={isDark ? '#71717A' : '#A1A1AA'}
              />
            </ScalePressable>
          </Animated.View>
        </ScrollView>

        {/* Non-annoying Auto Clipboard Detection Bottom Card */}
        {detectedUrl && (
          <ClipboardSheetCard
            url={detectedUrl}
            onDownload={handleDownloadDetectedClipboard}
            onDismiss={dismissDetectedUrl}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
