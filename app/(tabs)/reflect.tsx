/**
 * SCR-14 — Weekly Reflect.
 * Route `/reflect` · Goal: review the week, confirm calibration, preview ahead.
 *
 * This is the transparency surface for the whole personalization system: no
 * coefficient change is ever applied silently, so every proposal here is an
 * explicit accept/dismiss (§B.4).
 */

import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { Pip } from '@/components/pip';
import { Button, Card, Header, InlineBar, Screen, Skeleton, Txt } from '@/components/ui';
import {
  calibrationProposals,
  domainById,
  forecast,
  profile,
  weekSummary,
  weekTrend,
} from '@/mock';
import { useDemo } from '@/mock/demo';
import { colors, radius, space, TAB_BAR_HEIGHT } from '@/theme';
import { SUB_STAT_LABEL, SUB_STATS, type SubStat } from '@/types';

/** Sub-stat stroke colours, drawn from the state ramp. */
const SERIES_COLOR: Record<SubStat, string> = {
  rest: colors.pipState.wilting.silhouette,
  physical: colors.pipState.balanced.silhouette,
  mood: colors.pipState.strained.silhouette,
  connection: colors.pipState.depleted.silhouette,
};

export default function ReflectScreen() {
  const { loading, empty } = useDemo();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const proposals = calibrationProposals.filter((p) => !dismissed.has(p.id));

  // Week 1 — not enough data to reflect on yet.
  if (empty) {
    return (
      <Screen bottomInset={TAB_BAR_HEIGHT}>
        <Header title="Your week" subtitle={weekSummary.range} />
        <View style={{ alignItems: 'center', paddingVertical: space[7], gap: space[3] }}>
          <Pip size={132} pose="resting" />
          <Txt variant="bodyMd" color={colors.textSecondary} center>
            Come back after a few days — I&apos;m still learning your rhythm.
          </Txt>
        </View>
      </Screen>
    );
  }

  return (
    <Screen bottomInset={TAB_BAR_HEIGHT}>
      <Header title="Your week" subtitle={weekSummary.range} />

      {/* 2 — Summary hero. */}
      <Card style={{ marginTop: space[3] }}>
        {loading ? (
          <View style={{ gap: space[3] }}>
            <Skeleton height={40} />
            <Skeleton height={20} width="60%" />
          </View>
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: space[5] }}>
              <BigStat value={weekSummary.completed} label="completed" />
              <BigStat value={weekSummary.deferred} label="deferred" />
            </View>
            <Txt variant="bodyMd" color={colors.textSecondary} style={{ marginTop: space[3] }}>
              Balance Streak: {profile.wallet.balanceStreak} days.
            </Txt>
            {weekSummary.streakResetThisWeek ? (
              <InlineBar tone="info" icon="refresh-cw" style={{ marginTop: space[3] }}>
                Your streak reset — your progress didn&apos;t.
              </InlineBar>
            ) : null}
          </>
        )}
      </Card>

      {/* 3 — Trend. The one data-viz moment: flat, no gridline clutter. */}
      <Txt variant="h3" style={{ marginTop: space[5], marginBottom: space[3] }}>
        How you carried it.
      </Txt>
      <Card>
        {loading ? (
          <Skeleton height={120} borderRadius={radius.md} />
        ) : (
          <>
            <TrendChart />
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: space[3],
                marginTop: space[3],
              }}
            >
              {SUB_STATS.map((k) => (
                <View
                  key={k}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: space[1] }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: radius.full,
                      backgroundColor: SERIES_COLOR[k],
                    }}
                  />
                  <Txt variant="caption" color={colors.textSecondary}>
                    {SUB_STAT_LABEL[k]}
                  </Txt>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space[2] }}>
              {weekTrend.days.map((d) => (
                <Txt key={d} variant="caption" color={colors.textSecondary}>
                  {d}
                </Txt>
              ))}
            </View>
          </>
        )}
      </Card>

      {/* 4 — Calibration proposals. Omitted entirely when there are none. */}
      {!loading && proposals.length > 0 ? (
        <>
          <Txt variant="h3" style={{ marginTop: space[5], marginBottom: space[3] }}>
            Worth adjusting?
          </Txt>
          <View style={{ gap: space[3] }}>
            {proposals.map((p) => (
              <Card key={p.id}>
                <Txt variant="bodyMd">{p.copy}</Txt>
                <View style={{ flexDirection: 'row', gap: space[3], marginTop: space[3] }}>
                  <Button
                    label="Accept"
                    variant="secondary"
                    full={false}
                    onPress={() => setDismissed((s) => new Set(s).add(p.id))}
                    style={{ flex: 1, height: 44 }}
                  />
                  <Button
                    label="Keep as is"
                    variant="text"
                    full={false}
                    onPress={() => setDismissed((s) => new Set(s).add(p.id))}
                    style={{ flex: 1 }}
                  />
                </View>
              </Card>
            ))}
          </View>
        </>
      ) : null}

      {/* 5 — Forecast preview. */}
      <Txt variant="h3" style={{ marginTop: space[5], marginBottom: space[3] }}>
        Week ahead.
      </Txt>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {forecast.map((f) => (
            <View key={f.day} style={{ alignItems: 'center', gap: space[2], flex: 1 }}>
              <Txt variant="caption" color={colors.textSecondary}>
                {f.day}
              </Txt>
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: radius.full,
                  backgroundColor: f.risk ? colors.semantic.warning.solid : colors.muted,
                }}
              />
            </View>
          ))}
        </View>

        {forecast
          .filter((f) => f.risk)
          .map((f) => (
            <InlineBar key={f.day} tone="warning" icon="alert-circle" style={{ marginTop: space[3] }}>
              {f.day} is looking heavy — {f.contributors.join(' and ')}.
            </InlineBar>
          ))}
      </Card>
    </Screen>
  );
}

