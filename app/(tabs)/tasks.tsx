import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react-native';

import { FilterDrawer, ForestHeader, TaskCard, onForest } from '@/components/app';
import { EmptyState, IconButton, Interactive, SegmentedTabs, Txt } from '@/components/ui';
import {
  dayInitial,
  formatDayPill,
  formatFullDate,
  isoDate,
  startOfDay,
  weekFrom,
} from '@/data/format';
import { useApp } from '@/store/AppStore';
import { useCategories, useCategoryCounts, useNow, useTaskList } from '@/store/selectors';
import { brand, radius, space, status, useScheme } from '@/theme';
import type { RangeFilter } from '@/types';

const RANGES: { value: RangeFilter; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'week', label: 'This Week' },
  { value: 'all', label: 'Everything' },
];

/*
 * The filter row used to be a hardcoded list of five contexts.
 *
 * It is now built from `useCategories()`, because the categories are the
 * user's: someone who added "Placement" gets a Placement tab without the app
 * shipping a new build, and someone who retired "Club" stops being offered it.
 * "All" is the only fixed entry, and it is a pseudo-category rather than a real
 * one — see `CategoryFilter`.
 */

/**
 * The day a range actually points at.
 *
 * `inRange` reads "tomorrow" as the day AFTER the anchor, so the strip has to
 * agree — otherwise the header highlights one day while the list below shows
 * another. Every range except this one is anchored where it says it is.
 */
function focusDay(range: RangeFilter, anchor: Date): Date {
  if (range !== 'tomorrow') return anchor;
  const d = new Date(anchor);
  d.setDate(d.getDate() + 1);
  return d;
}

/** The last day "This Week" reaches — `inRange` allows six days past the anchor. */
function weekEnd(anchor: Date): Date {
  const d = new Date(anchor);
  d.setDate(d.getDate() + 6);
  return d;
}

/** What the "Showing:" line says, per range. */
function showingLabel(range: RangeFilter, anchor: Date): string {
  if (range === 'all') return 'Everything';
  if (range === 'week') return `${formatFullDate(anchor)} – ${formatFullDate(weekEnd(anchor))}`;
  return formatFullDate(focusDay(range, anchor));
}

/** The screen title, which is the same statement as the range tabs. */
function headline(range: RangeFilter, anchor: Date, now: Date): string {
  if (range === 'all') return 'Everything';
  if (range === 'week') return 'This Week';
  if (isoDate(anchor) !== isoDate(now)) return 'Manifest';
  return range === 'tomorrow' ? "Tomorrow's Manifest" : "Today's Manifest";
}

/**
 * Today's Manifest — SCR-11.
 *
 * The frame's date strip is drawn against Oct 23–29 2023 and its filter chips
 * are decorative. Here the strip is the week around a live anchor date, every
 * chip writes to the shared `TaskQuery`, and the list below is the result of
 * running that query — so the header and the list cannot disagree.
 */
