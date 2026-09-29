import '../global.css';
import React from 'react';
import { Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppProvider, useApp } from '../src/context/AppContext';
import { useShareIntentListener } from '../src/hooks/useShareIntent';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { ShieldCheck, Zap } from 'lucide-react-native';

function BrandSplashScreen() {
  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(260)}
      className="absolute inset-0 z-50 bg-zinc-950 items-center justify-center px-6"
    >
      <Animated.View
        entering={ZoomIn.duration(320).springify().damping(18)}
        className="items-center"
      >
        <View className="w-20 h-20 rounded-3xl bg-rose-600 items-center justify-center mb-5 shadow-lg">
          <Zap size={38} color="#FFFFFF" strokeWidth={2.4} />
        </View>
        <Text className="text-3xl font-bold tracking-tight text-zinc-50 mb-1.5">
          ReelRush
        </Text>
        <Text className="text-xs font-medium tracking-wider uppercase text-zinc-400">
          Fast · Clean · No Ads
        </Text>
      </Animated.View>

      <View className="absolute bottom-12 flex-row items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800">
        <ShieldCheck size={13} color="#F43F5E" strokeWidth={2.2} />
        <Text className="text-[11px] font-semibold text-zinc-300">
          100% Ad-Free Experience
        </Text>
      </View>
    </Animated.View>
  );
}

function RootNavigationContainer() {
  const { isDark, isHydrated } = useApp();
  const [showSplash, setShowSplash] = React.useState(true);
  useShareIntentListener();

  React.useEffect(() => {
    if (!isHydrated) return;
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 850);
    return () => clearTimeout(timer);
  }, [isHydrated]);

  return (
    <View className={isDark ? 'dark flex-1 bg-zinc-950' : 'flex-1 bg-zinc-50'}>
      <StatusBar style={showSplash || isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade_from_bottom',
          contentStyle: {
            backgroundColor: isDark ? '#09090B' : '#FAFAFA',
          },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="download" />
        <Stack.Screen name="history" />
        <Stack.Screen name="settings" />
      </Stack>
      {showSplash && <BrandSplashScreen />}
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AppProvider>
          <RootNavigationContainer />
        </AppProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
