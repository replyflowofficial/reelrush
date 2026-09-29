import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Check, Loader2 } from 'lucide-react-native';
import { DownloadStepState } from '@reelrush/shared';
import { useApp } from '../context/AppContext';

interface DownloadProgressStepperProps {
  currentState: DownloadStepState;
  progressPercent: number;
}

interface StepDefinition {
  key: DownloadStepState;
  label: string;
}

const STEPS: StepDefinition[] = [
  { key: 'preparing', label: 'Preparing' },
  { key: 'fetching', label: 'Fetching video' },
  { key: 'processing', label: 'Processing' },
  { key: 'downloading', label: 'Downloading' },
  { key: 'completed', label: 'Complete' },
];

const STATE_ORDER: Record<DownloadStepState, number> = {
  preparing: 0,
  fetching: 1,
  processing: 2,
  downloading: 3,
  completed: 4,
  failed: -1,
};

export function DownloadProgressStepper({
  currentState,
  progressPercent,
}: DownloadProgressStepperProps) {
  const { isDark } = useApp();
  const animatedWidth = useSharedValue(0);

  useEffect(() => {
    const clamped = Math.max(4, Math.min(100, progressPercent));
    animatedWidth.value = withTiming(clamped, { duration: 280 });
  }, [progressPercent, animatedWidth]);

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${animatedWidth.value}%`,
  }));

  const currentOrder = STATE_ORDER[currentState] ?? 0;

  return (
    <View className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
          {STEPS.find((s) => s.key === currentState)?.label || 'Processing'}
        </Text>
        <Text className="text-xs font-semibold text-rose-600 dark:text-rose-500">
          {Math.round(progressPercent)}%
        </Text>
      </View>

      {/* Smooth animated progress bar */}
      <View className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden mb-5">
        <Animated.View
          style={progressBarStyle}
          className={`h-full rounded-full ${
            currentState === 'completed'
              ? 'bg-emerald-500'
              : 'bg-rose-600 dark:bg-rose-500'
          }`}
        />
      </View>

      {/* Step list */}
      <View className="gap-2.5">
        {STEPS.map((step, idx) => {
          const isDone =
            currentState === 'completed' || idx < currentOrder;
          const isCurrent =
            currentState !== 'completed' && idx === currentOrder;

          return (
            <View
              key={step.key}
              className="flex-row items-center justify-between"
            >
              <View className="flex-row items-center gap-2.5">
                <View
                  className={`w-5 h-5 rounded-full items-center justify-center ${
                    isDone
                      ? 'bg-emerald-500/15 dark:bg-emerald-500/20'
                      : isCurrent
                        ? 'bg-rose-500/15 dark:bg-rose-500/20'
                        : 'bg-zinc-100 dark:bg-zinc-800'
                  }`}
                >
                  {isDone ? (
                    <Check
                      size={12}
                      color={isDark ? '#34D399' : '#059669'}
                      strokeWidth={2.6}
                    />
                  ) : isCurrent ? (
                    <Loader2
                      size={12}
                      color={isDark ? '#F43F5E' : '#E11D48'}
                      strokeWidth={2.4}
                    />
                  ) : (
                    <View className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                  )}
                </View>

                <Text
                  className={`text-xs ${
                    isCurrent
                      ? 'font-semibold text-zinc-950 dark:text-zinc-50'
                      : isDone
                        ? 'font-medium text-zinc-700 dark:text-zinc-300'
                        : 'text-zinc-400 dark:text-zinc-500'
                  }`}
                >
                  {step.label}
                </Text>
              </View>

              <Text className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                {isDone ? 'Done' : isCurrent ? 'In progress' : 'Pending'}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
