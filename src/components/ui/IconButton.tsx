import React, { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { MIN_TAP_TARGET, n, radius, space, status, useScheme } from '@/theme';
import { Interactive } from './Interactive';
import { Spinner } from './Spinner';
import { Txt } from './Txt';

export interface IconButtonProps {
  icon: ReactNode;
  onPress?: () => void;
  /** Required — an icon-only control has no visible name of its own. */
  accessibilityLabel: string;
  size?: number;
  /** `onDark` is the forest header's translucent-white treatment. */
  tone?: 'surface' | 'onDark' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  /** Unread count. `true` renders a bare dot instead of a number. */
  badge?: number | boolean;
}

/**
 * Circular icon control — the 52 navigation and 36px header buttons in the
 * frames. Always pill, always at least a 44pt target however small it looks.
 */
export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  size = 36,
  tone = 'surface',
  disabled,
  loading,
  badge,
}: IconButtonProps) {
  const scheme = useScheme();

  const skin =
    tone === 'onDark'
      ? { bg: 'rgba(255,255,255,0.12)', border: 'rgba(255,255,255,0.18)' }
      : tone === 'ghost'
        ? { bg: 'transparent', border: undefined }
        : { bg: scheme.surfaceAlt, border: scheme.border };

  const showBadge = badge === true || (typeof badge === 'number' && badge > 0);

  return (
    <Interactive
      accessibilityRole="button"
      accessibilityLabel={
        typeof badge === 'number' && badge > 0
          ? `${accessibilityLabel}, ${badge} unread`
          : accessibilityLabel
      }
      onPress={onPress}
      disabled={disabled}
      loading={loading}
      radius="pill"
      hitSlop={Math.max(0, (MIN_TAP_TARGET - size) / 2)}
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: radius.pill,
          backgroundColor: skin.bg,
          borderColor: skin.border,
          borderWidth: skin.border ? 1 : 0,
        },
      ]}
    >
      {loading ? <Spinner size={size * 0.5} color={tone === 'onDark' ? n[0] : scheme.primary} /> : icon}

      {showBadge ? (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: status.danger.solid,
              borderColor: tone === 'onDark' ? 'transparent' : scheme.surface,
              minWidth: typeof badge === 'number' ? 16 : 8,
              height: typeof badge === 'number' ? 16 : 8,
              paddingHorizontal: typeof badge === 'number' ? space[1] : 0,
            },
          ]}
        >
          {typeof badge === 'number' ? (
            <Txt variant="caption" color={n[0]} style={styles.badgeText}>
              {badge > 9 ? '9+' : badge}
            </Txt>
          ) : null}
        </View>
      ) : null}
    </Interactive>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10, lineHeight: 13 },
});
