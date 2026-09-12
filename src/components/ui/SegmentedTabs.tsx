import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { MIN_TAP_TARGET, radius, space, useScheme } from '@/theme';
import { Interactive } from './Interactive';
import { Txt } from './Txt';

export interface TabOption<T extends string> {
  value: T;
  label: string;
  /** Live count badge. Zero renders — "0" is information, not absence. */
  count?: number;
  disabled?: boolean;
}

export interface SegmentedTabsProps<T extends string> {
  options: TabOption<T>[];
  value: T;
  onChange: (v: T) => void;
  scrollable?: boolean;
  /** For placing the row on the forest header instead of a light surface. */
  onDark?: boolean;
}

/**
 * The filter row. Four states per tab: default, hover, pressed, selected —
 * plus disabled, which a context with nothing in it uses rather than
 * disappearing (a filter that vanishes teaches the user nothing).
 */
export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  scrollable = true,
  onDark,
}: SegmentedTabsProps<T>) {
  const scheme = useScheme();

  const tabs = options.map((opt) => {
    const selected = opt.value === value;

    const bg = selected
      ? onDark
        ? 'rgba(255,255,255,0.22)'
        : scheme.primary
      : onDark
        ? 'rgba(255,255,255,0.10)'
        : scheme.surfaceAlt;

    const fg = selected
      ? onDark
        ? '#ffffff'
        : scheme.onPrimary
      : onDark
        ? 'rgba(255,255,255,0.66)'
        : scheme.textSecondary;

    return (
      <Interactive
        key={opt.value}
        accessibilityRole="tab"
        accessibilityLabel={
          opt.count === undefined ? opt.label : `${opt.label}, ${opt.count} items`
        }
        selected={selected}
        disabled={opt.disabled}
        onPress={() => onChange(opt.value)}
        radius="pill"
        style={[
          styles.tab,
          {
            backgroundColor: bg,
            borderRadius: radius.pill,
            minHeight: Math.max(36, MIN_TAP_TARGET - 8),
            paddingHorizontal: space[4],
          },
        ]}
      >
        <Txt variant="label" color={fg}>
          {opt.label}
        </Txt>

        {opt.count !== undefined ? (
          <View
            style={[
              styles.badge,
              {
                backgroundColor: selected
                  ? 'rgba(255,255,255,0.22)'
                  : onDark
                    ? 'rgba(255,255,255,0.14)'
                    : scheme.border,
                marginLeft: space[1.5],
              },
            ]}
          >
            <Txt variant="caption" color={fg}>
              {opt.count}
            </Txt>
          </View>
        ) : null}
      </Interactive>
    );
  });

  if (!scrollable) return <View style={[styles.row, { gap: space[2] }]}>{tabs}</View>;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.row, { gap: space[2] }]}
    >
      {tabs}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  tab: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: space[1.5],
    paddingVertical: space[0.5],
    minWidth: 20,
    alignItems: 'center',
  },
});
