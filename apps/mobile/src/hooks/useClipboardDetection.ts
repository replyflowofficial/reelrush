import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { extractInstagramUrlFromText } from '@reelrush/shared';

interface UseClipboardDetectionResult {
  detectedUrl: string | null;
  dismissDetectedUrl: () => void;
  consumeDetectedUrl: () => string | null;
  checkClipboardOnce: () => Promise<void>;
}

/**
 * Event-driven, non-polling clipboard detector for Instagram URLs.
 * Only checks clipboard:
 * 1. When Home screen explicitly requests a check on focus/open
 * 2. When the app returns to foreground ('active' AppState transition)
 * Never polls on a timer.
 */
export function useClipboardDetection(
  currentInputValue: string
): UseClipboardDetectionResult {
  const [detectedUrl, setDetectedUrl] = useState<string | null>(null);
  const dismissedUrlsRef = useRef<Set<string>>(new Set());
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const isCheckingRef = useRef(false);

  const checkClipboardOnce = useCallback(async () => {
    if (isCheckingRef.current) return;

    // On web, reading clipboard without an explicit user gesture can trigger browser permission prompts
    if (Platform.OS === 'web') {
      return;
    }

    isCheckingRef.current = true;
    try {
      const hasString = await Clipboard.hasStringAsync();
      if (!hasString) {
        setDetectedUrl(null);
        return;
      }

      const text = await Clipboard.getStringAsync();
      const extracted = extractInstagramUrlFromText(text);

      if (!extracted) {
        setDetectedUrl(null);
        return;
      }

      // Do not show banner if the user already dismissed this exact URL
      // or already pasted it into the input box
      if (dismissedUrlsRef.current.has(extracted)) {
        setDetectedUrl(null);
        return;
      }

      const currentNormalized = extractInstagramUrlFromText(currentInputValue);
      if (currentNormalized && currentNormalized === extracted) {
        setDetectedUrl(null);
        return;
      }

      setDetectedUrl(extracted);
    } catch {
      // Respect platform clipboard privacy restrictions silently
    } finally {
      isCheckingRef.current = false;
    }
  }, [currentInputValue]);

  // Check clipboard when returning to the app from background/inactive
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        const wasBackground =
          appStateRef.current === 'background' ||
          appStateRef.current === 'inactive';

        appStateRef.current = nextAppState;

        if (wasBackground && nextAppState === 'active') {
          void checkClipboardOnce();
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, [checkClipboardOnce]);

  const dismissDetectedUrl = useCallback(() => {
    if (detectedUrl) {
      dismissedUrlsRef.current.add(detectedUrl);
    }
    setDetectedUrl(null);
  }, [detectedUrl]);

  const consumeDetectedUrl = useCallback(() => {
    const url = detectedUrl;
    if (url) {
      dismissedUrlsRef.current.add(url);
    }
    setDetectedUrl(null);
    return url;
  }, [detectedUrl]);

  return {
    detectedUrl,
    dismissDetectedUrl,
    consumeDetectedUrl,
    checkClipboardOnce,
  };
}
