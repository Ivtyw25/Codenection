import { useCallback, useState } from 'react';
import { Image, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  AlarmClock,
  ArrowLeft,
  CalendarClock,
  CalendarDays,
  Check,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Leaf,
  Music,
  Plus,
  Timer,
  Trash2,
  Video,
  X,
} from 'lucide-react-native';

import { ReassignSheet, TaskIcon, Timeline } from '@/components/app';
import {
  Button,
  Chip,
  ConfirmDialog,
  EmptyState,
  IconButton,
  Input,
  Interactive,
  ProgressBar,
  Screen,
  Txt,
} from '@/components/ui';
import { formatDuration } from '@/data/attachments';
import { formatDue, formatEstimate, isOverdue } from '@/data/format';
import { blockers, loadPercent, nextAction, progress } from '@/data/derive';
import { planSpan } from '@/data/schedule';
import { useApp } from '@/store/AppStore';
import { useCategory, useNow, useTask, useTaskTimeline } from '@/store/selectors';
import { radius, space, status, useScheme } from '@/theme';
import type { Resource, VitalId } from '@/types';

/**
 * Sub-stat names, for the recovery banner's payout line.
 *
 * Spelled out rather than read off `data.vitals`, because the banner is naming
 * the promise the task was created under and that promise does not change if
 * the reading behind it does.
 */
const VITAL_LABEL: Record<VitalId, string> = {
  rest: 'Rest & Sleep',
  mood: 'Mood & Stress',
  physical: 'Physical Vitality',
  social: 'Social Connection',
};

