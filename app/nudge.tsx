/**
 * SCR-23 — Recovery nudge (bottom sheet).
 * Route `/nudge` · Goal: offer a matched recovery action.
 *
 * The sheet is keyed to whichever Vitality sub-stat is currently LOWEST, so the
 * advice is specific rather than generic: low Rest suggests a rest window, low
 * Connection suggests a low-effort hangout.
 *
 * Dismissing carries NO penalty — no streak effect, nothing deducted.
 */

import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { Pip } from '@/components/pip';
import { Button, DragHandle, SheetFooter, SheetShell, Txt } from '@/components/ui';
import { derivePipState, NUDGE_BY_SUBSTAT } from '@/lib/pipState';
import { useDemo } from '@/mock/demo';
import { colors, SCREEN_PADDING, space } from '@/theme';
import { useToast } from '@/components/ui';

export default function NudgeScreen() {
  const router = useRouter();
  const toast = useToast();
  const demo = useDemo();

  const derived = derivePipState(demo.capacity);
  const nudge = NUDGE_BY_SUBSTAT[derived.lowestSubStat];

  /** Rest and Mood route to a guided activity; the others log directly. */
  const guided = derived.lowestSubStat === 'mood' || derived.lowestSubStat === 'rest';

  function start() {
    demo.setNudgeActive(false);
    if (guided) {
      router.replace(`/recover/${derived.lowestSubStat}`);
    } else {
      toast.show('+1 Care', 'care');
      router.back();
    }
  }

  return (
    <SheetShell height={0.52}>
      <View style={{ flex: 1, paddingHorizontal: SCREEN_PADDING }}>
        <DragHandle />

        <View style={{ alignItems: 'center', marginTop: space[2] }}>
          <Pip size={88} pose="resting" accessibilityLabel="Pip, resting" />
        </View>

        <Txt variant="h3" center style={{ marginTop: space[4] }}>
          {nudge.title}
        </Txt>
        <Txt
          variant="bodyMd"
          color={colors.textSecondary}
          center
          style={{ marginTop: space[2] }}
        >
          {nudge.body}
        </Txt>
      </View>

      <SheetFooter>
        <Button label={guided ? 'Start' : nudge.action} onPress={start} />
        <Button
          label="Maybe later"
          variant="text"
          onPress={() => {
            demo.setNudgeActive(false);
            router.back();
          }}
        />
      </SheetFooter>
    </SheetShell>
  );
}
