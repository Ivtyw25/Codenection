import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Heart,
  Radar,
  TriangleAlert,
} from 'lucide-react-native';

import { PipMascot, Timeline } from '@/components/app';
import { Card, Chip, EmptyState, IconButton, Interactive, SegmentedTabs, Txt } from '@/components/ui';
import { formatEstimate, isoDate, startOfDay } from '@/data/format';
import { useDaySlots, useNow, useOutlook } from '@/store/selectors';
import { radius, space, status, useScheme } from '@/theme';
import type { DayOutlook } from '@/data/derive';
import type { PipStateName } from '@/types';

const STATE_TONE: Record<PipStateName, 'success' | 'warning' | 'danger'> = {
  balanced: 'success',
  strained: 'warning',
  wilting: 'warning',
  depleted: 'danger',
  critical: 'danger',
};

const STATE_LABEL: Record<PipStateName, string> = {
  balanced: 'Balanced',
  strained: 'Strained',
  wilting: 'Wilting',
  depleted: 'Depleted',
  critical: 'Critical',
};

type Metric = 'pressure' | 'vitality' | 'state';

const METRICS: { value: Metric; label: string }[] = [
  { value: 'pressure', label: 'Pressure' },
  { value: 'vitality', label: 'Vitality' },
  { value: 'state', label: 'Pip' },
];

/** How far the outlook is asked to reach. A month either way covers the grid. */
const WINDOW = { back: 45, forward: 45 };

/**
 * Calendar.
 *
 * ── What this replaced, and why ────────────────────────────────────────────
 *
 * This tab was Reflect: seven bars, the last seven days, pick a metric. It was
 * honest, every number in it was real, and it answered a question nobody has.
 * A student does not open a wellbeing app at 9am to learn that Tuesday was
 * worse than Monday. They open it to find out which day this week is going to
 * hurt — and everything needed to answer that was already in the app, sitting
 * in two modules with nothing joining them to a date.
 *
 * So the same two numbers now live on a grid of days, with the past and the
 * forecast in one surface.
 *
 * ── The one rule this screen exists to keep ────────────────────────────────
 *
 * A FORECAST MUST NEVER LOOK LIKE A RECORD. Recorded days are filled; forecast
 * days are outlined and carry a dotted edge, the panel says which it is looking
 * at in words, and unrecorded past days are left empty rather than filled with
 * something plausible. An app that draws a guess about Thursday in the same ink
 * as what actually happened on Monday has stopped being a record of anything,
 * and the first time its Thursday is wrong it takes the credibility of every
 * other square with it.
 *
 * ── Why the squares move ───────────────────────────────────────────────────
 *
 * The forward days are not a trend line. Pressure on each is the real
 * `derivePressure` run against the task list that would exist if everything the
 * scheduler placed on earlier days were finished; Vitality is the four
 * sub-stats' own projections recombined through the user's weights. Both are
 * consequences of the plan, so agreeing to a rebalance or accepting a run on
 * Tuesday visibly changes the colour of the squares after it. That feedback —
 * "the thing I just agreed to made Thursday less bad" — is the entire argument
 * for putting a forecast on a calendar rather than in a sentence.
 */
