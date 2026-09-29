import React from 'react';
import { Text, View } from 'react-native';
import { ArrowRight, CheckCircle2, Share2, Zap } from 'lucide-react-native';
import { useApp } from '../context/AppContext';

export function ShareHowItWorksCard() {
  const { isDark } = useApp();
  const mutedIconColor = isDark ? '#71717A' : '#A1A1AA';

  return (
    <View className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-zinc-900/90 p-5">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <View className="w-2 h-2 rounded-full bg-rose-600 dark:bg-rose-500" />
          <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Native Share Sheet
          </Text>
        </View>
        <View className="px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800">
          <Text className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
            Fastest Flow
          </Text>
        </View>
      </View>

      <Text className="text-base font-semibold text-zinc-950 dark:text-zinc-50 mb-1">
        Share from Instagram → ReelRush
      </Text>
      <Text className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-4">
        Skip copying links. Tap Share inside Instagram and choose ReelRush to
        start downloading immediately.
      </Text>

      <View className="flex-row items-center justify-between rounded-xl bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200/60 dark:border-zinc-800/70 px-3.5 py-3">
        <View className="items-center flex-1">
          <View className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 items-center justify-center mb-1.5">
            <Share2
              size={16}
              color={isDark ? '#FAFAFA' : '#09090B'}
              strokeWidth={2}
            />
          </View>
          <Text className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100">
            Instagram
          </Text>
          <Text className="text-[10px] text-zinc-500 dark:text-zinc-400">
            Tap Share
          </Text>
        </View>

        <ArrowRight size={14} color={mutedIconColor} />

        <View className="items-center flex-1">
          <View className="w-9 h-9 rounded-xl bg-rose-600 dark:bg-rose-500 items-center justify-center mb-1.5">
            <Zap size={16} color="#FFFFFF" strokeWidth={2.2} />
          </View>
          <Text className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100">
            ReelRush
          </Text>
          <Text className="text-[10px] text-zinc-500 dark:text-zinc-400">
            Auto-detects
          </Text>
        </View>

        <ArrowRight size={14} color={mutedIconColor} />

        <View className="items-center flex-1">
          <View className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 items-center justify-center mb-1.5">
            <CheckCircle2
              size={16}
              color={isDark ? '#34D399' : '#059669'}
              strokeWidth={2.1}
            />
          </View>
          <Text className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100">
            Saved
          </Text>
          <Text className="text-[10px] text-zinc-500 dark:text-zinc-400">
            Camera Roll
          </Text>
        </View>
      </View>
    </View>
  );
}
