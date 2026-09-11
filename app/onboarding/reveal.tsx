/**
 * SCR-08 — First reveal.
 * Route `/onboarding/reveal` · Goal: the payoff.
 *
 * Pip is rendered in the ACTUAL computed starting state, not always Balanced.
 * "Someone who reported heavy, mostly-draining commitments and poor sleep does
 *  not see a pristine Balanced Pip, which is what establishes that the app was
 *  genuinely listening" (§A.10).
 */

import { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Habitat, Pip } from '@/components/pip';
import { Button, Txt } from '@/components/ui';
import { derivePipState } from '@/lib/pipState';
import { profile } from '@/mock';
import { useDemo } from '@/mock/demo';
import { colors, SCREEN_PADDING, space, useMotion } from '@/theme';
import type { PipStateName } from '@/types';

/** One honest line per starting state — bound to what was actually computed. */
const REVEAL_LINE: Record<PipStateName, string> = {
  balanced: "You've got room right now — let's keep it that way.",
  strained: "Looks like you're already carrying a fair bit — let's keep an eye on it together.",
  wilting: "Your load looks manageable, but your reserves are low. Let's start with rest.",
  depleted: "That's a heavy load on not much reserve. We'll take it a piece at a time.",
  critical: "That's a lot to be carrying. Let's start by setting one thing down.",
};

export default function RevealScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const motion = useMotion();
  const { capacity } = useDemo();

  const derived = derivePipState(capacity);
  const entrance = useSharedValue(0);

  useEffect(() => {
    entrance.value = withTiming(1, motion.t('pip'));
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [{ scale: 0.86 + entrance.value * 0.14 }],
  }));

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        paddingTop: insets.top,
        paddingHorizontal: SCREEN_PADDING,
      }}
    >
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Habitat height={358}>
          <Animated.View style={style}>
            <Pip
              size={220}
              state={derived.state}
              criticalCause={derived.criticalCause}
              lowestSubStat={derived.lowestSubStat}
              accessibilityLabel={`${profile.pipName} is ${colors.pipState[derived.state].label}`}
            />
          </Animated.View>
        </Habitat>

        <Txt variant="h1" center style={{ marginTop: space[5] }}>
          {profile.pipName} is ready.
        </Txt>
        <Txt
          variant="bodyMd"
          color={colors.textSecondary}
          center
          style={{ marginTop: space[2] }}
        >
          {REVEAL_LINE[derived.state]}
        </Txt>
      </View>

      {/* No footer nav here — a single centred primary button. */}
      <View style={{ paddingBottom: insets.bottom + space[5] }}>
        <Button label="Meet your Pip" onPress={() => router.push('/onboarding/tutorial')} />
      </View>
    </View>
  );
}
