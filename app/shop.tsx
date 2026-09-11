import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Star } from 'lucide-react-native';

import { Button, Card, SegmentedTabs, Txt } from '@/components/ui';
import { PIP_BASE, SHOP_CATEGORIES, SHOP_ITEMS } from '@/data/shop';
import { PIP } from '@/data/mock';
import { brand, n, radius, space, status, useScheme } from '@/theme';
import type { ShopCategory } from '@/types';

/** Shop — spend Sparks on cosmetics. */
export default function ShopScreen() {
  const scheme = useScheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [category, setCategory] = useState<ShopCategory>('skins');

  const items = SHOP_ITEMS.filter((i) => i.category === category);

  return (
    <View style={{ flex: 1, backgroundColor: scheme.ground }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + space[10] }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Forest hero ───────────────────────────────────────────────── */}
        <View style={[styles.hero, { paddingTop: insets.top + space[2] }]}>
          <View style={styles.heroTop}>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={12}
            >
              <ChevronLeft size={24} color={n[0]} />
            </Pressable>
            <View style={styles.sparks}>
              <Star size={13} color={brand.amber} fill={brand.amber} />
              <Txt variant="caption" color={brand.amber}>
                {PIP.sparks}
              </Txt>
            </View>
          </View>

          <View style={styles.heroBody}>
            <View style={{ flex: 1 }}>
              <Txt variant="h1" color={n[0]}>
                Shop
              </Txt>
              <Txt variant="bodySm" color="rgba(255,255,255,0.70)" style={{ marginTop: space[1] }}>
                Spend your Sparks on cosmetics and make Pip even happier!
              </Txt>
            </View>
            <Image source={PIP_BASE} style={styles.heroMascot} resizeMode="contain" />
          </View>
        </View>

        {/* ── Category tabs ─────────────────────────────────────────────── */}
        <View style={styles.tabs}>
          <SegmentedTabs options={SHOP_CATEGORIES} value={category} onChange={setCategory} />
        </View>

        {/* ── Grid ──────────────────────────────────────────────────────── */}
        <View style={styles.grid}>
          {items.map((item) => {
            const affordable = PIP.sparks >= item.price;
            return (
              <Card key={item.id} style={styles.item}>
                <View style={[styles.thumb, { backgroundColor: status.success.bg }]}>
                  <Image source={item.image} style={styles.thumbImage} resizeMode="contain" />
                </View>

                <Txt variant="h4" numberOfLines={1}>
                  {item.name}
                </Txt>
                <View style={styles.price}>
                  <Star size={13} color={brand.amber} fill={brand.amber} />
                  <Txt variant="label">{item.price}</Txt>
                </View>

                <Button
                  label={item.owned ? 'Owned' : 'Get'}
                  size="sm"
                  fullWidth
                  disabled={item.owned || !affordable}
                  onPress={() => {}}
                />
              </Card>
            );
          })}

          {items.length === 0 ? (
            <Txt variant="bodySm" muted center style={styles.empty}>
              Nothing here yet — new {category} are on the way.
            </Txt>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: brand.forest,
    paddingHorizontal: space[5],
    paddingBottom: space[6],
    borderBottomLeftRadius: space[7],
    borderBottomRightRadius: space[7],
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sparks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    paddingHorizontal: space[2.5],
    paddingVertical: space[1],
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  heroBody: { flexDirection: 'row', alignItems: 'center', marginTop: space[4] },
  heroMascot: { width: 84, height: 84 },

  tabs: { paddingVertical: space[4] },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[3],
    paddingHorizontal: space[4],
  },
  item: {
    // Two columns inside a 16pt gutter with a 12pt inter-card gap.
    width: '47.5%',
    gap: space[2],
  },
  thumb: {
    height: 116,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImage: { width: '72%', height: '82%' },
  price: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  empty: { width: '100%', paddingVertical: space[10] },
});
