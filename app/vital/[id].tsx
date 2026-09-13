import { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Activity,
  ArrowLeft,
  ChevronRight,
  Lightbulb,
  Moon,
  Smile,
  Sparkles,
  Users,
} from 'lucide-react-native';

import { Card, Chip, EmptyState, IconButton, Interactive, Screen, Txt } from '@/components/ui';
import { formatDayHeading } from '@/data/format';
import type { DriverTone } from '@/data/explain';
import {
  useCapacity,
  useVital,
  useVitalExplanation,
  useVitalSeries,
  useVitals,
} from '@/store/selectors';
import { radius, space, status, useScheme } from '@/theme';
import type { VitalId, VitalReading, VitalStanding } from '@/types';

const ICONS: Record<VitalId, typeof Moon> = {
  rest: Moon,
  mood: Smile,
  physical: Activity,
  social: Users,
};

const TONE: Record<VitalStanding, 'success' | 'warning' | 'danger'> = {
  strong: 'success',
  fair: 'warning',
  low: 'danger',
};

const STANDING_LABEL: Record<VitalStanding, string> = {
  strong: 'At your mark',
  fair: 'Slightly under',
  low: 'Below your mark',
};

const DRIVER_TONE: Record<DriverTone, 'success' | 'warning' | 'danger'> = {
  good: 'success',
  watch: 'warning',
  bad: 'danger',
};

const CHART_HEIGHT = 130;

/**
 * One sub-stat, explained.
 *
 * The Pip tab can say Vitality is 68. This page is the only place that can say
 * *why* — which of the four is dragging, how long it has been dragging, what
 * that gap costs in points, and what would move it today.
 *
 * The bar chart is drawn against this user's own target rather than against
 * 100, because 44 is only "bad" relative to the 60 they told us they need. The
 * target line is the whole reading; the axis is decoration.
 */
