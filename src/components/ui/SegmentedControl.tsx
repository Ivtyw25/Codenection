/**
 * Segmented control — `--radius-md`, selected segment fills
 * `--brand-secondary-soft` with `--brand-secondary-onFill` text (SCR-05
 * volatility, SCR-24 duration).
 */

import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { brand, colors, MIN_TAP_TARGET, radius, space } from '@/theme';
import { Txt } from './Txt';

export interface SegmentedControlProps<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
  accessibilityLabel,
}: SegmentedControlProps<T>) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={[
        {
          flexDirection: 'row',
          backgroundColor: colors.muted,
          borderRadius: radius.md,
          padding: 3,
          gap: 3,
        },
        style,
      ]}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={opt.label}
            onPress={() => onChange(opt.value)}
            style={{
              flex: 1,
              minHeight: MIN_TAP_TARGET - 6,
              borderRadius: radius.md - 3,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: space[2],
              backgroundColor: selected ? brand.secondarySoft : 'transparent',
            }}
          >
            <Txt variant="h4" color={selected ? colors.actionQuiet : colors.textSecondary}>
              {opt.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}
