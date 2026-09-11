/**
 * Root layout.
 *
 * Sets up fonts, gesture handling, safe areas, and the transition patterns from
 * `pip-design-spec.md` §3.2:
 *   - full-page push  → tab roots, domain detail, settings
 *   - bottom sheet    → capture, AI review, nudge, check-in, task detail
 *   - full-screen modal → Critical intervention, onboarding, tier unlock
 */

import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';

import { ToastProvider } from '@/components/ui';
import { DemoProvider } from '@/mock/demo';
import { colors, radius } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {
  /* no-op: the splash may already be hidden on fast refresh */
});

/**
 * Bottom-sheet routes.
 *
 * `sheetAllowedDetents` is REQUIRED on Android — without it react-native-screens
 * lays a `formSheet` out at zero height and the sheet appears not to open at
 * all. The detent per route matches the height the spec gives it: the capture
 * and review sheets are full-height, the check-in is "~40%", and the nudge is
 * compact.
 */
const sheet = {
  presentation: 'transparentModal',
  animation: 'slide_from_bottom',
  contentStyle: { backgroundColor: 'transparent' },
} as const;

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <DemoProvider>
        <ToastProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" options={{ animation: 'none' }} />
          <Stack.Screen name="welcome" options={{ animation: 'fade' }} />

          {/* Onboarding — full-screen, no tab bar (§3.1). */}
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />

          {/* The main shell. */}
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />

          {/* Bottom sheets. */}
          <Stack.Screen name="capture/index" options={sheet} />
          <Stack.Screen name="capture/review" options={sheet} />
          <Stack.Screen name="checkin" options={sheet} />
          <Stack.Screen name="nudge" options={sheet} />
          <Stack.Screen name="tasks/[id]" options={sheet} />

          {/* Full-screen modals. */}
          <Stack.Screen
            name="critical"
            options={{
              presentation: 'fullScreenModal',
              animation: 'fade',
              // "not dismissible by back-swipe — must choose an action" (SCR-30)
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="unlock"
            options={{ presentation: 'transparentModal', animation: 'fade' }}
          />
          <Stack.Screen name="recover/[type]" options={{ animation: 'fade' }} />
        </Stack>
        </ToastProvider>
        </DemoProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
