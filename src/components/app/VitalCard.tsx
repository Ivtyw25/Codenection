import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Activity, ChevronRight, Moon, Smile, Users } from 'lucide-react-native';

import { Card, Txt } from '@/components/ui';
import { radius, space, status, useScheme } from '@/theme';
import type { VitalId, VitalReading, VitalStanding } from '@/types';

/** The only place a `VitalId` becomes a glyph. */
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

export interface VitalCardProps {
  reading: VitalReading;
  onPress: () => void;
}

/**
 * One of the four things Vitality is made of.
 *
 * Shows the reading against THIS USER'S mark rather than against 100, because
 * 68 means nothing on its own — it is good for Physical Vitality and poor for
 * Rest, and only the user's own target says which. The bar is drawn to the
 * target, so a full bar means "where you want to be", not "perfect".
 */
export function VitalCard({ reading, onPress }: VitalCardProps) {
  const scheme = useScheme();
  const Icon = ICONS[reading.id];
  const tone = TONE[reading.standing];

  // Scaled to the target, capped at 1 — over-performing reads as "met", not as
  // a bar that runs off the end.
  const fill = Math.min(1, reading.value / Math.max(1, reading.target));

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`${reading.label}, ${reading.value} of your ${reading.target} mark`}
      accessibilityHint="Opens the trend and what would move it"
      style={styles.card}
    >
      <View style={styles.top}>
        <View style={[styles.icon, { backgroundColor: status[tone].bg }]}>
          <Icon size={15} color={status[tone].solid} />
        </View>
        <Txt variant="h3" color={status[tone].fg}>
          {reading.value}
        </Txt>
        <Txt variant="caption" color={scheme.textDisabled} style={{ flex: 1 }}>
          / {reading.target}
        </Txt>
        <ChevronRight size={15} color={scheme.textMuted} />
      </View>

      <View style={[styles.track, { backgroundColor: scheme.surfaceAlt }]}>
        <View
          style={[styles.fill, { width: `${fill * 100}%`, backgroundColor: status[tone].solid }]}
        />
      </View>

      <Txt variant="caption" muted numberOfLines={2}>
        {reading.label}
      </Txt>
      {/*
        Two lines, not one. At two-up on a 400px screen "35% of reserve · +9
        this week" truncates to "…this w…", and the week's movement is the half
        that was worth showing.
      */}
      <View style={styles.meta}>
        <Txt variant="caption" color={scheme.textDisabled}>
          {Math.round(reading.weight * 100)}% of reserve
        </Txt>
        {reading.delta !== 0 ? (
          <Txt
            variant="caption"
            color={reading.delta > 0 ? status.success.fg : status.warning.fg}
          >
            {reading.delta > 0 ? '+' : ''}
            {reading.delta} this week
          </Txt>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: '46%', gap: space[1.5], padding: space[3] },
  top: { flexDirection: 'row', alignItems: 'center', gap: space[1.5] },
  icon: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: { gap: 1 },
  track: { height: 5, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
});
