/**
 * SCR-16 — Friends / shared Pips.
 * Route `/pip/friends` · Goal: a coarse check on friends.
 *
 * Friends see a COLOUR BUCKET ONLY — never raw Pressure/Vitality numbers, never
 * task details. That preserves the "someone can tell I might need a check-in"
 * value of sharing without creating the comparison or leaderboard dynamic this
 * app deliberately avoids (§1.7).
 *
 * A friend who hasn't opted into sharing simply doesn't render — no empty
 * placeholder, no error (§3.4).
 */

import { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';

import { Pip } from '@/components/pip';
import { Card, Header, Screen, SkeletonRows, Txt } from '@/components/ui';
import { friends } from '@/mock';
import { useDemo } from '@/mock/demo';
import { brand, colors, MIN_TAP_TARGET, space } from '@/theme';

export default function FriendsScreen() {
  const router = useRouter();
  const { loading, empty } = useDemo();
  const [sharing, setSharing] = useState(true);

  return (
    <Screen>
      <Header
        title="Friends"
        onBack={() => router.back()}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add a friend"
            style={{
              width: MIN_TAP_TARGET,
              height: MIN_TAP_TARGET,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Feather name="user-plus" size={22} color={colors.text} />
          </Pressable>
        }
      />

      {/* Sharing toggle — states the privacy boundary in plain language. */}
      <Card style={{ marginTop: space[3] }} padding={14}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
          <View style={{ flex: 1 }}>
            <Txt variant="h4">Share my Pip&apos;s state</Txt>
            <Txt variant="bodySm" color={colors.textSecondary} style={{ marginTop: space[1] }}>
              Friends see only a colour, never your numbers or tasks.
            </Txt>
          </View>
          <Switch
            accessibilityLabel="Share my Pip's state"
            value={sharing}
            onValueChange={setSharing}
            trackColor={{ true: brand.secondary, false: colors.muted }}
            thumbColor={colors.card}
          />
        </View>
      </Card>

      <View style={{ marginTop: space[4] }}>
        {loading ? (
          <SkeletonRows count={4} height={64} />
        ) : empty || friends.length === 0 ? (
          <Txt variant="bodyMd" color={colors.textSecondary} center style={{ paddingVertical: space[6] }}>
            Add a friend to check in on each other.
          </Txt>
        ) : (
          <View style={{ gap: space[3] }}>
            {friends.map((f) => {
              const bucket = colors.pipState[f.state];
              return (
                <Card key={f.id} padding={14} onPress={() => {}} accessibilityLabel={`${f.name}, ${bucket.label}`}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
                    {/* Silhouette only — a single state-tinted colour, no face. */}
                    <Pip size={44} silhouetteColor={bucket.silhouette} accessibilityLabel="" />
                    <Txt variant="h4" style={{ flex: 1 }}>
                      {f.name}
                    </Txt>
                    {/* The word always accompanies the colour. */}
                    <Txt variant="caption" color={bucket.text}>
                      {bucket.label}
                    </Txt>
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </View>
    </Screen>
  );
}
