import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, Inbox as InboxIcon, Sparkles, Trash2 } from 'lucide-react-native';

import { ForestHeader, InboxRow, onForest } from '@/components/app';
import {
  Button,
  Checkbox,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  IconButton,
  Interactive,
  Txt,
} from '@/components/ui';
import { processInbox } from '@/data/api';
import { useApp } from '@/store/AppStore';
import { useNow } from '@/store/selectors';
import { radius, space, useScheme } from '@/theme';
import type { CaptureId } from '@/types';

/**
 * The Inbox — everything captured and not yet decided on.
 *
 * This is the queue the whole capture redesign exists to fill. Nothing here is
 * a task; nothing here has a context, a due date or an estimate. Turning a
 * selection into tasks is one deliberate action — **Process** — which is the
 * only route to `/review` now that capture no longer parses on the way in.
 *
 * Triage is batch work, so the screen is built around selection rather than
 * around opening one item at a time.
 */
export default function InboxScreen() {
  const scheme = useScheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const now = useNow();

  const { data, discardCaptures, setReview, toast } = useApp();
  const notes = data.inbox;

  const [selected, setSelected] = useState<CaptureId[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // A selection can outlive the notes it points at — a commit retires them.
  const live = useMemo(
    () => selected.filter((id) => notes.some((n) => n.id === id)),
    [selected, notes],
  );

  const allSelected = notes.length > 0 && live.length === notes.length;

  const toggle = useCallback((id: CaptureId) => {
    Haptics.selectionAsync().catch(() => {});
    setSelected((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  }, []);

  const toggleAll = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    setSelected((current) => (current.length === notes.length ? [] : notes.map((n) => n.id)));
  }, [notes]);

  const process = useCallback(async () => {
    const batch = notes.filter((n) => live.includes(n.id));
    if (batch.length === 0) return;

    setProcessing(true);
    setError(null);
    try {
      const review = await processInbox(batch, now);
      setReview(review);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setSelected([]);
      router.push('/review');
    } catch (e) {
      // The queue is untouched on failure — nothing is half-consumed.
      const message = (e as Error).message;
      setError(message);
      toast(message, 'danger');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setProcessing(false);
    }
  }, [notes, live, now, setReview, router, toast]);

  return (
    <View style={{ flex: 1, backgroundColor: scheme.ground }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: live.length > 0 ? space[24] : space[10] }}
        showsVerticalScrollIndicator={false}
      >
        <ForestHeader pad={space[5]}>
          <View style={styles.headTop}>
            <IconButton
              icon={<ChevronLeft size={22} color={onForest.primary} />}
              accessibilityLabel="Go back"
              tone="ghost"
              size={36}
              onPress={() => router.back()}
            />
            {notes.length > 0 ? (
              /*
                Not a ghost Button: that variant draws its label in
                `scheme.primary`, which is the forest green this canopy is made
                of — invisible on it. Anything sitting on the header has to take
                its ink from `onForest`.
              */
              <Interactive
                accessibilityRole="button"
                accessibilityLabel={allSelected ? 'Clear selection' : 'Select all captures'}
                onPress={toggleAll}
                radius="pill"
                style={styles.headAction}
              >
                <Txt variant="label" color={onForest.primary}>
                  {allSelected ? 'Clear' : 'Select all'}
                </Txt>
              </Interactive>
            ) : null}
          </View>

          <Txt variant="h1" color={onForest.primary} style={{ marginTop: space[2] }}>
            Inbox
          </Txt>
          <Txt variant="bodySm" color={onForest.secondary} style={{ marginTop: space[1] }}>
            {notes.length === 0
              ? 'Nothing waiting to be sorted.'
              : `${notes.length} unprocessed ${notes.length === 1 ? 'capture' : 'captures'}` +
                (live.length > 0 ? ` · ${live.length} selected` : '')}
          </Txt>
        </ForestHeader>

        <View style={styles.body}>
          {error ? (
            <ErrorState
              title="Couldn't structure those"
              body={error}
              onRetry={() => {
                setError(null);
                process();
              }}
            />
          ) : null}

          {notes.length === 0 ? (
            <EmptyState
              icon={<InboxIcon size={28} color={scheme.textMuted} />}
              title="Inbox zero"
              body="Anything you capture lands here as a raw note. Sort it into tasks when you have the attention for it — not before."
              action={{ label: 'Capture something', onPress: () => router.push('/capture') }}
            />
          ) : (
            <>
              <View style={styles.selectAllRow}>
                <Checkbox
                  checked={allSelected}
                  indeterminate={live.length > 0 && !allSelected}
                  onToggle={toggleAll}
                  accessibilityLabel={allSelected ? 'Clear selection' : 'Select all captures'}
                />
                <Txt variant="caption" muted style={{ flex: 1 }}>
                  {live.length > 0 ? `${live.length} selected` : 'Select notes to process together'}
                </Txt>
              </View>

              <View style={{ gap: space[2] }}>
                {notes.map((note) => (
                  <InboxRow
                    key={note.id}
                    note={note}
                    now={now}
                    selected={live.includes(note.id)}
                    onToggleSelect={() => toggle(note.id)}
                    onOpen={() =>
                      router.push({
                        pathname: '/capture',
                        params: { draft: note.text, from: note.id },
                      })
                    }
                  />
                ))}
              </View>

              <Txt variant="caption" muted style={{ marginTop: space[4] }}>
                Processing runs Pip&apos;s breakdown over everything you picked, in one pass. You
                confirm the result before any of it becomes a task.
              </Txt>
            </>
          )}
        </View>
      </ScrollView>

      {/* ── Action bar — only while something is selected ─────────────────── */}
      {live.length > 0 ? (
        <View
          style={[
            styles.actions,
            {
              backgroundColor: scheme.surface,
              borderTopColor: scheme.border,
              paddingBottom: insets.bottom + space[4],
            },
          ]}
        >
          <IconButton
            icon={<Trash2 size={18} color={scheme.textSecondary} />}
            accessibilityLabel={`Delete ${live.length} selected`}
            size={48}
            onPress={() => setConfirmDelete(true)}
            disabled={processing}
          />
          <View style={{ flex: 1 }}>
            <Button
              label={`Process ${live.length}`}
              fullWidth
              loading={processing}
              icon={<Sparkles size={16} color={scheme.onPrimary} />}
              onPress={process}
            />
          </View>
        </View>
      ) : null}

      <ConfirmDialog
        visible={confirmDelete}
        title={`Delete ${live.length} ${live.length === 1 ? 'capture' : 'captures'}?`}
        body="These are raw notes that were never turned into tasks. Deleting them cannot be undone."
        confirmLabel="Delete"
        tone="danger"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          const count = live.length;
          setConfirmDelete(false);
          discardCaptures(live);
          setSelected([]);
          toast(`${count} ${count === 1 ? 'capture' : 'captures'} deleted`, 'neutral');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headAction: { paddingHorizontal: space[3], paddingVertical: space[2] },
  body: { paddingHorizontal: space[4], paddingTop: space[4] },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingBottom: space[2],
  },
  actions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2.5],
    paddingHorizontal: space[4],
    paddingTop: space[4],
    borderTopWidth: 1,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
});
