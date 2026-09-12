import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  CalendarDays,
  Check,
  Download,
  ExternalLink,
  FileText,
  Leaf,
  Lock,
  MapPin,
  Plus,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react-native';

import {
  Avatar,
  Button,
  Checkbox,
  Chip,
  ConfirmDialog,
  EmptyState,
  IconButton,
  Input,
  Interactive,
  ProgressBar,
  Sheet,
  Txt,
} from '@/components/ui';
import { formatDue, formatEstimate, isOverdue } from '@/data/format';
import { blockers, loadPercent, nextAction, progress } from '@/data/derive';
import { useApp } from '@/store/AppStore';
import { useNow, useTask, useTeammates } from '@/store/selectors';
import { radius, space, status, useScheme } from '@/theme';
import type { Resource, SubTask, Teammate } from '@/types';

/**
 * Task Detail — SCR-13. Opens as a bottom sheet over the Manifest.
 *
 * Everything on this sheet writes through to the store: sub-tasks tick, steps
 * are added, the title is editable, the task can be completed or deleted. Close
 * it and the Manifest behind has already moved.
 */
export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scheme = useScheme();
  const now = useNow();

  const { toggleTask, toggleSubtask, addSubtask, patchTask, removeTask, toast } = useApp();
  const task = useTask(id);
  const teammates = useTeammates();
  const next = task ? nextAction(task) : null;

  const [adding, setAdding] = useState(false);
  const [newStep, setNewStep] = useState('');
  const [newStepMins, setNewStepMins] = useState('');
  /** Steps the one being added should wait on. Ids only ever point backwards. */
  const [newStepDeps, setNewStepDeps] = useState<string[]>([]);
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const close = useCallback(() => router.back(), [router]);

  const resetStepDraft = useCallback(() => {
    setNewStep('');
    setNewStepMins('');
    setNewStepDeps([]);
    setAdding(false);
  }, []);

  const submitStep = useCallback(() => {
    const title = newStep.trim();
    if (!task || title.length < 2) return;
    const parsed = parseInt(newStepMins, 10);
    addSubtask(task.id, title, {
      estimateMin: Number.isFinite(parsed) && parsed > 0 ? parsed : 15,
      dependsOn: newStepDeps,
    });
    resetStepDraft();
    Haptics.selectionAsync().catch(() => {});
    toast('Step added', 'success');
  }, [newStep, newStepMins, newStepDeps, task, addSubtask, resetStepDraft, toast]);

  if (!task) {
    return (
      <Sheet visible onClose={close} fullHeight>
        <EmptyState
          icon={<FileText size={28} color={scheme.textMuted} />}
          title="Task not found"
          body="This task may have been completed or removed."
          action={{ label: 'Go back', onPress: close }}
        />
      </Sheet>
    );
  }

  const { done, total, pct } = progress(task);
  const complete = task.status === 'done';
  const overdue = !complete && isOverdue(task.dueAt, now);

  return (
    <Sheet visible onClose={close} fullHeight>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Head ──────────────────────────────────────────────────────── */}
        <View style={styles.head}>
          <Txt variant="caption" muted style={styles.eyebrow}>
            TASK DETAIL
          </Txt>
          <View style={{ flexDirection: 'row', gap: space[1.5] }}>
            <IconButton
              icon={<Trash2 size={15} color={status.danger.solid} />}
              accessibilityLabel="Delete task"
              size={28}
              onPress={() => setConfirmDelete(true)}
            />
            <IconButton
              icon={<X size={16} color={scheme.textSecondary} />}
              accessibilityLabel="Close task detail"
              size={28}
              onPress={close}
            />
          </View>
        </View>

        {editingTitle ? (
          <Input
            value={draftTitle}
            onChangeText={setDraftTitle}
            autoFocus
            multiline
            maxLength={140}
            showCount
            accessibilityLabel="Task title"
            onBlur={() => {
              const next = draftTitle.trim();
              if (next.length >= 3 && next !== task.title) {
                patchTask(task.id, { title: next });
                toast('Title updated', 'success');
              }
              setEditingTitle(false);
            }}
          />
        ) : (
          <Interactive
            accessibilityRole="button"
            accessibilityLabel={`Edit title: ${task.title}`}
            onPress={() => {
              setDraftTitle(task.title);
              setEditingTitle(true);
            }}
            radius="sm"
          >
            <Txt variant="h2" style={complete ? styles.strike : undefined}>
              {task.title}
            </Txt>
            <Txt variant="bodySm" muted style={{ marginTop: space[1] }}>
              Tap title to edit
            </Txt>
          </Interactive>
        )}

        <View style={styles.chipRow}>
          {task.tag ? <Chip label={task.tag} tone="success" /> : null}
          <Chip label={task.context} icon={<MapPin size={12} color={scheme.textSecondary} />} />
        </View>
        <View style={styles.chipRow}>
          <Chip
            label={formatDue(task.dueAt, now)}
            tone={overdue ? 'danger' : 'neutral'}
            icon={<CalendarDays size={12} color={overdue ? status.danger.solid : scheme.textSecondary} />}
          />
          <Chip
            label={`+${loadPercent(task)}% load · ${formatEstimate(task.estimateMin)}`}
            tone="success"
          />
        </View>

        {/* ── Progress ──────────────────────────────────────────────────── */}
        {total > 0 ? (
          <View style={{ marginTop: space[4], gap: space[1.5] }}>
            <ProgressBar
              value={pct}
              tone={pct === 100 ? 'success' : 'brand'}
              label={`${done} of ${total} sub-tasks complete`}
            />
          </View>
        ) : null}

        {/* ── Sub-tasks ─────────────────────────────────────────────────── */}
        <View style={styles.sectionHead}>
          <Txt variant="h4">
            Sub-tasks ({done} of {total} complete)
          </Txt>
          {!adding ? (
            <Interactive
              accessibilityRole="button"
              accessibilityLabel="Add a step"
              onPress={() => setAdding(true)}
              radius="pill"
              style={styles.addStep}
              hitSlop={8}
            >
              <Plus size={14} color={scheme.primary} />
              <Txt variant="label" color={scheme.primary}>
                Add step
              </Txt>
            </Interactive>
          ) : null}
        </View>

        {total > 0 ? (
          <View style={[styles.subBox, { borderColor: scheme.border }]}>
            {task.subtasks.map((sub, i) => (
              <SubTaskRow
                key={sub.id}
                sub={sub}
                first={i === 0}
                // Exactly one row carries the pill, and it is the first step
                // that is actually startable — not merely the first unticked
                // one, which could be locked behind unfinished work.
                isNext={next?.id === sub.id}
                blockedBy={blockers(task, sub)}
                assignee={teammates.find((m) => m.id === sub.delegatedTo) ?? null}
                onToggle={() => {
                  Haptics.selectionAsync().catch(() => {});
                  toggleSubtask(task.id, sub.id);
                }}
                onDelegate={() =>
                  router.push({
                    pathname: '/delegate',
                    params: { taskId: task.id, subId: sub.id },
                  })
                }
              />
            ))}
          </View>
        ) : !adding ? (
          <Txt variant="bodySm" muted>
            No steps yet. Breaking this down is usually what unblocks it.
          </Txt>
        ) : null}

        {adding ? (
          <View style={{ gap: space[2] }}>
            <View style={styles.addRow}>
              <View style={{ flex: 1 }}>
                <Input
                  value={newStep}
                  onChangeText={setNewStep}
                  placeholder="What is the next concrete step?"
                  autoFocus
                  returnKeyType="done"
                  maxLength={120}
                  onSubmitEditing={submitStep}
                  accessibilityLabel="New sub-task"
                  error={newStep.length > 0 && newStep.trim().length < 2 ? 'A little more than that.' : undefined}
                />
              </View>
              <View style={{ width: 78 }}>
                <Input
                  value={newStepMins}
                  onChangeText={setNewStepMins}
                  placeholder="15"
                  keyboardType="number-pad"
                  maxLength={3}
                  accessibilityLabel="Minutes this step will take"
                />
              </View>
              <IconButton
                icon={<Check size={16} color={scheme.onPrimary} />}
                accessibilityLabel="Save step"
                size={40}
                disabled={newStep.trim().length < 2}
                onPress={submitStep}
              />
              <IconButton
                icon={<X size={16} color={scheme.textMuted} />}
                accessibilityLabel="Cancel"
                size={40}
                onPress={resetStepDraft}
              />
            </View>

            {/*
              Only steps that already exist are offered, which is also what
              keeps the graph acyclic: a new edge can only point backwards.
            */}
            {total > 0 ? (
              <View style={{ gap: space[1] }}>
                <Txt variant="caption" muted>
                  Waits on (optional)
                </Txt>
                <View style={styles.depPicker}>
                  {task.subtasks.map((s) => {
                    const picked = newStepDeps.includes(s.id);
                    return (
                      <Chip
                        key={s.id}
                        label={s.title}
                        size="sm"
                        tone={picked ? 'info' : 'neutral'}
                        variant={picked ? 'filled' : 'outline'}
                        onPress={() =>
                          setNewStepDeps((prev) =>
                            picked ? prev.filter((d) => d !== s.id) : [...prev, s.id],
                          )
                        }
                      />
                    );
                  })}
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* ── Notes ─────────────────────────────────────────────────────── */}
        {task.notes ? (
          <>
            <Txt variant="h4" style={styles.sectionTitle}>
              Notes &amp; Context
            </Txt>
            <View style={[styles.notes, { backgroundColor: scheme.surfaceAlt }]}>
              <Txt variant="bodySm" muted>
                {task.notes}
              </Txt>
            </View>
          </>
        ) : null}

        {/* ── Resources ─────────────────────────────────────────────────── */}
        {task.resources.length > 0 ? (
          <>
            <Txt variant="caption" muted style={styles.sectionTitle}>
              ATTACHED RESOURCES
            </Txt>
            <View style={{ gap: space[2] }}>
              {task.resources.map((resource) => (
                <ResourceRow key={resource.id} resource={resource} />
              ))}
            </View>
          </>
        ) : null}

        {/* ── Pip's note ────────────────────────────────────────────────── */}
        {task.pipNote ? (
          <View style={[styles.pipNote, { backgroundColor: status.success.bg }]}>
            <View style={styles.pipNoteHead}>
              <Leaf size={14} color={status.success.solid} />
              <Txt variant="label" color={status.success.fg}>
                Pip&apos;s note
              </Txt>
            </View>
            <Txt variant="bodySm" color={status.success.fg}>
              {task.pipNote}
            </Txt>
          </View>
        ) : null}
      </ScrollView>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <View style={styles.footer}>
        <Button
          label={complete ? 'Re-open task' : 'Mark complete'}
          variant={complete ? 'secondary' : 'primary'}
          fullWidth
          icon={complete ? undefined : <Check size={16} color={scheme.onPrimary} />}
          onPress={() => {
            Haptics.impactAsync(
              complete ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium,
            ).catch(() => {});
            toggleTask(task.id);
            toast(complete ? 'Re-opened' : 'Task complete', complete ? 'neutral' : 'success');
            if (!complete) close();
          }}
        />
      </View>

      <ConfirmDialog
        visible={confirmDelete}
        title="Delete this task?"
        body={`“${task.title}” and its ${total} sub-task${total === 1 ? '' : 's'} go with it. This cannot be undone.`}
        confirmLabel="Delete"
        tone="danger"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          removeTask(task.id);
          toast('Task deleted', 'neutral');
          close();
        }}
      />
    </Sheet>
  );
}

