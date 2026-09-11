/**
 * SCR-22 — Daily check-in (bottom sheet).
 * Route `/checkin` · Goal: a two-tap mood/stress log.
 *
 * Capped at two taps on purpose: "any longer and daily compliance drops, and an
 * un-logged Mood is a guessed Mood" (§C.4). The result is SMOOTHED into the
 * Mood sub-stat rather than overwriting it — one bad day nudges the trend, it
 * doesn't define it.
 */

import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { Pip } from '@/components/pip';
import { Button, Chip, DragHandle, SheetFooter, SheetShell, Slider, Txt, useToast } from '@/components/ui';
import { domains } from '@/mock';
import { useDemo } from '@/mock/demo';
import { brand, colors, SCREEN_PADDING, space } from '@/theme';
import type { PipStateName } from '@/types';

/**
 * Five stops, emoji-free — Pip's own face carries the scale.
 * Ordered strictly worst → best so the track reads monotonically: Depleted
 * (heavy load AND empty) sits below Wilting (empty but unloaded).
 */
const STOPS: { state: PipStateName; cause?: 'vitality' }[] = [
  { state: 'critical', cause: 'vitality' },
  { state: 'depleted' },
  { state: 'wilting' },
  { state: 'strained' },
  { state: 'balanced' },
];

export default function CheckInScreen() {
  const router = useRouter();
  const toast = useToast();
  const demo = useDemo();

  const [value, setValue] = useState(0.5);
  const [touched, setTouched] = useState(false);
  const [tagged, setTagged] = useState<string | null>(null);

  function done() {
    demo.setCheckInDone(true);
    toast.show('+1 Care', 'care');
    router.back();
  }

  return (
    <SheetShell height={0.58}>
      <View style={{ flex: 1, paddingHorizontal: SCREEN_PADDING }}>
        <DragHandle />

        <Txt variant="h3" style={{ marginBottom: space[4] }}>
          How are you feeling?
        </Txt>

        {/* Pip-face micro-states along the track, very-low → very-good. */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {STOPS.map((s, i) => {
            const active = Math.round(value * (STOPS.length - 1)) === i;
            return (
              <View key={i} style={{ opacity: active ? 1 : 0.4 }}>
                <Pip size={44} state={s.state} criticalCause={s.cause ?? null} />
              </View>
            );
          })}
        </View>

        <Slider
          value={value}
          onChange={(v) => {
            setValue(v);
            setTouched(true);
          }}
          gradient={[colors.semantic.info.solid, colors.semantic.success.solid, brand.primary]}
          accessibilityLabel="Mood and stress level"
          style={{ marginTop: space[3] }}
        />

        {/* Optional domain tag — never required. */}
        <Txt variant="bodySm" color={colors.textSecondary} style={{ marginTop: space[5] }}>
          About anything in particular?
        </Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginTop: space[2] }}>
          {domains.map((d) => (
            <Chip
              key={d.id}
              label={d.name}
              selected={tagged === d.id}
              onPress={() => setTagged(tagged === d.id ? null : d.id)}
            />
          ))}
        </View>
      </View>

      <SheetFooter>
        <Button label="Done" disabled={!touched} onPress={done} />
      </SheetFooter>
    </SheetShell>
  );
}
