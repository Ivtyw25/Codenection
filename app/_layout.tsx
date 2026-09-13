import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRootNavigationState, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';

import { ErrorState, Skeleton, ToastHost, Txt } from '@/components/ui';
import { AppProvider, useApp } from '@/store/AppStore';
import { ReduceMotionProvider, ThemeOverrideProvider, space, useScheme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {
  /* already hidden — not fatal */
});

export default function RootLayout() {
  /**
   * Neue Leiden — the source system's own face, self-hosted here as it is
   * there. Four weights of the seven it ships: the teardown found only
   * 400/500/600/700 are ever used, and "dropping 100/200/300 from the font
   * payload is free bytes". 176 KB of faces becomes 100 KB.
   */
  const [fontsLoaded, fontError] = useFonts({
    'NeueLeiden-Regular': require('../assets/fonts/NeueLeiden-Regular.ttf'),
    'NeueLeiden-Medium': require('../assets/fonts/NeueLeiden-Medium.ttf'),
    'NeueLeiden-SemiBold': require('../assets/fonts/NeueLeiden-SemiBold.ttf'),
    'NeueLeiden-Bold': require('../assets/fonts/NeueLeiden-Bold.ttf'),
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
        <AppProvider>
          <ThemedShell />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Bridges stored settings into the theme layer, then gates every route behind
 * the bootstrap read.
 *
 * The gate is the reason loading and error are real states in this app rather
 * than states the design system merely owns components for: no screen below
 * here has to handle a null world, because none of them mount until there is
 * one — or until the user has been told why there isn't.
 */
function ThemedShell() {
  const { state, reload } = useApp();

  return (
    <ThemeOverrideProvider value={state.data?.settings.theme ?? null}>
      <ReduceMotionProvider value={state.data?.settings.reduceMotion ?? false}>
        <StatusBar style="auto" />
        {state.boot.status === 'error' ? (
          <BootError message={state.boot.error ?? 'Something went wrong.'} onRetry={reload} />
        ) : state.data == null ? (
          <BootSkeleton />
        ) : (
          <>
            <Routes />
            <LaunchCapture />
            <ToastHost />
          </>
        )}
      </ReduceMotionProvider>
    </ThemeOverrideProvider>
  );
}

/**
 * Opens the app on Capture rather than on Home.
 *
 * Home is the densest screen in the app — a day timeline, Pip's state, the
 * week's vitals — and meeting all of it before you have said anything is the
 * overwhelm this app exists to reduce. Landing on Capture puts the one thing
 * you came to do in front of you and lets Home be somewhere you *choose* to
 * go.
 *
 * It is a **push, not a replace**, which is the whole trick: the tabs are
 * still mounted underneath, so closing Capture pops onto a fully-built Home
 * and the tab bar behaves exactly as it always has. Nothing downstream has to
 * know that the app opened somewhere else.
 *
 * Gated on `useRootNavigationState().key` because navigating before the root
 * navigator has mounted is dropped silently, and on a ref so that a re-render
 * never pushes a second copy.
 */
function LaunchCapture() {
  const router = useRouter();
  const navState = useRootNavigationState();
  const pushed = useRef(false);

  const ready = !!navState?.key;

  useEffect(() => {
    if (!ready || pushed.current) return;
    pushed.current = true;
    router.push({ pathname: '/capture', params: { launch: '1' } });
  }, [ready, router]);

  return null;
}

function Routes() {
  const scheme = useScheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: scheme.ground },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="shop" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="inbox" />
      {/*
        Capture is a full-screen card, not a transparent modal. It has to cover
        the tab bar and the screen beneath it — a canvas with the app still
        showing around the edges is not a distraction-free one.
      */}
      <Stack.Screen name="capture" options={{ animation: 'slide_from_bottom' }} />
      {/*
        A full screen, not a sheet. The breakdown is the densest thing the app
        asks anyone to read — four tasks, their steps, what waits on what — and
        a sheet gives it two-thirds of the height plus a drag gesture that
        dismisses the whole batch on a mis-swipe.
      */}
      <Stack.Screen name="clarify" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="review" options={{ animation: 'slide_from_bottom' }} />
      {/*
        A page, not a sheet. Task Detail is now the densest screen in the app —
        a title, two rows of chips, progress, a multi-day timeline, an add-step
        form, notes and resources — and a bottom sheet gave all of that
        two-thirds of the height plus a drag gesture that dismissed the lot on a
        mis-swipe. It is also a destination you navigate TO, so it should push
        like one and come back with the system Back gesture.
      */}
      <Stack.Screen name="task/[id]" options={{ animation: 'slide_from_right' }} />
      {/*
        One sub-stat, explained. A page rather than a drawer because it carries
        a chart, a reasoned explanation and a set of suggestions — and because
        it is where someone goes when they want to understand a number, which is
        not a glance.
      */}
      <Stack.Screen name="vital/[id]" options={{ animation: 'slide_from_right' }} />
      {/*
        Delegation is a full screen, not a sheet: it is opened FROM the review
        sheet, and stacking a second sheet on the first leaves the user unsure
        which one "back" dismisses.
      */}
      <Stack.Screen name="delegate" options={{ animation: 'slide_from_right' }} />

      {/*
        The Rebalancer rises from the bottom, like Capture and Review.

        It is deliberately NOT a push. A push reads as "going deeper into your
        task list", which is the opposite of what this screen does; a sheet
        reads as something offered, that you can dismiss by pushing it back
        down. For a screen whose whole proposition is "you are allowed to put
        things down", the gesture matters.
      */}
      <Stack.Screen name="rebalance" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="categories" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}

/** The shape of Home, before Home has anything to show. */
function BootSkeleton() {
  const scheme = useScheme();

  return (
    <View style={{ flex: 1, backgroundColor: scheme.ground }}>
      <View style={{ height: 220, backgroundColor: scheme.primary }} />
      <View style={{ padding: space[4], gap: space[3], marginTop: -space[6] }}>
        <Skeleton height={148} radius="lg" />
        <Skeleton height={56} radius="lg" />
        <Skeleton height={20} width="45%" />
        <Skeleton height={116} radius="lg" />
        <Skeleton height={116} radius="lg" />
      </View>
    </View>
  );
}

function BootError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const scheme = useScheme();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: scheme.ground,
        justifyContent: 'center',
        paddingHorizontal: space[4],
      }}
    >
      <ErrorState title="Pip is out of reach" body={message} onRetry={onRetry} />
      <Txt variant="caption" muted center>
        Nothing you have done has been lost.
      </Txt>
    </View>
  );
}
