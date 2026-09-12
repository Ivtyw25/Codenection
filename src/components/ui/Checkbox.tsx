import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { useScheme, radius, space, MIN_TAP_TARGET, n } from '@/theme';
import { Txt } from './Txt';

export interface CheckboxProps {
  checked: boolean;
  onToggle: (checked: boolean) => void;
  size?: number;
  /** Visible text rendered beside the box. Omit for a bare checkbox. */
  label?: string;
  /**
   * Screen-reader name. Use this — not `label` — when the visible text lives
   * in a sibling element, so the row is announced without being drawn twice.
   */
  accessibilityLabel?: string;
}

export function Checkbox({
  checked,
  onToggle,
  size = 24,
  label,
  accessibilityLabel,
}: CheckboxProps) {
  const scheme = useScheme();
  
  const hitSlop = Math.max(0, (MIN_TAP_TARGET - size) / 2);

  return (
    <TouchableOpacity
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel ?? label ?? 'Checkbox'}
      onPress={() => onToggle(!checked)}
      activeOpacity={0.8}
      hitSlop={{ top: hitSlop, bottom: hitSlop, left: hitSlop, right: hitSlop }}
      style={[styles.container, { minHeight: MIN_TAP_TARGET }]}
    >
      <View style={[
        styles.box,
        {
          width: size,
          height: size,
          borderRadius: radius.pill,
          backgroundColor: checked ? scheme.primary : undefined,
          borderColor: checked ? scheme.primary : scheme.borderStrong,
          borderWidth: checked ? 0 : 2,
        }
      ]}>
        {checked && <Check size={size * 0.6} color={n[0]} strokeWidth={3} />}
      </View>
      {label && (
        <Txt variant="body" style={{ marginLeft: space[2] }}>{label}</Txt>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  box: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
