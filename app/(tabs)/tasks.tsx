import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Code,
  FileText,
  Plus,
  SlidersHorizontal,
} from 'lucide-react-native';

import { Card, Checkbox, Chip, EmptyState, SegmentedTabs, Txt } from '@/components/ui';
import { RANGE_FILTERS, TASKS, TASK_CONTEXTS, WEEK } from '@/data/mock';
import { brand, n, radius, space, status, useScheme } from '@/theme';
import type { Task, TaskContext } from '@/types';

const ICONS: Record<string, typeof Code> = { CalendarDays, Code, FileText };

export default function TasksScreen() {
  const scheme = useScheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [range, setRange] = useState('today');
  const [context, setContext] = useState<TaskContext | 'all'>('all');

  const visible = useMemo(
    () => (context === 'all' ? TASKS : TASKS.filter((t) => t.context === context)),
    [context],
  );

  return (
    <View style={{ flex: 1, backgroundColor: scheme.ground }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: space[10] }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Forest header ─────────────────────────────────────────────── */}
        <View style={[styles.header, { paddingTop: insets.top + space[2] }]}>
          <View style={styles.headerTop}>
            <View style={styles.dateNav}>
              <ChevronLeft size={16} color="rgba(255,255,255,0.7)" />
              <CalendarDays size={14} color={n[0]} />
              <Txt variant="caption" color={n[0]}>
                TODAY · OCT 25
              </Txt>
              <ChevronRight size={16} color="rgba(255,255,255,0.7)" />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Filter options"
              style={styles.iconButton}
            >
              <SlidersHorizontal size={17} color={n[0]} />
            </Pressable>
          </View>

          <Txt variant="h1" color={n[0]} style={{ marginTop: space[3] }}>
            Today&apos;s Manifest
          </Txt>

          {/* Week strip */}
          <View style={styles.week}>
            {WEEK.map((d, i) => (
              <Pressable
                key={`${d.dow}-${d.day}`}
                accessibilityRole="button"
                accessibilityLabel={`October ${d.day}`}
                accessibilityState={{ selected: !!d.today }}
                style={[styles.day, d.today && { backgroundColor: n[0] }]}
              >
                <Txt
                  variant="caption"
                  color={d.today ? scheme.textMuted : 'rgba(255,255,255,0.55)'}
                >
                  {d.dow}
                </Txt>
                <Txt variant="h4" color={d.today ? brand.forest : n[0]}>
                  {d.day}
                </Txt>
                {d.today ? <View style={styles.todayDot} /> : null}
              </Pressable>
            ))}
          </View>

          {/* Range filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.ranges}
          >
            {RANGE_FILTERS.map((r) => {
              const on = r.value === range;
              return (
                <Pressable
                  key={r.value}
                  onPress={() => setRange(r.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={[
                    styles.range,
                    { backgroundColor: on ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.10)' },
                  ]}
                >
                  <Txt variant="caption" color={on ? n[0] : 'rgba(255,255,255,0.66)'}>
                    {r.label}
                  </Txt>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Body ──────────────────────────────────────────────────────── */}
        <View style={styles.body}>
          <View style={styles.showing}>
            <Txt variant="bodySm" muted>
              Showing: Oct 25, 2023
            </Txt>
            <Pressable accessibilityRole="button" style={styles.jump}>
              <Txt variant="label" color={status.success.fg}>
                Jump to Date
              </Txt>
              <ChevronRight size={15} color={status.success.fg} />
            </Pressable>
          </View>

          <SegmentedTabs options={TASK_CONTEXTS} value={context} onChange={setContext} />

          <View style={{ gap: space[3], marginTop: space[3] }}>
            {visible.map((task) => (
              <TaskCard key={task.id} task={task} onPress={() => router.push(`/task/${task.id}`)} />
            ))}
          </View>

          {visible.length === 0 ? (
            <EmptyState
              icon={<CalendarDays size={26} color={scheme.textMuted} />}
              title="Nothing in this context"
              body="No tasks match this filter for Oct 25."
              action={{ label: 'Show all', onPress: () => setContext('all') }}
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
      <Pressable
        onPress={() => router.push('/capture')}
        accessibilityRole="button"
        accessibilityLabel="Capture a new thought"
        style={[
          styles.fab,
          {
            backgroundColor: scheme.primary,
            bottom: space[5],
            shadowColor: brand.lime,
          },
        ]}
      >
        <Plus size={24} color={scheme.onPrimary} />
      </Pressable>
    </View>
  );
}

function TaskCard({ task, onPress }: { task: Task; onPress: () => void }) {
  const scheme = useScheme();
  const Icon = ICONS[task.icon] ?? FileText;
  const next = task.subtasks.find((s) => !s.done);
  const doneCount = task.subtasks.filter((s) => s.done).length;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={task.title}>
      <Card style={{ gap: space[2.5] }}>
        <View style={styles.cardHead}>
          <Checkbox checked={task.done} onToggle={() => {}} label={`Complete ${task.title}`} />
          <View style={[styles.typeIcon, { backgroundColor: scheme.surfaceAlt }]}>
            <Icon size={15} color={scheme.primary} />
          </View>
          <Txt variant="h4" style={{ flex: 1 }} numberOfLines={2}>
            {task.title}
          </Txt>
        </View>

        {next ? (
          <View style={[styles.subPreview, { backgroundColor: scheme.surfaceAlt }]}>
            <ChevronRight size={14} color={scheme.textMuted} />
            <Txt variant="bodySm" muted numberOfLines={1} style={{ flex: 1 }}>
              {next.title}
            </Txt>
          </View>
        ) : null}

        <View style={styles.meta}>
          <Chip label={task.due} size="sm" />
          <Chip label={task.estimate} size="sm" />
          {task.tag ? <Chip label={task.tag} tone="success" size="sm" /> : null}
          <Chip label={`${doneCount}/${task.subtasks.length} subtasks`} size="sm" />
          <Txt variant="caption" color={status.warning.fg}>
            +{task.loadDelta}% load
          </Txt>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: brand.forest,
    paddingHorizontal: space[5],
    paddingBottom: space[5],
    borderBottomLeftRadius: space[7],
    borderBottomRightRadius: space[7],
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1.5],
    paddingHorizontal: space[2.5],
    paddingVertical: space[1],
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  week: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space[4] },
  day: {
    width: 40,
    paddingVertical: space[1.5],
    borderRadius: radius.md,
    alignItems: 'center',
    gap: space[0.5],
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: brand.lime,
  },

  ranges: { gap: space[2], paddingTop: space[4] },
  range: {
    paddingHorizontal: space[3],
    paddingVertical: space[1.5],
    borderRadius: radius.pill,
  },

  body: { paddingHorizontal: space[4], paddingTop: space[4], gap: space[3] },
  showing: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  jump: { flexDirection: 'row', alignItems: 'center', gap: space[0.5] },

  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2] },
  typeIcon: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    paddingVertical: space[1.5],
    paddingHorizontal: space[2.5],
    borderRadius: radius.pill,
  },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space[1.5] },

  fab: {
    position: 'absolute',
    right: space[4],
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
