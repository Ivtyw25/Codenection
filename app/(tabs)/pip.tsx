import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Settings, ShoppingBag, Star, Users } from 'lucide-react-native';

import {
  ForecastRow,
  ForestHeader,
  Gauge,
  LoadBreakdown,
  PipMascot,
  VitalCard,
  onForest,
} from '@/components/app';
import { Card, Chip, Drawer, EmptyState, IconButton, Interactive, Txt } from '@/components/ui';
import { useApp } from '@/store/AppStore';
import {
  useCapacity,
  useForecast,
  useLoadBreakdown,
  usePipState,
  useStreak,
  useVitals,
} from '@/store/selectors';
import { brand, radius, space, status, useScheme } from '@/theme';

/** Diameter of the ambient glow behind the mascot. */
const GLOW = 300;

/**
 * Pip — SCR-12.
 *
 * The dark stage runs to the top of the screen and the content sheet rides
 * over it, so the stage keeps a fixed dark palette in both themes; only the
 * sheet below responds to the colour scheme.
 *
 * Both drivers are the same derived capacity Home shows, rendered in the
 * fuller `block` form. The mascot wears whatever the Shop sold.
 */
export default function PipScreen() {
  const scheme = useScheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data, patchSettings, equip, toast, setQuery } = useApp();
  const capacity = useCapacity();
  const forecast = useForecast();
  const pip = usePipState();
  const streak = useStreak();
  const vitals = useVitals();
  const breakdown = useLoadBreakdown();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);

  const owned = data.shop.filter((item) => data.pip.owned.includes(item.id));

  return (
    <View style={{ flex: 1, backgroundColor: brand.forest }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: space[10] }}
        showsVerticalScrollIndicator={false}
      >
        <ForestHeader flat pad={space[6]} style={{ paddingTop: insets.top + space[2] }}>
          <View style={styles.topBar}>
            <View style={styles.brandRow}>
              <Txt variant="h3" color={onForest.primary}>
                pip
              </Txt>
              <View style={[styles.levelPill, { backgroundColor: onForest.fillStrong }]}>
                <Txt variant="caption" color={onForest.primary}>
                  Level {data.pip.level}
                </Txt>
              </View>
            </View>

            <View style={styles.topRight}>
              <Interactive
                accessibilityRole="button"
                accessibilityLabel={`${data.pip.sparks} Sparks. Open the shop.`}
                onPress={() => router.push('/shop')}
                radius="pill"
                style={[styles.sparks, { backgroundColor: onForest.well }]}
              >
                <Star size={13} color={brand.amber} fill={brand.amber} />
                <Txt variant="caption" color={brand.amber}>
                  {data.pip.sparks}
                </Txt>
              </Interactive>

              <IconButton
                icon={<Settings size={17} color={onForest.primary} />}
                accessibilityLabel="Settings"
                tone="onDark"
                size={34}
                onPress={() => setSettingsOpen(true)}
              />
            </View>
          </View>

          <View style={styles.stage}>
            <PipMascot size={176} glow={GLOW} state={pip.name} />
          </View>

          <Txt variant="bodySm" center color={onForest.secondary} style={styles.blurb}>
            {pip.blurb}
          </Txt>

          <View style={[styles.streak, { backgroundColor: onForest.well }]}>
            <Txt variant="caption" color={onForest.secondary}>
              Balance streak:
            </Txt>
            <View style={styles.dots}>
              {Array.from({ length: streak.goal }, (_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    { backgroundColor: i < streak.days ? brand.lime : 'rgba(255,255,255,0.22)' },
                  ]}
                />
              ))}
            </View>
            <Txt variant="caption" color={brand.lime}>
              {streak.days}d
            </Txt>
          </View>

          <View style={styles.actions}>
            <StageAction
              icon={<ShoppingBag size={18} color={brand.amber} />}
              title="Cosmetic Shop"
              sub={owned.length > 0 ? `${owned.length} owned` : 'New skins & hats'}
              onPress={() => router.push('/shop')}
            />
            <StageAction
              icon={<Users size={18} color={brand.lime} />}
              title="Friend Pips"
              sub="Not connected yet"
              onPress={() => setFriendsOpen(true)}
            />
          </View>
        </ForestHeader>

        {/* ── Content sheet ─────────────────────────────────────────────── */}
        <View style={[styles.sheet, { backgroundColor: scheme.ground }]}>
          <Card elevated style={{ gap: space[3] }}>
            <View style={styles.cardHead}>
              <View style={styles.cardTitle}>
                <View style={[styles.statusDot, { backgroundColor: status.success.solid }]} />
                <Txt variant="h3">Capacity Drivers</Txt>
              </View>
              <Txt variant="caption" muted>
                Live Calibration
              </Txt>
            </View>

            <Gauge
              label="Workload Pressure"
              value={capacity.pressure}
              kind="pressure"
              hint={capacity.pressureNote}
              size="block"
            />
            <Gauge
              label="Vitality Reserve"
              value={capacity.vitality}
              kind="vitality"
              hint={capacity.vitalityNote}
              size="block"
            />

            <ForecastRow
              forecast={forecast}
              pressure={capacity.pressure}
              vitality={capacity.vitality}
              size="block"
            />
          </Card>

          {/*
            The mirror of Vitals below.

            This tab explained the Vitality gauge in four sub-stats and left the
            Pressure gauge as a bare number — so the half of the model a
            stressed student can actually *change* was the unexplained half.
            These are that explanation, in the categories they named themselves.
          */}
          <View style={styles.vitalsHead}>
            <Txt variant="h3" style={{ flex: 1 }}>
              Where the load sits
            </Txt>
            <Txt variant="caption" muted>
              {breakdown.total} total
            </Txt>
          </View>
          <Card>
            <LoadBreakdown
              total={breakdown.total}
              slices={breakdown.slices}
              onPressCategory={(categoryId) => {
                setQuery({ categoryId, range: 'all' });
                router.push('/tasks');
              }}
            />
            {breakdown.hottest ? (
              <Txt variant="bodySm" muted style={{ marginTop: space[3] }}>
                {`${breakdown.hottest.category.label} is carrying most of this right now.`}
              </Txt>
            ) : null}
          </Card>

          <View style={styles.vitalsHead}>
            <Txt variant="h3" style={{ flex: 1 }}>
              Vitals &amp; Sub-stats
            </Txt>
            <Txt variant="caption" muted>
              vs. your marks
            </Txt>
          </View>
          {/*
            The four things Vitality is actually made of, each against this
            user's own mark rather than against 100. A single reserve number can
            only say how much is left; these say which one is spending it.
          */}
          <View style={styles.vitals}>
            {vitals.map((reading) => (
              <VitalCard
                key={reading.id}
                reading={reading}
                onPress={() => router.push({ pathname: '/vital/[id]', params: { id: reading.id } })}
              />
            ))}
          </View>

          {/* Wardrobe — only appears once there is something in it. */}
          {owned.length > 0 ? (
            <>
              <Txt variant="h3" style={{ marginTop: space[5] }}>
                Wardrobe
              </Txt>
              <View style={styles.wardrobe}>
                <Chip
                  label="Default"
                  selected={data.pip.equipped == null}
                  onPress={() => {
                    equip(null);
                    toast('Back to Pip’s own face', 'neutral');
                  }}
                />
                {owned.map((item) => (
                  <Chip
                    key={item.id}
                    label={item.name.replace(' Skin', '')}
                    selected={data.pip.equipped === item.id}
                    onPress={() => {
                      equip(item.id);
                      toast(`${item.name} equipped`, 'success');
                    }}
                  />
                ))}
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>

      {/* ── Settings ────────────────────────────────────────────────────── */}
      <Drawer visible={settingsOpen} onClose={() => setSettingsOpen(false)} title="Pip settings" maxHeight="60%">
        <Txt variant="caption" muted style={styles.eyebrow}>
          APPEARANCE
        </Txt>
        <View style={styles.chipRow}>
          {([null, 'light', 'dark'] as const).map((value) => (
            <Chip
              key={String(value)}
              label={value === null ? 'Follow system' : value === 'light' ? 'Light' : 'Dark'}
              selected={data.settings.theme === value}
              onPress={() => patchSettings({ theme: value })}
            />
          ))}
        </View>

        <Txt variant="caption" muted style={styles.eyebrow}>
          NUDGES
        </Txt>
        <View style={styles.chipRow}>
          <Chip
            label={data.settings.notificationsEnabled ? 'Nudges on' : 'Nudges off'}
            selected={data.settings.notificationsEnabled}
            onPress={() =>
              patchSettings({ notificationsEnabled: !data.settings.notificationsEnabled })
            }
          />
        </View>
        <Txt variant="caption" muted style={{ marginTop: space[2] }}>
          Pip nudges when something has slipped, never on a schedule.
        </Txt>
      </Drawer>

      {/* ── Friends ─────────────────────────────────────────────────────── */}
      <Drawer visible={friendsOpen} onClose={() => setFriendsOpen(false)} title="Friend Pips" maxHeight="55%">
        <EmptyState
          icon={<Users size={28} color={scheme.textMuted} />}
          title="No friends connected"
          body="The Pip tab links here, but the Figma file has no Friends frame — so rather than invent a social graph, this is the empty state until one exists."
        />
      </Drawer>
    </View>
  );
}

