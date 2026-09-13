import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { Interactive, ProgressBar, Txt } from '@/components/ui';
import { formatEstimate } from '@/data/format';
import { radius, space, useScheme } from '@/theme';
import type { Category, CategoryLoad } from '@/types';
import { TaskIcon } from './TaskIcon';

export type LoadSlice = CategoryLoad & { category: Category };

export interface LoadBreakdownProps {
  total: number;
  /** Descending by value — `useLoadBreakdown` guarantees the order. */
  slices: LoadSlice[];
  /** Drill into the Manifest, filtered to that category. */
  onPressCategory?: (categoryId: string) => void;
  /** Cap the rows shown. The rest roll into an "everything else" line. */
  limit?: number;
}

/**
 * Where the pressure is actually coming from.
 *
 * The gauge above this says a number. This says which part of a life that
 * number is, in the user's own words — and that is the difference between an
 * alarm and something you can act on. "You are at 64" tells a student nothing
 * they did not already feel. "Club is 31 of your 64, across two tasks and four
 * hours" tells them what to put down.
 *
 * ── Two deliberate design calls ────────────────────────────────────────────
 *
 * ONE COLOUR, NOT A PALETTE. Every bar is drawn in the brand hue. A per-
 * category colour ramp would encode magnitude twice — once in the length of
 * the bar and again in its hue — and redundant encoding of the same variable is
 * precisely the cognitive noise this screen exists not to have. It would also
 * put the app in the business of generating N accessible hues for N
 * user-created categories, which it would eventually get wrong. Recognition is
 * carried by the icon, magnitude by length and the figure beside it.
 *
 * NOTHING AT ZERO. Categories carrying nothing are omitted rather than drawn
 * as empty rails. An empty bar is a row that asks to be read and then says
 * "nothing" — five of them is a wall of nothing, and a student at 88% does not
 * have the attention to spend on it.
 */
export function LoadBreakdown({ total, slices, onPressCategory, limit }: LoadBreakdownProps) {
  const scheme = useScheme();

  if (slices.length === 0) {
    return (
      <Txt variant="bodySm" muted>
        Nothing open, so nothing is carrying load right now.
      </Txt>
    );
  }

  const shown = limit ? slices.slice(0, limit) : slices;
  const rest = limit ? slices.slice(limit) : [];
  const restValue = rest.reduce((sum, s) => sum + s.value, 0);
  const restTasks = rest.reduce((sum, s) => sum + s.taskCount, 0);

  return (
    <View style={styles.root}>
      {shown.map((slice) => {
        const { category } = slice;
        const detail = `${slice.taskCount} ${slice.taskCount === 1 ? 'task' : 'tasks'} · ${formatEstimate(slice.minutes)} left`;

        const row = (
          <View style={styles.row}>
            <View style={[styles.badge, { backgroundColor: scheme.surfaceAlt }]}>
              <TaskIcon name={category.icon} size={15} color={scheme.primary} />
            </View>

            <View style={styles.body}>
              <View style={styles.head}>
                <Txt variant="h4" style={styles.label} numberOfLines={1}>
                  {category.label}
                </Txt>
                {/*
                  The figure is points of Pressure, not a percentage of itself —
                  the slices sum to the headline number above, which is the one
                  claim that makes this a breakdown rather than five gauges.
                */}
                <Txt variant="label">{slice.value}</Txt>
              </View>

              <ProgressBar
                // Against the total, so the bars are comparable to each other
                // AND to the gauge. Scaling each to its own maximum would make
                // the smallest worry look identical to the largest.
                value={total > 0 ? (slice.value / total) * 100 : 0}
                height={6}
                label={`${category.label}: ${slice.value} of ${total} pressure`}
              />

              <Txt variant="caption" muted>
                {detail}
              </Txt>
            </View>

            {onPressCategory ? <ChevronRight size={16} color={scheme.textMuted} /> : null}
          </View>
        );

        // Grouped into ONE announcement. Read element-by-element a row is
        // "Academics", "31", "progress bar", "2 tasks, 4h left" — four stops
        // for one fact.
        return onPressCategory ? (
          <Interactive
            key={slice.categoryId}
            accessibilityRole="button"
            accessibilityLabel={`${category.label}, ${slice.value} of ${total} pressure. ${detail}.`}
            accessibilityHint="Shows this category in the manifest"
            onPress={() => onPressCategory(slice.categoryId)}
            radius="md"
            style={styles.pressable}
          >
            {row}
          </Interactive>
        ) : (
          <View
            key={slice.categoryId}
            accessible
            accessibilityLabel={`${category.label}, ${slice.value} of ${total} pressure. ${detail}.`}
            style={styles.pressable}
          >
            {row}
          </View>
        );
      })}

      {rest.length > 0 ? (
        <Txt variant="caption" muted style={styles.rest}>
          {`+${rest.length} more ${rest.length === 1 ? 'category' : 'categories'} · ${restValue} pressure across ${restTasks} ${restTasks === 1 ? 'task' : 'tasks'}`}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space[1] },
  pressable: { paddingVertical: space[1.5], paddingHorizontal: space[1] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  badge: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: space[1] },
  head: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  label: { flex: 1 },
  rest: { paddingHorizontal: space[1], paddingTop: space[1] },
});
