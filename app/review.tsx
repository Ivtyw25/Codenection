import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  Sparkles,
  UserPlus,
  X,
  Zap,
} from 'lucide-react-native';

import { PipMascot, Timeline } from '@/components/app';
import {
  Avatar,
  Button,
  Checkbox,
  Chip,
  EmptyState,
  IconButton,
  Input,
  Interactive,
  Txt,
} from '@/components/ui';
import { loadPercent } from '@/data/derive';
import { categoryLabel } from '@/data/categories';
import { formatDue, formatEstimate } from '@/data/format';
import { compareSlots, planSpan, proposedSlotId, type Slot } from '@/data/schedule';
import { useApp } from '@/store/AppStore';
import {
  useAllCategories,
  useBudget,
  useNow,
  usePipState,
  useProposedTimeline,
  useTeammates,
} from '@/store/selectors';
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
  const teammates = useTeammates();
  const review = state.review;

  const [dropped, setDropped] = useState<string[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [quickDone, setQuickDone] = useState(false);
  /** Which breakdown cards have their timeline open. */
  const [expanded, setExpanded] = useState<string[]>([]);
  /** Two-minute items the user cleared here rather than scheduling. */
  const [completedNow, setCompletedNow] = useState<string[]>([]);
  const [committing, setCommitting] = useState(false);

  const accepted = useMemo(
    () =>
      (review?.proposed ?? [])
        .filter((p) => !dropped.includes(p.id))
        .map((p) => ({
          ...p,
          title: edits[p.id] ?? p.title,
          completeNow: completedNow.includes(p.id),
        })),
    [review, dropped, edits, completedNow],
  );

  const budget = useBudget(accepted);
  /*
   * When this batch would actually happen.
   *
   * Planned against the committed tasks, not in isolation — a sheet that
   * promised Tuesday 9am for a slot the midterm revision already owns would
   * have every time move the instant the user pressed Add.
   */
  const schedule = useProposedTimeline(accepted);

  /**
   * Trivial items are pulled out of the breakdown list, not out of the commit.
   *
   * They still become real tasks — the split is only about not making a
   * two-minute errand look like a project next to a 150-minute one.
   */
  const trivial = useMemo(() => accepted.filter((p) => p.twoMinute), [accepted]);
  const breakdown = useMemo(() => accepted.filter((p) => !p.twoMinute), [accepted]);

  /**
   * Steps worth handing off, lifted out of their cards so the decision is
   * offered once, at the moment the work is being shaped — rather than waiting
   * to be rediscovered inside a task detail screen days later.
   */
  const delegatable = useMemo(
    () =>
      accepted.flatMap((p) =>
        p.subtasks.filter((s) => s.delegatable).map((sub) => ({ proposal: p, sub })),
      ),
    [accepted],
  );

  const commit = useCallback(() => {
    if (!review || accepted.length === 0) return;
    setCommitting(true);
    const created = commitReview(review, accepted);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    toast(
      `${created.length} task${created.length === 1 ? '' : 's'} added · inbox cleared · +${review.sparksReward} Sparks`,
      'success',
    );
    setCommitting(false);
    router.replace('/tasks');
  }, [review, accepted, commitReview, toast, router]);

  // Reached by deep link, or after a commit cleared the handoff.
  if (!review) {
    return (
      <View style={[styles.root, { backgroundColor: scheme.ground }]}>
        <View style={styles.page}>
          <EmptyState
            icon={<Sparkles size={28} color={scheme.textMuted} />}
            title="Nothing to review"
            body="Triage starts in the Inbox. Pick the captures you want structured and Pip will break them down."
            action={{ label: 'Open the inbox', onPress: () => router.replace('/inbox') }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: scheme.ground }]}>
      <View style={styles.page}>
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
                label={
                  `${review.sourceIds.length} capture${review.sourceIds.length === 1 ? '' : 's'}` +
                  ` · ${accepted.length} task${accepted.length === 1 ? '' : 's'}`
                }
                tone="success"
                size="sm"
                icon={<Sparkles size={11} color={status.success.solid} />}
              />
              <Txt variant="h3">Here&apos;s how I&apos;d break this down.</Txt>
            </View>
          </View>

          <View style={styles.sectionHead}>
            <Txt variant="h4">Proposed Manifest</Txt>
          </View>

          {accepted.length === 0 ? (
            <EmptyState
              icon={<Info size={26} color={scheme.textMuted} />}
              title="You dropped everything"
              body="Nothing will be added and the captures stay in your inbox. Restore one below, or go back."
              action={{ label: 'Restore all', onPress: () => setDropped([]) }}
            />
          ) : (
            breakdown.map((task) => (
              <ProposedCard
                key={task.id}
                task={task}
                now={now}
                slots={slotsFor(task, schedule)}
                expanded={expanded.includes(task.id)}
                onToggleTimeline={() =>
                  setExpanded((e) =>
                    e.includes(task.id) ? e.filter((id) => id !== task.id) : [...e, task.id],
                  )
                }
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

          {/* ── Delegation ──────────────────────────────────────────────── */}
          {delegatable.length > 0 ? (
            <>
              <View style={styles.quickHead}>
                <UserPlus size={15} color={status.info.solid} />
                <Txt variant="h4" color={status.info.fg}>
                  Could be delegated
                </Txt>
              </View>

              {delegatable.map(({ proposal, sub }) => {
                const assignee = teammates.find((m) => m.id === sub.delegatedTo) ?? null;
                return (
                  <View
                    key={`${proposal.id}:${sub.id}`}
                    style={[
                      styles.quickCard,
                      { backgroundColor: status.info.bg, borderColor: status.info.solid },
                    ]}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <Txt variant="bodySm">{sub.title}</Txt>
                      <Txt variant="caption" color={status.info.fg} numberOfLines={1}>
                        from {proposal.title}
                      </Txt>
                    </View>

                    {assignee ? (
                      <Interactive
                        accessibilityRole="button"
                        accessibilityLabel={`Reassign ${sub.title}, currently ${assignee.name}`}
                        onPress={() =>
                          router.push({
                            pathname: '/delegate',
                            params: { proposalId: proposal.id, subId: sub.id },
                          })
                        }
                        radius="pill"
                        style={styles.assigned}
                      >
                        <Avatar initials={assignee.initials} size={20} />
                        <Txt variant="caption" color={status.info.fg}>
                          {assignee.name}
                        </Txt>
                      </Interactive>
                    ) : (
                      <Button
                        label="Choose someone"
                        variant="secondary"
                        size="sm"
                        onPress={() =>
                          router.push({
                            pathname: '/delegate',
                            params: { proposalId: proposal.id, subId: sub.id },
                          })
                        }
                      />
                    )}
                  </View>
                );
              })}
            </>
          ) : null}

          {/* ── 2-minute rule ───────────────────────────────────────────── */}
          {trivial.length > 0 ? (
            <>
              <View style={styles.quickHead}>
                <Zap size={15} color={status.warning.solid} />
                <Txt variant="h4" color={status.warning.fg}>
                  Just do it now (2-minute rule)
                </Txt>
              </View>

              {trivial.map((task) => {
                const doneNow = completedNow.includes(task.id);
                return (
                  <View
                    key={task.id}
                    style={[
                      styles.twoMinCard,
                      { backgroundColor: status.warning.bg, borderColor: status.warning.solid },
                    ]}
                  >
                    <View style={styles.quickRow}>
                      <Zap size={16} color={status.warning.solid} />
                      <Txt
                        variant="bodySm"
                        style={[{ flex: 1 }, doneNow && styles.strike]}
                        color={doneNow ? status.warning.fg : undefined}
                      >
                        {task.title}
                      </Txt>
                      <IconButton
                        icon={<X size={14} color={scheme.textMuted} />}
                        accessibilityLabel={`Drop ${task.title}`}
                        size={32}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                          setDropped((d) => [...d, task.id]);
                          toast('Dropped from this batch', 'neutral', {
                            label: 'Undo',
                            run: () => setDropped((d) => d.filter((id) => id !== task.id)),
                          });
                        }}
                      />
                    </View>

                    {/*
                      Both options commit the task. The difference is only
                      whether it lands already finished — which is the honest
                      version of the 2-minute rule: doing it now should still
                      be something the week can see you did.
                    */}
                    <View style={styles.quickActions}>
                      <Button
                        label={doneNow ? 'Completed' : 'Complete'}
                        size="sm"
                        variant={doneNow ? 'primary' : 'secondary'}
                        icon={
                          <CheckCircle2
                            size={14}
                            color={doneNow ? scheme.onPrimary : scheme.text}
                          />
                        }
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                          setCompletedNow((c) =>
                            c.includes(task.id) ? c : [...c, task.id],
                          );
                        }}
                      />
                      <Button
                        label="Do it later"
                        size="sm"
                        variant={doneNow ? 'secondary' : 'primary'}
                        onPress={() =>
                          setCompletedNow((c) => c.filter((id) => id !== task.id))
                        }
                      />
                    </View>
                  </View>
                );
              })}
            </>
          ) : null}

          {/* Legacy parser quick-win — typed captures can still produce one. */}
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
            accessibilityLabel="Back to the inbox without committing"
            onPress={() => {
              setReview(null);
              router.back();
            }}
            radius="pill"
            style={styles.editMore}
          >
            <Txt variant="label" muted>
              Back to inbox
            </Txt>
          </Interactive>
        </View>
      </View>
    </View>
  );
}

