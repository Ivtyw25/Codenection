import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react-native';

import { Txt } from '@/components/ui';
import { radius, space, status, useScheme } from '@/theme';
import type { Forecast } from '@/types';

export interface ForecastRowProps {
  forecast: Forecast;
  /** Today's readings, so the row can show the move rather than a bare number. */
  pressure: number;
  vitality: number;
  /** Pip's fuller form; Home uses the compact one. */
  size?: 'row' | 'block';
}

/**
 * Where tomorrow lands if today goes to plan.
 *
 * The two gauges above this say where the student is. On their own that is a
 * dashboard — it reports a number and leaves the person to work out whether
 * their day is worth having. This row is the answer: it runs the same pressure
 * and vitality functions over tomorrow morning with today's scheduled blocks
 * marked done, so it prices the exact promise the timeline is already making.
 *
 * The assumption is printed, always. A forecast that hides what it assumed is
 * how a wellbeing app ends up quietly blamed for being wrong.
 */
export function ForecastRow({ forecast, pressure, vitality, size = 'row' }: ForecastRowProps) {
  const scheme = useScheme();

  return (
    <View style={[styles.root, { backgroundColor: scheme.surfaceAlt }]}>
      <Txt variant="caption" muted style={styles.eyebrow}>
        TOMORROW, IF TODAY GOES TO PLAN
      </Txt>

      <Line
        label="Pressure"
        from={pressure}
        to={forecast.pressure}
        delta={forecast.pressureDelta}
        // Pressure is a cost, so falling is the good direction.
        goodWhenFalling
        size={size}
      />
      <Line
        label="Vitality"
        from={vitality}
        to={forecast.vitality}
        delta={forecast.vitalityDelta}
        size={size}
      />

      <Txt variant="caption" color={scheme.textMuted}>
        {forecast.note}
      </Txt>
    </View>
  );
}

function Line({
  label,
  from,
  to,
  delta,
  goodWhenFalling,
  size,
}: {
  label: string;
  from: number;
  to: number;
  delta: number;
  goodWhenFalling?: boolean;
  size: 'row' | 'block';
}) {
  const scheme = useScheme();

  const flat = delta === 0;
  const improving = goodWhenFalling ? delta < 0 : delta > 0;
  const tone = flat ? scheme.textMuted : improving ? status.success.fg : status.warning.fg;

  const Icon = flat ? ArrowRight : delta > 0 ? ArrowUpRight : ArrowDownRight;

  /*
   * One fact, one announcement.
   *
   * Read child-by-child this row is five stops — "Vitality", "68%", "arrow",
   * "74%", "+6" — to say a single thing. Worse, the direction is carried by an
   * arrow glyph and a colour, neither of which survives being read aloud, so
   * the one part that matters (is this getting better or worse?) was the part
   * a screen-reader user could not get. The sentence says it in words.
   */
  const direction = flat ? 'unchanged at' : improving ? 'improving to' : 'worsening to';

  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${direction} ${to} percent, from ${from}. ${flat ? 'No change' : `${delta > 0 ? 'Up' : 'Down'} ${Math.abs(delta)}`}.`}
      style={styles.line}
    >
      <Txt variant={size === 'block' ? 'bodySm' : 'caption'} muted style={styles.label}>
        {label}
      </Txt>
      <Txt variant="caption" color={scheme.textMuted}>
        {from}%
      </Txt>
      <ArrowRight size={12} color={scheme.textMuted} />
      <Txt variant={size === 'block' ? 'h4' : 'label'} color={tone}>
        {to}%
      </Txt>
      <View style={styles.delta}>
        <Icon size={12} color={tone} />
        <Txt variant="caption" color={tone}>
          {flat ? 'no change' : `${Math.abs(delta)}`}
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space[1.5], padding: space[3], borderRadius: radius.md },
  eyebrow: { letterSpacing: 1 },
  line: { flexDirection: 'row', alignItems: 'center', gap: space[1.5] },
  label: { flex: 1 },
  delta: { flexDirection: 'row', alignItems: 'center', gap: space[0.5], minWidth: 64, justifyContent: 'flex-end' },
});
