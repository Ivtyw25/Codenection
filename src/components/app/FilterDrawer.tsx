import React from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { Button, Chip, Drawer, Txt } from '@/components/ui';
import { isoDate } from '@/data/format';
import { useApp } from '@/store/AppStore';
import { radius, space, useScheme } from '@/theme';
import type { RangeFilter, SortKey } from '@/types';

const SORTS: { value: SortKey; label: string; hint: string }[] = [
  { value: 'due', label: 'Due first', hint: 'Soonest deadline at the top' },
  { value: 'load', label: 'Heaviest first', hint: 'Highest cognitive load at the top' },
  { value: 'created', label: 'Newest first', hint: 'Most recently captured at the top' },
];

const RANGES: { value: RangeFilter; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'week', label: 'This week' },
  { value: 'all', label: 'Everything' },
];

/**
 * Sort and scope for the Manifest.
 *
 * The frames show a sliders icon in the Manifest header with nothing behind
 * it. This is what it does: it writes to the same `TaskQuery` the filter chips
 * write to, so the two controls can never disagree about what is on screen.
 */
export function FilterDrawer({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const scheme = useScheme();
  const { state, setQuery } = useApp();
  const { query } = state;

  const isDefault =
    query.sort === 'due' && query.range === 'today' && !query.hideDone && query.categoryId === 'all';

  return (
    <Drawer
      visible={visible}
      onClose={onClose}
      title="Filter & sort"
      maxHeight="72%"
      footer={
        <View style={{ flexDirection: 'row', gap: space[2.5] }}>
          <View style={{ flex: 1 }}>
            <Button
              label="Reset"
              variant="secondary"
              fullWidth
              disabled={isDefault}
              disabledReason="Already showing the default view"
              onPress={() =>
                setQuery({
                  sort: 'due',
                  range: 'today',
                  hideDone: false,
                  categoryId: 'all',
                  anchor: isoDate(new Date()),
                })
              }
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Done" fullWidth onPress={onClose} />
          </View>
        </View>
      }
    >
      <Txt variant="caption" muted style={styles.eyebrow}>
        SHOW
      </Txt>
      <View style={styles.chips}>
        {RANGES.map((r) => (
          <Chip
            key={r.value}
            label={r.label}
            selected={query.range === r.value}
            onPress={() => setQuery({ range: r.value })}
          />
        ))}
      </View>

      <Txt variant="caption" muted style={styles.eyebrow}>
        ORDER BY
      </Txt>
      <View style={{ gap: space[2] }}>
        {SORTS.map((s) => {
          const on = query.sort === s.value;
          return (
            <View
              key={s.value}
              style={[
                styles.sortRow,
                {
                  borderColor: on ? scheme.primary : scheme.border,
                  backgroundColor: on ? scheme.surfaceAlt : scheme.surface,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Txt variant="h4">{s.label}</Txt>
                <Txt variant="caption" muted>
                  {s.hint}
                </Txt>
              </View>
              <Chip
                label={on ? 'Selected' : 'Select'}
                size="sm"
                tone={on ? 'brand' : 'neutral'}
                selected={on}
                onPress={() => setQuery({ sort: s.value })}
              />
            </View>
          );
        })}
      </View>

      <View style={[styles.switchRow, { borderColor: scheme.border }]}>
        <View style={{ flex: 1 }}>
          <Txt variant="h4">Hide completed</Txt>
          <Txt variant="caption" muted>
            Closed tasks sink to the bottom either way.
          </Txt>
        </View>
        <Switch
          value={query.hideDone}
          onValueChange={(hideDone) => setQuery({ hideDone })}
          accessibilityLabel="Hide completed tasks"
          trackColor={{ true: scheme.primary, false: scheme.borderStrong }}
          thumbColor={scheme.surface}
        />
      </View>
    </Drawer>
  );
}

const styles = StyleSheet.create({
  eyebrow: { letterSpacing: 1, marginTop: space[2], marginBottom: space[2] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    padding: space[3],
    borderWidth: 1,
    borderRadius: radius.md,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    marginTop: space[5],
    paddingTop: space[4],
    borderTopWidth: 1,
  },
});
