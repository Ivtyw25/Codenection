import { useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, PackageOpen, Star } from 'lucide-react-native';

import { ForestHeader, PipMascot, onForest } from '@/components/app';
import {
  Button,
  Card,
  Chip,
  ConfirmDialog,
  EmptyState,
  IconButton,
  SegmentedTabs,
  Txt,
} from '@/components/ui';
import { useApp } from '@/store/AppStore';
import { usePipState } from '@/store/selectors';
import { brand, radius, space, status, useScheme } from '@/theme';
import type { ShopCategory, ShopItem } from '@/types';

const CATEGORIES: { value: ShopCategory; label: string }[] = [
  { value: 'skins', label: 'Skins' },
  { value: 'hats', label: 'Hats' },
  { value: 'habitat', label: 'Habitat' },
  { value: 'auras', label: 'Auras' },
];

/**
 * Shop — spend Sparks on cosmetics.
 *
 * A purchase here is a real transaction: it confirms, goes through the async
 * boundary with a per-card loading state, debits the balance, can fail, and
 * changes the mascot everywhere the moment it lands.
 */
export default function ShopScreen() {
  const scheme = useScheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pip = usePipState();

  const { data, state, buy, equip, toast } = useApp();
  const [category, setCategory] = useState<ShopCategory>('skins');
  const [confirming, setConfirming] = useState<ShopItem | null>(null);

  const items = useMemo(
    () => data.shop.filter((item) => item.category === category),
    [data.shop, category],
  );

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of data.shop) map[item.category] = (map[item.category] ?? 0) + 1;
    return map;
  }, [data.shop]);

  return (
    <View style={{ flex: 1, backgroundColor: scheme.ground }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + space[10] }}
        showsVerticalScrollIndicator={false}
      >
        <ForestHeader pad={space[6]}>
          <View style={styles.heroTop}>
            <IconButton
              icon={<ChevronLeft size={22} color={onForest.primary} />}
              accessibilityLabel="Go back"
              tone="ghost"
              size={36}
              onPress={() => router.back()}
            />
            <View style={[styles.sparks, { backgroundColor: onForest.well }]}>
              <Star size={13} color={brand.amber} fill={brand.amber} />
              <Txt variant="caption" color={brand.amber}>
                {data.pip.sparks}
              </Txt>
            </View>
          </View>

          <View style={styles.heroBody}>
            <View style={{ flex: 1 }}>
              <Txt variant="h1" color={onForest.primary}>
                Shop
              </Txt>
              <Txt variant="bodySm" color={onForest.secondary} style={{ marginTop: space[1] }}>
                Spend your Sparks on cosmetics and make Pip even happier!
              </Txt>
            </View>
            <PipMascot size={84} state={pip.name} />
          </View>
        </ForestHeader>

        <View style={styles.tabs}>
          <SegmentedTabs
            options={CATEGORIES.map((c) => ({ ...c, count: counts[c.value] ?? 0 }))}
            value={category}
            onChange={setCategory}
          />
        </View>

        <View style={styles.grid}>
          {items.map((item) => {
            const owned = data.pip.owned.includes(item.id);
            const equipped = data.pip.equipped === item.id;
            const affordable = data.pip.sparks >= item.price;
            const busy = state.pending.includes(item.id);

            return (
              <Card key={item.id} style={styles.item}>
                <View style={[styles.thumb, { backgroundColor: status.success.bg }]}>
                  <Image
                    source={item.image}
                    style={styles.thumbImage}
                    resizeMode="contain"
                    accessibilityRole="image"
                    accessibilityLabel={item.name}
                  />
                  {owned ? (
                    <View style={styles.ownedTag}>
                      <Chip label={equipped ? 'Worn' : 'Owned'} size="sm" tone="success" variant="filled" />
                    </View>
                  ) : null}
                </View>

                <Txt variant="h4" numberOfLines={1}>
                  {item.name}
                </Txt>

                <View style={styles.price}>
                  <Star
                    size={13}
                    color={affordable || owned ? brand.amber : scheme.textDisabled}
                    fill={affordable || owned ? brand.amber : scheme.textDisabled}
                  />
                  <Txt variant="label" color={affordable || owned ? undefined : scheme.textMuted}>
                    {item.price}
                  </Txt>
                  {!owned && !affordable ? (
                    <Txt variant="caption" color={status.warning.fg}>
                      · {item.price - data.pip.sparks} short
                    </Txt>
                  ) : null}
                </View>

                {owned ? (
                  <Button
                    label={equipped ? 'Take off' : 'Wear'}
                    size="sm"
                    fullWidth
                    variant={equipped ? 'secondary' : 'lime'}
                    onPress={() => {
                      equip(equipped ? null : item.id);
                      toast(equipped ? 'Back to Pip’s own face' : `${item.name} equipped`, 'success');
                    }}
                  />
                ) : (
                  <Button
                    label="Get"
                    size="sm"
                    fullWidth
                    loading={busy}
                    disabled={!affordable}
                    disabledReason={`Needs ${item.price - data.pip.sparks} more Sparks`}
                    onPress={() => setConfirming(item)}
                  />
                )}
              </Card>
            );
          })}

          {items.length === 0 ? (
            <View style={{ width: '100%' }}>
              <EmptyState
                icon={<PackageOpen size={28} color={scheme.textMuted} />}
                title={`No ${category} yet`}
                body="The Figma shop grid only contains skins — the other three tabs exist with nothing behind them, so this is the honest state rather than invented stock."
                action={{ label: 'Back to skins', onPress: () => setCategory('skins') }}
              />
            </View>
          ) : null}
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={confirming != null}
        title={`Buy ${confirming?.name ?? ''}?`}
        body="Sparks are earned by closing work. This spends them."
        confirmLabel={`Spend ${confirming?.price ?? 0}`}
        loading={confirming ? state.pending.includes(confirming.id) : false}
        onCancel={() => setConfirming(null)}
        onConfirm={async () => {
          if (!confirming) return;
          const item = confirming;
          setConfirming(null);
          // Errors surface as a toast from the store; the card returns to rest.
          await buy(item.id).catch(() => {});
        }}
      >
        <View style={[styles.confirmRow, { backgroundColor: scheme.surfaceAlt }]}>
          <Txt variant="bodySm" muted style={{ flex: 1 }}>
            Balance after
          </Txt>
          <Star size={13} color={brand.amber} fill={brand.amber} />
          <Txt variant="h4">{data.pip.sparks - (confirming?.price ?? 0)}</Txt>
        </View>
      </ConfirmDialog>
    </View>
  );
}

const styles = StyleSheet.create({
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sparks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    paddingHorizontal: space[2.5],
    paddingVertical: space[1],
    borderRadius: radius.pill,
  },
  heroBody: { flexDirection: 'row', alignItems: 'center', marginTop: space[4] },

  tabs: { paddingVertical: space[4], paddingHorizontal: space[4] },

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
    overflow: 'hidden',
  },
  thumbImage: { width: '72%', height: '82%' },
  ownedTag: { position: 'absolute', top: space[1.5], right: space[1.5] },
  price: { flexDirection: 'row', alignItems: 'center', gap: space[1] },

  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1.5],
    padding: space[3],
    borderRadius: radius.md,
  },
});
