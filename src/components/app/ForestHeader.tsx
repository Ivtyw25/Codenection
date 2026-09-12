import React, { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { brand, space } from '@/theme';

export interface ForestHeaderProps {
  children: ReactNode;
  /** Bottom padding inside the canopy. */
  pad?: number;
  /** Square off the bottom — the Pip tab's stage runs into its sheet. */
  flat?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * The curved forest canopy — Figma's "Header Curved Canopy" / "Forest Top Hero
 * & Mascot Stage", which four of the seven frames open with.
 *
 * It keeps a fixed dark palette in both themes rather than inverting with the
 * scheme. The forest green is the system's spine (2,140 uses) and the screens
 * are built on the contrast between it and the light body beneath; a header
 * that goes pale in light mode would take the structure with it.
 */
export function ForestHeader({ children, pad = space[6], flat, style }: ForestHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.base,
        { paddingTop: insets.top + space[2], paddingBottom: pad },
        !flat && styles.curved,
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Ink that is legible on the canopy. Never a scheme colour — see above. */
export const onForest = {
  primary: '#ffffff',
  secondary: 'rgba(255,255,255,0.72)',
  muted: 'rgba(255,255,255,0.60)',
  hairline: 'rgba(255,255,255,0.18)',
  fill: 'rgba(255,255,255,0.12)',
  fillStrong: 'rgba(255,255,255,0.22)',
  well: 'rgba(0,0,0,0.30)',
} as const;

const styles = StyleSheet.create({
  base: {
    backgroundColor: brand.forest,
    paddingHorizontal: space[5],
  },
  curved: {
    borderBottomLeftRadius: space[7],
    borderBottomRightRadius: space[7],
  },
});
