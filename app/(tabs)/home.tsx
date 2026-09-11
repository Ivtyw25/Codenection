/**
 * SCR-10 — Home.
 * Route `/home` · Goal: at-a-glance state + entry to the daily loop.
 *
 * Zones: Header → Pip hero → Status strip → Today preview → Nudge slot.
 */

import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';

import { Habitat, Pip } from '@/components/pip';
import {
  CapacityBar,
  Card,
  Chip,
  Header,
  InlineBar,
  Screen,
  Skeleton,
  Txt,
} from '@/components/ui';
import { derivePipState, NUDGE_BY_SUBSTAT } from '@/lib/pipState';
import { domainById, manifest, profile } from '@/mock';
import { useDemo } from '@/mock/demo';
import {
  brand,
  colors,
  elevation,
  radius,
  space,
  TAB_BAR_HEIGHT,
} from '@/theme';

export default function HomeScreen() {
  const router = useRouter();
  const demo = useDemo();
  const { capacity, loading, empty, checkInDone, nudgeActive } = demo;

  const derived = derivePipState(capacity);
  const stateColors = colors.pipState[derived.state];

  /**
   * "Critical reached (live): Home auto-presents SCR-30 as a full-screen modal;
   *  Pip hero itself shifts to the Critical render underneath."
   */
  useEffect(() => {
    if (derived.state === 'critical' && !loading) {
      router.push({
        pathname: '/critical',
        params: { cause: derived.criticalCause ?? 'vitality' },
      });
    }
  }, [derived.state, derived.criticalCause, loading]);

  const preview = manifest.slice(0, 3);
  const nudge = NUDGE_BY_SUBSTAT[derived.lowestSubStat];

  return (
    <Screen bottomInset={TAB_BAR_HEIGHT}>
      {/* 1 — Header. Greeting + date, streak pill on the right. */}
      <Header
        compact
        title={`Morning, ${profile.firstName}`}
        subtitle="Thursday, 6 November"
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Balance streak: ${profile.wallet.balanceStreak} days. Opens Reflect.`}
            onPress={() => router.push('/reflect')}
            style={{
              height: 40,
              borderRadius: radius.full,
              backgroundColor: brand.accent,
              flexDirection: 'row',
              alignItems: 'center',
              gap: space[1],
              paddingHorizontal: space[3],
            }}
          >
            <Feather name="zap" size={16} color={brand.accentText} />
            <Txt variant="h4" color={brand.accentText}>
              {profile.wallet.balanceStreak}
            </Txt>
          </Pressable>
        }
      />

      {/* 2 — Pip hero. */}
      <Habitat
        height={300}
        streak={profile.wallet.balanceStreak}
        onPress={() => router.push('/pip')}
        accessibilityLabel={`Pip is ${stateColors.label}. Opens Pip detail.`}
        style={{ marginTop: space[4] }}
      >
        {loading ? (
          // Loading: a static Balanced silhouette, never a spinner.
          <Pip size={220} state="balanced" silhouetteColor={colors.muted} />
        ) : (
          <Pip
            size={220}
            state={derived.state}
            criticalCause={derived.criticalCause}
            lowestSubStat={derived.lowestSubStat}
            tier={profile.wallet.tier}
            accessibilityLabel={`Pip is ${stateColors.label}`}
          />
        )}
      </Habitat>

      {/* 3 — Status strip. Raw numbers hidden; chevron opens detail. */}
      <Card
        padding={14}
        onPress={() => router.push('/pip')}
        accessibilityLabel="Pressure and Vitality. Opens the detail view."
        style={{ marginTop: space[4] }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[4] }}>
          <View style={{ flex: 1, gap: space[3] }}>
            <View style={{ gap: space[1] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
                <Txt variant="caption" color={colors.textSecondary}>
                  Pressure
                </Txt>
                {capacity.isColdStart ? (
                  <Chip
                    label="Estimating…"
                    tint={colors.semantic.info.fill}
                    textColor={colors.semantic.info.text}
                    style={{ height: 20 }}
                  />
                ) : null}
              </View>
              {loading ? (
                <Skeleton height={8} borderRadius={radius.full} />
              ) : (
                <CapacityBar value={capacity.pressure} fill={stateColors.silhouette} />
              )}
            </View>

            <View style={{ gap: space[1] }}>
              <Txt variant="caption" color={colors.textSecondary}>
                Vitality
              </Txt>
              {loading ? (
                <Skeleton height={8} borderRadius={radius.full} />
              ) : (
                <CapacityBar value={capacity.vitality} fill={brand.secondary} />
              )}
            </View>
          </View>

          <Feather name="chevron-right" size={20} color={colors.textSecondary} />
        </View>

        {/* Check-in not done today → a gentle prompt, never a blocking modal. */}
        {!checkInDone && !loading ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="How are you feeling? Opens the daily check-in."
            onPress={() => router.push('/checkin')}
            style={{ marginTop: space[3] }}
          >
            <InlineBar tone="info" icon="smile">
              How are you feeling?
            </InlineBar>
          </Pressable>
        ) : null}
      </Card>

      {/* 4 — Today preview. */}
      <Card style={{ marginTop: space[4] }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Txt variant="h4">Today</Txt>
          {!loading && !empty ? (
            <Txt variant="bodySm" color={colors.textSecondary}>
              {manifest.length} things
            </Txt>
          ) : null}
        </View>

        {loading ? (
          <View style={{ gap: space[2], marginTop: space[3] }}>
            <Skeleton height={20} />
            <Skeleton height={20} width="80%" />
            <Skeleton height={20} width="60%" />
          </View>
        ) : empty ? (
          // Empty (day 1): no "add more" pressure, just a pointer to the FAB.
          <View style={{ alignItems: 'center', paddingVertical: space[4], gap: space[2] }}>
            <Pip size={88} pose="empty" />
            <Txt variant="bodyMd" color={colors.textSecondary} center>
              Nothing scheduled yet. Tap + to brain-dump what&apos;s on your mind.
            </Txt>
            <Feather name="arrow-down" size={20} color={colors.textSecondary} />
          </View>
        ) : (
          <View style={{ marginTop: space[3], gap: space[3] }}>
            {preview.map((task) => {
              const domain = domainById(task.domainId);
              return (
                <View
                  key={task.id}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: radius.full,
                      borderWidth: 2,
                      borderColor: colors.borderStrong,
                    }}
                  />
                  <Txt variant="bodyMd" style={{ flex: 1 }} numberOfLines={1}>
                    {task.title}
                  </Txt>
                  {domain ? <Chip label={domain.name} tint={domain.tint} /> : null}
                </View>
              );
            })}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="See all tasks"
              onPress={() => router.push('/tasks')}
              style={{ paddingTop: space[1] }}
            >
              <Txt variant="h4" color={colors.actionQuiet}>
                See all →
              </Txt>
            </Pressable>
          </View>
        )}
      </Card>

      {/* 5 — Nudge slot. Appears only when a recovery nudge is active, and it
          always matches the lowest sub-stat. */}
      {nudgeActive && !loading ? (
        <View
          style={[
            {
              marginTop: space[4],
              backgroundColor: brand.secondarySoft,
              borderRadius: radius.lg,
              padding: space[4],
              gap: space[3],
            },
            elevation[1],
          ]}
        >
          <View style={{ flexDirection: 'row', gap: space[3] }}>
            <Feather name="feather" size={20} color={colors.actionQuiet} />
            <Txt variant="bodyMd" style={{ flex: 1 }}>
              {nudge.title}
            </Txt>
          </View>
          <View style={{ flexDirection: 'row', gap: space[2] }}>
            <Pressable
              accessibilityRole="button"
              onPress={() => demo.setNudgeActive(false)}
              style={{ paddingVertical: space[2], paddingHorizontal: space[3] }}
            >
              <Txt variant="h4" color={colors.textSecondary}>
                Later
              </Txt>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/nudge')}
              style={{ paddingVertical: space[2], paddingHorizontal: space[3] }}
            >
              <Txt variant="h4" color={colors.actionQuiet}>
                Do it
              </Txt>
            </Pressable>
          </View>
        </View>
      ) : null}
    </Screen>
  );
}
