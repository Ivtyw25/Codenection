import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react-native';

import { FilterDrawer, ForestHeader, TaskCard, onForest } from '@/components/app';
import { EmptyState, IconButton, Interactive, SegmentedTabs, Txt } from '@/components/ui';
import {
  contextLabel,
  dayInitial,
  formatDayPill,
  formatFullDate,
  isoDate,
  startOfDay,
  weekOf,
} from '@/data/format';
import { useApp } from '@/store/AppStore';
import { useContextCounts, useNow, useTaskList } from '@/store/selectors';
import { brand, radius, space, status, useScheme } from '@/theme';
import type { ContextFilter, RangeFilter } from '@/types';

const RANGES: { value: RangeFilter; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'week', label: 'This Week' },
  { value: 'all', label: 'Everything' },
];

const CONTEXTS: ContextFilter[] = ['all', '@academics', '@club', '@internship', '@errands', '@personal'];

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
  const counts = useContextCounts();

  const [filterOpen, setFilterOpen] = useState(false);

  const anchor = useMemo(() => startOfDay(state.query.anchor), [state.query.anchor]);
  const week = useMemo(() => weekOf(anchor), [anchor]);

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

  const filtered = state.query.context !== 'all' || state.query.range !== 'today';

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
            {isoDate(anchor) === isoDate(now) ? "Today's Manifest" : 'Manifest'}
          </Txt>

          {/* Week strip — the seven days around the anchor. */}
          <View style={styles.week}>
            {week.map((day) => {
              const selected = isoDate(day) === isoDate(anchor);
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
                  selected={selected}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setQuery({ anchor: isoDate(day) });
                  }}
                  radius="md"
                  style={[styles.day, selected && { backgroundColor: onForest.primary }]}
                >
                  <Txt variant="caption" color={selected ? scheme.textMuted : onForest.muted}>
                    {dayInitial(day)}
                  </Txt>
                  <Txt variant="h4" color={selected ? brand.forest : onForest.primary}>
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
              Showing: {formatFullDate(anchor)}
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
            options={CONTEXTS.map((value) => ({
              value,
              label: value === 'all' ? 'All' : contextLabel(value),
              count: counts[value] ?? 0,
              disabled: value !== 'all' && (counts[value] ?? 0) === 0,
            }))}
            value={state.query.context}
            onChange={(context) => setQuery({ context })}
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
                  ? `No tasks for ${formatFullDate(anchor)} in this context.`
                  : `${formatFullDate(anchor)} is clear. Capture something, or enjoy it.`
              }
              action={
                filtered
                  ? { label: 'Clear filters', onPress: () => setQuery({ context: 'all', range: 'all' }) }
                  : { label: 'Capture a thought', onPress: () => router.push('/capture') }
              }
            />
          ) : null}
        </View>
      </ScrollView>

      {/*
        Capture FAB.

        The Figma bottom bar is inconsistent between frames — the Shop frame
        shows a "+" in the centre slot, the Home/Tasks/Pip frames show Pip. The
        Pip reading won (3 frames to 1), which leaves capture with no entry
        point, so it gets a FAB on the screen its output lands in.
      */}
      <Interactive
        accessibilityRole="button"
        accessibilityLabel="Capture a new thought"
        onPress={() => router.push('/capture')}
        radius="pill"
        style={[styles.fab, { backgroundColor: scheme.primary, shadowColor: brand.lime }]}
      >
        <Plus size={24} color={scheme.onPrimary} />
      </Interactive>

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

  fab: {
    position: 'absolute',
    right: space[4],
    bottom: space[5],
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    // The lime focus glow, reused as the FAB's lift.
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 10,
  },
});