/**
 * One step.
 *
 * Three states beyond done/not-done: LOCKED (waiting on unfinished work — no
 * checkbox at all, because offering a control that refuses the tap is worse
 * than showing why it isn't there), DELEGATED (someone else's, still yours to
 * see), and startable.
 */
function SubTaskRow({
  sub,
  first,
  isNext,
  blockedBy,
  assignee,
  onToggle,
  onDelegate,
}: {
  sub: SubTask;
  first: boolean;
  isNext: boolean;
  blockedBy: SubTask[];
  assignee: Teammate | null;
  onToggle: () => void;
  onDelegate: () => void;
}) {
  const scheme = useScheme();
  const locked = blockedBy.length > 0 && !sub.done;
  const dimmed = locked || sub.done;

  return (
    <View
      style={[styles.subRow, !first && { borderTopWidth: 1, borderTopColor: scheme.border }]}
    >
      {locked ? (
        <View
          style={styles.lockSlot}
          accessible
          accessibilityRole="image"
          accessibilityLabel={`Locked. Waiting on ${blockedBy.map((b) => b.title).join(' and ')}.`}
        >
          <Lock size={15} color={scheme.textDisabled} />
        </View>
      ) : (
        <Checkbox checked={sub.done} onToggle={onToggle} accessibilityLabel={sub.title} />
      )}

      <View style={{ flex: 1, gap: 2 }}>
        <Txt
          variant="bodySm"
          style={sub.done && styles.strike}
          color={dimmed ? scheme.textMuted : undefined}
          numberOfLines={2}
        >
          {sub.title}
        </Txt>

        <View style={styles.subMeta}>
          <Txt variant="caption" muted>
            {formatEstimate(sub.estimateMin)}
          </Txt>

          {locked ? (
            <Txt variant="caption" color={scheme.textDisabled} numberOfLines={1} style={{ flex: 1 }}>
              · Waiting on {blockedBy.map((b) => b.title).join(' + ')}
            </Txt>
          ) : null}

          {assignee ? (
            <>
              <Txt variant="caption" muted>
                ·
              </Txt>
              <Avatar initials={assignee.initials} size={16} />
              <Txt variant="caption" muted numberOfLines={1}>
                {assignee.name}
              </Txt>
            </>
          ) : null}
        </View>
      </View>

      {isNext ? <Chip label="Next Action" tone="success" variant="filled" size="sm" /> : null}

      {!sub.done && !locked ? (
        <Interactive
          accessibilityRole="button"
          accessibilityLabel={
            assignee ? `Reassign ${sub.title}` : `Delegate ${sub.title} to someone`
          }
          onPress={onDelegate}
          radius="pill"
          hitSlop={8}
          style={styles.delegateBtn}
        >
          <UserPlus size={14} color={scheme.primary} />
        </Interactive>
      ) : null}
    </View>
  );
}

