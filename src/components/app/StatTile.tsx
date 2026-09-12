import React, { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, ProgressBar, Txt } from '@/components/ui';
import { radius, space, useScheme } from '@/theme';

export interface StatTileProps {
  icon: ReactNode;
  label: string;
  /** The headline figure — already formatted ("12", "6h 20m"). */
  value: string;
  /** Small qualifier under the value ("of 15 planned"). */
  caption?: string;
  /** 0–100. Renders the thin bar under the figure. */
  progress?: number;
  tone?: 'brand' | 'success' | 'warning' | 'danger';
  onPress?: () => void;
}

/**
 * The "This Week" metric tile — Figma's `Tasks completed metric` and
 * `Focus time metric` (nodes 19:497 / 19:510).
 *
 * This section exists on the Home frame at y=670, below the fold of the
 * default render, and the first rebuild missed it entirely. Both tiles are now
 * fed from `history`, so the figures move with the week rather than sitting at
 * whatever the mock said.
 */
export function StatTile({
  icon,
  label,
  value,
  caption,
  progress,
  tone = 'brand',
  onPress,
}: StatTileProps) {
  const scheme = useScheme();

  return (
    <Card
      style={styles.card}
      onPress={onPress}
      accessibilityLabel={`${label}: ${value}${caption ? `, ${caption}` : ''}`}
    >
      <View style={styles.head}>
        <View style={[styles.icon, { backgroundColor: scheme.surfaceAlt }]}>{icon}</View>
        <Txt variant="caption" muted style={{ flex: 1 }} numberOfLines={1}>
          {label}
        </Txt>
      </View>

      <Txt variant="h2" style={styles.value}>
        {value}
      </Txt>

      {caption ? (
        <Txt variant="caption" muted numberOfLines={1}>
          {caption}
        </Txt>
      ) : null}

      {progress !== undefined ? (
        <ProgressBar value={progress} tone={tone} height={6} label={`${label} progress`} />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, gap: space[2], padding: space[3.5] },
  head: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  icon: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { marginTop: space[0.5] },
});
