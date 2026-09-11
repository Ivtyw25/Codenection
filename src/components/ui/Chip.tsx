/**
 * Chip — `--radius-full`, 32px, Caption.
 * Default `--muted` / `--text-secondary`; selected `--brand-primary-soft` /
 * `--brand-primary-onFill`. Sentence case, NEVER all-caps (Appendix).
 */

import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { brand, colors, MIN_TAP_TARGET, radius, space } from '@/theme';
import { Txt } from './Txt';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** Overrides the fill — used by domain chips, which carry the domain's tint. */
  tint?: string;
  textColor?: string;
  leading?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Chip({ label, selected, onPress, tint, textColor, leading, style }: ChipProps) {
  const bg = tint ?? (selected ? brand.primarySoft : colors.muted);
  const fg = textColor ?? (selected ? colors.action : colors.textSecondary);

  const body = (
    <View
      style={[
        {
          height: 32,
          borderRadius: radius.full,
          paddingHorizontal: space[3],
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: space[1],
          backgroundColor: bg,
        },
        style,
      ]}
    >
      {leading}
      <Txt variant="caption" color={fg}>
        {label}
      </Txt>
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      // The chip itself is 32px; the hit slop carries it to the 44pt floor.
      hitSlop={(MIN_TAP_TARGET - 32) / 2}
    >
      {body}
    </Pressable>
  );
}
