import { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Activity,
  ArrowLeft,
  ChevronRight,
  Moon,
  Smile,
  Sparkles,
  Users,
} from 'lucide-react-native';

import { Card, Chip, EmptyState, IconButton, Interactive, Screen, Txt } from '@/components/ui';
import { formatDayHeading } from '@/data/format';
import { useApp } from '@/store/AppStore';
import {
  useCapacity,
  useVital,
  useVitalExplanation,
  useVitalProjection,
  useVitalSeries,
  useVitals,
} from '@/store/selectors';
import { radius, space, status, type, useScheme } from '@/theme';
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

/**
 * What the standing means, said as a threshold rather than as a comparison.
 *
 * These used to read "At your mark" / "Below your mark", which framed the
 * number as a score against a personal best — as though the student had set
 * themselves a target and were being graded on hitting it. That is the wrong
 * relationship entirely. The mark is not an aspiration and missing it is not a
 * failure: it is the level this sub-stat needs to stay above for the reserve to
 * hold, in the same way a fuel gauge has a line on it. So the copy says what
 * the line is for.
 */
const STANDING_LABEL: Record<VitalStanding, string> = {
  strong: 'Above the suggested level',
  fair: 'Dipping under',
  low: 'Under the level you need',
};

const CHART_HEIGHT = 130;

/**
 * One sub-stat, explained.
 *
 * The Pip tab can say Vitality is 68. This page is the only place that can say
 * *why* — which of the four is dragging, how long it has been dragging, and
 * what that gap is costing the reserve.
 *
 * It explains and it does not prescribe. The old "What would move it" section
 * lived here and has gone to the Rebalancer, where a suggestion can be turned
 * into a scheduled block instead of a sentence — and where the student has
 * asked for advice rather than had it attached to a number they only came here
 * to understand.
 *
 * The bar chart is drawn against the suggested level rather than against 100,
 * because 44 is only "low" relative to the 60 this stat needs to stay above.
 * That line is the whole reading; the axis is decoration.
 */
