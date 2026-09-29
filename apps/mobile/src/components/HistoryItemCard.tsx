import React, { useState } from 'react';
import { Image, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  CheckCircle2,
  Clock,
  Film,
  RotateCcw,
  Trash2,
  XCircle,
} from 'lucide-react-native';
import { HistoryItem } from '@reelrush/shared';
import { ScalePressable } from './ScalePressable';
import { useApp } from '../context/AppContext';

interface HistoryItemCardProps {
  item: HistoryItem;
  index: number;
  onDownloadAgain: (url: string) => void;
  onRemove: (id: string) => void;
}

function formatHistoryDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Recently';
  }
}

export function HistoryItemCard({
  item,
  index,
  onDownloadAgain,
  onRemove,
}: HistoryItemCardProps) {
  const { isDark } = useApp();
  const [thumbFailed, setThumbFailed] = useState(false);

  const isCompleted = item.status === 'completed';

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index * 45, 250))
        .duration(220)
        .springify()
        .damping(22)}
      className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 mb-3"
    >
      <View className="flex-row gap-3.5">
        {/* Thumbnail */}
        <View className="w-16 h-20 rounded-xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden items-center justify-center border border-zinc-200/60 dark:border-zinc-700/50">
          {item.thumbnailUrl && !thumbFailed ? (
            <Image
              source={{ uri: item.thumbnailUrl }}
              className="w-full h-full"
              resizeMode="cover"
              onError={() => setThumbFailed(true)}
            />
          ) : (
            <Film
              size={20}
              color={isDark ? '#71717A' : '#A1A1AA'}
              strokeWidth={1.8}
            />
          )}
        </View>

        {/* Info */}
        <View className="flex-1 justify-between">
          <View>
            <View className="flex-row items-center justify-between gap-2 mb-1">
              <View className="flex-row items-center gap-1.5">
                <View className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">
                  <Text className="text-[10px] font-semibold uppercase text-zinc-700 dark:text-zinc-300">
                    {item.mediaType}
                  </Text>
                </View>

                {item.formattedDuration && (
                  <View className="flex-row items-center gap-1">
                    <Clock size={10} color={isDark ? '#A1A1AA' : '#71717A'} />
                    <Text className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                      {item.formattedDuration}
                    </Text>
                  </View>
                )}
              </View>

              {/* Status pill */}
              <View
                className={`flex-row items-center gap-1 px-2 py-0.5 rounded-full ${
                  isCompleted
                    ? 'bg-emerald-50 dark:bg-emerald-950/60'
                    : 'bg-rose-50 dark:bg-rose-950/60'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2
                    size={11}
                    color={isDark ? '#34D399' : '#059669'}
                  />
                ) : (
                  <XCircle size={11} color={isDark ? '#F43F5E' : '#E11D48'} />
                )}
                <Text
                  className={`text-[10px] font-semibold ${
                    isCompleted
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {isCompleted ? 'Saved' : 'Failed'}
                </Text>
              </View>
            </View>

            <Text
              numberOfLines={1}
              className="text-sm font-semibold text-zinc-950 dark:text-zinc-50 mb-0.5"
            >
              {item.title}
            </Text>

            <Text className="text-[11px] text-zinc-500 dark:text-zinc-400">
              {formatHistoryDate(item.createdAt)}
              {item.author ? ` · ${item.author}` : ''}
            </Text>
          </View>

          {/* Actions */}
          <View className="flex-row items-center justify-end gap-2 mt-2.5">
            <ScalePressable
              onPress={() => onRemove(item.id)}
              accessibilityLabel="Remove from history"
              className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 flex-row items-center gap-1.5"
            >
              <Trash2 size={12} color={isDark ? '#A1A1AA' : '#71717A'} />
              <Text className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Remove
              </Text>
            </ScalePressable>

            <ScalePressable
              onPress={() => onDownloadAgain(item.normalizedUrl)}
              className="px-3 py-1.5 rounded-lg bg-zinc-950 dark:bg-zinc-100 flex-row items-center gap-1.5"
            >
              <RotateCcw
                size={12}
                color={isDark ? '#09090B' : '#FAFAFA'}
                strokeWidth={2.2}
              />
              <Text className="text-xs font-semibold text-zinc-50 dark:text-zinc-950">
                Download again
              </Text>
            </ScalePressable>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}
