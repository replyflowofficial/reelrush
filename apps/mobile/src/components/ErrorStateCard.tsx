import React from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { AlertCircle, RotateCcw } from 'lucide-react-native';
import { ScalePressable } from './ScalePressable';
import { useApp } from '../context/AppContext';

interface ErrorStateCardProps {
  message: string;
  onRetry?: () => void;
  onBack?: () => void;
}

export function ErrorStateCard({
  message,
  onRetry,
  onBack,
}: ErrorStateCardProps) {
  const { isDark } = useApp();

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-zinc-900 p-5"
    >
      <View className="flex-row items-start gap-3.5 mb-4">
        <View className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/70 items-center justify-center">
          <AlertCircle
            size={20}
            color={isDark ? '#F43F5E' : '#E11D48'}
            strokeWidth={2.1}
          />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold text-zinc-950 dark:text-zinc-50 mb-1">
            Unable to process link
          </Text>
          <Text className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {message}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center gap-2.5">
        {onBack && (
          <ScalePressable
            onPress={onBack}
            className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 items-center justify-center"
          >
            <Text className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Change Link
            </Text>
          </ScalePressable>
        )}

        {onRetry && (
          <ScalePressable
            onPress={onRetry}
            className="flex-1 py-2.5 rounded-xl bg-zinc-950 dark:bg-zinc-50 flex-row items-center justify-center gap-1.5"
          >
            <RotateCcw
              size={14}
              color={isDark ? '#09090B' : '#FAFAFA'}
              strokeWidth={2.2}
            />
            <Text className="text-xs font-semibold text-zinc-50 dark:text-zinc-950">
              Try Again
            </Text>
          </ScalePressable>
        )}
      </View>
    </Animated.View>
  );
}
