import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronRight, Inbox, Star, TriangleAlert } from 'lucide-react-native';

import { PipMascot } from '@/components/app';
import {
  Avatar,
  Button,
  Card,
  Chip,
  ConfirmDialog,
  Txt,
} from '@/components/ui';
import { failNext } from '@/data/api';
import { useApp } from '@/store/AppStore';
import { usePipState } from '@/store/selectors';
import { brand, radius, space, status, useScheme } from '@/theme';

/**
 * Profile.
 *
 * NO FIGMA FRAME EXISTS for this tab either — it is in the bottom bar of every
 * device frame with nothing behind it. So this renders only what the other
 * screens already establish as fact (name, level, Sparks, the route into the
 * Shop) plus the two things an interactive build genuinely needs and no frame
 * could have shown: the capture inbox, and a way to exercise the failure path.
 */
export default function ProfileScreen() {
  const scheme = useScheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data, patchSettings, toast, reload } = useApp();
  const pip = usePipState();

  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: scheme.ground }}
      contentContainerStyle={{
        paddingTop: insets.top + space[4],
        paddingHorizontal: space[4],
        paddingBottom: space[10],
        gap: space[4],
      }}
      showsVerticalScrollIndicator={false}
    >
      <Txt variant="h1">Profile</Txt>

      {/* ── Identity ────────────────────────────────────────────────────── */}
      <Card elevated style={{ gap: space[4] }}>
        <View style={styles.identity}>
          <Avatar initials={data.user.name.slice(0, 1)} size={52} ring />
          <View style={{ flex: 1 }}>
            <Txt variant="h3">{data.user.name}</Txt>
            <Txt variant="bodySm" muted>
              Level {data.pip.level} · Pip is {pip.label.toLowerCase()}
            </Txt>
          </View>
          <PipMascot size={44} state={pip.name} />
        </View>

        <View style={[styles.sparksRow, { borderTopColor: scheme.border }]}>
          <Star size={16} color={brand.amber} fill={brand.amber} />
          <Txt variant="h4">{data.pip.sparks}</Txt>
          <Txt variant="bodySm" muted style={{ flex: 1 }}>
            Sparks available
          </Txt>
          <Button label="Shop" variant="secondary" size="sm" onPress={() => router.push('/shop')} />
        </View>
      </Card>

      {/* ── Inbox ───────────────────────────────────────────────────────── */}
      {/*
        A link, not a second list. The Inbox has a screen of its own built for
        batch triage; re-implementing a cut-down version of it here is exactly
        the duplication that let Home and the Manifest drift apart before.
      */}
      <Card
        onPress={() => router.push('/inbox')}
        accessibilityLabel={`Capture inbox, ${data.inbox.length} unprocessed`}
        accessibilityHint="Opens the inbox"
        style={styles.navRow}
      >
        <View style={[styles.navIcon, { backgroundColor: scheme.surfaceAlt }]}>
          <Inbox size={17} color={scheme.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt variant="h4">Capture inbox</Txt>
          <Txt variant="caption" muted>
            {data.inbox.length === 0
              ? 'Nothing waiting to be sorted'
              : `${data.inbox.length} unprocessed ${data.inbox.length === 1 ? 'capture' : 'captures'}`}
          </Txt>
        </View>
        {data.inbox.length > 0 ? (
          <Chip label={String(data.inbox.length)} size="sm" tone="info" />
        ) : null}
        <ChevronRight size={18} color={scheme.textMuted} />
      </Card>

      {/* ── Preferences ─────────────────────────────────────────────────── */}
      <Txt variant="h3" style={{ marginTop: space[2] }}>
        Preferences
      </Txt>

      <Card style={{ gap: space[4] }}>
        <View>
          <Txt variant="h4">Appearance</Txt>
          <Txt variant="caption" muted style={{ marginBottom: space[2.5] }}>
            The system ships a real dark theme; this picks which one wins.
          </Txt>
          <View style={styles.chipRow}>
            {([null, 'light', 'dark'] as const).map((value) => (
              <Chip
                key={String(value)}
                label={value === null ? 'System' : value === 'light' ? 'Light' : 'Dark'}
                selected={data.settings.theme === value}
                onPress={() => patchSettings({ theme: value })}
              />
            ))}
          </View>
        </View>

        <View style={[styles.switchRow, { borderTopColor: scheme.border }]}>
          <View style={{ flex: 1 }}>
            <Txt variant="h4">Nudges</Txt>
            <Txt variant="caption" muted>
              Only when something has actually slipped.
            </Txt>
          </View>
          <Switch
            value={data.settings.notificationsEnabled}
            onValueChange={(notificationsEnabled) => patchSettings({ notificationsEnabled })}
            accessibilityLabel="Enable nudges"
            trackColor={{ true: scheme.primary, false: scheme.borderStrong }}
            thumbColor={scheme.surface}
          />
        </View>

        <View style={[styles.switchRow, { borderTopColor: scheme.border }]}>
          <View style={{ flex: 1 }}>
            <Txt variant="h4">Reduce motion</Txt>
            <Txt variant="caption" muted>
              Adds to the OS setting — it never turns motion back on.
            </Txt>
          </View>
          <Switch
            value={data.settings.reduceMotion}
            onValueChange={(reduceMotion) => patchSettings({ reduceMotion })}
            accessibilityLabel="Reduce motion"
            trackColor={{ true: scheme.primary, false: scheme.borderStrong }}
            thumbColor={scheme.surface}
          />
        </View>
      </Card>

      {/* ── Developer ───────────────────────────────────────────────────── */}
      <Txt variant="h3" style={{ marginTop: space[2] }}>
        Developer
      </Txt>

      <Card style={{ gap: space[3] }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space[2.5] }}>
          <TriangleAlert size={18} color={status.warning.solid} />
          <Txt variant="bodySm" muted style={{ flex: 1 }}>
            The next call to the data layer will fail. Use it to see the loading and error states
            the teardown found missing from the source system — they are real screens here, not
            components sitting unused in a library.
          </Txt>
        </View>

        <View style={{ flexDirection: 'row', gap: space[2.5] }}>
          <View style={{ flex: 1 }}>
            <Button
              label="Fail next call"
              variant="secondary"
              fullWidth
              onPress={() => {
                failNext(true);
                toast('Next data call will fail', 'warning');
              }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Reset world" variant="danger" fullWidth onPress={() => setConfirmReset(true)} />
          </View>
        </View>
      </Card>

      <ConfirmDialog
        visible={confirmReset}
        title="Reset everything?"
        body="Every task, purchase and Spark returns to the seed state. There is no persistence layer yet, so this is the same as restarting the app."
        confirmLabel="Reset"
        tone="danger"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          setConfirmReset(false);
          reload();
          toast('Back to the seed world', 'neutral');
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  sparksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1.5],
    paddingTop: space[3],
    borderTopWidth: 1,
  },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: space[2.5], padding: space[3.5] },
  navIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingTop: space[3.5],
    borderTopWidth: 1,
  },
});