function ResourceRow({ resource }: { resource: Resource }) {
  const scheme = useScheme();
  const { toast } = useApp();

  return (
    <Interactive
      accessibilityRole="button"
      accessibilityLabel={`${resource.name}, ${resource.kind}, ${resource.size}`}
      accessibilityHint="File storage is not connected yet"
      onPress={() => toast('File storage arrives with the backend', 'neutral')}
      radius="md"
      style={[styles.resource, { borderColor: scheme.border }]}
    >
      <View style={[styles.resourceIcon, { backgroundColor: scheme.surfaceAlt }]}>
        <FileText size={15} color={scheme.textSecondary} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt variant="bodySm" numberOfLines={1}>
          {resource.name}
        </Txt>
        <Txt variant="caption" muted>
          {resource.kind} · {resource.size}
        </Txt>
      </View>
      {resource.external ? (
        <ExternalLink size={16} color={scheme.textMuted} />
      ) : (
        <Download size={16} color={scheme.textMuted} />
      )}
    </Interactive>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: space[6] },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { letterSpacing: 1.2 },
  strike: { textDecorationLine: 'line-through' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[1.5], marginTop: space[2.5] },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space[6],
    marginBottom: space[2.5],
    minHeight: 28,
  },
  sectionTitle: { marginTop: space[6], marginBottom: space[2.5] },
  addStep: { flexDirection: 'row', alignItems: 'center', gap: space[1], paddingVertical: space[1] },
  addRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2], marginTop: space[2] },
  depPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: space[1] },
  subMeta: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  /** Same footprint as the Checkbox it replaces, so locked rows don't reflow. */
  lockSlot: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  delegateBtn: { padding: space[1] },

  subBox: { borderWidth: 1, borderRadius: radius.md, overflow: 'hidden' },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2.5],
    padding: space[3],
  },

  notes: { padding: space[3.5], borderRadius: radius.md },

  resource: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2.5],
    padding: space[2.5],
    borderWidth: 1,
    borderRadius: radius.md,
  },
  resourceIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pipNote: {
    marginTop: space[6],
    padding: space[3.5],
    borderRadius: radius.md,
    gap: space[1.5],
  },
  pipNoteHead: { flexDirection: 'row', alignItems: 'center', gap: space[1.5] },

  footer: { paddingTop: space[3] },
});
