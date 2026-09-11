import React, { ReactNode } from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { useScheme, radius, space, CONTROL_HEIGHT, MIN_TAP_TARGET, status, n } from '@/theme';
import { Txt } from './Txt';
import { Spinner } from './Spinner';

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  label: string;
  onPress?: () => void;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
}

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
}: ButtonProps) {
  const scheme = useScheme();
  
  const height = size === 'md' ? CONTROL_HEIGHT : 40;
  
  let backgroundColor: string | undefined = undefined;
  let borderColor: string | undefined = undefined;
  let borderWidth = 0;
  let textColor = scheme.onPrimary;
  
  if (variant === 'primary') {
    backgroundColor = scheme.primary;
    textColor = scheme.onPrimary;
  } else if (variant === 'secondary') {
    backgroundColor = scheme.surfaceAlt;
    borderColor = scheme.border;
    borderWidth = 1;
    textColor = scheme.text;
  } else if (variant === 'ghost') {
    backgroundColor = undefined;
    textColor = scheme.primary;
  } else if (variant === 'danger') {
    backgroundColor = status.danger.solid;
    textColor = n[0];
  }

  const minTarget = Math.max(height, MIN_TAP_TARGET);
  const minW = Math.max(height, MIN_TAP_TARGET);

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: loading, disabled: disabled || loading }}
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        {
          height,
          minHeight: minTarget,
          minWidth: minW,
          borderRadius: radius.pill,
          backgroundColor,
          borderColor,
          borderWidth,
        },
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
      ]}
    >
      {loading ? (
        <Spinner size={20} color={textColor} />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && <View style={[styles.iconLeft, { marginRight: space[2] }]}>{icon}</View>}
          <Txt variant="label" color={textColor}>{label}</Txt>
          {icon && iconPosition === 'right' && <View style={[styles.iconRight, { marginLeft: space[2] }]}>{icon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {},
  iconRight: {},
});