export default function VitalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scheme = useScheme();

  const vitalId = id as VitalId;
  const reading = useVital(vitalId);
  const series = useVitalSeries(vitalId);
  const explanation = useVitalExplanation(vitalId);
  const all = useVitals();
  const capacity = useCapacity();

  const close = useCallback(() => router.back(), [router]);

  if (!reading || !explanation) {
    return (
      <Screen>
        <EmptyState
          icon={<Sparkles size={28} color={scheme.textMuted} />}
          title="No such sub-stat"
          body="Vitality is made of Rest & Sleep, Mood & Stress, Physical Vitality and Social Connection."
          action={{ label: 'Go back', onPress: close }}
        />
      </Screen>
    );
  }

  const Icon = ICONS[reading.id];
  const tone = TONE[reading.standing];
  const others = all.filter((r) => r.id !== reading.id);

  return (
    <Screen scroll={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.head}>
          <IconButton
            icon={<ArrowLeft size={18} color={scheme.text} />}
            accessibilityLabel="Go back"
            size={40}
            onPress={close}
          />
          <Txt variant="caption" muted style={[styles.eyebrow, { flex: 1 }]}>
            VITALITY SUB-STAT
          </Txt>
        </View>

        {/* ── The reading ───────────────────────────────────────────────── */}
        <View style={styles.titleRow}>
          <View style={[styles.icon, { backgroundColor: status[tone].bg }]}>
            <Icon size={20} color={status[tone].solid} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="h2">{reading.label}</Txt>
            <Txt variant="caption" muted>
              {Math.round(reading.weight * 100)}% of your Vitality Reserve
            </Txt>
          </View>
        </View>

        <View style={styles.chipRow}>
          <Chip label={`${reading.value} / ${reading.target}`} tone={tone} variant="filled" />
          <Chip label={STANDING_LABEL[reading.standing]} tone={tone} />
          {reading.delta !== 0 ? (
            <Chip
              label={`${reading.delta > 0 ? '+' : ''}${reading.delta} this week`}
              tone={reading.delta > 0 ? 'success' : 'warning'}
            />
          ) : null}
        </View>

        <Txt variant="bodySm" muted style={{ marginTop: space[2] }}>
          {reading.note}
        </Txt>

        {/* ── Trend ─────────────────────────────────────────────────────── */}
        <Card style={styles.chartCard}>
          <View style={styles.chartHead}>
            <Txt variant="h4" style={{ flex: 1 }}>
              Last {series.length} days
            </Txt>
            <View style={styles.legend}>
              <View style={[styles.legendDash, { backgroundColor: scheme.borderStrong }]} />
              <Txt variant="caption" muted>
                your {reading.target} mark
              </Txt>
            </View>
          </View>

          <View
            accessibilityRole="image"
            accessibilityLabel={`${reading.label} over ${series.length} days: ${series
              .map((p) => `${p.isToday ? 'today' : formatDayHeading(p.date)} ${p.value}`)
              .join(', ')}. Your mark is ${reading.target}.`}
            style={styles.chart}
          >
            {/* The mark, drawn across every column — the line the bars are read against. */}
            <View
              pointerEvents="none"
              style={[
                styles.targetLine,
                {
                  bottom: space[5] + (reading.target / 100) * CHART_HEIGHT,
                  borderColor: scheme.borderStrong,
                },
              ]}
            />

            {series.map((point) => {
              const met = point.value >= reading.target;
              return (
                <View key={point.date} style={styles.column}>
                  <Txt variant="caption" color={scheme.textDisabled} style={styles.value}>
                    {point.value}
                  </Txt>
                  <View style={[styles.track, { backgroundColor: scheme.surfaceAlt }]}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: Math.max(4, (point.value / 100) * CHART_HEIGHT),
                          backgroundColor: met ? status.success.solid : status[tone].solid,
                          opacity: point.isToday ? 1 : 0.6,
                        },
                      ]}
                    />
                  </View>
                  <Txt
                    variant="caption"
                    color={point.isToday ? scheme.text : scheme.textMuted}
                    numberOfLines={1}
                  >
                    {point.isToday
                      ? 'Now'
                      : new Date(point.date).toLocaleDateString(undefined, { weekday: 'narrow' })}
                  </Txt>
                </View>
              );
            })}
          </View>
        </Card>

        {/* ── Why ───────────────────────────────────────────────────────── */}
        <View style={styles.sectionHead}>
          <Sparkles size={15} color={scheme.primary} />
          <Txt variant="h4" style={{ flex: 1 }}>
            What Pip reads into this
          </Txt>
        </View>

        <Txt variant="body" style={{ marginBottom: space[2.5] }}>
          {explanation.headline}
        </Txt>

        <View style={{ gap: space[2] }}>
          {explanation.drivers.map((driver) => (
            <View key={driver.text} style={styles.driver}>
              <View
                style={[
                  styles.driverDot,
                  { backgroundColor: status[DRIVER_TONE[driver.tone]].solid },
                ]}
              />
              <Txt variant="bodySm" muted style={{ flex: 1 }}>
                {driver.text}
              </Txt>
            </View>
          ))}
        </View>

        {/*
          The honesty note. Everything above is arithmetic over the user's own
          readings and their own targets — saying so is what makes the numbers
          checkable, and an explanation nobody can check is worth nothing.
        */}
        <Txt variant="caption" color={scheme.textDisabled} style={{ marginTop: space[3] }}>
          Worked out from your own readings, your {reading.target} mark and the{' '}
          {Math.round(reading.weight * 100)}% weight you give this stat. No part of it is a guess
          about you.
        </Txt>

        {/* ── Suggestions ───────────────────────────────────────────────── */}
        <View style={styles.sectionHead}>
          <Lightbulb size={15} color={status.warning.solid} />
          <Txt variant="h4" style={{ flex: 1 }}>
            {reading.standing === 'strong' ? 'Worth keeping up' : 'What would move it'}
          </Txt>
        </View>

        <View style={{ gap: space[2.5] }}>
          {explanation.suggestions.map((suggestion) => (
            <Card key={suggestion.title} style={styles.suggestion}>
              <View style={styles.suggestionHead}>
                <Txt variant="h4" style={{ flex: 1 }}>
                  {suggestion.title}
                </Txt>
                <Chip label={suggestion.lift} size="sm" tone="success" />
              </View>
              <Txt variant="bodySm" muted>
                {suggestion.why}
              </Txt>
            </Card>
          ))}
        </View>

        {/* ── The other three ───────────────────────────────────────────── */}
        <View style={styles.sectionHead}>
          <Txt variant="h4" style={{ flex: 1 }}>
            The rest of your reserve
          </Txt>
          <Txt variant="caption" muted>
            {capacity.vitality}% total
          </Txt>
        </View>

        <View style={{ gap: space[2] }}>
          {others.map((other) => (
            <OtherStat
              key={other.id}
              reading={other}
              onPress={() => router.replace({ pathname: '/vital/[id]', params: { id: other.id } })}
            />
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

/**
 * A sibling sub-stat.
 *
 * Present so the four are readable against each other — a Rest score of 71
 * only means something next to the Social score of 44 that is actually doing
 * the damage. Navigates with `replace`, so tapping through all four does not
 * build a back stack four pages deep.
 */
function OtherStat({ reading, onPress }: { reading: VitalReading; onPress: () => void }) {
  const scheme = useScheme();
  const Icon = ICONS[reading.id];
  const tone = TONE[reading.standing];
  const fill = Math.min(1, reading.value / Math.max(1, reading.target));

  return (
    <Interactive
      accessibilityRole="button"
      accessibilityLabel={`${reading.label}, ${reading.value} of your ${reading.target} mark`}
      onPress={onPress}
      radius="md"
      noScale
      style={[styles.other, { borderColor: scheme.border }]}
    >
      <View style={[styles.otherIcon, { backgroundColor: status[tone].bg }]}>
        <Icon size={14} color={status[tone].solid} />
      </View>

      <View style={{ flex: 1, gap: space[1] }}>
        <Txt variant="bodySm" numberOfLines={1}>
          {reading.label}
        </Txt>
        <View style={[styles.track, styles.otherTrack, { backgroundColor: scheme.surfaceAlt }]}>
          <View
            style={[styles.bar, { width: `${fill * 100}%`, height: '100%', backgroundColor: status[tone].solid }]}
          />
        </View>
      </View>

      <Txt variant="label" color={status[tone].fg}>
        {reading.value}
      </Txt>
      <ChevronRight size={15} color={scheme.textMuted} />
    </Interactive>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: space[10] },
  head: { flexDirection: 'row', alignItems: 'center', gap: space[1.5], marginLeft: -space[2] },
  eyebrow: { letterSpacing: 1.2 },

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space[2.5], marginTop: space[1] },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[1.5], marginTop: space[3] },

  chartCard: { marginTop: space[4], gap: space[3] },
  chartHead: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  legend: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  legendDash: { width: 14, height: 2, borderRadius: radius.pill },
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  targetLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
  },
  column: { alignItems: 'center', gap: space[1], flex: 1 },
  value: { fontSize: 10 },
  track: {
    width: 16,
    height: CHART_HEIGHT,
    borderRadius: radius.sm,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bar: { width: '100%', borderRadius: radius.sm },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1.5],
    marginTop: space[6],
    marginBottom: space[2],
  },
  driver: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2] },
  driverDot: { width: 7, height: 7, borderRadius: radius.pill, marginTop: space[1.5] },

  suggestion: { gap: space[1.5], padding: space[3.5] },
  suggestionHead: { flexDirection: 'row', alignItems: 'center', gap: space[2] },

  other: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2.5],
    padding: space[3],
    borderWidth: 1,
    borderRadius: radius.md,
  },
  otherIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otherTrack: { width: '100%', height: 5 },
});
