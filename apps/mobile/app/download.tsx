import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import {
  ArrowDownToLine,
  ArrowLeft,
  CheckCircle2,
  FolderCheck,
  Loader2,
  Share2,
  Sparkles,
} from 'lucide-react-native';
import {
  DownloadJobInfo,
  DownloadStepState,
  USER_FRIENDLY_ERRORS,
  validateAndNormalizeInstagramUrl,
} from '@reelrush/shared';
import { useApp } from '../src/context/AppContext';
import { ClientApiError, createDownloadJob } from '../src/services/api';
import {
  downloadVideoToDevice,
  ensureMediaLibraryPermission,
} from '../src/services/mediaDownloader';
import { ScalePressable } from '../src/components/ScalePressable';
import { VideoPreviewCard } from '../src/components/VideoPreviewCard';
import { DownloadProgressStepper } from '../src/components/DownloadProgressStepper';
import { ErrorStateCard } from '../src/components/ErrorStateCard';

export default function DownloadScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ url?: string; source?: string }>();
  const { isDark, settings, recordHistoryItem } = useApp();

  const rawUrl = typeof params.url === 'string' ? params.url : '';
  const source = typeof params.source === 'string' ? params.source : 'manual';

  const [stepState, setStepState] = useState<DownloadStepState>('preparing');
  const [progress, setProgress] = useState<number>(12);
  const [jobInfo, setJobInfo] = useState<DownloadJobInfo | null>(null);
  const [awaitingUserConfirm, setAwaitingUserConfirm] =
    useState<boolean>(false);
  const [savedLocalUri, setSavedLocalUri] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Step 2: Stream the prepared MP4 file to the user's device and save to Gallery
   */
  const executeDeviceSave = useCallback(
    async (preparedJob: DownloadJobInfo) => {
      setAwaitingUserConfirm(false);
      setErrorMessage(null);
      setStepState('downloading');
      setProgress(65);

      try {
        const result = await downloadVideoToDevice({
          downloadUrl: preparedJob.downloadUrl,
          shortcode: preparedJob.metadata.shortcode,
          wifiOnly: settings.wifiOnly,
          onProgress: (devicePct) => {
            if (!isMountedRef.current) return;
            // Map device download 0-100% into overall 65-99%
            const mapped = Math.min(
              99,
              Math.max(65, Math.round(65 + devicePct * 0.34))
            );
            setProgress(mapped);
          },
        });

        if (!isMountedRef.current) return;

        setSavedLocalUri(result.localUri);
        setStepState('completed');
        setProgress(100);

        await recordHistoryItem({
          id: preparedJob.id,
          url: preparedJob.url,
          normalizedUrl: preparedJob.normalizedUrl,
          shortcode: preparedJob.metadata.shortcode,
          thumbnailUrl: preparedJob.metadata.thumbnailUrl,
          title: preparedJob.metadata.title,
          author: preparedJob.metadata.author,
          createdAt: new Date().toISOString(),
          durationSeconds: preparedJob.metadata.durationSeconds,
          formattedDuration: preparedJob.metadata.formattedDuration,
          resolution: preparedJob.metadata.resolution,
          mediaType: preparedJob.metadata.mediaType,
          status: 'completed',
          localUri: result.localUri,
        });
      } catch (err) {
        if (!isMountedRef.current) return;
        const friendlyMsg =
          err instanceof ClientApiError
            ? err.message
            : USER_FRIENDLY_ERRORS.YTDLP_FAILURE;

        setStepState('failed');
        setErrorMessage(friendlyMsg);

        await recordHistoryItem({
          id: preparedJob.id,
          url: preparedJob.url,
          normalizedUrl: preparedJob.normalizedUrl,
          shortcode: preparedJob.metadata.shortcode,
          thumbnailUrl: preparedJob.metadata.thumbnailUrl,
          title: preparedJob.metadata.title,
          author: preparedJob.metadata.author,
          createdAt: new Date().toISOString(),
          durationSeconds: preparedJob.metadata.durationSeconds,
          formattedDuration: preparedJob.metadata.formattedDuration,
          resolution: preparedJob.metadata.resolution,
          mediaType: preparedJob.metadata.mediaType,
          status: 'failed',
        });
      }
    },
    [recordHistoryItem, settings.wifiOnly]
  );

  /**
   * Step 1: Validate URL, request storage permission in parallel, & fetch video
   */
  const prepareVideoFromUrl = useCallback(async () => {
    setErrorMessage(null);
    setSavedLocalUri(null);
    setJobInfo(null);
    setAwaitingUserConfirm(false);
    setStepState('preparing');
    setProgress(12);

    const validation = validateAndNormalizeInstagramUrl(rawUrl);
    if (!validation.valid) {
      setStepState('failed');
      setErrorMessage(validation.errorMessage);
      return;
    }

    // Request Gallery/Storage permission in parallel while the video is being fetched
    void ensureMediaLibraryPermission();

    // Smoothly advance visual progress during fast fetch
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 30) {
          setStepState('fetching');
          return prev + 6;
        }
        if (prev < 58) {
          setStepState('processing');
          return prev + 4;
        }
        return prev;
      });
    }, 300);

    try {
      const prepared = await createDownloadJob(validation.data.normalizedUrl);
      clearInterval(progressInterval);

      if (!isMountedRef.current) return;

      setJobInfo(prepared);
      setStepState('processing');
      setProgress(62);

      if (settings.askBeforeDownloading) {
        setAwaitingUserConfirm(true);
      } else {
        await executeDeviceSave(prepared);
      }
    } catch (err) {
      clearInterval(progressInterval);
      if (!isMountedRef.current) return;

      const friendlyMsg =
        err instanceof ClientApiError
          ? err.message
          : USER_FRIENDLY_ERRORS.YTDLP_FAILURE;

      setStepState('failed');
      setErrorMessage(friendlyMsg);
    }
  }, [executeDeviceSave, rawUrl, settings.askBeforeDownloading]);

  useEffect(() => {
    void prepareVideoFromUrl();
  }, [prepareVideoFromUrl]);

  const handleShareSavedVideo = useCallback(async () => {
    if (!savedLocalUri || Platform.OS === 'web') return;
    try {
      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(savedLocalUri);
      }
    } catch {
      // Ignore share cancellation
    }
  }, [savedLocalUri]);

  const isWorking =
    stepState !== 'completed' &&
    stepState !== 'failed' &&
    !awaitingUserConfirm;

  return (
    <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      {/* Top Bar */}
      <View className="px-5 pt-3 pb-3 flex-row items-center justify-between border-b border-zinc-200/70 dark:border-zinc-900">
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

        <View className="items-center">
          <Text className="text-sm font-bold text-zinc-950 dark:text-zinc-50">
            {stepState === 'completed'
              ? 'Download Complete'
              : awaitingUserConfirm
                ? 'Ready to Download'
                : 'Download Video'}
          </Text>
          {source === 'share' && (
            <Text className="text-[11px] font-medium text-rose-600 dark:text-rose-400">
              Shared from Instagram
            </Text>
          )}
        </View>

        <View className="w-10 h-10" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-6 pb-12"
        showsVerticalScrollIndicator={false}
      >
        {/* Preparing hero banner when metadata is not yet loaded */}
        {!jobInfo && stepState !== 'failed' && (
          <Animated.View
            entering={FadeIn.duration(200)}
            className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 items-center mb-4"
          >
            <View className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/70 items-center justify-center mb-3.5">
              <Loader2
                size={24}
                color={isDark ? '#F43F5E' : '#E11D48'}
                strokeWidth={2.2}
              />
            </View>
            <Text className="text-base font-bold text-zinc-950 dark:text-zinc-50 mb-1">
              Downloading your video...
            </Text>
            <Text
              numberOfLines={1}
              ellipsizeMode="middle"
              className="text-xs text-zinc-500 dark:text-zinc-400 max-w-full px-4"
            >
              {rawUrl}
            </Text>
          </Animated.View>
        )}

        {/* Video Preview & Metadata Card */}
        {jobInfo && (
          <Animated.View
            entering={FadeInDown.duration(240)}
            className="mb-4"
          >
            <VideoPreviewCard metadata={jobInfo.metadata} />
          </Animated.View>
        )}

        {/* Large Download Button when awaiting user confirmation */}
        {jobInfo && awaitingUserConfirm && stepState !== 'failed' && (
          <Animated.View
            entering={FadeInDown.delay(60).duration(240)}
            className="mb-4"
          >
            <ScalePressable
              onPress={() => void executeDeviceSave(jobInfo)}
              className="py-4 rounded-2xl bg-zinc-950 dark:bg-zinc-50 flex-row items-center justify-center gap-2.5 shadow-sm"
            >
              <ArrowDownToLine
                size={19}
                color={isDark ? '#09090B' : '#FAFAFA'}
                strokeWidth={2.3}
              />
              <Text className="text-base font-bold text-zinc-50 dark:text-zinc-950">
                Download Video
              </Text>
            </ScalePressable>
          </Animated.View>
        )}

        {/* Animated Progress Stepper during active work or completion */}
        {(isWorking || stepState === 'completed') && (
          <Animated.View
            entering={FadeInDown.delay(40).duration(240)}
            className="mb-4"
          >
            <DownloadProgressStepper
              currentState={stepState}
              progressPercent={progress}
            />
          </Animated.View>
        )}

        {/* Beautiful Success State */}
        {stepState === 'completed' && (
          <Animated.View
            entering={ZoomIn.duration(260).springify().damping(20)}
            className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-white dark:bg-zinc-900 p-5"
          >
            <View className="flex-row items-center gap-3.5 mb-4">
              <View className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 items-center justify-center">
                <CheckCircle2
                  size={24}
                  color={isDark ? '#34D399' : '#059669'}
                  strokeWidth={2.2}
                />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-zinc-950 dark:text-zinc-50">
                  Saved to your gallery
                </Text>
                <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                  Video saved directly to your gallery in full quality.
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-2.5">
              {Platform.OS !== 'web' && savedLocalUri && (
                <ScalePressable
                  onPress={handleShareSavedVideo}
                  className="flex-1 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/70 flex-row items-center justify-center gap-1.5"
                >
                  <Share2
                    size={15}
                    color={isDark ? '#FAFAFA' : '#18181B'}
                    strokeWidth={2.1}
                  />
                  <Text className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    Share Video
                  </Text>
                </ScalePressable>
              )}

              <ScalePressable
                onPress={() => router.replace('/history')}
                className="flex-1 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/70 flex-row items-center justify-center gap-1.5"
              >
                <FolderCheck
                  size={15}
                  color={isDark ? '#FAFAFA' : '#18181B'}
                  strokeWidth={2.1}
                />
                <Text className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Your Downloads
                </Text>
              </ScalePressable>
            </View>

            <ScalePressable
              onPress={() => router.replace('/')}
              className="mt-2.5 py-3.5 rounded-xl bg-zinc-950 dark:bg-zinc-50 flex-row items-center justify-center gap-2"
            >
              <Sparkles
                size={15}
                color={isDark ? '#09090B' : '#FAFAFA'}
                strokeWidth={2.2}
              />
              <Text className="text-xs font-semibold text-zinc-50 dark:text-zinc-950">
                Download Another Video
              </Text>
            </ScalePressable>
          </Animated.View>
        )}

        {/* Error State */}
        {stepState === 'failed' && errorMessage && (
          <ErrorStateCard
            message={errorMessage}
            onRetry={() => void prepareVideoFromUrl()}
            onBack={() => router.back()}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
