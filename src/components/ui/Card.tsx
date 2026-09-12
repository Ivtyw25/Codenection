import React, { type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { elevation, radius, space, useScheme } from '@/theme';
import { Interactive } from './Interactive';

export interface CardProps {
  elevated?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  /** Supplying this makes the whole card a control, with press/hover states. */
  onPress?: () => void;
  disabled?: boolean;
  /** Draws the error border without changing the fill. */
  error?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

/**
 * 295 instances in the source, `16px` radius, shadow none by default — "lift
 * is opt-in", which the teardown was explicit about. Pressability is opt-in
 * too: a card only reacts to touch when it actually goes somewhere.
 */
export function Card({
  elevated = false,
  padded = true,
  style,
  children,
  onPress,
  disabled,
  error,
  accessibilityLabel,
  accessibilityHint,
}: CardProps) {
  const scheme = useScheme();

  const base: StyleProp<ViewStyle> = [
    {
      backgroundColor: scheme.surface,
      borderRadius: radius.lg,
      borderColor: scheme.border,
      borderWidth: 1,
    },
    elevated ? elevation.md : elevation.none,
    padded && { padding: space[4] },
    style,
  ];

  if (!onPress) return <View style={base}>{children}</View>;

  return (
    <Interactive
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      disabled={disabled}
      error={error}
      radius="lg"
      style={base}
    >
      {children}
    </Interactive>
  );
}
