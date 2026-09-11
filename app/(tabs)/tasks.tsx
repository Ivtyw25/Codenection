/**
 * SCR-11 — Tasks / Today's Manifest.
 * Route `/tasks` · Goal: work the capacity-sized daily list.
 *
 * The Manifest is deliberately SHORTER when Pressure is high — "presenting a
 * full backlog to an overloaded student is precisely the failure mode the app
 * exists to prevent" (§B.3).
 */

import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Feather from '@expo/vector-icons/Feather';

import { Pip } from '@/components/pip';
import {
  Button,
  Card,
  Chip,
  Header,
  Screen,
  SegmentedControl,
  SkeletonRows,
  Txt,
  useToast,
  DragHandle,
} from '@/components/ui';
import { domainById, manifest, TOTAL_ACTIVE_TASKS } from '@/mock';
import { useDemo } from '@/mock/demo';
import {
  colors,
  elevation,
  MIN_TAP_TARGET,
  radius,
  SCREEN_PADDING,
  space,
  TAB_BAR_HEIGHT,
} from '@/theme';
import { TASK_CONTEXTS, type Task, type TaskContext } from '@/types';

type Filter = 'All' | TaskContext;
const FILTERS: Filter[] = ['All', ...TASK_CONTEXTS];

/** Pressure at or above the Strained threshold shortens the list. */
const STRAINED_THRESHOLD = 60;

export default function TasksScreen() {
  const router = useRouter();
  const toast = useToast();
  const { capacity, loading, empty } = useDemo();

  const [filter, setFilter] = useState<Filter>('All');
  const [done, setDone] = useState<Set<string>>(new Set());
  /** The calibration check fires at most once a day (§SCR-11 states). */
  const [calibrationFor, setCalibrationFor] = useState<Task | null>(null);
  const [calibrationUsedToday, setCalibrationUsedToday] = useState(false);

  const visible = manifest.filter((t) => filter === 'All' || t.context === filter);
  const allDone = visible.length > 0 && visible.every((t) => done.has(t.id));
  const nearCapacity = capacity.pressure >= STRAINED_THRESHOLD;

  function complete(task: Task) {
    setDone((cur) => new Set(cur).add(task.id));
    toast.show('+1 Care', 'care');

    // Low-confidence estimates flag a Task-Level Calibration Check (§B.2).
    if (task.lowConfidenceEstimate && !calibrationUsedToday) {
      setCalibrationFor(task);
      setCalibrationUsedToday(true);
    }
  }

  return (
    <>
      <Screen bottomInset={TAB_BAR_HEIGHT}>
        <Header
          title="Today"
          right={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sort and filter"
              style={{
                width: MIN_TAP_TARGET,
                height: MIN_TAP_TARGET,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Feather name="sliders" size={22} color={colors.text} />
            </Pressable>
          }
        />

        {/* Context filter chips — act on what fits your current situation. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: space[2], paddingVertical: space[3] }}
        >
          {FILTERS.map((f) => (
            <Chip key={f} label={f} selected={filter === f} onPress={() => setFilter(f)} />
          ))}
        </ScrollView>

        {/* Capacity note. */}
        {!loading && !empty ? (
          <Txt
            variant="bodySm"
            color={nearCapacity ? colors.semantic.warning.text : colors.textSecondary}
            style={{ marginBottom: space[3] }}
          >
            {nearCapacity
              ? "You're near capacity, so today's list is short."
              : `Sized to your capacity — ${manifest.length} of ${TOTAL_ACTIVE_TASKS} shown.`}
          </Txt>
        ) : null}

        {/* Manifest list. */}
        {loading ? (
          <SkeletonRows count={5} />
        ) : empty ? (
          <EmptyNothingCaptured onCapture={() => router.push('/capture')} />
        ) : allDone ? (
          <AllDone />
        ) : (
          <View style={{ gap: space[2] }}>
            {visible.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                done={done.has(task.id)}
                onComplete={() => complete(task)}
                onOpen={() => router.push(`/tasks/${task.id}`)}
              />
            ))}
          </View>
        )}
      </Screen>

      <CalibrationCheckSheet
        task={calibrationFor}
        onClose={() => setCalibrationFor(null)}
      />
    </>
  );
}

