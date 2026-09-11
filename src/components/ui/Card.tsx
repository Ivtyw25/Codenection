import React, { ReactNode } from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { useScheme, radius, space, elevation } from '@/theme';

export interface CardProps {
  elevated?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

export function Card({
  elevated = false,
  padded = true,
  style,
  children,
}: CardProps) {
  const scheme = useScheme();
  
  return (
    <View
      style={[
        {
          backgroundColor: scheme.surface,
          borderRadius: radius.lg,
          borderColor: scheme.border,
          borderWidth: 1,
        },
        elevated ? elevation.md : elevation.none,
        padded && { padding: space[4] },
        style,
      ]}
    >
      {children}
    </View>
  );
}
