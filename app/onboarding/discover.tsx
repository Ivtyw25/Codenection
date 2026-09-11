/**
 * SCR-03 — Domain discovery (AI conversation).
 * Route `/onboarding/discover` · Goal: elicit Life Domains conversationally.
 *
 * This is the step that replaces fixed commitment checkboxes. It is deliberately
 * BOUNDED — a few turns, not open-ended chat (§A.3 guardrails) — and a student
 * who doesn't want to type can fall back to templates.
 */

import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';

import { Pip } from '@/components/pip';
import { StepScaffold } from '@/components/onboarding/StepScaffold';
import { Skeleton, Txt } from '@/components/ui';
import { discoveryScript } from '@/mock';
import { brand, colors, radius, space, type as typeScale } from '@/theme';

interface Bubble {
  role: 'assistant' | 'user';
  text: string;
}

export default function DiscoverScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exchanges, setExchanges] = useState(0);

  // On step entry: one shimmer prompt-bubble skeleton before the first real one.
  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(false);
      setBubbles([discoveryScript[0]]);
    }, 700);
    return () => clearTimeout(t);
  }, []);

  function send() {
    const text = draft.trim();
    if (!text) return;

    setBubbles((b) => [...b, { role: 'user', text }]);
    setDraft('');
    setExchanges((n) => n + 1);
    setThinking(true);

    // Frontend stage: the follow-up is scripted, not generated.
    setTimeout(() => {
      setThinking(false);
      const follow = discoveryScript[2];
      if (follow) setBubbles((b) => [...b, follow]);
    }, 1100);
  }

  return (
    <StepScaffold
      step={3}
      ctaLabel="Continue"
      ctaDisabled={exchanges < 1}
      onBack={() => router.back()}
      onContinue={() => router.push('/onboarding/domains')}
      scroll={false}
      footerExtra={
        // Template fallback — a student who doesn't want to type can still finish.
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/onboarding/domains')}
          style={{ alignSelf: 'center', paddingVertical: space[2] }}
        >
          <Txt variant="bodySm" color={colors.actionQuiet}>
            Prefer to pick from a list?
          </Txt>
        </Pressable>
      }
    >
      <View style={{ flex: 1, flexDirection: 'row', gap: space[3], paddingTop: space[3] }}>
        {/* 1 — Sticky Pip anchor. Swaps to Thinking while the AI works. */}
        <View style={{ width: 64 }}>
          <Pip
            size={64}
            pose={thinking ? 'thinking' : 'listening'}
            accessibilityLabel={thinking ? 'Pip is thinking' : 'Pip is listening'}
          />
        </View>

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ gap: space[3], paddingBottom: space[3] }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <Skeleton height={72} width="86%" borderRadius={radius.lg} />
          ) : null}

          {bubbles.map((b, i) => (
            <View
              key={i}
              style={{
                maxWidth: 300,
                alignSelf: b.role === 'user' ? 'flex-end' : 'flex-start',
                backgroundColor: b.role === 'user' ? brand.primarySoft : colors.card,
                borderRadius: radius.lg,
                borderBottomLeftRadius: b.role === 'assistant' ? radius.sm : radius.lg,
                borderBottomRightRadius: b.role === 'user' ? radius.sm : radius.lg,
                padding: space[3],
              }}
            >
              <Txt variant="bodyMd">{b.text}</Txt>
            </View>
          ))}

          {/* Typing indicator. */}
          {thinking ? (
            <View
              style={{
                alignSelf: 'flex-start',
                backgroundColor: colors.muted,
                borderRadius: radius.lg,
                borderBottomLeftRadius: radius.sm,
                paddingHorizontal: space[4],
                paddingVertical: space[3],
                flexDirection: 'row',
                gap: space[1],
              }}
            >
              {[0, 1, 2].map((i) => (
                <View
                  key={i}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: radius.full,
                    backgroundColor: colors.textDisabled,
                  }}
                />
              ))}
            </View>
          ) : null}
        </ScrollView>
      </View>

      {/* 4 — Composer. */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: space[2],
          paddingVertical: space[2],
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.card,
          marginHorizontal: -space[4],
          paddingHorizontal: space[4],
        }}
      >
        <TextInput
          accessibilityLabel="Your reply"
          value={draft}
          onChangeText={setDraft}
          placeholder="Type your answer…"
          placeholderTextColor={colors.textDisabled}
          multiline
          style={[
            typeScale.bodyMd,
            { flex: 1, color: colors.text, maxHeight: 88, paddingVertical: space[2] },
          ]}
        />
        <RoundButton icon="mic" label="Record a voice note" onPress={() => {}} />
        <RoundButton
          icon="send"
          label="Send"
          onPress={send}
          disabled={draft.trim().length === 0}
          filled
        />
      </View>
    </StepScaffold>
  );
}

function RoundButton({
  icon,
  label,
  onPress,
  disabled,
  filled,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  onPress: () => void;
  disabled?: boolean;
  filled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={{
        width: 40,
        height: 40,
        borderRadius: radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: filled ? colors.action : 'transparent',
        borderWidth: filled ? 0 : 1.5,
        borderColor: colors.actionQuiet,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Feather name={icon} size={18} color={filled ? colors.onFill : colors.actionQuiet} />
    </Pressable>
  );
}
