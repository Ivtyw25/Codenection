/**
 * SCR-05 — Per-domain baseline.
 * Route `/onboarding/baseline/:domainId` · Goal: quantify each domain.
 *
 * Three identical questions per domain, deliberately: the student learns the
 * pattern once and repeats it, which is what keeps this fast at 4–6 domains
 * (§A.4). This is the structured half of the hybrid elicitation model — free
 * text is bad at producing numbers, so this part is not a conversation.
 */

import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Feather from '@expo/vector-icons/Feather';

import { StepScaffold } from '@/components/onboarding/StepScaffold';
import { Card, SegmentedControl, Slider, Txt } from '@/components/ui';
import { domains } from '@/mock';
import { brand, colors, space } from '@/theme';

/** Drain ↔ Fulfilment, mapped to the [−1, +1] coefficient in §A.6. */
function fulfilmentLabel(v: number) {
  if (v < 0.34) return 'Draining';
  if (v < 0.67) return 'Neutral';
  return 'Fulfilling';
}

export default function BaselineScreen() {
  const { domainId } = useLocalSearchParams<{ domainId: string }>();

  // expo-router reuses this component across `/baseline/d1` → `/baseline/d2`,
  // so the answers must reset per domain. `key` remounts the form, which is the
  // React-idiomatic reset — resetting via an effect causes a cascading render.
  return <BaselineForm key={domainId} domainId={domainId} />;
}

function BaselineForm({ domainId }: { domainId: string }) {
  const router = useRouter();

  const index = Math.max(0, domains.findIndex((d) => d.id === domainId));
  const domain = domains[index];
  const isLast = index === domains.length - 1;
  const next = domains[index + 1];

  // Untouched sliders default to mid; the footer is enabled immediately.
  const [hours, setHours] = useState(0.4);
  const [fulfilment, setFulfilment] = useState(0.5);
  const [volatility, setVolatility] = useState<'steady' | 'spiky'>('steady');

  return (
    <StepScaffold
      step={5}
      ctaLabel={isLast ? 'Continue' : 'Next domain'}
      onBack={() => router.back()}
      onContinue={() =>
        isLast
          ? router.push('/onboarding/whole-person')
          : router.push(`/onboarding/baseline/${next.id}`)
      }
    >
      <Txt variant="bodySm" color={colors.textSecondary} style={{ marginTop: space[4] }}>
        Domain {index + 1} of {domains.length}
      </Txt>

      <Txt variant="h2" style={{ marginTop: space[3] }}>
        {domain?.name}
      </Txt>

      {/* 2 — Hours per week. */}
      <Animated.View entering={FadeInDown.delay(0).duration(240)}>
        <Card style={{ marginTop: space[5] }}>
          <Txt variant="h4">Roughly how many hours a week?</Txt>
          <Slider
            value={hours}
            onChange={setHours}
            formatValue={(v) => `${Math.round(v * 30)} hrs`}
            accessibilityLabel="Hours per week"
            style={{ marginTop: space[3] }}
          />
        </Card>
      </Animated.View>

      {/* 3 — Drain ↔ Fulfilment. The mechanic that makes two 10-hour
          commitments visibly unequal (§A.6). */}
      <Animated.View entering={FadeInDown.delay(40).duration(240)}>
        <Card style={{ marginTop: space[3] }}>
          <Txt variant="h4">How does it feel to do?</Txt>
          <Slider
            value={fulfilment}
            onChange={setFulfilment}
            gradient={[brand.secondary, colors.muted, brand.primary]}
            accessibilityLabel="Draining to fulfilling"
            leading={
              <Feather name="frown" size={20} color={colors.semantic.destructive.solid} />
            }
            trailing={<Feather name="heart" size={20} color={colors.semantic.success.solid} />}
            style={{ marginTop: space[3] }}
          />
          <Txt
            variant="bodySm"
            color={colors.textSecondary}
            center
            style={{ marginTop: space[2] }}
          >
            {fulfilmentLabel(fulfilment)}
          </Txt>
        </Card>
      </Animated.View>

      {/* 4 — Volatility. Spiky domains are what forecasting watches hardest. */}
      <Animated.View entering={FadeInDown.delay(80).duration(240)}>
        <Card style={{ marginTop: space[3] }}>
          <Txt variant="h4">Is it steady or spiky?</Txt>
          <SegmentedControl
            accessibilityLabel="Volatility"
            options={[
              { value: 'steady', label: 'Steady' },
              { value: 'spiky', label: 'Spiky' },
            ]}
            value={volatility}
            onChange={setVolatility}
            style={{ marginTop: space[3] }}
          />
        </Card>
      </Animated.View>
    </StepScaffold>
  );
}
