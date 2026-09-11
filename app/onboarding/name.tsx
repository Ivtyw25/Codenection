/**
 * SCR-02 — Meet & name Pip.
 * Route `/onboarding/name` · Goal: name the pet — the first emotional hook.
 *
 * The pet is named BEFORE anything is measured, deliberately: the student
 * should feel they're helping Pip understand them, not filling in a database
 * (§A.0).
 */

import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Pip } from '@/components/pip';
import { StepScaffold } from '@/components/onboarding/StepScaffold';
import { Input, Txt } from '@/components/ui';
import { starterSkins } from '@/mock';
import { brand, colors, radius, space } from '@/theme';

export default function NamePipScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [skin, setSkin] = useState(0);

  return (
    <StepScaffold
      step={2}
      ctaLabel="Continue"
      ctaDisabled={name.trim().length === 0}
      onBack={() => router.back()}
      onContinue={() => router.push('/onboarding/discover')}
    >
      {/* 1 — Mascot zone. Recolours live as skins are tapped. */}
      <View style={{ alignItems: 'center', marginTop: space[6] }}>
        <Pip
          size={180}
          pose="welcome"
          bodyColor={starterSkins[skin].color}
          accessibilityLabel="Your Pip"
        />
      </View>

      {/* 2 — Prompt. */}
      <Txt variant="h2" center style={{ marginTop: space[5] }}>
        What should we call your Pip?
      </Txt>

      {/* 3 — Name input, centred, max 20 with a counter after first keystroke. */}
      <Input
        value={name}
        onChangeText={setName}
        placeholder="Name your Pip"
        maxLength={20}
        showCounter
        centerText
        accessibilityLabel="Pip's name"
        textStyle={{ fontFamily: undefined }}
        style={{ marginTop: space[4] }}
      />

      {/* 4 — Skin selector. Selection never affects mechanics (§SCR-02). */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          gap: space[3],
          marginTop: space[5],
        }}
      >
        {starterSkins.map((s, i) => {
          const selected = i === skin;
          return (
            <Pressable
              key={s.name}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${s.name} skin`}
              onPress={() => setSkin(i)}
              style={{
                width: 56,
                height: 56,
                borderRadius: radius.full,
                backgroundColor: s.color,
                borderWidth: selected ? 2 : 1,
                borderColor: selected ? brand.primary : colors.border,
                // 3px offset ring on the selected swatch.
                margin: selected ? 0 : 3,
              }}
            />
          );
        })}
      </View>
    </StepScaffold>
  );
}
