/**
 * The sprout-only health pip (`pip-mascot-identity.md` §1.4, asset matrix).
 * Reused as an inline health indicator at 24 and 16px — perky at high Vitality,
 * drooping at low.
 */

import Svg, { Path } from 'react-native-svg';

import { brand } from '@/theme';
import { leafPath, stemPath, stemTip } from './shapes';

const DEG = Math.PI / 180;

export interface SproutProps {
  size?: number;
  /** 0 = fully wilted, 100 = perky. Mirrors a Vitality value. */
  vitality: number;
  color?: string;
}

export function Sprout({ size = 24, vitality, color = brand.secondary }: SproutProps) {
  const droop = Math.min(1, Math.max(0, 1 - vitality / 100));
  const baseX = 12;
  const baseY = 21;
  const height = 11;
  const tip = stemTip(baseX, baseY, height, droop);

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d={stemPath(baseX, baseY, height, droop)}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
      <Path d={leafPath(tip.x, tip.y, (-140 - droop * 80) * DEG, 8, 3.3)} fill={color} />
      <Path d={leafPath(tip.x, tip.y, (-40 + droop * 80) * DEG, 8, 3.3)} fill={color} />
    </Svg>
  );
}
