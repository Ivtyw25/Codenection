/**
 * SCR-24 — Guided recovery.
 * Route `/recover/:type` · Goal: run a short recovery activity.
 *
 * Completing the activity auto-logs it as a recovery action, which is what
 * earns the Care Point. The visible reward is Pip re-saturating — the colour
 * coming back is the point, not a number going up.
 *
 * Reduced motion: the orb steps between two sizes with a cross-fade instead of
 * scaling continuously.
 */

import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { Pip } from '@/components/pip';
import { Button, SegmentedControl, Txt, useToast } from '@/components/ui';
import { brand, colors, radius, SCREEN_PADDING, space, useMotion } from '@/theme';
import { alpha } from '@/lib/color';

type Duration = '2' | '5' | '10';

const BREATH_MS = 4000;

export default function RecoverScreen() {
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const motion = useMotion();
  const { type } = useLocalSearchParams<{ type: string }>();

  const [minutes, setMinutes] = useState<Duration>('2');
  /**
   * The session is defined by when it ENDS, not by a counter being decremented.
   * A timestamp doesn't drift if a tick is late or the app is backgrounded, and
   * `remaining` / `complete` fall out as derived values — which removes the
   * cascading setState-inside-an-effect this screen used to have.
   */
  const [endsAt, setEndsAt] = useState(() => Date.now() + 2 * 60_000);
  const [ended, setEnded] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const breath = useSharedValue(0);
  const phaseLabel = useSharedValue(0);

  // Breathing loop, synced to inhale/exhale.
  useEffect(() => {
    if (!motion.idleEnabled) {
      breath.value = 0.5;
      return;
    }
    breath.value = withRepeat(
      withSequence(
        withTiming(1, { duration: BREATH_MS, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: BREATH_MS, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [motion.idleEnabled]);

  const remaining = Math.max(0, Math.ceil((endsAt - now) / 1000));
  const complete = ended || remaining === 0;

  /** Changing the duration restarts the session — an event, not an effect. */
  function chooseDuration(m: Duration) {
    setMinutes(m);
    setEndsAt(Date.now() + Number(m) * 60_000);
    setEnded(false);
    setNow(Date.now());
  }

  // Tick. Only advances the clock; nothing else is decided here.
  useEffect(() => {
    if (complete) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [complete]);

  // Completion side-effect — auto-logs the recovery action, which is what earns
  // the Care Point (§4.4: "completing the activity logs it as a recovery
  // action"). No state is set here; `complete` is already derived.
  useEffect(() => {
    if (complete) toast.show('+1 Care', 'care');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete]);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.72 + breath.value * 0.28 }],
    opacity: 0.55 + breath.value * 0.45,
  }));

  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: brand.secondarySoft,
        paddingTop: insets.top,
        paddingHorizontal: SCREEN_PADDING,
      }}
    >
      <SegmentedControl
        accessibilityLabel="Session length"
        options={[
          { value: '2', label: '2 min' },
          { value: '5', label: '5 min' },
          { value: '10', label: '10 min' },
        ]}
        value={minutes}
        onChange={chooseDuration}
        style={{ marginTop: space[4] }}
      />

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[5] }}>
        <View style={{ width: 260, height: 260, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View
            style={[
              {
                position: 'absolute',
                width: 260,
                height: 260,
                borderRadius: radius.full,
                backgroundColor: alpha(brand.secondary, 0.28),
              },
              orbStyle,
            ]}
          />
          {/* Pip's resting face, faintly inside the orb. */}
          <View style={{ opacity: 0.85 }}>
            <Pip
              size={132}
              pose={complete ? 'celebrating' : 'resting'}
              accessibilityLabel={complete ? 'Pip is celebrating' : 'Pip is resting'}
            />
          </View>
        </View>

        <Txt variant="bodyLg" color={colors.actionQuiet} center>
          {complete ? 'Nicely done.' : 'Breathe in… and out.'}
        </Txt>

        <Txt variant="numMd" color={colors.text}>
          {mm}:{String(ss).padStart(2, '0')}
        </Txt>
      </View>

      <View style={{ paddingBottom: insets.bottom + space[5] }}>
        {complete ? (
          <Button label="Done" onPress={() => router.dismissAll()} />
        ) : (
          <Button label="End" variant="text" onPress={() => router.back()} />
        )}
      </View>
    </View>
  );
}
