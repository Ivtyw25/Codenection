import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useScheme, radius, space, MIN_TAP_TARGET } from '@/theme';
import { Txt } from './Txt';

export interface SegmentedTabsProps<T extends string> {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  scrollable?: boolean;
}

export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  scrollable = true,
}: SegmentedTabsProps<T>) {
  const scheme = useScheme();

  const content = options.map((opt) => {
    const isSelected = opt.value === value;
    const bgColor = isSelected ? scheme.primary : scheme.surfaceAlt;
    const fgColor = isSelected ? scheme.onPrimary : scheme.textSecondary;

    return (
      <TouchableOpacity
        key={opt.value}
        accessibilityRole="tab"
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={opt.label}
        onPress={() => onChange(opt.value)}
        activeOpacity={0.8}
        style={[
          styles.tab,
          {
            backgroundColor: bgColor,
            borderRadius: radius.pill,
            minHeight: Math.max(32, MIN_TAP_TARGET),
            minWidth: Math.max(44, MIN_TAP_TARGET),
            paddingHorizontal: space[4],
          }
        ]}
      >
        <Txt variant="label" color={fgColor}>{opt.label}</Txt>
        {opt.count !== undefined && (
          <View style={[styles.badge, { 
            backgroundColor: isSelected ? scheme.surfaceAlt + '40' : scheme.border,
            marginLeft: space[1.5],
            paddingHorizontal: space[1.5],
            paddingVertical: space[0.5],
          }]}>
            <Txt variant="caption" color={fgColor}>{String(opt.count)}</Txt>
          </View>
        )}
      </TouchableOpacity>
    );
  });

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.container, { gap: space[2] }]}
      >
        {content}
      </ScrollView>
    );
  }

  return <View style={[styles.container, { gap: space[2] }]}>{content}</View>;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    borderRadius: 999,
  },
});
