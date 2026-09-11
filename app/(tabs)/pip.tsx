/**
 * SCR-12 — Pip detail.
 * Route `/pip` · Goal: understand current state + access shop/social.
 *
 * The raw numbers are collapsed by default. Pip's body is the primary readout;
 * the digits are an on-demand detail, not the headline.
 */

import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';

import { Habitat, Pip } from '@/components/pip';
import { Button, CapacityBar, Card, Screen, Skeleton, Txt } from '@/components/ui';
import { derivePipState, STATE_EXPLANATION } from '@/lib/pipState';
import { profile } from '@/mock';
import { useDemo } from '@/mock/demo';
import { brand, colors, radius, space, TAB_BAR_HEIGHT, type as typeScale } from '@/theme';
import { SUB_STAT_LABEL, SUB_STATS, type SubStat } from '@/types';

type IconName = React.ComponentProps<typeof Feather>['name'];

const SUB_STAT_ICON: Record<SubStat, IconName> = {
  rest: 'moon',
  physical: 'activity',
  mood: 'smile',
  connection: 'users',
};

export default function PipDetailScreen() {
  const router = useRouter();
  const { capacity, loading } = useDemo();
  const [showNumbers, setShowNumbers] = useState(false);

  const derived = derivePipState(capacity);
  const stateColor = colors.pipState[derived.state];

  return (
    <Screen bottomInset={TAB_BAR_HEIGHT}>
      {/* 1 — Large Pip stage, with tier accessories and aura. */}
      <Habitat height={340} style={{ marginTop: space[4] }}>
        {loading ? (
          <Pip size={220} state="balanced" silhouetteColor={colors.muted} />
        ) : (
          <Pip
            size={220}
            state={derived.state}
            criticalCause={derived.criticalCause}
            lowestSubStat={derived.lowestSubStat}
            tier={profile.wallet.tier}
            accessibilityLabel={`${profile.pipName} is ${stateColor.label}`}
          />
        )}
      </Habitat>

      {/* 2 — State caption. The word always accompanies the colour. */}
      <View style={{ alignItems: 'center', marginTop: space[4], gap: space[1] }}>
        <Txt variant="h3" color={derived.state === 'critical' ? stateColor.fill : stateColor.text}>
          {stateColor.label}
        </Txt>
        <Txt variant="bodyMd" color={colors.textSecondary} center>
          {STATE_EXPLANATION[derived.state]}
        </Txt>
      </View>

      {/* 3 — Sub-stat breakdown. The lowest one is ringed and labelled. */}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: space[3],
          marginTop: space[5],
        }}
      >
        {SUB_STATS.map((key) => {
          const isLowest = key === derived.lowestSubStat && !loading;
          return (
            <View
              key={key}
              style={{
                flexGrow: 1,
                flexBasis: '45%',
                backgroundColor: colors.card,
                borderRadius: radius.md,
                padding: space[3],
                gap: space[2],
                borderWidth: isLowest ? 2 : 1,
                borderColor: isLowest ? brand.secondary : colors.border,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
                <Feather name={SUB_STAT_ICON[key]} size={16} color={colors.textSecondary} />
                <Txt variant="h4">{SUB_STAT_LABEL[key]}</Txt>
              </View>
              {loading ? (
                <Skeleton height={6} borderRadius={radius.full} />
              ) : (
                <CapacityBar
                  value={capacity.subStats[key]}
                  fill={isLowest ? brand.secondary : colors.borderStrong}
                  height={6}
                />
              )}
              {isLowest ? (
                <Txt variant="caption" color={colors.actionQuiet}>
                  Focus here
                </Txt>
              ) : null}
            </View>
          );
        })}
      </View>

      {/* 4 — Raw detail, collapsed by default. */}
      <Card style={{ marginTop: space[4] }} padding={space[3]}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: showNumbers }}
          accessibilityLabel="See the numbers"
          onPress={() => setShowNumbers((v) => !v)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: 32,
          }}
        >
          <Txt variant="h4">See the numbers</Txt>
          <Feather
            name={showNumbers ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.textSecondary}
          />
        </Pressable>

        {showNumbers ? (
          <View style={{ marginTop: space[3], gap: space[2] }}>
            <NumberRow label="Pressure" value={capacity.pressure} />
            <NumberRow label="Vitality" value={capacity.vitality} />
            {SUB_STATS.map((k) => (
              <NumberRow key={k} label={SUB_STAT_LABEL[k]} value={capacity.subStats[k]} muted />
            ))}
          </View>
        ) : null}
      </Card>

      {/* 5 — Action row. */}
      <View style={{ flexDirection: 'row', gap: space[3], marginTop: space[4] }}>
        <Button
          label="Shop"
          variant="secondary"
          full={false}
          onPress={() => router.push('/pip/shop')}
          style={{ flex: 1, height: 48 }}
        />
        <Button
          label="Friends"
          variant="secondary"
          full={false}
          onPress={() => router.push('/pip/friends')}
          style={{ flex: 1, height: 48 }}
        />
      </View>
    </Screen>
  );
}

function NumberRow({
  label,
  value,
  muted,
}: {
  label: string;
  value: number;
  muted?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Txt variant="bodySm" color={muted ? colors.textSecondary : colors.text}>
        {label}
      </Txt>
      <Txt
        variant="numMd"
        color={muted ? colors.textSecondary : colors.text}
        style={typeScale.numMd}
      >
        {Math.round(value)}
      </Txt>
    </View>
  );
}
