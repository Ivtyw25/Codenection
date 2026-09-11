/**
 * SCR-06 — Whole-person baseline (adaptive).
 * Route `/onboarding/whole-person`
 *
 * Seeds the sub-stats the domains don't cover. Sleep is ALWAYS asked — it's
 * foundational. Connection is reworded or skipped when a highly social domain
 * already implies it, and Physical is only asked when no physical-tagged domain
 * surfaced (§A.5). Skipped questions simply don't render — no empty
 * placeholders.
 */

import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { StepScaffold } from '@/components/onboarding/StepScaffold';
import { Card, Slider, Txt } from '@/components/ui';
import { domains, wholePersonQuestions } from '@/mock';
import { colors, space } from '@/theme';

export default function WholePersonScreen() {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, number>>({});

  /**
   * Adaptive skip logic, evaluated from the confirmed domains.
   * A social-tagged domain already answers the Connection question; a
   * physical-tagged one already seeds Physical.
   */
  const hasSocialDomain = domains.some((d) => d.categories.includes('social'));
  const hasPhysicalDomain = domains.some((d) => d.categories.includes('physical'));

  const questions = [
    ...wholePersonQuestions,
    ...(hasSocialDomain
      ? []
      : [
          {
            id: 'w3',
            label: 'How connected do you feel day to day?',
            helper: 'Living situation, people you see regularly.',
            format: (v: number) => (v < 0.33 ? 'Isolated' : v < 0.66 ? 'Some' : 'Well connected'),
            always: false,
          },
        ]),
    ...(hasPhysicalDomain
      ? []
      : [
          {
            id: 'w4',
            label: 'How much do you move in a normal week?',
            helper: 'Anything counts — walking, sport, cycling.',
            format: (v: number) => (v < 0.33 ? 'Rarely' : v < 0.66 ? 'Sometimes' : 'Often'),
            always: false,
          },
        ]),
  ];

  return (
    <StepScaffold
      step={6}
      ctaLabel="Continue"
      onBack={() => router.back()}
      onContinue={() => router.push('/onboarding/integrations')}
    >
      <Txt variant="h2" style={{ marginTop: space[5] }}>
        A little about you.
      </Txt>
      <Txt variant="bodySm" color={colors.textSecondary} style={{ marginTop: space[1] }}>
        The parts your commitments don&apos;t already tell me.
      </Txt>

      <View style={{ marginTop: space[4], gap: space[3] }}>
        {questions.map((q, i) => {
          const v = values[q.id] ?? 0.5;
          return (
            <Animated.View key={q.id} entering={FadeInDown.delay(i * 40).duration(240)}>
              <Card>
                <Txt variant="h4">{q.label}</Txt>
                <Txt variant="bodySm" color={colors.textSecondary} style={{ marginTop: space[1] }}>
                  {q.helper}
                </Txt>
                <Slider
                  value={v}
                  onChange={(nv) => setValues((cur) => ({ ...cur, [q.id]: nv }))}
                  formatValue={q.format}
                  accessibilityLabel={q.label}
                  style={{ marginTop: space[3] }}
                />
              </Card>
            </Animated.View>
          );
        })}
      </View>
    </StepScaffold>
  );
}