export default function VitalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scheme = useScheme();

  const vitalId = id as VitalId;
  const reading = useVital(vitalId);
  const series = useVitalSeries(vitalId);
  const projected = useVitalProjection(vitalId);
  const explanation = useVitalExplanation(vitalId);
  const all = useVitals();
  const capacity = useCapacity();
  const { data } = useApp();

  /** Recovery blocks already on the plan for this sub-stat — what bends the line. */
  const committed = data.tasks.filter(
    (t) => t.status === 'open' && t.recovery?.vitalId === vitalId,
  ).length;

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

  /*
   * History and forecast, drawn on one axis.
   *
   * Two charts side by side would make the reader compare two pictures to
   * answer one question. The whole value of the projection is that it continues
   * a line they can already see, so it shares the axis, the target line and the
   * scale — and is distinguished by being hollow rather than by being smaller
   * or elsewhere.
   */
  const columns = [
    ...series.map((p) => ({ ...p, projected: false as boolean })),
    ...projected.map((p) => ({ ...p, projected: true as boolean })),
  ];

  const projection = describeProjection(reading, projected, committed);

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

        {/* ── Trend, and where it is heading ────────────────────────────── */}
        <Card style={styles.chartCard}>
          <View style={styles.chartHead}>
            <Txt variant="h4" style={{ flex: 1 }}>
              {series.length} days back, 7 forward
            </Txt>
            <View style={styles.legend}>
              <View style={[styles.legendDash, { backgroundColor: scheme.borderStrong }]} />
              <Txt variant="caption" muted>
                stay above {reading.target}
              </Txt>
            </View>
          </View>

          {/*
            The projection, said in words above the bars it describes.

            A ghosted half of a chart is easy to mistake for more history, and
            mistaking a forecast for a record is the worst possible confusion on
            this particular screen. The sentence states the number and, when the
            student has already committed to recovery, says that the line bends
            because of something they chose — which is the only reason this
            projection is worth drawing rather than merely alarming.
          */}
          <Txt variant="bodySm" color={projection.tone === 'good' ? status.success.fg : scheme.textSecondary}>
            {projection.sentence}
          </Txt>

          <View
            accessibilityRole="image"
            accessibilityLabel={`${reading.label} over the last ${series.length} days: ${series
              .map((p) => `${p.isToday ? 'today' : formatDayHeading(p.date)} ${p.value}`)
              .join(', ')}. ${projection.sentence} The suggested level to stay above is ${reading.target}.`}
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

            {columns.map((point) => {
              const met = point.value >= reading.target;
              return (
                <View key={point.date} style={styles.column}>
                  <Txt variant="caption" color={scheme.textMuted} style={styles.value}>
                    {point.value}
                  </Txt>
                  <View style={[styles.track, { backgroundColor: scheme.surfaceAlt }]}>
                    {/*
                      Projected bars are OUTLINED, not merely faded. Opacity
                      alone reads as "older", which is the one thing these are
                      not — a hollow bar is the conventional way to say "this
                      has not happened yet" and survives being looked at quickly
                      by somebody who is tired.
                    */}
                    <View
                      style={[
                        styles.bar,
                        point.projected && styles.barProjected,
                        {
                          height: Math.max(4, (point.value / 100) * CHART_HEIGHT),
                          backgroundColor: point.projected
                            ? 'transparent'
                            : met
                              ? status.success.solid
                              : status[tone].solid,
                          borderColor: met ? status.success.solid : status[tone].solid,
                          opacity: point.isToday ? 1 : point.projected ? 0.85 : 0.6,
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

        {/*
          Paragraphs, not a bulleted readout.

          This was six coloured dots — "44 against your 60 mark", "down 9 since
          Monday", "5 days running below" — every one of them true, and the set
          of them explaining nothing, because assembling six disconnected facts
          into a causal story is work, and the person on this screen is by
          definition the one with least capacity to do it today. A bulleted
          number is a reading; a sentence is a diagnosis. The prose says what is
          breaking and why it is dropping, which is the question that brought
          them here.
        */}
        <View style={{ gap: space[3] }}>
          {explanation.paragraphs.map((paragraph, i) => (
            <Txt key={i} variant="bodySm" color={scheme.textSecondary}>
              {paragraph}
            </Txt>
          ))}
        </View>

        {/*
          The honesty note. Everything above is arithmetic over the user's own
          readings and the marks suggested for them — saying so is what makes
          the numbers checkable, and an explanation nobody can check is worth
          nothing.
        */}
        <Txt variant="caption" color={scheme.textMuted} style={{ marginTop: space[3] }}>
          {explanation.basis}
        </Txt>

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
 * The forecast, in one sentence.
 *
 * Says the number, names the day, and — this is the part that matters — credits
 * the student's own committed recovery when the line bends upward. A projection
 * that only ever warned would be a weather report about someone's wellbeing; the
 * reason to draw it at all is that accepting a run on Tuesday visibly changes
 * where Sunday lands, and the sentence has to say so or the chart is just a
 * nicer way of being told off.
 */
function describeProjection(
  reading: VitalReading,
  projected: { value: number; date: string }[],
  committed: number,
): { sentence: string; tone: 'good' | 'plain' } {
  if (projected.length === 0) {
    return { sentence: 'Not enough history yet to project the week ahead.', tone: 'plain' };
  }

  const end = projected[projected.length - 1];
  const change = end.value - reading.value;
  const day = new Date(end.date).toLocaleDateString(undefined, { weekday: 'long' });
  const helped = committed > 0;

  const plan = helped
    ? ` That already counts the ${committed} recovery ${committed === 1 ? 'block' : 'blocks'} on your plan.`
    : '';

  if (Math.abs(change) < 3) {
    return {
      sentence: `On the way it is going, this sits around ${end.value} by ${day} — near enough where it is now.${plan}`,
      tone: helped ? 'good' : 'plain',
    };
  }

  if (change > 0) {
    return {
      sentence: `On the way it is going, this reaches about ${end.value} by ${day} — up ${change}.${plan}`,
      tone: 'good',
    };
  }

  const crosses = end.value < reading.target && reading.value >= reading.target;
  return {
    sentence: crosses
      ? `If nothing changes, this drops to about ${end.value} by ${day} — under the ${reading.target} it needs to stay above.${plan}`
      : `If nothing changes, this drifts to about ${end.value} by ${day} — down another ${-change}.${plan}`,
    tone: 'plain',
  };
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
      accessibilityLabel={`${reading.label}, ${reading.value}, against a suggested level of ${reading.target}`}
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
  value: { fontSize: type.caption.fontSize, lineHeight: type.caption.lineHeight },
  track: {
    // Narrower than it was: the chart now carries fourteen columns rather
    // than seven, because half of it is the week ahead.
    width: 9,
    height: CHART_HEIGHT,
    borderRadius: radius.sm,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bar: { width: '100%', borderRadius: radius.sm },
  barProjected: { borderWidth: 1.5, borderStyle: 'dashed' },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1.5],
    marginTop: space[6],
    marginBottom: space[2],
  },

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