/**
 * Task Detail — SCR-13. A full page, pushed from the Manifest.
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
  const category = useCategory(task?.categoryId);
  const timeline = useTaskTimeline(id);
  const next = task ? nextAction(task) : null;

  const [adding, setAdding] = useState(false);
  const [newStep, setNewStep] = useState('');
  const [newStepMins, setNewStepMins] = useState('');
  /** Steps the one being added should wait on. Ids only ever point backwards. */
  const [newStepDeps, setNewStepDeps] = useState<string[]>([]);
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reassigning, setReassigning] = useState(false);

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
      <Screen>
        <EmptyState
          icon={<FileText size={28} color={scheme.textMuted} />}
          title="Task not found"
          body="This task may have been completed or removed."
          action={{ label: 'Go back', onPress: close }}
        />
      </Screen>
    );
  }

  const { done, total, pct } = progress(task);
  const complete = task.status === 'done';
  const overdue = !complete && isOverdue(task.dueAt, now);
  const span = planSpan(timeline, now);
  /*
   * Why each locked step is locked, by id.
   *
   * Built here rather than inside the rail because `blockers` needs the whole
   * task to answer, and the rail only ever sees slots — which is the right
   * split: the timeline knows about time, the domain knows about dependencies.
   */
  const blockedBy: Record<string, string[]> = {};
  for (const sub of task.subtasks) {
    const waiting = blockers(task, sub);
    if (waiting.length > 0) blockedBy[sub.id] = waiting.map((b) => b.title);
  }

  return (
    <Screen
      scroll={false}
      footer={
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
      }
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Head ──────────────────────────────────────────────────────── */}
        <View style={styles.head}>
          <IconButton
            icon={<ArrowLeft size={18} color={scheme.text} />}
            accessibilityLabel="Go back"
            size={40}
            onPress={close}
          />
          <Txt variant="caption" muted style={[styles.eyebrow, { flex: 1 }]}>
            TASK DETAIL
          </Txt>
          <IconButton
            icon={<Trash2 size={15} color={status.danger.solid} />}
            accessibilityLabel="Delete task"
            size={40}
            onPress={() => setConfirmDelete(true)}
          />
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
          {/*
            Carries the category's OWN icon rather than a generic pin. Once the
            user picks the icon, it is the fastest thing on the card to
            recognise — faster than reading the word next to it.
          */}
          <Chip
            label={category?.label ?? task.categoryId}
            icon={
              <TaskIcon
                name={category?.icon ?? 'Sparkles'}
                size={12}
                color={scheme.textSecondary}
              />
            }
          />
        </View>
        <View style={styles.chipRow}>
          <Chip
            label={overdue ? `Overdue · ${formatDue(task.dueAt, now)}` : formatDue(task.dueAt, now)}
            tone={overdue ? 'danger' : 'neutral'}
            icon={<CalendarDays size={12} color={overdue ? status.danger.solid : scheme.textSecondary} />}
          />
          <Chip
            label={`+${loadPercent(task)}% load · ${formatEstimate(task.estimateMin)}`}
            tone="success"
          />
          {/*
            The deadline says when this must be FINISHED; the plan says when it
            actually gets worked on. Those are different facts and the sheet
            used to show only the first, which is why a task due Friday read as
            a thing that happens on Friday.
          */}
          {span ? (
            <Chip
              label={`Plan · ${span}`}
              tone="info"
              icon={<Clock size={12} color={status.info.solid} />}
            />
          ) : null}
        </View>

        {/*
          ── Overdue: the place it actually gets resolved ─────────────────

          Overdue work no longer appears in Today's Focus. The scheduler stopped
          laying a missed deadline's steps across this afternoon, because doing
          so dressed a broken promise up as a plan — the rail opened with blocks
          that were already failures and the student ticked them in whatever
          order the app had invented.

          So a late task now has exactly two places it can be answered: the
          Rebalancer, which guarantees a proposal for every one of them, and
          here — the screen somebody lands on when they finally tap the thing
          they have been avoiding. Giving it a date is what puts it back on the
          plan, and this banner is the one control that does it.
        */}
        {overdue ? (
          <View style={[styles.overdueBanner, { backgroundColor: status.danger.bg }]}>
            <View style={styles.overdueHead}>
              <AlarmClock size={15} color={status.danger.fg} />
              <Txt variant="label" color={status.danger.fg} style={{ flex: 1 }}>
                Past its date — and off your plan until it has a new one
              </Txt>
            </View>
            <Txt variant="caption" color={status.danger.fg}>
              Pip will not schedule work behind its own deadline, and it will not move the date for
              you. Finish it, or say when it is really happening.
            </Txt>
            <Button
              label="Give it a new date"
              variant="secondary"
              size="sm"
              icon={<CalendarClock size={14} color={scheme.primary} />}
              onPress={() => setReassigning(true)}
            />
          </View>
        ) : null}

        {/*
          ── A recovery block's own control ───────────────────────────────

          A timed recovery task is not something you tick when you remember to;
          the passing of the time IS the task. Opening it from the Rebalancer
          starts the timer immediately, but somebody who accepted a nap this
          morning and came back to it this evening arrives HERE — and finding
          only a checkbox would mean the one thing the task is made of has no
          control anywhere on its own screen.
        */}
        {task.recovery ? (
          <View style={[styles.recoveryBanner, { backgroundColor: status.success.bg }]}>
            <View style={styles.overdueHead}>
              <Leaf size={15} color={status.success.fg} />
              <Txt variant="label" color={status.success.fg} style={{ flex: 1 }}>
                Recovery · +{task.recovery.lift} to {VITAL_LABEL[task.recovery.vitalId]} when done
              </Txt>
            </View>
            <Txt variant="caption" color={status.success.fg}>
              Takes {formatEstimate(task.estimateMin)} of your day and adds nothing to your
              pressure. Finishing it is what pays out.
            </Txt>
            {task.recovery.timerSec && !complete ? (
              <Button
                label={`Start the ${Math.round(task.recovery.timerSec / 60)}-minute timer`}
                variant="primary"
                size="sm"
                icon={<Timer size={14} color={scheme.onPrimary} />}
                onPress={() => router.push({ pathname: '/timer/[id]', params: { id: task.id } })}
              />
            ) : null}
          </View>
        ) : null}

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
            <Timeline
              slots={timeline}
              now={now}
              groupDays
              // Exactly one row carries the pill, and it is the first step that
              // is actually startable — not merely the first unticked one,
              // which could be locked behind unfinished work.
              nextId={next?.id ?? null}
              blockedBy={blockedBy}
              onToggle={(slot) => {
                Haptics.selectionAsync().catch(() => {});
                toggleSubtask(task.id, slot.subId);
              }}
              onDelegate={(slot) =>
                router.push({
                  pathname: '/delegate',
                  params: { taskId: task.id, subId: slot.subId },
                })
              }
            />
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
              ATTACHED FROM CAPTURE
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

      <ReassignSheet
        task={reassigning ? task : null}
        now={now}
        onClose={() => setReassigning(false)}
        onPick={(to) => {
          const previous = task.dueAt;
          patchTask(task.id, {
            dueAt: to.toISOString(),
            // Counted like any other deferral. A task that keeps being re-dated
            // is one that is not going to happen, and the Rebalancer reads this
            // to stop offering it a fourth date.
            postponedFrom: previous,
            postponeCount: (task.postponeCount ?? 0) + 1,
          });
          setReassigning(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          toast(`Now due ${formatDue(to.toISOString(), now)} · back on your plan`, 'success', {
            label: 'Undo',
            run: () =>
              patchTask(task.id, {
                dueAt: previous,
                postponedFrom: task.postponedFrom ?? null,
                postponeCount: task.postponeCount ?? 0,
              }),
          });
        }}
      />

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
    </Screen>
  );
}

