import '../global.css';
import React from 'react';
import { View } from 'react-native';
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

function RootNavigationContainer() {
  const { isDark } = useApp();
  useShareIntentListener();

  return (
    <View className={isDark ? 'dark flex-1 bg-zinc-950' : 'flex-1 bg-zinc-50'}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
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
