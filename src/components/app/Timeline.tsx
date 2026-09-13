import React, { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Check, Lock, UserPlus } from 'lucide-react-native';

import { Avatar, Checkbox, Chip, Interactive, Txt } from '@/components/ui';
import { formatClock, formatDayHeading, formatEstimate, formatTimeRange } from '@/data/format';
import { compareSlots, groupByDay, type Slot } from '@/data/schedule';
import { useTeammates } from '@/store/selectors';
import { radius, space, status, type, useScheme } from '@/theme';

export interface TimelineProps {
  slots: Slot[];
  now?: Date;
  /** Break the rail into day sections. Off for a single-day view. */
  groupDays?: boolean;
  /** Name the parent task under each block — for the cross-task rail. */
  showParent?: boolean;
  /** Draw the "now" hairline where the current time falls. */
  nowMarker?: boolean;
  /** Supplying this makes each block's checkbox live. */
  onToggle?: (slot: Slot) => void;
  onDelegate?: (slot: Slot) => void;
  /** Tapping a block's body — used by Home to open the parent task. */
  onOpen?: (slot: Slot) => void;
  /** The one step that is actually startable. */
  nextId?: string | null;
  /** subId → the titles it is waiting on, for the locked row's reason line. */
  blockedBy?: Record<string, string[]>;
  footer?: ReactNode;
}

/**
 * The flow timeline. One component, three surfaces.
 *
 * Task Detail, the Review sheet's breakdown and Home's Today's Focus are all
 * the same question — *what happens, in what order, at what time* — and the
 * only honest way to keep those three answers identical is for there to be one
 * of them. `TaskCard`'s own header records what happened the last time this
 * app drew the same list twice.
 *
 * Every block's position comes from `src/data/schedule.ts`, which derives the
 * plan rather than storing it. Nothing here decides when anything happens.
 */
