import React, { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { Clock, Film, HardDrive, Maximize2, User } from 'lucide-react-native';
import { VideoMetadata } from '@reelrush/shared';
import { useApp } from '../context/AppContext';

interface VideoPreviewCardProps {
  metadata: VideoMetadata;
}

function formatBytes(bytes?: number): string | null {
  if (!bytes || !Number.isFinite(bytes) || bytes <= 0) return null;
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) {
    return `${mb.toFixed(1)} MB`;
  }
  const kb = bytes / 1024;
  return `${Math.round(kb)} KB`;
}

export function VideoPreviewCard({ metadata }: VideoPreviewCardProps) {
  const { isDark } = useApp();
  const [imageError, setImageError] = useState(false);

  const showThumbnail = Boolean(metadata.thumbnailUrl && !imageError);
  const formattedSize = formatBytes(metadata.filesizeBytes);

  return (
    <View className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      <View className="flex-row p-4 gap-4">
        {/* Thumbnail / Preview Box */}
        <View className="w-24 h-32 rounded-xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden items-center justify-center border border-zinc-200/60 dark:border-zinc-700/50">
          {showThumbnail ? (
            <Image
              source={{ uri: metadata.thumbnailUrl }}
              className="w-full h-full"
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <View className="items-center justify-center p-2">
              <Film
                size={24}
                color={isDark ? '#71717A' : '#A1A1AA'}
                strokeWidth={1.8}
              />
              <Text className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 mt-1.5">
                {metadata.mediaType}
              </Text>
            </View>
          )}
        </View>

        {/* Metadata Column */}
        <View className="flex-1 justify-between py-0.5">
          <View>
            {/* Platform & Type Badges */}
            <View className="flex-row items-center gap-1.5 mb-2 flex-wrap">
              <View className="px-2 py-0.5 rounded-md bg-zinc-950 dark:bg-zinc-100">
                <Text className="text-[10px] font-semibold uppercase tracking-wider text-zinc-50 dark:text-zinc-950">
                  Instagram
                </Text>
              </View>

              <View className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/80 border border-rose-200/60 dark:border-rose-800/60">
                <Text className="text-[10px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  {metadata.mediaType}
                </Text>
              </View>
            </View>

            <Text
              numberOfLines={2}
              className="text-sm font-semibold text-zinc-950 dark:text-zinc-50 leading-snug mb-1.5"
            >
              {metadata.title}
            </Text>

            {metadata.author && (
              <View className="flex-row items-center gap-1.5">
                <User size={12} color={isDark ? '#A1A1AA' : '#71717A'} />
                <Text
                  numberOfLines={1}
                  className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
                >
                  {metadata.author}
                </Text>
              </View>
            )}
          </View>

          {/* Technical pills: Duration, Resolution, Size */}
          <View className="flex-row items-center flex-wrap gap-2 mt-3">
            {metadata.formattedDuration && (
              <View className="flex-row items-center gap-1 px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <Clock size={11} color={isDark ? '#A1A1AA' : '#52525B'} />
                <Text className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                  {metadata.formattedDuration}
                </Text>
              </View>
            )}

            {metadata.resolution && (
              <View className="flex-row items-center gap-1 px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <Maximize2 size={11} color={isDark ? '#A1A1AA' : '#52525B'} />
                <Text className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                  {metadata.resolution}
                </Text>
              </View>
            )}

            {formattedSize && (
              <View className="flex-row items-center gap-1 px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <HardDrive size={11} color={isDark ? '#A1A1AA' : '#52525B'} />
                <Text className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                  {formattedSize}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}
