import React from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { ArrowDownToLine, ClipboardCheck, X } from 'lucide-react-native';
import { ScalePressable } from './ScalePressable';
import { useApp } from '../context/AppContext';

interface ClipboardSheetCardProps {
  url: string;
  onDownload: (url: string) => void;
  onDismiss: () => void;
}

export function ClipboardSheetCard({
  url,
  onDownload,
  onDismiss,
}: ClipboardSheetCardProps) {
  const { isDark } = useApp();

  return (
    <Animated.View
      entering={FadeInDown.duration(240).springify().damping(22)}
      exiting={FadeOutDown.duration(180)}
      className="mx-5 mb-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-lg"
    >
      <View className="flex-row items-center justify-between mb-2.5">
        <View className="flex-row items-center gap-2.5">
          <View className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-950/60 items-center justify-center">
            <ClipboardCheck
              size={16}
              color={isDark ? '#F43F5E' : '#E11D48'}
              strokeWidth={2.2}
            />
          </View>
          <View>
            <Text className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
              Instagram link detected
            </Text>
            <Text className="text-xs text-zinc-500 dark:text-zinc-400">
              Ready to download from your clipboard
            </Text>
          </View>
        </View>

        <ScalePressable
          onPress={onDismiss}
          accessibilityLabel="Dismiss detected link"
          className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 items-center justify-center"
        >
          <X size={14} color={isDark ? '#A1A1AA' : '#71717A'} />
        </ScalePressable>
      </View>

      <View className="rounded-xl bg-zinc-100/90 dark:bg-zinc-950/90 border border-zinc-200/70 dark:border-zinc-800/80 px-3.5 py-2.5 mb-3.5">
        <Text
          numberOfLines={1}
          ellipsizeMode="middle"
          className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
        >
          {url}
        </Text>
      </View>

      <View className="flex-row items-center gap-2.5">
        <ScalePressable
          onPress={onDismiss}
          className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 items-center justify-center"
        >
          <Text className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Dismiss
          </Text>
        </ScalePressable>

        <ScalePressable
          onPress={() => onDownload(url)}
          className="flex-[1.6] py-2.5 rounded-xl bg-zinc-950 dark:bg-zinc-50 flex-row items-center justify-center gap-1.5"
        >
          <ArrowDownToLine
            size={14}
            color={isDark ? '#09090B' : '#FAFAFA'}
            strokeWidth={2.25}
          />
          <Text className="text-xs font-semibold text-zinc-50 dark:text-zinc-950">
            Download
          </Text>
        </ScalePressable>
      </View>
    </Animated.View>
  );
}
