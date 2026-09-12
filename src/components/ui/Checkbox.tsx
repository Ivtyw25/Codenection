import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Check, Minus } from 'lucide-react-native';

import { MIN_TAP_TARGET, n, radius, space, status, useScheme } from '@/theme';
import { Interactive } from './Interactive';
import { Txt } from './Txt';

export interface CheckboxProps {
  checked: boolean;
  onToggle: (next: boolean) => void;
  size?: number;
  /** Some but not all children done — the parent-row state. */
  indeterminate?: boolean;
  disabled?: boolean;
  /** Validation failure, e.g. a required acknowledgement left unticked. */
  error?: boolean;
  /** Visible text rendered beside the box. Omit for a bare checkbox. */
  label?: string;
  /**
   * Screen-reader name. Use this — not `label` — when the visible text lives
   * in a sibling element, so the row is announced without being drawn twice.
   */
  accessibilityLabel?: string;
}

/**
 * Six states: unchecked, checked, indeterminate, pressed, disabled, error.
 *
 * `indeterminate` matters here specifically: a task row whose sub-tasks are
 * half done is the app's most common list state, and drawing it as unchecked
 * throws away the only progress signal the row has.
 */
export function Checkbox({
  checked,
  onToggle,
  size = 24,
  indeterminate,
  disabled,
  error,
  label,
  accessibilityLabel,
}: CheckboxProps) {
  const scheme = useScheme();
  const filled = checked || indeterminate;

  const fill = error ? status.danger.solid : scheme.primary;
  const emptyBorder = error ? status.danger.solid : scheme.borderStrong;

  return (
    <Interactive
      accessibilityRole="checkbox"
      accessibilityState={{ checked: indeterminate ? 'mixed' : checked, disabled }}
      accessibilityLabel={accessibilityLabel ?? label ?? 'Checkbox'}
      onPress={() => onToggle(!checked)}
      disabled={disabled}
      error={error}
      radius="pill"
      noOverlay
      hitSlop={Math.max(0, (MIN_TAP_TARGET - size) / 2)}
      style={[styles.row, { minHeight: MIN_TAP_TARGET }]}
    >
      <View
        style={[
          styles.box,
          {
            width: size,
            height: size,
            borderRadius: radius.pill,
            backgroundColor: filled ? fill : 'transparent',
            borderColor: filled ? fill : emptyBorder,
            borderWidth: filled ? 0 : 2,
          },
        ]}
      >
        {indeterminate ? (
          <Minus size={size * 0.6} color={n[0]} strokeWidth={3} />
        ) : checked ? (
          <Check size={size * 0.6} color={n[0]} strokeWidth={3} />
        ) : null}
      </View>

      {label ? (
        <Txt variant="body" style={{ marginLeft: space[2] }} color={error ? status.danger.fg : undefined}>
          {label}
        </Txt>
      ) : null}
    </Interactive>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  box: { alignItems: 'center', justifyContent: 'center' },
});
