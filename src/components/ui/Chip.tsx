import React, { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { MIN_TAP_TARGET, n, radius, space, status, useScheme } from '@/theme';
import { Interactive } from './Interactive';
import { Txt } from './Txt';

export type ChipTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand';

export interface ChipProps {
  label: string;
  /** Toggle state. Only meaningful with `onPress`. */
  selected?: boolean;
  onPress?: () => void;
  tone?: ChipTone;
  variant?: 'filled' | 'tonal' | 'outline';
  icon?: ReactNode;
  size?: 'sm' | 'md';
  disabled?: boolean;
  /** Trailing affordance — a dismiss X, a count. */
  trailing?: ReactNode;
}

/**
 * Two jobs in one shape, distinguished by whether `onPress` is supplied:
 * a static metadata tag (due date, load, context) and an interactive filter
 * toggle. Only the interactive form gets press, hover and focus states — a
 * chip that reacts to touch but does nothing is worse than one that doesn't.
 */
export function Chip({
  label,
  selected,
  onPress,
  tone = 'neutral',
  variant = 'tonal',
  icon,
  size = 'md',
  disabled,
  trailing,
}: ChipProps) {
  const scheme = useScheme();
  const skin = skinFor({ variant, tone, selected: !!selected, scheme });

  const height = size === 'md' ? 32 : 24;
  const paddingHorizontal = size === 'md' ? space[3] : space[2];

  const body = (
    <View
      style={[
        styles.content,
        {
          height,
          paddingHorizontal,
          borderRadius: radius.pill,
          backgroundColor: skin.bg,
          borderColor: skin.border,
          borderWidth: skin.border ? 1 : 0,
        },
      ]}
    >
      {icon ? <View style={{ marginRight: space[1] }}>{icon}</View> : null}
      <Txt variant="caption" color={skin.fg} numberOfLines={1}>
        {label}
      </Txt>
      {trailing ? <View style={{ marginLeft: space[1] }}>{trailing}</View> : null}
    </View>
  );

  if (!onPress) return <View style={styles.static}>{body}</View>;

  return (
    <Interactive
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      selected={selected}
      disabled={disabled}
      radius="pill"
      style={[styles.touch, { minHeight: MIN_TAP_TARGET }]}
    >
      {body}
    </Interactive>
  );
}

function skinFor({
  variant,
  tone,
  selected,
  scheme,
}: {
  variant: NonNullable<ChipProps['variant']>;
  tone: ChipTone;
  selected: boolean;
  scheme: ReturnType<typeof useScheme>;
}): { bg?: string; fg: string; border?: string } {
  // Selection outranks tone: a selected filter must be unmistakable across a
  // row where every other chip carries a different semantic colour.
  if (selected) return { bg: scheme.primary, fg: scheme.onPrimary };

  if (variant === 'filled') {
    if (tone === 'neutral') return { bg: scheme.text, fg: scheme.surface };
    if (tone === 'brand') return { bg: scheme.primary, fg: scheme.onPrimary };
    return { bg: status[tone].solid, fg: n[0] };
  }

  if (variant === 'outline') {
    if (tone === 'neutral') return { fg: scheme.text, border: scheme.borderStrong };
    if (tone === 'brand') return { fg: scheme.primary, border: scheme.primary };
    return { fg: status[tone].fg, border: status[tone].solid };
  }

  // tonal
  if (tone === 'neutral') return { bg: scheme.surfaceAlt, fg: scheme.text };
  if (tone === 'brand') return { bg: scheme.surfaceAlt, fg: scheme.primary };
  return { bg: status[tone].bg, fg: status[tone].fg };
}

const styles = StyleSheet.create({
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  static: { justifyContent: 'center' },
  touch: { justifyContent: 'center' },
});
