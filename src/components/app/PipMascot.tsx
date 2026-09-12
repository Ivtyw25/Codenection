import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { PIP_BASE, SKIN_IMAGES, type SkinId } from '@/data/seed';
import { useApp } from '@/store/AppStore';
import { brand } from '@/theme';
import type { PipStateName } from '@/types';

export interface PipMascotProps {
  size: number;
  /** Ambient glow diameter. Omit for no glow. */
  glow?: number;
  /** Tints the glow by mood. Defaults to the live derived state. */
  state?: PipStateName;
}

/**
 * Pip, wearing whatever is equipped.
 *
 * Reads the equipped cosmetic straight from the store, which is what makes the
 * Shop a real purchase rather than a card that greys out: buying a skin
 * changes the mascot on the Pip tab, on Home, in the Review sheet and in the
 * tab bar, all at once, because they all render this.
 */
export function PipMascot({ size, glow, state = 'balanced' }: PipMascotProps) {
  const { data } = useApp();

  const equipped = data.pip.equipped as SkinId | null;
  const source = equipped && equipped in SKIN_IMAGES ? SKIN_IMAGES[equipped] : PIP_BASE;

  return (
    <View style={[styles.root, { width: size, height: size }]}>
      {glow ? <Glow size={glow} state={state} /> : null}
      <Image
        source={source}
        style={{ width: size, height: size }}
        resizeMode="contain"
        accessibilityRole="image"
        accessibilityLabel={`Pip, looking ${state}`}
      />
    </View>
  );
}

/**
 * The ambient falloff behind the mascot.
 *
 * A flat rgba circle reads as a hard-edged disc at 260pt, which is not what
 * the frames show; a real radial gradient needs SVG. The hue now follows Pip's
 * state — lime when balanced, amber under strain, rust when critical — so the
 * glow carries the same information as the face.
 */
function Glow({ size, state }: { size: number; state: PipStateName }) {
  const colour =
    state === 'critical' || state === 'depleted'
      ? '#d98a72'
      : state === 'wilting' || state === 'strained'
        ? brand.amber
        : brand.lime;

  return (
    <View style={[styles.glow, { width: size, height: size }]} pointerEvents="none">
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="pipGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={colour} stopOpacity={0.22} />
            <Stop offset="55%" stopColor={colour} stopOpacity={0.09} />
            <Stop offset="100%" stopColor={colour} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#pipGlow)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});
