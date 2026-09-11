import React from 'react';
import { View, Image, StyleSheet, ImageSourcePropType } from 'react-native';
import { useScheme, radius, focusGlow } from '@/theme';
import { Txt } from './Txt';

export interface AvatarProps {
  source?: ImageSourcePropType;
  initials?: string;
  size?: number;
  ring?: boolean;
}

export function Avatar({ source, initials, size = 40, ring = false }: AvatarProps) {
  const scheme = useScheme();
  
  return (
    <View style={[
      styles.base,
      {
        width: size,
        height: size,
        borderRadius: radius.pill,
        backgroundColor: scheme.surfaceAlt,
      },
      ring && {
        borderWidth: 2,
        borderColor: scheme.focus,
        ...focusGlow,
      }
    ]}>
      {source ? (
        <Image
          source={source}
          style={{ width: '100%', height: '100%', borderRadius: radius.pill }}
        />
      ) : (
        <Txt variant="bodySm" color={scheme.textSecondary}>{initials?.substring(0, 2).toUpperCase()}</Txt>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