export function Timeline({
  slots,
  now = new Date(),
  groupDays = false,
  showParent = false,
  nowMarker = false,
  onToggle,
  onDelegate,
  onOpen,
  nextId,
  blockedBy,
  footer,
}: TimelineProps) {
  const scheme = useScheme();
  const days = groupDays ? groupByDay(slots) : [{ date: '', slots, totalMin: 0 }];

  /*
   * Where the "now" line goes: immediately before the first block that has not
   * started yet.
   *
   * Anchored to the block's id rather than to a position, because day grouping
   * re-sorts and an index into `slots` would then point at the wrong row.
   */
  const nowMs = now.getTime();
  const markerBefore = nowMarker
    ? ([...slots]
        .sort(compareSlots)
        .find((s) => s.startAt != null && new Date(s.startAt).getTime() > nowMs)?.subId ?? null)
    : null;

  return (
    <View style={styles.root}>
      {days.map((day, dayIndex) => (
        <View key={day.date || `unplanned-${dayIndex}`} style={styles.day}>
          {groupDays ? (
            <View style={styles.dayHead}>
              <Txt variant="caption" muted style={styles.dayLabel}>
                {day.date ? formatDayHeading(day.date, now) : 'NOT PLANNED YET'}
              </Txt>
              {day.totalMin > 0 ? (
                <Txt variant="caption" color={scheme.textDisabled}>
                  {formatEstimate(day.totalMin)}
                </Txt>
              ) : null}
            </View>
          ) : null}

          {day.slots.map((slot, i) => {
            const last = i === day.slots.length - 1;
            return (
              <React.Fragment key={slot.subId}>
                {slot.subId === markerBefore ? <NowMarker now={now} /> : null}
                <TimelineRow
                  slot={slot}
                  last={last}
                  isNext={nextId === slot.subId}
                  waitingOn={blockedBy?.[slot.subId] ?? []}
                  showParent={showParent}
                  onToggle={onToggle}
                  onDelegate={onDelegate}
                  onOpen={onOpen}
                />
              </React.Fragment>
            );
          })}
        </View>
      ))}

      {/* Everything today is already behind us — the line belongs at the end. */}
      {nowMarker && markerBefore == null && slots.length > 0 ? <NowMarker now={now} /> : null}

      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

/**
 * One block.
 *
 * Carries the same four states the sub-task list has always had — done, locked,
 * delegated, startable — because they are states of the work, not of the list
 * that happens to be drawing it.
 */
function TimelineRow({
  slot,
  last,
  isNext,
  waitingOn,
  showParent,
  onToggle,
  onDelegate,
  onOpen,
}: {
  slot: Slot;
  last: boolean;
  isNext: boolean;
  waitingOn: string[];
  showParent: boolean;
  onToggle?: (slot: Slot) => void;
  onDelegate?: (slot: Slot) => void;
  onOpen?: (slot: Slot) => void;
}) {
  const scheme = useScheme();
  const teammates = useTeammates();
  const assignee = teammates.find((m) => m.id === slot.delegatedTo) ?? null;

  const locked = slot.blocked && !slot.done;
  const dimmed = locked || slot.done;

  const dotColor = slot.done
    ? status.success.solid
    : locked
      ? scheme.textDisabled
      : slot.late
        ? status.danger.solid
        : assignee
          ? status.info.solid
          : scheme.primary;

  const time =
    slot.startAt && slot.endAt ? formatTimeRange(slot.startAt, slot.endAt) : 'Not scheduled';

  const body = (
    <View style={styles.content}>
      <View style={styles.timeRow}>
        <Txt
          variant="caption"
          style={styles.clock}
          color={slot.done ? status.success.fg : dimmed ? scheme.textDisabled : scheme.textSecondary}
        >
          {time}
        </Txt>
        <Txt variant="caption" color={scheme.textDisabled}>
          · {formatEstimate(slot.estimateMin)}
        </Txt>
        {slot.late ? <Chip label="Past deadline" size="sm" tone="danger" /> : null}
        {isNext ? <Chip label="Next Action" size="sm" tone="success" variant="filled" /> : null}
      </View>

      <View style={styles.titleRow}>
        {locked ? (
          <View
            style={styles.slot}
            accessible
            accessibilityRole="image"
            accessibilityLabel={
              waitingOn.length > 0
                ? `Locked. Waiting on ${waitingOn.join(' and ')}.`
                : 'Locked. Waiting on earlier work.'
            }
          >
            <Lock size={14} color={scheme.textDisabled} />
          </View>
        ) : onToggle ? (
          <Checkbox
            checked={slot.done}
            size={20}
            onToggle={() => onToggle(slot)}
            accessibilityLabel={slot.title}
          />
        ) : (
          <View style={styles.slot}>
            {slot.done ? (
              <Check size={14} color={status.success.solid} />
            ) : (
              <View style={[styles.pip, { borderColor: scheme.borderStrong }]} />
            )}
          </View>
        )}

        <Txt
          variant="bodySm"
          style={[{ flex: 1 }, slot.done && styles.strike]}
          color={dimmed ? scheme.textMuted : undefined}
          numberOfLines={2}
        >
          {slot.title}
        </Txt>

        {onDelegate && !slot.done && !locked ? (
          <Interactive
            accessibilityRole="button"
            accessibilityLabel={
              assignee ? `Reassign ${slot.title}` : `Delegate ${slot.title} to someone`
            }
            onPress={() => onDelegate(slot)}
            radius="pill"
            hitSlop={8}
            style={styles.delegate}
          >
            <UserPlus size={14} color={scheme.primary} />
          </Interactive>
        ) : null}
      </View>

      {/*
        One sub-line at most, in priority order: why this is locked beats who
        owns it, which beats which task it came from. Stacking all three turns
        a rail into a form.
      */}
      {locked && waitingOn.length > 0 ? (
        <Txt variant="caption" color={scheme.textDisabled} numberOfLines={1} style={styles.sub}>
          Waiting on {waitingOn.join(' + ')}
        </Txt>
      ) : assignee ? (
        <View style={[styles.subRow, styles.sub]}>
          <Avatar initials={assignee.initials} size={16} />
          <Txt variant="caption" color={status.info.fg} numberOfLines={1}>
            {assignee.name} is on this
          </Txt>
        </View>
      ) : showParent && !slot.synthetic ? (
        <Txt variant="caption" muted numberOfLines={1} style={styles.sub}>
          {slot.taskTitle}
        </Txt>
      ) : null}
    </View>
  );

  return (
    <View style={styles.row}>
      <View style={styles.rail}>
        <View style={[styles.dot, { backgroundColor: dotColor, borderColor: dotColor }]} />
        {!last ? <View style={[styles.line, { backgroundColor: scheme.border }]} /> : null}
      </View>

      {onOpen ? (
        <Interactive
          accessibilityRole="button"
          accessibilityLabel={`${slot.title}. ${time}. Opens ${slot.taskTitle}.`}
          onPress={() => onOpen(slot)}
          radius="md"
          noScale
          style={{ flex: 1 }}
        >
          {body}
        </Interactive>
      ) : (
        body
      )}
    </View>
  );
}

/** Where the student actually is. The one line on the rail that moves by itself. */
function NowMarker({ now }: { now: Date }) {
  const scheme = useScheme();

  return (
    <View style={styles.nowRow} accessible accessibilityRole="text" accessibilityLabel={`Now, ${formatClock(now)}`}>
      <View style={styles.rail}>
        <View style={[styles.nowDot, { backgroundColor: scheme.focus }]} />
      </View>
      <View style={styles.nowBody}>
        <Txt variant="caption" color={scheme.primary} style={styles.dayLabel}>
          NOW · {formatClock(now)}
        </Txt>
        <View style={[styles.nowLine, { backgroundColor: scheme.focus }]} />
      </View>
    </View>
  );
}

const RAIL_WIDTH = 22;

const styles = StyleSheet.create({
  root: { gap: 0 },
  day: { marginBottom: space[1] },
  dayHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space[3],
    marginBottom: space[1.5],
    paddingLeft: RAIL_WIDTH,
  },
  dayLabel: { letterSpacing: 1.1 },

  row: { flexDirection: 'row', alignItems: 'stretch' },
  rail: { width: RAIL_WIDTH, alignItems: 'center' },
  dot: { width: 9, height: 9, borderRadius: radius.pill, borderWidth: 1, marginTop: space[1.5] },
  line: { width: 2, flex: 1, marginTop: space[1], borderRadius: radius.pill },

  content: { flex: 1, paddingBottom: space[3.5], gap: space[1] },
  timeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space[1] },
  /** Tabular figures, so stacked start times line up down the rail. */
  clock: { fontFamily: type.mono.fontFamily },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  sub: { marginLeft: space[7] },
  strike: { textDecorationLine: 'line-through' },
  /** Same footprint as the Checkbox it replaces, so rows never reflow. */
  slot: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  pip: { width: 10, height: 10, borderRadius: radius.pill, borderWidth: 1.5 },
  delegate: { padding: space[1] },

  nowRow: { flexDirection: 'row', alignItems: 'center', paddingBottom: space[3.5] },
  nowDot: { width: 11, height: 11, borderRadius: radius.pill },
  nowBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space[2] },
  nowLine: { flex: 1, height: 1, borderRadius: radius.pill, opacity: 0.7 },

  footer: { marginTop: space[1], paddingLeft: RAIL_WIDTH },
});
