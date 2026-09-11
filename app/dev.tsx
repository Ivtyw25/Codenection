/**
 * /dev — review harness. NOT part of the product surface.
 *
 * Two jobs: flip the demo scenario so every screen's Loading / Empty / Critical
 * branch is reachable, and show the full mascot state sheet in one place for
 * comparison against `pip-mascot-identity.md` §1.3.
 *
 * Delete this file before shipping.
 */

import { ScrollView, View } from 'react-native';
import { Link } from 'expo-router';

import { Pip, Sprout } from '@/components/pip';
import { Card, Chip, Header, Screen, Txt } from '@/components/ui';
import { SCENARIOS, useDemo } from '@/mock/demo';
import { colors, space } from '@/theme';
import type { PipPose, PipStateName, SubStat } from '@/types';

const STATES: { state: PipStateName; cause?: 'pressure' | 'vitality'; label: string }[] = [
  { state: 'balanced', label: 'Balanced' },
  { state: 'strained', label: 'Strained' },
  { state: 'wilting', label: 'Wilting' },
  { state: 'depleted', label: 'Depleted' },
  { state: 'critical', cause: 'pressure', label: 'Critical — pressure' },
  { state: 'critical', cause: 'vitality', label: 'Critical — vitality' },
];

const POSES: PipPose[] = [
  'welcome',
  'listening',
  'thinking',
  'celebrating',
  'tierUnlock',
  'resting',
  'empty',
];

const SUBSTATS: SubStat[] = ['rest', 'physical', 'mood', 'connection'];

const ROUTES = [
  { href: '/welcome', label: 'SCR-00 Welcome' },
  { href: '/onboarding/name', label: 'SCR-02 Name Pip' },
  { href: '/onboarding/discover', label: 'SCR-03 Discovery' },
  { href: '/onboarding/domains', label: 'SCR-04 Domains' },
  { href: '/onboarding/baseline/d1', label: 'SCR-05 Per-domain baseline' },
  { href: '/onboarding/whole-person', label: 'SCR-06 Whole person' },
  { href: '/onboarding/integrations', label: 'SCR-07 Integrations' },
  { href: '/onboarding/reveal', label: 'SCR-08 Reveal' },
  { href: '/onboarding/tutorial', label: 'SCR-09 Tutorial' },
  { href: '/(tabs)/home', label: 'SCR-10 Home' },
  { href: '/(tabs)/tasks', label: 'SCR-11 Tasks' },
  { href: '/tasks/t1', label: 'SCR-13 Task detail' },
  { href: '/(tabs)/pip', label: 'SCR-12 Pip detail' },
  { href: '/(tabs)/reflect', label: 'SCR-14 Reflect' },
  { href: '/pip/shop', label: 'SCR-15 Shop' },
  { href: '/pip/friends', label: 'SCR-16 Friends' },
  { href: '/capture', label: 'SCR-20 Capture' },
  { href: '/capture/review', label: 'SCR-21 AI review' },
  { href: '/checkin', label: 'SCR-22 Check-in' },
  { href: '/nudge', label: 'SCR-23 Nudge' },
  { href: '/recover/mood', label: 'SCR-24 Guided recovery' },
  { href: '/critical?cause=pressure', label: 'SCR-30 Critical (pressure)' },
  { href: '/critical?cause=vitality', label: 'SCR-30 Critical (vitality)' },
  { href: '/unlock?tier=companion', label: 'SCR-31 Tier unlock' },
] as const;

export default function DevScreen() {
  const demo = useDemo();

  return (
    <Screen>
      <Header title="Review harness" subtitle="Not part of the product" />

      <Card style={{ marginTop: space[3] }}>
        <Txt variant="h4">Scenario</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginTop: space[3] }}>
          {SCENARIOS.map((s) => (
            <Chip
              key={s.value}
              label={s.label}
              selected={demo.scenario === s.value}
              onPress={() => demo.setScenario(s.value)}
            />
          ))}
        </View>
        <Txt variant="bodySm" color={colors.textSecondary} style={{ marginTop: space[3] }}>
          Pressure {Math.round(demo.capacity.pressure)} · Vitality{' '}
          {Math.round(demo.capacity.vitality)}
        </Txt>
      </Card>

      <Txt variant="h3" style={{ marginTop: space[5], marginBottom: space[3] }}>
        Screens
      </Txt>
      <View style={{ gap: space[2] }}>
        {ROUTES.map((r) => (
          <Link key={r.href} href={r.href as never} asChild>
            <Card padding={space[3]} onPress={() => {}} accessibilityLabel={r.label}>
              <Txt variant="h4" color={colors.actionQuiet}>
                {r.label}
              </Txt>
            </Card>
          </Link>
        ))}
      </View>

      <Txt variant="h3" style={{ marginTop: space[5], marginBottom: space[3] }}>
        Live capacity states
      </Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space[3] }}>
        {STATES.map((s) => (
          <View key={s.label} style={{ alignItems: 'center', width: 140 }}>
            <Pip size={120} state={s.state} criticalCause={s.cause ?? null} />
            <Txt variant="caption" color={colors.textSecondary} center>
              {s.label}
            </Txt>
          </View>
        ))}
      </ScrollView>

      <Txt variant="h3" style={{ marginTop: space[5], marginBottom: space[3] }}>
        Journey poses
      </Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space[3] }}>
        {POSES.map((p) => (
          <View key={p} style={{ alignItems: 'center', width: 140 }}>
            <Pip size={120} pose={p} />
            <Txt variant="caption" color={colors.textSecondary}>
              {p}
            </Txt>
          </View>
        ))}
      </ScrollView>

      <Txt variant="h3" style={{ marginTop: space[5], marginBottom: space[3] }}>
        Lowest sub-stat flourish
      </Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space[3] }}>
        {SUBSTATS.map((s) => (
          <View key={s} style={{ alignItems: 'center', width: 140 }}>
            <Pip size={120} state="balanced" lowestSubStat={s} />
            <Txt variant="caption" color={colors.textSecondary}>
              low {s}
            </Txt>
          </View>
        ))}
      </ScrollView>

      <Txt variant="h3" style={{ marginTop: space[5], marginBottom: space[3] }}>
        Sprout health indicator
      </Txt>
      <View style={{ flexDirection: 'row', gap: space[4], alignItems: 'center' }}>
        {[100, 60, 20, 0].map((v) => (
          <View key={v} style={{ alignItems: 'center' }}>
            <Sprout size={32} vitality={v} />
            <Txt variant="caption" color={colors.textSecondary}>
              {v}
            </Txt>
          </View>
        ))}
      </View>
    </Screen>
  );
}