export default function CalendarScreen() {
  const scheme = useScheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const now = useNow();

  const { byDate, worstAhead } = useOutlook(WINDOW);

  const [metric, setMetric] = useState<Metric>('pressure');
  /** Months away from the one containing today. */
  const [monthOffset, setMonthOffset] = useState(0);
  const [selected, setSelected] = useState<string>(() => isoDate(new Date()));

  const month = useMemo(() => {
    const d = startOfDay(now);
    d.setDate(1);
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [now, monthOffset]);

  /**
   * The grid.
   *
   * Padded to whole weeks with the neighbouring months' days so the columns
   * line up under their weekday letters. Those pad days render as ghosts —
   * present for alignment, never selectable, because tapping into a day the
   * header says you are not looking at is how a calendar loses somebody.
   */
  const weeks = useMemo(() => {
    const first = new Date(month);
    const start = new Date(first);
    start.setDate(1 - first.getDay());

    const cells: { date: string; inMonth: boolean }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      cells.push({ date: isoDate(d), inMonth: d.getMonth() === month.getMonth() });
    }

    // Six rows is always enough and often one too many; drop a trailing row
    // that belongs entirely to the next month.
    const rows: { date: string; inMonth: boolean }[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows.filter((row) => row.some((c) => c.inMonth));
  }, [month]);

  const day = byDate.get(selected) ?? null;
  const slots = useDaySlots(day?.known ? selected : null);

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
        <Txt variant="h1">Calendar</Txt>
        <Txt variant="bodySm" muted style={{ marginTop: space[1] }}>
          What each day has cost, and what the plan says the next ones will.
        </Txt>
      </View>

      {/*
        The one thing worth saying before the grid.

        Only appears when there is a genuinely heavy day ahead — a "worst day"
        banner on a quiet fortnight would be the app manufacturing a worry to
        look useful, which is the failure mode every screen in here is written
        against.
      */}
      {worstAhead ? (
        <Interactive
          accessibilityRole="button"
          accessibilityLabel={`The heaviest day ahead is ${headingFor(worstAhead.date, now)}, forecast ${STATE_LABEL[worstAhead.state]} at pressure ${worstAhead.pressure}. Open it.`}
          onPress={() => {
            setSelected(worstAhead.date);
            setMonthOffset(monthsBetween(now, worstAhead.date));
          }}
          radius="lg"
          style={[styles.warn, { backgroundColor: status.warning.bg, borderColor: status.warning.solid }]}
        >
          <TriangleAlert size={16} color={status.warning.solid} />
          <Txt variant="bodySm" color={status.warning.fg} style={{ flex: 1 }}>
            {headingFor(worstAhead.date, now)} is the heaviest day ahead — pressure {worstAhead.pressure},
            reserve {worstAhead.vitality}. It has not happened yet.
          </Txt>
          <ChevronRight size={15} color={status.warning.solid} />
        </Interactive>
      ) : null}

      <SegmentedTabs options={METRICS} value={metric} onChange={setMetric} scrollable={false} />

      {/* ── The grid ────────────────────────────────────────────────────── */}
      <Card style={{ gap: space[3] }}>
        <View style={styles.monthHead}>
          <IconButton
            icon={<ChevronLeft size={18} color={scheme.text} />}
            accessibilityLabel="Previous month"
            size={32}
            onPress={() => setMonthOffset((m) => m - 1)}
          />
          <Txt variant="h3" style={{ flex: 1 }} center>
            {month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </Txt>
          <IconButton
            icon={<ChevronRight size={18} color={scheme.text} />}
            accessibilityLabel="Next month"
            size={32}
            onPress={() => setMonthOffset((m) => m + 1)}
          />
        </View>

        <View style={styles.weekHead}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((letter, i) => (
            <Txt key={i} variant="caption" muted center style={{ flex: 1 }}>
              {letter}
            </Txt>
          ))}
        </View>

        {weeks.map((row, i) => (
          <View key={i} style={styles.week}>
            {row.map((cell) => (
              <DayCell
                key={cell.date}
                date={cell.date}
                outlook={byDate.get(cell.date) ?? null}
                inMonth={cell.inMonth}
                metric={metric}
                selected={cell.date === selected}
                onPress={() => setSelected(cell.date)}
              />
            ))}
          </View>
        ))}

        {/* ── Legend ───────────────────────────────────────────────────── */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: scheme.textMuted }]} />
            <Txt variant="caption" muted>
              recorded
            </Txt>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.swatch, styles.swatchGhost, { borderColor: scheme.textMuted }]} />
            <Txt variant="caption" muted>
              forecast
            </Txt>
          </View>
          <Txt variant="caption" muted style={{ flex: 1 }}>
            {metric === 'state'
              ? 'Coloured by how Pip reads the day.'
              : metric === 'pressure'
                ? 'Darker is more pressure.'
                : 'Darker is more reserve.'}
          </Txt>
        </View>
      </Card>

      {/* ── The selected day ────────────────────────────────────────────── */}
      {day && day.known ? (
        <DayPanel day={day} now={now} slots={slots} onOpenTask={(id) => router.push(`/task/${id}`)} />
      ) : (
        <Card>
          <EmptyState
            icon={<CalendarClock size={26} color={scheme.textMuted} />}
            title="Nothing recorded for that day"
            body={
              day == null || new Date(selected) > now
                ? 'That is further out than the app is willing to guess. The forecast stops at three weeks — the schedule only plans seven days ahead, and past a fortnight the honest answer about any of these numbers is that nobody knows.'
                : 'Pip was not keeping records that far back. An empty square is the honest version — the alternative is drawing a number nobody could check.'
            }
          />
        </Card>
      )}
    </ScrollView>
  );
}

/**
 * One square.
 *
 * The whole grid's honesty lives in about ten lines here: a recorded day gets a
 * filled tint, a forecast day gets the same hue as an outline with nothing
 * inside it, and a day with no reading gets neither. The number is never drawn
 * differently — a 71 is a 71 — it is the container that says whether it
 * happened.
 */
