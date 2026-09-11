import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Coffee, Moon, Settings, ShoppingBag, Star, Users } from 'lucide-react-native';

import { Card, ProgressBar, Txt } from '@/components/ui';
import { PIP_BASE } from '@/data/shop';
import { PIP } from '@/data/mock';
import { brand, n, radius, space, status, useScheme } from '@/theme';

/**
 * Pip — the mascot tab.
 *
 * The dark stage runs to the top of the screen and the content sheet rides over
 * it, so the header keeps a fixed dark palette in both themes; only the sheet
 * below responds to the colour scheme.
 */
export default function PipScreen() {
  const scheme = useScheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { capacity, level, sparks, state, streakDays, streakGoal, vitals } = PIP;

  return (
    <View style={{ flex: 1, backgroundColor: brand.forest }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: space[10] }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Mascot stage ──────────────────────────────────────────────── */}
        <View style={[styles.stage, { paddingTop: insets.top + space[2] }]}>
          <View style={styles.topBar}>
            <View style={styles.brandRow}>
              <Txt variant="h3" color={n[0]}>
                pip
              </Txt>
              <View style={styles.levelPill}>
                <Txt variant="caption" color={n[0]}>
                  Level {level}
                </Txt>
              </View>
            </View>

            <View style={styles.topRight}>
              <View style={styles.sparks}>
                <Star size={13} color={brand.amber} fill={brand.amber} />
                <Txt variant="caption" color={brand.amber}>
                  {sparks}
                </Txt>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Settings"
                style={styles.iconButton}
              >
                <Settings size={17} color={n[0]} />
              </Pressable>
            </View>
          </View>

          {/* Ambient glow behind the mascot — decorative only. */}
          <View style={styles.glow} pointerEvents="none" />
          <Image source={PIP_BASE} style={styles.mascot} resizeMode="contain" />

          <Txt variant="bodySm" center color="rgba(255,255,255,0.78)" style={styles.blurb}>
            {state.blurb}
          </Txt>

          <View style={styles.streak}>
            <Txt variant="caption" color="rgba(255,255,255,0.72)">
              Balance streak:
            </Txt>
            <View style={styles.dots}>
              {Array.from({ length: streakGoal }, (_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    { backgroundColor: i < streakDays ? brand.lime : 'rgba(255,255,255,0.22)' },
                  ]}
                />
              ))}
            </View>
            <Txt variant="caption" color={brand.lime}>
              {streakDays}d
            </Txt>
          </View>

          <View style={styles.actions}>
            <StageAction
              icon={<ShoppingBag size={18} color={brand.amber} />}
              title="Cosmetic Shop"
              sub="New skins & hats"
              onPress={() => router.push('/shop')}
            />
            <StageAction
              icon={<Users size={18} color={brand.lime} />}
              title="Friend Pips"
              sub="3 classmates sharing"
              onPress={() => {}}
            />
          </View>
        </View>

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

            <Driver
              label="Workload Pressure"
              value={capacity.pressure}
              tone="warning"
              hint={capacity.pressureNote}
            />
            <Driver
              label="Vitality Reserve"
              value={capacity.vitality}
              tone="success"
              hint={capacity.vitalityNote}
            />
          </Card>

          <Txt variant="h3" style={{ marginTop: space[5] }}>
            Vitals &amp; Sub-stats
          </Txt>
          <View style={styles.vitals}>
            {vitals.map((v) => (
              <Card key={v.id} style={styles.vitalCard}>
                <View style={styles.vitalTop}>
                  <View style={[styles.vitalIcon, { backgroundColor: scheme.surfaceAlt }]}>
                    {v.icon === 'Moon' ? (
                      <Moon size={16} color={scheme.primary} />
                    ) : (
                      <Coffee size={16} color={status.success.solid} />
                    )}
                  </View>
                  <Txt variant="h4" color={v.icon === 'Moon' ? scheme.primary : status.success.fg}>
                    {v.value}%
                  </Txt>
                </View>
                <Txt variant="caption" muted>
                  {v.label}
                </Txt>
              </Card>
            ))}
          </View>
        </View>
      </ScrollView>
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
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${sub}`}
      style={styles.action}
    >
      <View style={styles.actionIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Txt variant="label" color={n[0]}>
          {title}
        </Txt>
        <Txt variant="caption" color="rgba(255,255,255,0.6)">
          {sub}
        </Txt>
      </View>
    </Pressable>
  );
}

function Driver({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: number;
  tone: 'warning' | 'success';
  hint: string;
}) {
  const scheme = useScheme();
  const toneColor = tone === 'warning' ? status.warning.fg : status.success.fg;
  return (
    <View style={{ gap: space[1.5] }}>
      <View style={styles.driverRow}>
        <Txt variant="h4" style={{ flex: 1 }}>
          {label}
        </Txt>
        <Txt variant="label" color={toneColor}>
          {value}%
        </Txt>
        <Txt variant="label" color={scheme.textDisabled}>
          {' / '}100
        </Txt>
      </View>
      <ProgressBar value={value} tone={tone} />
      <Txt variant="caption" muted>
        {hint}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { paddingHorizontal: space[5], paddingBottom: space[6] },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  levelPill: {
    paddingHorizontal: space[2.5],
    paddingVertical: space[1],
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  sparks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    paddingHorizontal: space[2.5],
    paddingVertical: space[1],
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },

  glow: {
    position: 'absolute',
    alignSelf: 'center',
    top: 110,
    width: 260,
    height: 260,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(121,235,86,0.10)',
  },
  mascot: { width: 176, height: 176, alignSelf: 'center', marginTop: space[5] },
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
    backgroundColor: 'rgba(0,0,0,0.28)',
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
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
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
  driverRow: { flexDirection: 'row', alignItems: 'center' },

  vitals: { flexDirection: 'row', gap: space[2.5], marginTop: space[2.5] },
  vitalCard: { flex: 1, gap: space[2] },
  vitalTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  vitalIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