function BigStat({ value, label }: { value: number; label: string }) {
  return (
    <View>
      <Txt variant="h1">{value}</Txt>
      <Txt variant="bodySm" color={colors.textSecondary}>
        {label}
      </Txt>
    </View>
  );
}

/**
 * A 7-day multi-line of the four sub-stats. Deliberately axis-free: the shape
 * of the week is the message, not the precise values.
 */
function TrendChart() {
  const W = 320;
  const H = 120;
  const pad = 10;

  /**
   * The y-domain follows the data rather than a fixed 0–100. Across a single
   * week the four sub-stats occupy a narrow band, and pinning to 0–100 flattens
   * them into an unreadable bundle — which defeats the purpose, since the SHAPE
   * of the week is the whole message here.
   */
  const all = SUB_STATS.flatMap((k) => weekTrend[k]);
  const lo = Math.max(0, Math.min(...all) - 8);
  const hi = Math.min(100, Math.max(...all) + 8);
  const span = Math.max(1, hi - lo);

  const x = (i: number) => pad + (i / (weekTrend.days.length - 1)) * (W - pad * 2);
  const y = (v: number) => H - pad - ((v - lo) / span) * (H - pad * 2);

  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      {SUB_STATS.map((key) => {
        const series = weekTrend[key];
        const points = series.map((v, i) => `${x(i)},${y(v)}`).join(' ');
        return (
          <Polyline
            key={key}
            points={points}
            fill="none"
            stroke={SERIES_COLOR[key]}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}
      {/* Endpoint dots so each series is findable without a legend hunt. */}
      {SUB_STATS.map((key) => {
        const series = weekTrend[key];
        return (
          <Circle
            key={`${key}-end`}
            cx={x(series.length - 1)}
            cy={y(series[series.length - 1])}
            r={3.5}
            fill={SERIES_COLOR[key]}
          />
        );
      })}
    </Svg>
  );
}
