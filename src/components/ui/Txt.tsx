import React from 'react';
import { Text, type TextProps } from 'react-native';
import { useScheme, type, TypeName } from '@/theme';

export interface TxtProps extends TextProps {
  variant?: TypeName;
  color?: string;
  center?: boolean;
  muted?: boolean;
}

export function Txt({
  variant = 'body',
  color,
  center,
  muted,
  style,
  ...props
}: TxtProps) {
  const scheme = useScheme();
  
  const textColor = color ?? (muted ? scheme.textMuted : scheme.text);
  const textStyle = type[variant];

  return (
    <Text
      style={[
        textStyle,
        { color: textColor },
        center && { textAlign: 'center' },
        style,
      ]}
      {...props}
    />
  );
}
