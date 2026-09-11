import React, { ReactNode } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useScheme, radius, space, status, n } from '@/theme';
import { Txt } from './Txt';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand';
  variant?: 'filled' | 'tonal' | 'outline';
  icon?: ReactNode;
  size?: 'sm' | 'md';
}

export function Chip({
  label,
  selected,
  onPress,
  tone = 'neutral',
  variant = 'tonal',
  icon,
  size = 'md',
}: ChipProps) {
  const scheme = useScheme();
  
  let bgColor: string | undefined = undefined;
  let fgColor = scheme.text;
  let borderColor: string | undefined = undefined;
  let borderWidth = 0;

  if (variant === 'filled') {
    if (tone === 'neutral') {
      bgColor = scheme.text;
      fgColor = scheme.surface;
    } else if (tone === 'brand') {
      bgColor = scheme.primary;
      fgColor = scheme.onPrimary;
    } else {
      bgColor = status[tone].solid;
      fgColor = n[0];
    }
  } else if (variant === 'tonal') {
    if (tone === 'neutral') {
      bgColor = scheme.surfaceAlt;
      fgColor = scheme.text;
    } else if (tone === 'brand') {
      bgColor = scheme.primary + '20';
      fgColor = scheme.primary;
    } else {
      bgColor = status[tone].bg;
      fgColor = status[tone].fg;
    }
  } else if (variant === 'outline') {
    borderWidth = 1;
    if (tone === 'neutral') {
      borderColor = scheme.borderStrong;
      fgColor = scheme.text;
    } else if (tone === 'brand') {
      borderColor = scheme.primary;
      fgColor = scheme.primary;
    } else {
      borderColor = status[tone].solid;
      fgColor = status[tone].fg;
    }
  }

  if (selected) {
    bgColor = scheme.primary;
    fgColor = scheme.onPrimary;
    borderColor = undefined;
    borderWidth = 0;
  }

  const height = size === 'md' ? 32 : 24;
  const paddingH = size === 'md' ? space[3] : space[2];

  const content = (
    <View style={[
      styles.content,
      {
        height,
        borderRadius: radius.pill,
        backgroundColor: bgColor,
        borderColor,
        borderWidth,
        paddingHorizontal: paddingH,
      }
    ]}>
      {icon && <View style={[styles.icon, { marginRight: space[1] }]}>{icon}</View>}
      <Txt variant="caption" color={fgColor}>{label}</Txt>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected }}
        style={{ minHeight: 44, minWidth: 44, justifyContent: 'center' }}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={{ justifyContent: 'center' }}>{content}</View>;
}

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {},
});
