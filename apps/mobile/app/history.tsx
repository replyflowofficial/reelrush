import React, { useCallback } from 'react';
import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import {
  ArrowDownToLine,
  ArrowLeft,
  FolderOpen,
  Trash2,
} from 'lucide-react-native';
import { HistoryItem } from '@reelrush/shared';
import { useApp } from '../src/context/AppContext';
import { ScalePressable } from '../src/components/ScalePressable';
import { HistoryItemCard } from '../src/components/HistoryItemCard';

export default function HistoryScreen() {
  const router = useRouter();
  const { isDark, history, deleteHistoryEntry, wipeHistory } = useApp();

  const handleDownloadAgain = useCallback(
    (url: string) => {
      router.push({
        pathname: '/download',
        params: {
          url,
          source: 'history',
        },
      });
    },
    [router]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: HistoryItem; index: number }) => (
      <HistoryItemCard
        item={item}
        index={index}
        onDownloadAgain={handleDownloadAgain}
        onRemove={(id) => void deleteHistoryEntry(id)}
      />
    ),
    [deleteHistoryEntry, handleDownloadAgain]
  );

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
              Your Downloads
            </Text>
            <Text className="text-xs text-zinc-500 dark:text-zinc-400">
              Stored privately on your device
            </Text>
          </View>
        </View>

        {history.length > 0 && (
          <ScalePressable
            onPress={() => void wipeHistory()}
            accessibilityLabel="Clear all downloads"
            className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex-row items-center gap-1.5"
          >
            <Trash2 size={14} color={isDark ? '#F43F5E' : '#E11D48'} />
            <Text className="text-xs font-semibold text-rose-600 dark:text-rose-400">
              Clear
            </Text>
          </ScalePressable>
        )}
      </View>

      {history.length === 0 ? (
        <Animated.View
          entering={FadeIn.duration(240)}
          className="flex-1 items-center justify-center px-8"
        >
          <View className="w-16 h-16 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 items-center justify-center mb-4">
            <FolderOpen
              size={28}
              color={isDark ? '#71717A' : '#A1A1AA'}
              strokeWidth={1.8}
            />
          </View>
          <Text className="text-base font-bold text-zinc-950 dark:text-zinc-50 mb-1.5 text-center">
            No downloads yet
          </Text>
          <Text className="text-xs text-zinc-500 dark:text-zinc-400 text-center leading-relaxed mb-6">
            Videos you download from Instagram will appear here for quick
            access.
          </Text>

          <ScalePressable
            onPress={() => router.replace('/')}
            className="px-5 py-3 rounded-xl bg-zinc-950 dark:bg-zinc-50 flex-row items-center gap-2"
          >
            <ArrowDownToLine
              size={15}
              color={isDark ? '#09090B' : '#FAFAFA'}
              strokeWidth={2.2}
            />
            <Text className="text-xs font-semibold text-zinc-50 dark:text-zinc-950">
              Download a Video
            </Text>
          </ScalePressable>
        </Animated.View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => `${item.id}-${item.createdAt}`}
          renderItem={renderItem}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 18,
            paddingBottom: 36,
          }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