function DayCell({
  date,
  outlook,
  inMonth,
  metric,
  selected,
  onPress,
}: {
  date: string;
  outlook: DayOutlook | null;
  inMonth: boolean;
  metric: Metric;
  selected: boolean;
  onPress: () => void;
}) {
  const scheme = useScheme();
  const number = new Date(date).getDate();

  if (!inMonth) {
    return <View style={styles.cell} />;
  }

  const known = outlook?.known ?? false;
  const tone = outlook ? STATE_TONE[outlook.state] : 'success';

  // The colour the square is arguing with. Pressure and Vitality are not mirror
  // images — a reserve of 80 is good and a pressure of 80 is not — so intensity
  // is read off the metric's own direction rather than a shared ramp.
  const intensity = !outlook
    ? 0
    : metric === 'pressure'
      ? outlook.pressure / 100
      : metric === 'vitality'
        ? outlook.vitality / 100
        : 1;

  const hue =
    metric === 'state'
      ? status[tone].solid
      : metric === 'pressure'
        ? status[outlook && outlook.pressure >= 70 ? 'danger' : outlook && outlook.pressure >= 45 ? 'warning' : 'success'].solid
        : status[outlook && outlook.vitality >= 65 ? 'success' : outlook && outlook.vitality >= 40 ? 'warning' : 'danger'].solid;

  const actual = outlook?.actual ?? false;
  const value = !outlook
    ? null
    : metric === 'vitality'
      ? outlook.vitality
      : metric === 'pressure'
        ? outlook.pressure
        : null;

  return (
    <Interactive
      accessibilityRole="button"
      accessibilityLabel={
        known && outlook
          ? `${new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}. ` +
            `${actual ? 'Recorded' : 'Forecast'}: pressure ${outlook.pressure}, reserve ${outlook.vitality}, ${STATE_LABEL[outlook.state]}.`
          : `${new Date(date).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}. No reading.`
      }
      onPress={onPress}
      radius="md"
      style={styles.cell}
    >
      <View
        style={[
          styles.square,
          {
            backgroundColor: known && actual ? withAlpha(hue, 0.1 + intensity * 0.55) : 'transparent',
            borderColor: known ? (actual ? 'transparent' : hue) : scheme.border,
            borderStyle: known && !actual ? 'dashed' : 'solid',
            borderWidth: known && actual ? 0 : 1,
            opacity: known ? 1 : 0.35,
          },
          selected && { borderWidth: 2, borderStyle: 'solid', borderColor: scheme.text },
        ]}
      >
        <Txt
          variant="caption"
          color={outlook?.today ? scheme.text : known ? scheme.textSecondary : scheme.textDisabled}
          style={outlook?.today ? styles.today : undefined}
        >
          {number}
        </Txt>
        {value != null ? (
          <Txt variant="caption" color={scheme.textMuted} style={styles.cellValue}>
            {value}
          </Txt>
        ) : known && outlook ? (
          <View style={[styles.stateDot, { backgroundColor: hue }]} />
        ) : null}
      </View>
    </Interactive>
  );
}

/**
 * Everything about one day.
 *
 * Leads with whether it happened, then the two numbers, then what the plan puts
 * on it. The order is the point: a student reading a forecast square needs to
 * know it is a forecast before they know what it says, or they will remember
 * the number and forget the caveat.
 */
