import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { CalendarDays, CheckCircle2, Info, Sparkles, X, Zap } from 'lucide-react-native';

import { PipMascot } from '@/components/app';
import {
  Button,
  Checkbox,
  Chip,
  EmptyState,
  IconButton,
  Input,
  Interactive,
  Txt,
} from '@/components/ui';
import { formatDue, formatEstimate } from '@/data/format';
import { useApp } from '@/store/AppStore';
import { useBudget, useNow, usePipState } from '@/store/selectors';
import { radius, space, status, useScheme } from '@/theme';
import type { ProposedTask } from '@/types';

const LOAD_LABEL: Record<ProposedTask['load'], string> = {
  low: 'Low Load',
  medium: 'Medium',
  high: 'High Load',
};

/**
 * SCR-21 — AI Processing Review. Confirm what Pip extracted before committing.
 *
 * Three things the frame could only imply, now real: the proposals are the
 * parse of what was typed, titles are editable in place, and the budget line
 * runs the actual pressure function over the hypothetical list — so the number
 * it promises is the number Home shows a second later.
 */
export default function ReviewScreen() {
  const router = useRouter();
  const scheme = useScheme();
  const now = useNow();
  const pip = usePipState();

  const { state, commitReview, setReview, toast } = useApp();
  const review = state.review;

  const [dropped, setDropped] = useState<string[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [quickDone, setQuickDone] = useState(false);
  const [committing, setCommitting] = useState(false);

  const accepted = useMemo(
    () =>
      (review?.proposed ?? [])
        .filter((p) => !dropped.includes(p.id))
        .map((p) => ({ ...p, title: edits[p.id] ?? p.title })),
    [review, dropped, edits],
  );

  const budget = useBudget(accepted);

  const commit = useCallback(() => {
    if (!review || accepted.length === 0) return;
    setCommitting(true);
    const created = commitReview(review, accepted);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    toast(
      `${created.length} task${created.length === 1 ? '' : 's'} added · +${review.sparksReward} Sparks`,
      'success',
    );
    setCommitting(false);
    router.replace('/tasks');
  }, [review, accepted, commitReview, toast, router]);

  // Reached by deep link, or after a commit cleared the handoff.
  if (!review) {
    return (
      <View style={[styles.root, { backgroundColor: scheme.scrim }]}>
        <View style={[styles.sheet, { backgroundColor: scheme.surface }]}>
          <EmptyState
            icon={<Sparkles size={28} color={scheme.textMuted} />}
            title="Nothing to review"
            body="Reviews are produced by the capture sheet. Start one and Pip will break it down."
            action={{ label: 'Capture a thought', onPress: () => router.replace('/capture') }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: scheme.scrim }]}>
      <View style={[styles.sheet, { backgroundColor: scheme.surface }]}>
        <View style={[styles.handle, { backgroundColor: scheme.borderStrong }]} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Head ────────────────────────────────────────────────────── */}
          <View style={styles.head}>
            <PipMascot size={52} state={pip.name} />
            <View style={{ flex: 1, gap: space[1] }}>
              <Chip
                label={`${accepted.length} task${accepted.length === 1 ? '' : 's'} extracted`}
                tone="success"
                size="sm"
                icon={<Sparkles size={11} color={status.success.solid} />}
              />
              <Txt variant="h3">Here&apos;s how I&apos;d break this down.</Txt>
            </View>
          </View>

          <View style={styles.sectionHead}>
            <Txt variant="caption" muted style={styles.eyebrow}>
              PROPOSED MANIFEST TASKS
            </Txt>
            <Txt variant="caption" muted>
              Tap a title to edit
            </Txt>
          </View>

          {accepted.length === 0 ? (
            <EmptyState
              icon={<Info size={26} color={scheme.textMuted} />}
              title="You dropped everything"
              body="Nothing will be added. Go back and edit the capture, or restore one below."
              action={{ label: 'Restore all', onPress: () => setDropped([]) }}
            />
          ) : (
            accepted.map((task) => (
              <ProposedCard
                key={task.id}
                task={task}
                now={now}
                editing={editing === task.id}
                onEdit={() => setEditing(task.id)}
                onChangeTitle={(title) => setEdits((e) => ({ ...e, [task.id]: title }))}
                onCommitTitle={() => setEditing(null)}
                onDrop={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  setDropped((d) => [...d, task.id]);
                  toast('Dropped from this batch', 'neutral', {
                    label: 'Undo',
                    run: () => setDropped((d) => d.filter((id) => id !== task.id)),
                  });
                }}
              />
            ))
          )}

          {/* ── 2-minute rule ───────────────────────────────────────────── */}
          {review.quickWin ? (
            <>
              <View style={styles.quickHead}>
                <Zap size={15} color={status.warning.solid} />
                <Txt variant="h4" color={status.warning.fg}>
                  Just do it now (2-minute rule)
                </Txt>
              </View>

              <View
                style={[
                  styles.quickCard,
                  { backgroundColor: status.warning.bg, borderColor: status.warning.solid },
                ]}
              >
                <Checkbox
                  checked={quickDone}
                  onToggle={(next) => {
                    setQuickDone(next);
                    if (next) {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                      toast('Cleared without scheduling it', 'success');
                    }
                  }}
                  accessibilityLabel={review.quickWin.title}
                  size={22}
                />
                <View style={{ flex: 1 }}>
                  <Txt variant="bodySm" style={quickDone ? styles.strike : undefined}>
                    {review.quickWin.title}
                  </Txt>
                  <Txt variant="caption" color={status.warning.fg}>
                    {review.quickWin.note}
                  </Txt>
                </View>
              </View>
            </>
          ) : null}

          {/* ── Budget ──────────────────────────────────────────────────── */}
          <View style={[styles.budget, { backgroundColor: scheme.surfaceAlt }]}>
            <View
              style={[
                styles.budgetDot,
                {
                  backgroundColor:
                    budget.remaining > 40
                      ? status.success.solid
                      : budget.remaining > 15
                        ? status.warning.solid
                        : status.danger.solid,
                },
              ]}
            />
            <Txt variant="caption" muted style={{ flex: 1 }}>
              {accepted.length === 0
                ? `Nothing added — pressure stays at ${budget.before}%.`
                : `Pressure ${budget.before}% → ${budget.after}% (${budget.remaining}% budget left)`}
            </Txt>
            <Txt variant="caption" color={status.warning.fg}>
              +{review.sparksReward} Sparks
            </Txt>
          </View>
        </ScrollView>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <View style={styles.footer}>
          <Button
            label={`Add ${accepted.length} task${accepted.length === 1 ? '' : 's'}`}
            fullWidth
            loading={committing}
            disabled={accepted.length === 0}
            disabledReason="Restore at least one task first"
            icon={<CheckCircle2 size={16} color={scheme.onPrimary} />}
            onPress={commit}
          />
          <Interactive
            accessibilityRole="button"
            accessibilityLabel="Go back and edit the capture"
            onPress={() => {
              setReview(null);
              router.replace('/capture');
            }}
            radius="pill"
            style={styles.editMore}
          >
            <Txt variant="label" muted>
              Edit the capture
            </Txt>
          </Interactive>
        </View>
      </View>
    </View>
  );
}

