import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, TrendingDown, TrendingUp } from 'lucide-react-native';

import { Card, Chip, Txt } from '@/components/ui';
import { useWeekSeries } from '@/store/selectors';
import { radius, space, status, type, useScheme } from '@/theme';
import type { PipStateName } from '@/types';

const STATE_TONE: Record<PipStateName, 'success' | 'warning' | 'danger'> = {
  balanced: 'success',
  strained: 'warning',
  wilting: 'warning',
  depleted: 'danger',
  critical: 'danger',
};

type Metric = 'pressure' | 'vitality' | 'tasksCompleted';

const METRICS: { value: Metric; label: string; max: number; invert: boolean }[] = [
  { value: 'pressure', label: 'Pressure', max: 100, invert: true },
  { value: 'vitality', label: 'Vitality', max: 100, invert: false },
  { value: 'tasksCompleted', label: 'Tasks done', max: 6, invert: false },
];

/**
 * Reflect — the weekly trend.
 *
 * NO FIGMA FRAME EXISTS for this tab. It appears in the bottom bar of all four
 * device frames and has no screen behind it, so nothing here is transcribed.
 *
 * What it is instead: the same seven-day series the streak drawer reads,
 * plotted with nothing but existing tokens and components. Every bar is a real
 * derived number — today's column moves as tasks are ticked on other tabs.
 * When a Reflect frame does exist, the data layer underneath it is already
 * built; only this file should need replacing.
 */
export default function ReflectScreen() {
  const scheme = useScheme();
  const insets = useSafeAreaInsets();
  const week = useWeekSeries();

  const [metric, setMetric] = useState<Metric>('pressure');
  const active = METRICS.find((m) => m.value === metric)!;

  const values = week.map((d) => d[metric]);
  const first = values[0] ?? 0;
  const last = values[values.length - 1] ?? 0;
  const delta = last - first;
  // For pressure, down is good — so "improving" is not the same as "rising".
  const improving = active.invert ? delta < 0 : delta > 0;

  const balancedDays = week.filter((d) => d.state === 'balanced').length;
  const totalDone = week.reduce((sum, d) => sum + d.tasksCompleted, 0);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: scheme.ground }}
      contentContainerStyle={{
        paddingTop: insets.top + space[4],
        paddingHorizontal: space[4],
        paddingBottom: space[10],
        gap: space[4],
      }}
      showsVerticalScrollIndicator={false}
    >
      <View>
        <Txt variant="h1">Reflect</Txt>
        <Txt variant="bodySm" muted style={{ marginTop: space[1] }}>
          Seven days, ending today.
        </Txt>
      </View>

      {/* ── Summary ─────────────────────────────────────────────────────── */}
      <View style={styles.summaryRow}>
        <Card style={styles.summaryCard}>
          <Txt variant="caption" muted>
            Balanced days
          </Txt>
          <Txt variant="h2">
            {balancedDays}
            <Txt variant="bodySm" muted>
              {' '}
              / {week.length}
            </Txt>
          </Txt>
        </Card>

        <Card style={styles.summaryCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[1] }}>
            <CheckCircle2 size={13} color={status.success.solid} />
            <Txt variant="caption" muted>
              Tasks closed
            </Txt>
          </View>
          <Txt variant="h2">{totalDone}</Txt>
        </Card>
      </View>

      {/* ── Chart ───────────────────────────────────────────────────────── */}
      <Card style={{ gap: space[4] }}>
        <View style={styles.chartHead}>
          <Txt variant="h3" style={{ flex: 1 }}>
            {active.label}
          </Txt>
          <Chip
            label={`${delta > 0 ? '+' : ''}${delta} this week`}
            size="sm"
            tone={improving ? 'success' : delta === 0 ? 'neutral' : 'warning'}
            icon={
              improving ? (
                <TrendingUp size={11} color={status.success.solid} />
              ) : delta === 0 ? undefined : (
                <TrendingDown size={11} color={status.warning.solid} />
              )
            }
          />
        </View>

        <View style={styles.chips}>
          {METRICS.map((m) => (
            <Chip
              key={m.value}
              label={m.label}
              size="sm"
              selected={metric === m.value}
              onPress={() => setMetric(m.value)}
            />
          ))}
        </View>

        <View
          accessibilityRole="image"
          accessibilityLabel={`${active.label} over seven days: ${week
            .map((d) => `${d.isToday ? 'today' : new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' })} ${d[metric]}`)
            .join(', ')}`}
          style={styles.chart}
        >
          {week.map((day) => {
            const value = day[metric];
            const height = Math.max(4, (value / active.max) * 120);
            const tone = STATE_TONE[day.state];

            return (
              <View key={day.date} style={styles.column}>
                <Txt variant="caption" muted style={styles.value}>
                  {value}
                </Txt>
                <View style={[styles.track, { backgroundColor: scheme.surfaceAlt }]}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height,
                        backgroundColor: day.isToday ? scheme.primary : status[tone].solid,
                        opacity: day.isToday ? 1 : 0.75,
                      },
                    ]}
                  />
                </View>
                <Txt
                  variant="caption"
                  color={day.isToday ? scheme.text : scheme.textMuted}
                  style={day.isToday ? styles.todayLabel : undefined}
                >
                  {day.isToday
                    ? 'Now'
                    : new Date(day.date).toLocaleDateString(undefined, { weekday: 'narrow' })}
                </Txt>
              </View>
            );
          })}
        </View>
      </Card>

      {/* ── Day list ────────────────────────────────────────────────────── */}
      <Txt variant="h3">Day by day</Txt>
      <View style={{ gap: space[2] }}>
        {[...week].reverse().map((day) => {
          const tone = STATE_TONE[day.state];
          return (
            <Card key={day.date} style={styles.dayRow} padded={false}>
              <View style={[styles.dayPip, { backgroundColor: status[tone].solid }]} />
              <View style={{ flex: 1 }}>
                <Txt variant="h4">
                  {day.isToday
                    ? 'Today'
                    : new Date(day.date).toLocaleDateString(undefined, {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric',
                      })}
                </Txt>
                <Txt variant="caption" muted>
                  Pressure {day.pressure} · Vitality {day.vitality} · {day.tasksCompleted} closed
                </Txt>
              </View>
              <Chip label={day.state} size="sm" tone={tone} />
            </Card>
          );
        })}
      </View>

      <Txt variant="caption" muted>
        No Reflect frame exists in the Figma file. This view is assembled from design-system
        components over the same derived series the rest of the app reads — nothing here is invented
        data.
      </Txt>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  summaryRow: { flexDirection: 'row', gap: space[3] },
  summaryCard: { flex: 1, gap: space[1], padding: space[3.5] },

  chartHead: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  column: { alignItems: 'center', gap: space[1], flex: 1 },
  value: { fontSize: type.caption.fontSize, lineHeight: type.caption.lineHeight },
  track: {
    width: 18,
    height: 120,
    borderRadius: radius.sm,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bar: { width: '100%', borderRadius: radius.sm },
  todayLabel: { fontWeight: '600' },

  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2.5],
    padding: space[3],
  },
  dayPip: { width: 8, height: 8, borderRadius: radius.pill },
});
