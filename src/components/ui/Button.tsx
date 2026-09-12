import React, { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  CONTROL_HEIGHT,
  MIN_TAP_TARGET,
  n,
  radius,
  space,
  status,
  useScheme,
  type InteractionState,
} from '@/theme';
import { Interactive } from './Interactive';
import { Spinner } from './Spinner';
import { Txt } from './Txt';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'lime';

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  label: string;
  onPress?: () => void;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  /** Swaps the label for a spinner and blocks input. */
  loading?: boolean;
  disabled?: boolean;
  /**
   * Why the button is disabled, announced to screen readers and available to
   * callers for a helper line. A disabled control with no stated reason is the
   * most common accessibility failure in a design system.
   */
  disabledReason?: string;
  accessibilityHint?: string;
}

/**
 * The system's signature control — a full pill, 583 uses of `9999px` in the
 * source. Six states: default, hover, pressed, focused, loading, disabled.
 *
 * The three surfaces it can sit on (forest header, white card, lime accent)
 * are why `Interactive`'s overlay is alpha rather than a second palette.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  label,
  onPress,
  icon,
  iconPosition = 'left',
  fullWidth,
  loading,
  disabled,
  disabledReason,
  accessibilityHint,
}: ButtonProps) {
  const scheme = useScheme();
  const height = size === 'md' ? CONTROL_HEIGHT : 40;

  const skin = surfaceFor(variant, scheme);

  return (
    <Interactive
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={disabled && disabledReason ? disabledReason : accessibilityHint}
      onPress={onPress}
      loading={loading}
      disabled={disabled}
      radius="pill"
      style={[
        styles.base,
        {
          height,
          minHeight: Math.max(height, MIN_TAP_TARGET),
          minWidth: Math.max(height, MIN_TAP_TARGET),
          borderRadius: radius.pill,
          backgroundColor: skin.bg,
          borderColor: skin.border,
          borderWidth: skin.border ? 1 : 0,
          paddingHorizontal: size === 'md' ? space[5] : space[4],
        },
        fullWidth && styles.fullWidth,
      ]}
    >
      {(state: InteractionState) =>
        loading ? (
          <View style={styles.content}>
            <Spinner size={18} color={skin.fg} />
            <Txt variant="label" color={skin.fg} style={{ marginLeft: space[2] }}>
              {label}
            </Txt>
          </View>
        ) : (
          <View style={styles.content}>
            {icon && iconPosition === 'left' ? (
              <View style={{ marginRight: space[2] }}>{icon}</View>
            ) : null}
            <Txt
              variant="label"
              color={skin.fg}
              // The focused state is carried by the lime ring, but a ring alone
              // is invisible to anyone who can't see the glow colour shift.
              style={state === 'focused' ? styles.focusedLabel : undefined}
            >
              {label}
            </Txt>
            {icon && iconPosition === 'right' ? (
              <View style={{ marginLeft: space[2] }}>{icon}</View>
            ) : null}
          </View>
        )
      }
    </Interactive>
  );
}

function surfaceFor(variant: ButtonVariant, scheme: ReturnType<typeof useScheme>) {
  switch (variant) {
    case 'primary':
      // 11.35:1 — AAA, the teardown's verified pairing.
      return { bg: scheme.primary, fg: scheme.onPrimary, border: undefined as string | undefined };
    case 'lime':
      // 7.47:1 — AAA. The hero pairing, reserved for the one action per screen
      // that the whole screen exists to produce.
      return { bg: scheme.secondary, fg: scheme.onSecondary, border: undefined };
    case 'secondary':
      return { bg: scheme.surfaceAlt, fg: scheme.text, border: scheme.border };
    case 'ghost':
      return { bg: 'transparent', fg: scheme.primary, border: undefined };
    case 'danger':
      return { bg: status.danger.solid, fg: n[0], border: undefined };
  }
}

const styles = StyleSheet.create({
  base: { justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  fullWidth: { width: '100%' },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  focusedLabel: { textDecorationLine: 'underline' },
});