// ── Row ──────────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  done,
  onComplete,
  onOpen,
}: {
  task: Task;
  done: boolean;
  onComplete: () => void;
  onOpen: () => void;
}) {
  const domain = domainById(task.domainId);

  return (
    <Swipeable
      friction={2}
      leftThreshold={64}
      rightThreshold={64}
      // Swipe-right completes.
      renderLeftActions={() => (
        <View
          style={{
            justifyContent: 'center',
            paddingHorizontal: space[4],
            backgroundColor: colors.semantic.success.fill,
            borderRadius: radius.md,
            marginRight: space[2],
          }}
        >
          <Feather name="check" size={20} color={colors.semantic.success.text} />
        </View>
      )}
      // Swipe-left offers reschedule / defer.
      renderRightActions={() => (
        <View style={{ flexDirection: 'row', gap: space[2], marginLeft: space[2] }}>
          <View
            style={{
              justifyContent: 'center',
              paddingHorizontal: space[4],
              backgroundColor: colors.semantic.info.fill,
              borderRadius: radius.md,
            }}
          >
            <Feather name="clock" size={20} color={colors.semantic.info.text} />
          </View>
          <View
            style={{
              justifyContent: 'center',
              paddingHorizontal: space[4],
              backgroundColor: colors.semantic.warning.fill,
              borderRadius: radius.md,
            }}
          >
            <Feather name="corner-up-right" size={20} color={colors.semantic.warning.text} />
          </View>
        </View>
      )}
      onSwipeableOpen={(dir) => {
        if (dir === 'left') onComplete();
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${task.title}${domain ? `, ${domain.name}` : ''}${task.due ? `, due ${task.due}` : ''}`}
        onPress={onOpen}
        style={[
          {
            minHeight: 56,
            backgroundColor: colors.card,
            borderRadius: radius.md,
            padding: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: space[3],
          },
          elevation[1],
        ]}
      >
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          accessibilityLabel={`Mark ${task.title} complete`}
          onPress={onComplete}
          hitSlop={10}
          style={{
            width: 24,
            height: 24,
            borderRadius: radius.full,
            borderWidth: done ? 0 : 2,
            borderColor: colors.borderStrong,
            backgroundColor: done ? colors.semantic.success.solid : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {done ? <Feather name="check" size={14} color={colors.onFill} /> : null}
        </Pressable>

        <View style={{ flex: 1, gap: space[1] }}>
          <Txt
            variant="h4"
            color={done ? colors.textDisabled : colors.text}
            style={done ? { textDecorationLine: 'line-through' } : undefined}
            numberOfLines={2}
          >
            {task.title}
          </Txt>
          {domain ? (
            <View style={{ flexDirection: 'row' }}>
              <Chip label={domain.name} tint={domain.tint} />
            </View>
          ) : null}
        </View>

        <View style={{ alignItems: 'flex-end', gap: space[1] }}>
          {task.due ? (
            <Txt variant="bodySm" color={colors.textSecondary}>
              {task.due}
            </Txt>
          ) : null}
          <Feather name="menu" size={16} color={colors.textDisabled} />
        </View>
      </Pressable>
    </Swipeable>
  );
}

// ── Empty states ─────────────────────────────────────────────────────────────

/** All done — explicitly no "add more" pressure. */
function AllDone() {
  return (
    <View style={{ alignItems: 'center', paddingVertical: space[6], gap: space[2] }}>
      <Pip size={132} pose="celebrating" />
      <Txt variant="h3" center>
        That&apos;s your capacity for today.
      </Txt>
      <Txt variant="bodyMd" color={colors.textSecondary} center>
        Rest is productive too.
      </Txt>
    </View>
  );
}

function EmptyNothingCaptured({ onCapture }: { onCapture: () => void }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: space[6], gap: space[3] }}>
      <Pip size={132} pose="empty" />
      <Txt variant="bodyMd" color={colors.textSecondary} center>
        Nothing captured yet. Tap + to brain-dump what&apos;s on your mind.
      </Txt>
      <Button label="Capture something" full={false} onPress={onCapture} />
    </View>
  );
}

// ── Calibration check ────────────────────────────────────────────────────────

/**
 * "Was that as heavy as we guessed?" — a small, skippable sheet shown at most
 * once a day, only after completing a low-confidence estimate.
 */
function CalibrationCheckSheet({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const [answer, setAnswer] = useState<'lighter' | 'right' | 'heavier'>('right');

  return (
    <Modal visible={task != null} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: colors.scrim }} onPress={onClose} />
      <View
        style={[
          {
            backgroundColor: colors.card,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            paddingHorizontal: SCREEN_PADDING,
            paddingBottom: space[7],
            gap: space[3],
          },
          elevation[3],
        ]}
      >
        <DragHandle />
        <Txt variant="h3">Was that as heavy as we guessed?</Txt>
        {task ? (
          <Txt variant="bodySm" color={colors.textSecondary}>
            We estimated {task.effortMinutes} minutes for “{task.title}”.
          </Txt>
        ) : null}

        <SegmentedControl
          accessibilityLabel="How heavy was it?"
          options={[
            { value: 'lighter', label: 'Lighter' },
            { value: 'right', label: 'Right' },
            { value: 'heavier', label: 'Heavier' },
          ]}
          value={answer}
          onChange={setAnswer}
          style={{ marginTop: space[1] }}
        />

        <Button label="Save" onPress={onClose} />
        <Button label="Skip" variant="text" onPress={onClose} />
      </View>
    </Modal>
  );
}