/** The proposal's blocks, in plan order. */
function slotsFor(task: ProposedTask, schedule: Map<string, Slot>): Slot[] {
  const ids =
    task.subtasks.length === 0
      ? [task.id]
      : task.subtasks.map((s) => proposedSlotId(task.id, s.id));
  return ids
    .map((id) => schedule.get(id))
    .filter((s): s is Slot => s != null)
    .sort(compareSlots);
}

function ProposedCard({
  task,
  now,
  slots,
  expanded,
  onToggleTimeline,
  editing,
  onEdit,
  onChangeTitle,
  onCommitTitle,
  onDrop,
}: {
  task: ProposedTask;
  now: Date;
  slots: Slot[];
  expanded: boolean;
  onToggleTimeline: () => void;
  editing: boolean;
  onEdit: () => void;
  onChangeTitle: (title: string) => void;
  onCommitTitle: () => void;
  onDrop: () => void;
}) {
  // Read here rather than drilled from the sheet: a proposal stores a category
  // *id*, and the label it resolves to is the user's to change at any moment.
  const categories = useAllCategories();
  const scheme = useScheme();
  const span = planSpan(slots, now);

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
        <Chip label={categoryLabel(categories, task.categoryId)} size="sm" tone="success" />
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
        {/*
          What this one task costs as a share of a student-day, so the weight
          of each card is legible before the batch total at the bottom.
        */}
        <Chip
          label={`+${loadPercent(task)}% load`}
          size="sm"
          tone={loadPercent(task) >= 25 ? 'warning' : 'neutral'}
          variant="filled"
        />
      </View>

      {/*
        The breakdown opens into a plan, not just a list.
        A disclosure row rather than a tap on the card body, because the title
        is already bound to inline editing — and collapsed by default, because
        four expanded rails is the wall of text this sheet exists to avoid.
      */}
      {slots.length > 0 ? (
        <>
          <Interactive
            accessibilityRole="button"
            accessibilityLabel={
              expanded
                ? `Hide the plan for ${task.title}`
                : `Show when each step of ${task.title} is planned`
            }
            onPress={onToggleTimeline}
            radius="md"
            style={[styles.disclose, { backgroundColor: scheme.surfaceAlt }]}
          >
            <Txt variant="caption" muted style={{ flex: 1 }}>
              {task.subtasks.length > 0
                ? `${task.subtasks.length} step${task.subtasks.length === 1 ? '' : 's'}`
                : 'One sitting'}
              {span ? ` · ${span}` : ''}
            </Txt>
            <Txt variant="caption" color={scheme.primary}>
              {expanded ? 'Hide plan' : 'See plan'}
            </Txt>
            {expanded ? (
              <ChevronUp size={14} color={scheme.primary} />
            ) : (
              <ChevronDown size={14} color={scheme.primary} />
            )}
          </Interactive>

          {expanded ? (
            <View style={styles.railBox}>
              <Timeline slots={slots} now={now} groupDays />
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  page: { flex: 1, paddingHorizontal: space[4], paddingTop: space[6], paddingBottom: space[4] },
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
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1.5],
    marginBottom: space[2],
  },

  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space[3.5],
    marginBottom: space[3],
    gap: space[2],
  },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2] },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[1.5] },
  disclose: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1.5],
    paddingVertical: space[2],
    paddingHorizontal: space[3],
    borderRadius: radius.md,
    marginTop: space[1],
  },
  railBox: { marginTop: space[2.5] },
  assigned: { flexDirection: 'row', alignItems: 'center', gap: space[1] },

  quickRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  quickActions: { flexDirection: 'row', gap: space[2], marginTop: space[2] },
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
  /** Stacks, because the two-minute card carries its own pair of actions. */
  twoMinCard: { padding: space[3], borderWidth: 1, borderRadius: radius.lg },
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