function StageAction({
  icon,
  title,
  sub,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  onPress: () => void;
}) {
  return (
    <Interactive
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${sub}`}
      onPress={onPress}
      radius="lg"
      style={[styles.action, { backgroundColor: onForest.fill }]}
    >
      <View style={[styles.actionIcon, { backgroundColor: onForest.well }]}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Txt variant="label" color={onForest.primary}>
          {title}
        </Txt>
        <Txt variant="caption" color={onForest.muted}>
          {sub}
        </Txt>
      </View>
    </Interactive>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  levelPill: {
    paddingHorizontal: space[2.5],
    paddingVertical: space[1],
    borderRadius: radius.pill,
  },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  sparks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    paddingHorizontal: space[2.5],
    paddingVertical: space[1],
    borderRadius: radius.pill,
  },

  stage: { alignItems: 'center', marginTop: space[5] },
  blurb: { marginTop: space[4], paddingHorizontal: space[4] },

  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: space[2],
    marginTop: space[4],
    paddingHorizontal: space[3.5],
    paddingVertical: space[2],
    borderRadius: radius.pill,
  },
  dots: { flexDirection: 'row', gap: space[1] },
  dot: { width: 8, height: 8, borderRadius: radius.pill },

  actions: { flexDirection: 'row', gap: space[2.5], marginTop: space[5] },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    padding: space[3],
    borderRadius: radius.lg,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sheet: {
    paddingHorizontal: space[4],
    paddingTop: space[5],
    borderTopLeftRadius: space[7],
    borderTopRightRadius: space[7],
    minHeight: 420,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  statusDot: { width: 9, height: 9, borderRadius: radius.pill },

  vitalsHead: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginTop: space[5] },
  /** Two up, wrapping — four sub-stats in one row is unreadable at 400px. */
  vitals: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2.5], marginTop: space[2.5] },
  vitalIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  wardrobe: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginTop: space[2.5] },
  eyebrow: { letterSpacing: 1, marginTop: space[3], marginBottom: space[2] },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
});
