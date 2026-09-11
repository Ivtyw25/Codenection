import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
// Imported by weight-specific subpath, NOT from the package barrel. The barrel
// pulls all 18 faces (nine weights x roman/italic) into the bundle; these four
// are the only ones the type scale uses. The teardown called dropping the
// unused weights "free bytes" — this is where that saving is actually taken.
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';

import { useScheme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {
  /* already hidden — not fatal */
});

export default function RootLayout() {
  const scheme = useScheme();

  /**
   * Only the four weights the design system actually uses. The teardown found
   * the source site shipped seven and used four; dropping 100/200/300 is
   * "free bytes" with no visual consequence.
   */
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  // Hold the splash rather than flashing a fallback face. `fontError` still
  // releases it — shipping system-font text beats hanging on the splash.
  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: scheme.ground },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="shop" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen
            name="capture"
            options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="review"
            options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="task/[id]"
            options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
