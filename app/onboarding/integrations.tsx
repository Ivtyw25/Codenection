/**
 * SCR-07 — Integrations.
 * Route `/onboarding/integrations` · Goal: let real deadlines count from day one.
 *
 * Each integration is individually optional, and "Skip for now" is explicitly
 * allowed here — the student controls what the app can access from the start.
 */

import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';

import { StepScaffold } from '@/components/onboarding/StepScaffold';
import { Button, Card, Txt } from '@/components/ui';
import { colors, radius, space } from '@/theme';

type IconName = React.ComponentProps<typeof Feather>['name'];

const SERVICES: { id: string; name: string; icon: IconName; detail: string }[] = [
  { id: 'calendar', name: 'Calendar', icon: 'calendar', detail: 'Classes, shifts and events' },
  { id: 'lms', name: 'Learning platform', icon: 'book-open', detail: 'Assignment deadlines' },
];

export default function IntegrationsScreen() {
  const router = useRouter();
  const [connected, setConnected] = useState<Set<string>>(new Set());

  return (
    <StepScaffold
      step={7}
      ctaLabel="Continue"
      onBack={() => router.back()}
      onSkip={() => router.push('/onboarding/reveal')}
      skipLabel="Skip for now"
      onContinue={() => router.push('/onboarding/reveal')}
    >
      <Txt variant="h2" style={{ marginTop: space[5] }}>
        Connect what you use.
      </Txt>
      <Txt variant="bodySm" color={colors.textSecondary} style={{ marginTop: space[1] }}>
        Optional — you can turn these on later from settings.
      </Txt>

      <View style={{ marginTop: space[4], gap: space[3] }}>
        {SERVICES.map((s) => {
          const isOn = connected.has(s.id);
          return (
            <Card key={s.id} padding={14}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: radius.md,
                    backgroundColor: colors.muted,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Feather name={s.icon} size={20} color={colors.textSecondary} />
                </View>

                <View style={{ flex: 1 }}>
                  <Txt variant="h4">{s.name}</Txt>
                  <Txt variant="bodySm" color={colors.textSecondary}>
                    {s.detail}
                  </Txt>
                </View>

                <Button
                  label={isOn ? 'Connected' : 'Connect'}
                  variant="secondary"
                  full={false}
                  disabled={isOn}
                  onPress={() => setConnected((c) => new Set(c).add(s.id))}
                  style={{ height: 40, borderRadius: radius.full, paddingHorizontal: space[4] }}
                />
              </View>
            </Card>
          );
        })}
      </View>
    </StepScaffold>
  );
}