/** Attachment kind → the icon that stands in when there is no thumbnail. */
const ATTACHMENT_ICON: Record<NonNullable<Resource['attachmentKind']>, typeof FileText> = {
  image: ImageIcon,
  video: Video,
  audio: Music,
  document: FileText,
};

/**
 * One thing carried in from the capture that produced this task.
 *
 * This row used to be a grey page icon, a filename and a toast that said file
 * storage was not connected — which was true of the *storage* and quietly
 * untrue of the file, because the picker had put a real local `uri` on the
 * attachment and the commit threw it away. A student who photographed a
 * whiteboard and said one sentence about it got a task carrying the photo's
 * name and no photo.
 *
 * Now the row renders what the thing actually is: image attachments show
 * themselves, audio and video say how long they run, and anything with a `uri`
 * opens. Seeded resources and the voice-note placeholder have no `uri`, so they
 * render as an honest non-openable row rather than a button that lies.
 */
function ResourceRow({ resource }: { resource: Resource }) {
  const scheme = useScheme();
  const { toast } = useApp();

  const Icon = resource.attachmentKind ? ATTACHMENT_ICON[resource.attachmentKind] : FileText;
  const openable = Boolean(resource.uri);

  const meta = [
    resource.kind,
    resource.durationSec !== undefined ? formatDuration(resource.durationSec) : null,
    resource.size !== '—' ? resource.size : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const open = () => {
    if (!resource.uri) {
      toast('Nothing stored for this one — it is listed for the record', 'neutral');
      return;
    }
    /*
     * `openURL`, not a bundled viewer.
     *
     * The `uri` is the picker's own cache copy on this device, so handing it to
     * the OS is both the honest thing and the working one: whatever app already
     * owns that file type opens it. A viewer of our own would be re-implementing
     * the photo roll badly, and would still fail on the formats it did not know.
     */
    Linking.openURL(resource.uri).catch(() =>
      toast('Nothing on this device can open that file', 'warning'),
    );
  };

  return (
    <Interactive
      accessibilityRole="button"
      accessibilityLabel={`${resource.name}, ${meta}`}
      accessibilityHint={openable ? 'Opens the file' : 'Listed for the record — no file stored'}
      onPress={open}
      radius="md"
      style={[styles.resource, { borderColor: scheme.border }]}
    >
      <View style={[styles.resourceIcon, { backgroundColor: scheme.surfaceAlt }]}>
        {resource.attachmentKind === 'image' && resource.uri ? (
          <Image source={{ uri: resource.uri }} style={styles.resourceThumb} resizeMode="cover" />
        ) : (
          <Icon size={15} color={scheme.textSecondary} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Txt variant="bodySm" numberOfLines={1}>
          {resource.name}
        </Txt>
        <Txt variant="caption" muted>
          {meta}
        </Txt>
      </View>
      {!openable ? null : resource.external ? (
        <ExternalLink size={16} color={scheme.textMuted} />
      ) : (
        <Download size={16} color={scheme.textMuted} />
      )}
    </Interactive>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: space[6] },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1.5],
    marginLeft: -space[2],
    marginBottom: space[1],
  },
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

  subBox: { borderWidth: 1, borderRadius: radius.md, padding: space[3], paddingBottom: 0 },

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
    overflow: 'hidden',
  },
  resourceThumb: { width: '100%', height: '100%' },

  overdueBanner: { gap: space[2], padding: space[3], borderRadius: radius.md, marginTop: space[4] },
  recoveryBanner: { gap: space[2], padding: space[3], borderRadius: radius.md, marginTop: space[4] },
  overdueHead: { flexDirection: 'row', alignItems: 'center', gap: space[2] },

  pipNote: {
    marginTop: space[6],
    padding: space[3.5],
    borderRadius: radius.md,
    gap: space[1.5],
  },
  pipNoteHead: { flexDirection: 'row', alignItems: 'center', gap: space[1.5] },

  /** Screen renders the footer outside its padded content, so it pads itself. */
  footer: { paddingHorizontal: space[4], paddingTop: space[3], paddingBottom: space[2] },
});
