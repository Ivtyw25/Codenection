import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Drawer, Txt } from '@/components/ui';
import { useApp } from '@/store/AppStore';
import { usePipState, useStreak, useWeekSeries } from '@/store/selectors';
import { radius, space, status, useScheme } from '@/theme';
import type { PipStateName } from '@/types';

const STATE_TONE: Record<PipStateName, 'success' | 'warning' | 'danger'> = {
  balanced: 'success',
  strained: 'warning',
  wilting: 'warning',
  depleted: 'danger',
  critical: 'danger',
};

/**
 * What the streak row on Home actually means.
 *
 * The frames show "5 consecutive days" with no way to interrogate it. Since
 * the number is now derived from `history` rather than stored, it can show its
 * working: which days counted, which broke it, and what today is running at.
 */
export function StreakDrawer({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const scheme = useScheme();
  const { data } = useApp();
  const streak = useStreak();
  const week = useWeekSeries();
  const pip = usePipState();

  return (
    <Drawer visible={visible} onClose={onClose} title="Balance streak" maxHeight="70%">
      <View style={[styles.summary, { backgroundColor: status.success.bg }]}>
        <Txt variant="display" color={status.success.fg}>
          {streak.days}
        </Txt>
        <View style={{ flex: 1 }}>
          <Txt variant="h4" color={status.success.fg}>
            {streak.days === 1 ? 'day balanced' : 'days balanced'}
          </Txt>
          <Txt variant="caption" color={status.success.fg}>
            Goal is {streak.goal}. Today is running {pip.label.toLowerCase()}.
          </Txt>
        </View>
      </View>

      {/* Dot row — filled slots against the goal. */}
      <View style={styles.dots}>
        {Array.from({ length: streak.goal }, (_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i < streak.days ? scheme.secondary : scheme.surfaceAlt,
                borderColor: i < streak.days ? scheme.secondary : scheme.border,
              },
            ]}
          />
        ))}
      </View>

      <Txt variant="caption" muted style={{ marginTop: space[5], marginBottom: space[2] }}>
        LAST SEVEN DAYS
      </Txt>

      <View style={{ gap: space[1.5] }}>
        {[...week].reverse().map((day) => {
          const tone = STATE_TONE[day.state];
          const label = new Date(day.date).toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
          });

          return (
            <View key={day.date} style={[styles.row, { borderColor: scheme.border }]}>
              <View style={[styles.pip, { backgroundColor: status[tone].solid }]} />
              <Txt variant="bodySm" style={{ flex: 1 }}>
                {day.isToday ? 'Today' : label}
              </Txt>
              <Txt variant="caption" color={status[tone].fg}>
                {day.state}
              </Txt>
              <Txt variant="caption" muted style={styles.count}>
                {day.tasksCompleted} done
              </Txt>
            </View>
          );
        })}
      </View>

      <Txt variant="caption" muted style={{ marginTop: space[4] }}>
        A day counts when Pip ends it balanced — low pressure against healthy reserves. The run
        resets the first day it isn&apos;t, which is why it reads {streak.days} rather than{' '}
        {data.history.length + 1}.
      </Txt>
    </Drawer>
  );
}

const styles = StyleSheet.create({
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    padding: space[4],
    borderRadius: radius.lg,
  },
  dots: { flexDirection: 'row', gap: space[2], marginTop: space[4], justifyContent: 'center' },
  dot: { width: 14, height: 14, borderRadius: radius.pill, borderWidth: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2.5],
    paddingVertical: space[2.5],
    paddingHorizontal: space[3],
    borderWidth: 1,
    borderRadius: radius.md,
  },
  pip: { width: 8, height: 8, borderRadius: radius.pill },
  count: { width: 56, textAlign: 'right' },
});
