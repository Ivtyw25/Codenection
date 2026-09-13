import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ProgressBar, Txt } from '@/components/ui';
import { space, status, useScheme } from '@/theme';

export interface GaugeProps {
  label: string;
  /** 0–100. */
  value: number;
  /** `pressure` inverts the reading: high is bad, so it warms as it rises. */
  kind: 'pressure' | 'vitality';
  hint?: string;
  /** Compact form for Home; the full form is the Pip tab's driver row. */
  size?: 'row' | 'block';
}

/**
 * The capacity readout. One component, two screens.
 *
 * Home and Pip previously each had their own near-identical `Gauge`/`Driver`
 * with different colour logic, which is how "Pressure 38%" ended up amber on
 * one screen and green on the other for the same number. The tone is now a
 * function of the value and the kind, computed once.
 */
export function Gauge({ label, value, kind, hint, size = 'row' }: GaugeProps) {
  const scheme = useScheme();

  /*
   * The two gauges are not mirror images, and the frames are right about that.
   *
   * Vitality is a reserve: plenty of it is genuinely good, so it earns green.
   * Pressure is a cost. Even a low one is load being carried, so it tops out at
   * amber and escalates to red — it never reads as "good". That is why the
   * frame draws 38% pressure in amber next to 76% vitality in green rather than
   * two green bars, and why a severity ramp shared by both would be wrong.
   */
  const tone =
    kind === 'pressure'
      ? value >= 70
        ? 'danger'
        : 'warning'
      : value <= 30
        ? 'danger'
        : value <= 55
          ? 'warning'
          : 'success';

  const toneColor = status[tone].fg;

  if (size === 'block') {
    return (
      <View style={{ gap: space[1.5] }}>
        <View style={styles.blockHead}>
          <Txt variant="h4" style={{ flex: 1 }}>
            {label}
          </Txt>
          <Txt variant="label" color={toneColor}>
            {value}%
          </Txt>
          <Txt variant="label" color={scheme.textMuted}>
            {' / 100'}
          </Txt>
        </View>
        <ProgressBar value={value} tone={tone} label={`${label}: ${value} of 100`} />
        {hint ? (
          <Txt variant="caption" muted>
            {hint}
          </Txt>
        ) : null}
      </View>
    );
  }

  return (
    <View style={{ gap: space[1] }}>
      <View style={styles.rowHead}>
        <Txt variant="bodySm" muted style={styles.rowLabel}>
          {label}
        </Txt>
        <ProgressBar
          value={value}
          tone={tone}
          style={{ flex: 1 }}
          label={`${label}: ${value} of 100`}
        />
        <Txt variant="label" style={styles.rowValue}>
          {value}%
        </Txt>
      </View>
      {hint ? (
        <Txt variant="caption" muted>
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: space[2.5] },
  rowLabel: { width: 60 },
  rowValue: { width: 40, textAlign: 'right' },
  blockHead: { flexDirection: 'row', alignItems: 'center' },
});
