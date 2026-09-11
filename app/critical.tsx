/**
 * SCR-30 — Critical intervention (full-screen modal).
 * Route `/critical` · Goal: calm, supportive de-escalation.
 *
 * THIS SCREEN IS NEVER PUNISHING. There is no failure message, no score-loss
 * message, and no mention of the streak. Recovery is framed as relief: Pip lets
 * out a breath and settles the moment one supportive action is logged.
 *
 * Two framings share this screen. A Pressure-driven Critical ("about to pop")
 * calls for offloading; a Vitality-driven one ("running on empty") calls for
 * rest (§1.2).
 */

import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Pip } from '@/components/pip';
import { Button, Txt } from '@/components/ui';
import { colors, SCREEN_PADDING, space } from '@/theme';
import type { CriticalCause } from '@/types';

const COPY: Record<CriticalCause, { title: string; body: string }> = {
  pressure: {
    title: "Let's set something down.",
    body: "You're carrying more than fits right now. Nothing here is urgent enough to cost you this.",
  },
  vitality: {
    title: "Let's get you some rest.",
    body: "You've been running on empty for a while. The list will still be there afterwards.",
  },
};

export default function CriticalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { cause } = useLocalSearchParams<{ cause?: string }>();

  const criticalCause: CriticalCause = cause === 'pressure' ? 'pressure' : 'vitality';
  const copy = COPY[criticalCause];

  /** 'active' → the intervention; 'settling' → the exhale confirmation. */
  const [phase, setPhase] = useState<'active' | 'settling'>('active');

  function logAction() {
    // Pip exhales and deflates; the outline fades as the state changes.
    setPhase('settling');
    setTimeout(() => router.back(), 1800);
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        paddingTop: insets.top,
        paddingHorizontal: SCREEN_PADDING,
      }}
    >
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[4] }}>
        <Pip
          size={220}
          // The state swap drives the deflate; `--motion-pip` carries it.
          state={phase === 'active' ? 'critical' : 'strained'}
          criticalCause={criticalCause}
          accessibilityLabel={
            phase === 'active' ? 'Pip is at maximum' : 'Pip is settling'
          }
        />

        {phase === 'active' ? (
          <Animated.View entering={FadeIn} style={{ gap: space[3], alignItems: 'center' }}>
            <Txt variant="h2" center>
              {copy.title}
            </Txt>
            <Txt variant="bodyLg" color={colors.textSecondary} center>
              {copy.body}
            </Txt>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn} style={{ alignItems: 'center' }}>
            <Txt variant="h2" center>
              Settling…
            </Txt>
          </Animated.View>
        )}
      </View>

      {phase === 'active' ? (
        <View style={{ paddingBottom: insets.bottom + space[5], gap: space[2] }}>
          <Button label="Log one thing that helps" variant="quiet" onPress={logAction} />
          {/* A quiet exit — dismissing is never penalised. */}
          <Button label="Not now" variant="text" onPress={() => router.back()} />
        </View>
      ) : (
        <View style={{ height: insets.bottom + 120 }} />
      )}
    </View>
  );
}
