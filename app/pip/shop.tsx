/**
 * SCR-15 — Cosmetic shop.
 * Route `/pip/shop` · Goal: spend Sparks on cosmetics.
 *
 * Items affect APPEARANCE ONLY, never gameplay or scoring. Sparks are earned by
 * staying balanced, never by task volume — the shop is the sink for a currency
 * that deliberately does not reward grinding.
 */

import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';

import { Pip } from '@/components/pip';
import { Button, Chip, Header, Screen, Skeleton, Txt, useToast } from '@/components/ui';
import { profile, SHOP_CATEGORIES, shopItems } from '@/mock';
import { useDemo } from '@/mock/demo';
import { brand, colors, elevation, radius, space } from '@/theme';

export default function ShopScreen() {
  const router = useRouter();
  const toast = useToast();
  const { loading } = useDemo();

  const [category, setCategory] = useState<string>(SHOP_CATEGORIES[0]);
  const [sparks, setSparks] = useState(profile.wallet.sparks);
  const [owned, setOwned] = useState<Set<string>>(
    new Set(shopItems.filter((i) => i.owned).map((i) => i.id)),
  );
  const [celebrating, setCelebrating] = useState<string | null>(null);

  const items = shopItems.filter((i) => i.category === category);

  function buy(id: string, cost: number) {
    setSparks((s) => s - cost);
    setOwned((o) => new Set(o).add(id));
    setCelebrating(id);
    toast.show(`−${cost} Sparks`, 'spark');
    setTimeout(() => setCelebrating(null), 1200);
  }

  return (
    <Screen>
      <Header
        title="Shop"
        onBack={() => router.back()}
        right={
          <View
            accessibilityLabel={`${sparks} Sparks`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space[1],
              backgroundColor: brand.accent,
              borderRadius: radius.full,
              paddingHorizontal: space[3],
              height: 32,
            }}
          >
            <Feather name="star" size={14} color={brand.accentText} />
            <Txt variant="numMd" color={brand.accentText}>
              {sparks}
            </Txt>
          </View>
        }
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: space[2], paddingVertical: space[3] }}
      >
        {SHOP_CATEGORIES.map((c) => (
          <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
        ))}
      </ScrollView>

      {loading ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[3] }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} height={230} borderRadius={radius.lg} style={{ width: '48%' }} />
          ))}
        </View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[3] }}>
          {items.map((item) => {
            const isOwned = owned.has(item.id);
            const affordable = sparks >= item.cost;

            return (
              <View
                key={item.id}
                style={[
                  {
                    // Fixed half-width, NOT flexBasis + flexGrow: with an odd
                    // item count (or a single-item category) grow stretches the
                    // last tile to full width and the 2-col grid collapses.
                    width: '48%',
                    backgroundColor: colors.card,
                    borderRadius: radius.lg,
                    padding: space[3],
                    gap: space[2],
                  },
                  elevation[2],
                ]}
              >
                {/* 1:1 preview. */}
                <View
                  style={{
                    aspectRatio: 1,
                    maxWidth: '100%',
                    borderRadius: radius.md,
                    backgroundColor: colors.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {/* Placeholder preview until real item art exists. Ownership
                      is shown by the "Owned" chip below, NOT by dressing Pip —
                      a scarf on an owned *skin* just reads as the wrong item. */}
                  <Pip size={110} pose={celebrating === item.id ? 'celebrating' : 'empty'} />
                </View>

                <Txt variant="h4" numberOfLines={1}>
                  {item.name}
                </Txt>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[1] }}>
                  <Feather name="star" size={14} color={brand.accentText} />
                  <Txt variant="numMd" color={colors.textSecondary}>
                    {item.cost}
                  </Txt>
                </View>

                {isOwned ? (
                  <Chip
                    label="Owned"
                    tint={colors.semantic.success.fill}
                    textColor={colors.semantic.success.text}
                    leading={
                      <Feather name="check" size={12} color={colors.semantic.success.text} />
                    }
                  />
                ) : (
                  <>
                    <Button
                      label="Get"
                      disabled={!affordable}
                      onPress={() => buy(item.id, item.cost)}
                      style={{ height: 40 }}
                    />
                    {!affordable ? (
                      <Txt variant="caption" color={colors.textSecondary}>
                        Earn more by staying balanced.
                      </Txt>
                    ) : null}
                  </>
                )}
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
