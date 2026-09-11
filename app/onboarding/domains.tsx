/**
 * SCR-04 — Domain confirmation.
 * Route `/onboarding/domains` · Goal: review/edit the extracted domains.
 *
 * "Nothing is committed until the student approves it — the AI proposes, the
 *  student owns" (§A.3). Every inference is an editable suggestion.
 */

import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { LinearTransition, SlideOutLeft } from 'react-native-reanimated';
import Feather from '@expo/vector-icons/Feather';

import { StepScaffold } from '@/components/onboarding/StepScaffold';
import { Chip, Txt } from '@/components/ui';
import { domains as seedDomains } from '@/mock';
import {
  colors,
  CONTROL_HEIGHT,
  elevation,
  MIN_TAP_TARGET,
  radius,
  space,
  type as typeScale,
} from '@/theme';
import type { LifeDomain } from '@/types';

export default function DomainsScreen() {
  const router = useRouter();
  const [list, setList] = useState<LifeDomain[]>(seedDomains);
  const [editingId, setEditingId] = useState<string | null>(null);

  function rename(id: string, name: string) {
    setList((cur) => cur.map((d) => (d.id === id ? { ...d, name } : d)));
  }

  function remove(id: string) {
    setList((cur) => cur.filter((d) => d.id !== id));
  }

  function add() {
    const id = `new-${Date.now()}`;
    setList((cur) => [
      ...cur,
      {
        id,
        name: '',
        categories: ['time'],
        hoursPerWeek: 4,
        fulfillment: 0,
        volatility: 'steady',
        tint: colors.muted,
      },
    ]);
    setEditingId(id);
  }

  const first = list[0];

  return (
    <StepScaffold
      step={4}
      ctaLabel="Confirm domains"
      ctaDisabled={list.length === 0}
      onBack={() => router.back()}
      onContinue={() =>
        first && router.push(`/onboarding/baseline/${first.id}`)
      }
    >
      <Txt variant="h2" style={{ marginTop: space[5] }}>
        Here&apos;s what I heard.
      </Txt>
      <Txt variant="bodySm" color={colors.textSecondary} style={{ marginTop: space[1] }}>
        Add, rename, or remove anything.
      </Txt>

      <View style={{ marginTop: space[4], gap: space[3] }}>
        {list.length === 0 ? (
          <View
            style={[
              {
                backgroundColor: colors.card,
                borderRadius: radius.lg,
                padding: 14,
              },
              elevation[1],
            ]}
          >
            <Txt variant="bodyMd">I didn&apos;t catch any — let&apos;s add them.</Txt>
          </View>
        ) : null}

        {list.map((d) => (
          <Animated.View
            key={d.id}
            layout={LinearTransition}
            exiting={SlideOutLeft.duration(240)}
            style={[
              {
                minHeight: 64,
                backgroundColor: colors.card,
                borderRadius: radius.lg,
                padding: 14,
                flexDirection: 'row',
                alignItems: 'center',
                gap: space[3],
              },
              elevation[1],
            ]}
          >
            <View style={{ flex: 1, gap: space[2] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
                {editingId === d.id ? (
                  <TextInput
                    accessibilityLabel="Domain name"
                    value={d.name}
                    onChangeText={(t) => rename(d.id, t)}
                    onBlur={() => setEditingId(null)}
                    placeholder="What is it called?"
                    placeholderTextColor={colors.textDisabled}
                    autoFocus
                    style={[typeScale.h4, { flex: 1, color: colors.text, padding: 0 }]}
                  />
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Rename ${d.name}`}
                    onPress={() => setEditingId(d.id)}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: space[2] }}
                  >
                    <Txt variant="h4" style={{ flex: 1 }}>
                      {d.name || 'Untitled'}
                    </Txt>
                    <Feather name="edit-2" size={14} color={colors.textSecondary} />
                  </Pressable>
                )}
              </View>

              {/* The tag IS the domain — no generic mapping is shown here. */}
              <View style={{ flexDirection: 'row' }}>
                <Chip label={d.name || 'Untitled'} tint={d.tint} />
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${d.name}`}
              onPress={() => remove(d.id)}
              hitSlop={10}
              style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}
            >
              <Feather name="x" size={20} color={colors.textSecondary} />
            </Pressable>
          </Animated.View>
        ))}

        {/* Add-domain row. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add a commitment"
          onPress={add}
          style={{
            height: CONTROL_HEIGHT,
            minHeight: MIN_TAP_TARGET,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: colors.borderStrong,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: space[2],
          }}
        >
          <Feather name="plus" size={18} color={colors.actionQuiet} />
          <Txt variant="h4" color={colors.actionQuiet}>
            Add a commitment
          </Txt>
        </Pressable>
      </View>
    </StepScaffold>
  );
}
