/**
 * SCR-00 — Welcome / Auth.
 * Route `/welcome` · Goal: get the user into onboarding.
 *
 * Entrance is a single orchestrated moment: the mascot fades and scales in on
 * `--motion-pip`, the text follows at +120ms, and nothing else animates.
 */

import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { Pip } from '@/components/pip';
import { Button, InlineBar, StickyFooter, Txt } from '@/components/ui';
import { brand, colors, radius, SCREEN_PADDING, space, useMotion } from '@/theme';
import { alpha } from '@/lib/color';

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const motion = useMotion();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mascot = useSharedValue(0);
  const text = useSharedValue(0);

  useEffect(() => {
    mascot.value = withTiming(1, motion.t('pip'));
    text.value = withDelay(120, withTiming(1, motion.t('base')));
  }, []);

  const mascotStyle = useAnimatedStyle(() => ({
    opacity: mascot.value,
    transform: [{ scale: 0.9 + mascot.value * 0.1 }],
  }));

  const textStyle = useAnimatedStyle(() => ({ opacity: text.value }));

  function start() {
    setBusy(true);
    setError(null);
    // Frontend stage: no auth call, just the transition into onboarding.
    setTimeout(() => {
      setBusy(false);
      router.replace('/onboarding/name');
    }, 350);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1, alignItems: 'center', paddingTop: insets.top + 96 }}>
        {/* Soft honey radial wash behind the mascot. */}
        <Animated.View
          style={[
            {
              width: 260,
              height: 260,
              borderRadius: radius.full,
              backgroundColor: alpha(brand.accent, 0.2),
              alignItems: 'center',
              justifyContent: 'center',
            },
            mascotStyle,
          ]}
        >
          <Pip size={220} pose="welcome" accessibilityLabel="Pip, waving hello" />
        </Animated.View>

        <Animated.View
          style={[
            { paddingHorizontal: SCREEN_PADDING, alignItems: 'center', marginTop: space[5] },
            textStyle,
          ]}
        >
          <Txt variant="h1" center>
            Meet Pip.
          </Txt>
          <Txt
            variant="bodyLg"
            color={colors.textSecondary}
            center
            numberOfLines={2}
            style={{ marginTop: space[2] }}
          >
            A companion that carries what you carry — and helps you set it down.
          </Txt>
        </Animated.View>
      </View>

      <StickyFooter>
        {error ? (
          <InlineBar tone="destructive" icon="alert-circle">
            {error}
          </InlineBar>
        ) : null}
        <Button label="Get started." loading={busy} onPress={start} />
        <Button
          label="I already have an account."
          variant="text"
          disabled={busy}
          onPress={() => router.replace('/(tabs)/home')}
        />
      </StickyFooter>
    </View>
  );
}