export default function TasksScreen() {
  const scheme = useScheme();
  const router = useRouter();
  const now = useNow();

  const { state, setQuery, toggleTask, toggleSubtask, toast } = useApp();
  const tasks = useTaskList();
  const counts = useCategoryCounts();
  const categories = useCategories();

  const [filterOpen, setFilterOpen] = useState(false);

  const anchor = useMemo(() => startOfDay(state.query.anchor), [state.query.anchor]);
  const week = useMemo(() => weekFrom(anchor), [anchor]);

  const shiftDay = useCallback(
    (delta: number) => {
      const next = new Date(anchor);
      next.setDate(next.getDate() + delta);
      Haptics.selectionAsync().catch(() => {});
      setQuery({ anchor: isoDate(next) });
    },
    [anchor, setQuery],
  );

  const completeTask = useCallback(
    (id: string, title: string, wasDone: boolean) => {
      Haptics.impactAsync(
        wasDone ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium,
      ).catch(() => {});
      toggleTask(id);
      if (!wasDone) {
        toast(`“${title.slice(0, 32)}${title.length > 32 ? '…' : ''}” done`, 'success', {
          label: 'Undo',
          run: () => toggleTask(id),
        });
      }
    },
    [toggleTask, toast],
  );

  const filtered = state.query.categoryId !== 'all' || state.query.range !== 'today';

  /*
   * How the strip marks the range.
   *
   * "This Week" bands the whole row rather than picking a day, because the
   * range genuinely covers all of them; "Everything" marks nothing, because it
   * belongs to no day at all. The other two mark exactly the day they filter to.
   */
  const banded = state.query.range === 'week';
  const marked =
    state.query.range === 'today' || state.query.range === 'tomorrow'
      ? isoDate(focusDay(state.query.range, anchor))
      : null;

  return (
    <View style={{ flex: 1, backgroundColor: scheme.ground }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: space[24] }}
        showsVerticalScrollIndicator={false}
      >
        <ForestHeader pad={space[5]}>
          <View style={styles.headerTop}>
            <View style={styles.dateNav}>
              <Interactive
                accessibilityRole="button"
                accessibilityLabel="Previous day"
                onPress={() => shiftDay(-1)}
                radius="pill"
                hitSlop={10}
              >
                <ChevronLeft size={16} color={onForest.secondary} />
              </Interactive>

              <CalendarDays size={14} color={onForest.primary} />
              <Txt variant="caption" color={onForest.primary}>
                {formatDayPill(anchor, now)}
              </Txt>

              <Interactive
                accessibilityRole="button"
                accessibilityLabel="Next day"
                onPress={() => shiftDay(1)}
                radius="pill"
                hitSlop={10}
              >
                <ChevronRight size={16} color={onForest.secondary} />
              </Interactive>
            </View>

            <IconButton
              icon={<SlidersHorizontal size={17} color={onForest.primary} />}
              accessibilityLabel="Filter and sort"
              tone="onDark"
              size={34}
              badge={filtered}
              onPress={() => setFilterOpen(true)}
            />
          </View>

          <Txt variant="h1" color={onForest.primary} style={{ marginTop: space[3] }}>
            {headline(state.query.range, anchor, now)}
          </Txt>

          {/* Week strip — seven days from the anchor, marked per range. */}
          <View
            style={[
              styles.week,
              banded && { backgroundColor: onForest.primary, borderRadius: radius.md },
            ]}
          >
            {week.map((day) => {
              const lit = banded || isoDate(day) === marked;
              const today = isoDate(day) === isoDate(now);

              return (
                <Interactive
                  key={day.toISOString()}
                  accessibilityRole="button"
                  accessibilityLabel={day.toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                  selected={lit && !banded}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    // Picking a day is a statement about THAT day, so the range
                    // narrows to it. Without this, tapping Wednesday while the
                    // range is "Tomorrow" would light up Thursday.
                    setQuery({ anchor: isoDate(day), range: 'today' });
                  }}
                  radius="md"
                  style={[styles.day, lit && !banded && { backgroundColor: onForest.primary }]}
                >
                  <Txt variant="caption" color={lit ? scheme.textMuted : onForest.muted}>
                    {dayInitial(day)}
                  </Txt>
                  <Txt variant="h4" color={lit ? brand.forest : onForest.primary}>
                    {day.getDate()}
                  </Txt>
                  <View
                    style={[
                      styles.todayDot,
                      { backgroundColor: today ? brand.lime : 'transparent' },
                    ]}
                  />
                </Interactive>
              );
            })}
          </View>

          <View style={{ marginTop: space[4] }}>
            <SegmentedTabs
              options={RANGES}
              value={state.query.range}
              onChange={(range) => setQuery({ range })}
              onDark
            />
          </View>
        </ForestHeader>

        <View style={styles.body}>
          <View style={styles.showing}>
            <Txt variant="bodySm" muted>
              Showing: {showingLabel(state.query.range, anchor)}
            </Txt>

            {isoDate(anchor) !== isoDate(now) ? (
              <Interactive
                accessibilityRole="button"
                accessibilityLabel="Jump to today"
                onPress={() => setQuery({ anchor: isoDate(now) })}
                radius="pill"
                style={styles.jump}
              >
                <RotateCcw size={13} color={status.success.fg} />
                <Txt variant="label" color={status.success.fg}>
                  Jump to today
                </Txt>
              </Interactive>
            ) : null}
          </View>

          <SegmentedTabs
            options={[
              { value: 'all', label: 'All', count: counts.all ?? 0, disabled: false },
              ...categories.map((category) => ({
                value: category.id,
                label: category.label,
                count: counts[category.id] ?? 0,
                // A category with nothing in the active range is shown but
                // inert: hiding it would make the row's contents jump around
                // as the date strip moves, and a row that reshuffles under you
                // is exactly the kind of small instability this screen exists
                // to avoid.
                disabled: (counts[category.id] ?? 0) === 0,
              })),
            ]}
            value={state.query.categoryId}
            onChange={(categoryId) => setQuery({ categoryId })}
          />

          <View style={{ gap: space[3], marginTop: space[3] }}>
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                now={now}
                onPress={() => router.push(`/task/${task.id}`)}
                onToggle={() => completeTask(task.id, task.title, task.status === 'done')}
                onToggleSubtask={(subId) => {
                  Haptics.selectionAsync().catch(() => {});
                  toggleSubtask(task.id, subId);
                }}
              />
            ))}
          </View>

          {tasks.length === 0 ? (
            <EmptyState
              icon={<CalendarDays size={26} color={scheme.textMuted} />}
              title={filtered ? 'Nothing matches this filter' : 'Nothing scheduled'}
              body={
                filtered
                  ? `No tasks for ${showingLabel(state.query.range, anchor)} in this context.`
                  : `${formatFullDate(anchor)} is clear. Capture something, or enjoy it.`
              }
              action={
                filtered
                  ? { label: 'Clear filters', onPress: () => setQuery({ categoryId: 'all', range: 'all' }) }
                  : { label: 'Capture a thought', onPress: () => router.push('/capture') }
              }
            />
          ) : null}
        </View>
      </ScrollView>

      <FilterDrawer visible={filterOpen} onClose={() => setFilterOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1.5],
    paddingHorizontal: space[2.5],
    paddingVertical: space[1],
    borderRadius: radius.pill,
    backgroundColor: onForest.fill,
  },

  week: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space[4] },
  day: {
    width: 40,
    paddingVertical: space[1.5],
    borderRadius: radius.md,
    alignItems: 'center',
    gap: space[0.5],
  },
  todayDot: { width: 4, height: 4, borderRadius: radius.pill },

  body: { paddingHorizontal: space[4], paddingTop: space[4], gap: space[3] },
  showing: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 24 },
  jump: { flexDirection: 'row', alignItems: 'center', gap: space[1], paddingVertical: space[1] },

});
