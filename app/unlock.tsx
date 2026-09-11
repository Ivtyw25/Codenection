/**
 * SCR-31 — Tier unlock (celebration modal).
 * Route `/unlock` · Goal: reward earned progress.
 *
 * Tier is the persistent IDENTITY layer, separate from daily state — which is
 * the whole mechanism that stops a rough week feeling like it erased months of
 * progress (§1.1).
 *
 * This modal never interrupts a Critical state; it is queued until after
 * recovery.
 */

import { useEffect } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Pip } from '@/components/pip';
import { Button, Txt } from '@/components/ui';
import { brand, colors, elevation, radius, SCREEN_PADDING, space, useMotion } from '@/theme';
import { alpha } from '@/lib/color';
import { TIERS, type TierName } from '@/types';

export default function UnlockScreen() {
  const router = useRouter();
  const motion = useMotion();
  const { tier } = useLocalSearchParams<{ tier?: string }>();

  const tierName = (tier as TierName) ?? 'sprout';
  const meta = TIERS.find((t) => t.name === tierName) ?? TIERS[1];

  const burst = useSharedValue(0);

  useEffect(() => {
    burst.value = withTiming(1, motion.t('celebrate'));
  }, []);

  const dialogStyle = useAnimatedStyle(() => ({
    opacity: burst.value,
    // Reduced motion collapses this to a plain fade — no bounce.
    transform: [{ scale: motion.reduced ? 1 : 0.9 + burst.value * 0.1 }],
  }));

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.scrim,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SCREEN_PADDING,
      }}
    >
      <Animated.View
        style={[
          {
            width: '100%',
            backgroundColor: colors.card,
            borderRadius: radius.xl,
            overflow: 'hidden',
            alignItems: 'center',
            paddingBottom: space[5],
          },
          elevation[4],
          dialogStyle,
        ]}
      >
        {/* Honey soft top wash. */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 200,
            backgroundColor: alpha(brand.accent, 0.35),
          }}
        />

        <View style={{ paddingTop: space[5] }}>
          <Pip
            size={180}
            pose="tierUnlock"
            tier={tierName}
            accessibilityLabel={`Pip wearing the ${meta.label} accessory`}
          />
        </View>

        <Txt variant="h2" center style={{ marginTop: space[3] }}>
          You reached {meta.label}!
        </Txt>
        <Txt
          variant="bodyMd"
          color={colors.textSecondary}
          center
          style={{ marginTop: space[2], paddingHorizontal: space[5] }}
        >
          {meta.unlocks}
        </Txt>

        <View style={{ width: '100%', paddingHorizontal: space[5], marginTop: space[5], gap: space[2] }}>
          {/* dismissTo, not back()-then-push(): the two calls race, and the
              push can land before the modal has finished dismissing. */}
          <Button label="See it on Pip" onPress={() => router.dismissTo('/(tabs)/pip')} />
          <Button label="Later" variant="text" onPress={() => router.back()} />
        </View>
      </Animated.View>
    </View>
  );
}
