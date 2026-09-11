/**
 * Onboarding stack.
 * Deep links are deferred until onboarding completes (§3.4), and the tab bar
 * never renders here — these routes live outside the `(tabs)` layout entirely.
 */

import { Stack } from 'expo-router';

import { colors } from '@/theme';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'slide_from_right',
      }}
    />
  );
}
