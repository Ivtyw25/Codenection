import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useScheme, radius, space, status, n } from '@/theme';
import { Txt } from './Txt';

export interface BadgeProps {
  label: string | number;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand';
}

export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  const scheme = useScheme();
  
  let bgColor = scheme.surfaceAlt;
  let fgColor = scheme.text;

  if (tone === 'brand') {
    bgColor = scheme.primary;
    fgColor = scheme.onPrimary;
  } else if (tone !== 'neutral') {
    bgColor = status[tone].solid;
    fgColor = n[0];
  }

  return (
    <View style={[
      styles.base,
      {
        backgroundColor: bgColor,
        borderRadius: radius.pill,
        paddingHorizontal: space[1.5],
        paddingVertical: space[0.5],
      }
    ]}>
      <Txt variant="caption" color={fgColor}>{String(label)}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
});