function DayPanel({
  day,
  now,
  slots,
  onOpenTask,
}: {
  day: DayOutlook;
  now: Date;
  slots: ReturnType<typeof useDaySlots>;
  onOpenTask: (id: string) => void;
}) {
  const scheme = useScheme();
  const tone = STATE_TONE[day.state];

  return (
    <Card style={{ gap: space[3] }}>
      <View style={styles.panelHead}>
        <PipMascot size={52} state={day.state} />
        <View style={{ flex: 1, gap: space[1] }}>
          <Txt variant="h3">{headingFor(day.date, now)}</Txt>
          <View style={styles.panelChips}>
            <Chip
              label={day.today ? 'Today · live' : day.actual ? 'Recorded' : 'Forecast'}
              size="sm"
              tone={day.actual ? 'neutral' : 'warning'}
              icon={
                day.actual ? (
                  <CheckCircle2 size={11} color={scheme.textSecondary} />
                ) : (
                  <Radar size={11} color={status.warning.solid} />
                )
              }
            />
            <Chip label={STATE_LABEL[day.state]} size="sm" tone={tone} />
          </View>
        </View>
      </View>

      <View style={styles.readings}>
        <Reading label="Pressure" value={day.pressure} kind="pressure" />
        <View style={[styles.divider, { backgroundColor: scheme.border }]} />
        <Reading label="Reserve" value={day.vitality} kind="vitality" />
      </View>

      {/*
        Where the forecast came from, said on the day it is about. It is one
        sentence and it is the difference between a number somebody trusts and a
        number somebody believes.
      */}
      <Txt variant="caption" muted>
        {day.actual
          ? day.today
            ? 'Live, off your task list as it stands this second. It moves as you tick things.'
            : `Recorded at the end of the day${day.tasksCompleted > 0 ? ` · ${day.tasksCompleted} ${day.tasksCompleted === 1 ? 'task' : 'tasks'} closed` : ''}.`
          : 'Projected: everything your plan schedules before this day counted as done, your four sub-stats carried forward on their own trend, and any recovery you have already agreed to added back in.'}
      </Txt>

      {/* ── What is on it ────────────────────────────────────────────────── */}
      {day.blocks > 0 ? (
        <>
          <View style={styles.loadRow}>
            <Clock size={13} color={scheme.textMuted} />
            <Txt variant="caption" muted style={{ flex: 1 }}>
              {day.blocks} {day.blocks === 1 ? 'block' : 'blocks'} · {formatEstimate(day.plannedMin)}
              {day.dueCount > 0 ? ` · ${day.dueCount} due` : ''}
            </Txt>
            {day.recoveryBlocks > 0 ? (
              <Chip
                label={`${day.recoveryBlocks} recovery`}
                size="sm"
                tone="success"
                icon={<Heart size={10} color={status.success.solid} />}
              />
            ) : null}
          </View>
          <Timeline slots={slots} now={now} showParent onOpen={(slot) => onOpenTask(slot.taskId)} />
        </>
      ) : (
        <Txt variant="caption" muted>
          {day.actual
            ? 'Nothing on the plan for that day.'
            : 'Nothing scheduled yet. A clear day this far out usually means the work has not been broken down, not that there is none.'}
        </Txt>
      )}
    </Card>
  );
}

function Reading({ label, value, kind }: { label: string; value: number; kind: 'pressure' | 'vitality' }) {
  const tone =
    kind === 'pressure'
      ? value >= 70
        ? 'danger'
        : value >= 45
          ? 'warning'
          : 'success'
      : value >= 65
        ? 'success'
        : value >= 40
          ? 'warning'
          : 'danger';

  return (
    <View style={styles.reading}>
      <Txt variant="h2" color={status[tone].fg}>
        {value}
      </Txt>
      <Txt variant="caption" muted>
        {label}
      </Txt>
    </View>
  );
}

/** "Today" · "Tomorrow" · "Thursday 18 Sep" — the panel's own heading. */
function headingFor(iso: string, now: Date): string {
  const d = new Date(iso);
  const days = Math.round(
    (startOfDay(d).getTime() - startOfDay(now).getTime()) / 86_400_000,
  );
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

/** Whole months between today's month and the one holding `iso`. */
function monthsBetween(now: Date, iso: string): number {
  const d = new Date(iso);
  return (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth());
}

/**
 * A token colour at partial strength.
 *
 * The palette ships hex, and the grid needs the same hue at a dozen intensities
 * — one per pressure band per day. Generating them here keeps the theme file
 * from growing a tint ramp that only this screen would ever read.
 */
function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha)).toFixed(2)})`;
}

const styles = StyleSheet.create({
  warn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2.5],
    padding: space[3],
    borderWidth: 1,
    borderRadius: radius.lg,
  },

  monthHead: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  weekHead: { flexDirection: 'row' },
  week: { flexDirection: 'row' },
  cell: { flex: 1, padding: 2 },
  square: {
    aspectRatio: 1,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  cellValue: { fontSize: 9, lineHeight: 11 },
  stateDot: { width: 5, height: 5, borderRadius: radius.pill },
  today: { fontWeight: '700' },

  legend: { flexDirection: 'row', alignItems: 'center', gap: space[3], flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  swatch: { width: 10, height: 10, borderRadius: radius.sm, opacity: 0.6 },
  swatchGhost: { backgroundColor: 'transparent', borderWidth: 1, borderStyle: 'dashed' },

  panelHead: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  panelChips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[1.5] },
  readings: { flexDirection: 'row', alignItems: 'center', gap: space[5] },
  reading: { alignItems: 'center', gap: space[0.5], flex: 1 },
  divider: { width: 1, height: 32 },
  loadRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
});
