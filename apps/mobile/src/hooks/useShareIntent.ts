import { useEffect, useRef } from 'react';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { extractInstagramUrlFromText } from '@reelrush/shared';

/**
 * Listens for incoming native Share Sheet intents (Android ACTION_SEND & iOS Share Extension)
 * bridged via `reelrush://share?text=...` or `reelrush://download?url=...`,
 * extracts the Instagram URL, and opens the `/download` screen automatically.
 */
export function useShareIntentListener(): void {
  const router = useRouter();
  const lastHandledPayloadRef = useRef<string | null>(null);

  useEffect(() => {
    function handleIncomingUrl(rawUrl: string | null) {
      if (!rawUrl) return;

      // Avoid handling the exact same intent twice in a row
      if (lastHandledPayloadRef.current === rawUrl) {
        return;
      }

      try {
        const parsed = Linking.parse(rawUrl);
        const queryParams = parsed.queryParams || {};

        const sharedCandidate =
          (typeof queryParams.text === 'string' ? queryParams.text : '') ||
          (typeof queryParams.url === 'string' ? queryParams.url : '') ||
          rawUrl;

        const instagramUrl = extractInstagramUrlFromText(
          decodeURIComponent(sharedCandidate)
        );

        if (instagramUrl) {
          lastHandledPayloadRef.current = rawUrl;
          router.push({
            pathname: '/download',
            params: {
              url: instagramUrl,
              source: 'share',
            },
          });
        }
      } catch {
        // Fallback direct extraction
        const instagramUrl = extractInstagramUrlFromText(rawUrl);
        if (instagramUrl) {
          lastHandledPayloadRef.current = rawUrl;
          router.push({
            pathname: '/download',
            params: {
              url: instagramUrl,
              source: 'share',
            },
          });
        }
      }
    }

    // 1. Check initial cold-start URL / Share Intent
    void Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl) {
        handleIncomingUrl(initialUrl);
      }
    });

    // 2. Listen for warm resume Share Intents
    const subscription = Linking.addEventListener('url', (event) => {
      handleIncomingUrl(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, [router]);
}