function ProposedCard({
  task,
  now,
  editing,
  onEdit,
  onChangeTitle,
  onCommitTitle,
  onDrop,
}: {
  task: ProposedTask;
  now: Date;
  editing: boolean;
  onEdit: () => void;
  onChangeTitle: (title: string) => void;
  onCommitTitle: () => void;
  onDrop: () => void;
}) {
  const scheme = useScheme();

  return (
    <View style={[styles.card, { borderColor: scheme.border }]}>
      <View style={styles.cardHead}>
        {editing ? (
          <View style={{ flex: 1 }}>
            <Input
              value={task.title}
              onChangeText={onChangeTitle}
              onBlur={onCommitTitle}
              onSubmitEditing={onCommitTitle}
              autoFocus
              returnKeyType="done"
              maxLength={120}
              showCount
              accessibilityLabel="Task title"
            />
          </View>
        ) : (
          <Interactive
            accessibilityRole="button"
            accessibilityLabel={`Edit title: ${task.title}`}
            onPress={onEdit}
            radius="sm"
            style={{ flex: 1 }}
          >
            <Txt variant="h4">{task.title}</Txt>
          </Interactive>
        )}

        <IconButton
          icon={<X size={16} color={scheme.textMuted} />}
          accessibilityLabel={`Remove ${task.title}`}
          size={30}
          tone="ghost"
          onPress={onDrop}
        />
      </View>

      <View style={styles.chipRow}>
        <Chip label={task.context} size="sm" tone="success" />
        <Chip
          label={formatDue(task.dueAt, now)}
          size="sm"
          icon={<CalendarDays size={11} color={scheme.textSecondary} />}
        />
        <Chip
          label={`${LOAD_LABEL[task.load]} · ${formatEstimate(task.estimateMin)}`}
          size="sm"
          tone={task.load === 'high' ? 'warning' : 'neutral'}
        />
      </View>

      {task.calibrateLater ? (
        <Chip
          label="Calibrate later"
          size="sm"
          tone="info"
          icon={<Info size={11} color={status.info.solid} />}
        />
      ) : null}

      {task.subtasks.length > 0 ? (
        <View style={{ gap: space[1.5], marginTop: space[1] }}>
          {task.subtasks.map((sub, i) => (
            <View key={i} style={styles.subRow}>
              <View style={[styles.radio, { borderColor: scheme.borderStrong }]} />
              <Txt variant="bodySm" muted style={{ flex: 1 }}>
                {sub}
              </Txt>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '94%',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: space[4],
    paddingBottom: space[6],
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radius.pill,
    alignSelf: 'center',
    marginTop: space[2.5],
    marginBottom: space[3],
  },
  scroll: { paddingBottom: space[4] },

  head: { flexDirection: 'row', alignItems: 'center', gap: space[3] },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space[5],
    marginBottom: space[2.5],
  },
  eyebrow: { letterSpacing: 1 },

  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space[3.5],
    marginBottom: space[3],
    gap: space[2],
  },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2] },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[1.5] },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  radio: { width: 16, height: 16, borderRadius: radius.pill, borderWidth: 1.5 },

  quickHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1.5],
    marginTop: space[3],
    marginBottom: space[2.5],
  },
  quickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2.5],
    padding: space[3],
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  strike: { textDecorationLine: 'line-through' },

  budget: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    marginTop: space[4],
    padding: space[3],
    borderRadius: radius.md,
  },
  budgetDot: { width: 8, height: 8, borderRadius: radius.pill },

  footer: { gap: space[2], paddingTop: space[3] },
  editMore: { alignSelf: 'center', paddingVertical: space[2], paddingHorizontal: space[3] },
});
