/**
 * Pip's habitat — the `--brand-accent` soft radial wash, `--radius-xl`, that
 * Pip is staged on across Home (SCR-10), the first reveal (SCR-08) and Pip
 * detail (SCR-12).
 *
 * The Balance Streak renders here as "a small row of lanterns/stones in Pip's
 * habitat background, one lit per streak day" (§1.6) — max 7 shown, then a
 * "+N" pill. This is the only place the streak appears as a body of light
 * rather than a number.
 */

import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { brand, colors, radius, space } from '@/theme';
import { alpha } from '@/lib/color';
import { Txt } from '@/components/ui/Txt';

const MAX_LANTERNS = 7;

export interface HabitatProps {
  children: React.ReactNode;
  height?: number;
  /** Balance Streak — one lantern lit per day. */
  streak?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Habitat({
  children,
  height = 300,
  streak,
  onPress,
  style,
  accessibilityLabel,
}: HabitatProps) {
  const lit = Math.min(streak ?? 0, MAX_LANTERNS);
  const overflow = (streak ?? 0) - lit;

  const content = (
    <LinearGradient
      colors={[alpha(brand.accent, 0.55), alpha(brand.accent, 0.16), colors.bg]}
      start={{ x: 0.5, y: 0.1 }}
      end={{ x: 0.5, y: 1 }}
      style={{
        height,
        borderRadius: radius.xl,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {children}

      {streak != null ? (
        <View
          style={{
            position: 'absolute',
            bottom: space[4],
            flexDirection: 'row',
            alignItems: 'center',
            gap: space[2],
          }}
        >
          {Array.from({ length: MAX_LANTERNS }).map((_, i) => (
            <View
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: radius.full,
                backgroundColor: i < lit ? brand.accentText : alpha(brand.accentText, 0.18),
              }}
            />
          ))}
          {overflow > 0 ? (
            <View
              style={{
                backgroundColor: brand.accent,
                borderRadius: radius.full,
                paddingHorizontal: space[2],
                paddingVertical: 2,
              }}
            >
              <Txt variant="caption" color={brand.accentText}>
                +{overflow}
              </Txt>
            </View>
          ) : null}
        </View>
      ) : null}
    </LinearGradient>
  );

  if (!onPress) return <View style={style}>{content}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={style}
    >
      {content}
    </Pressable>
  );
}
