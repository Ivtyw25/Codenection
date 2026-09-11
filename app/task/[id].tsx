import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  CalendarDays,
  Download,
  ExternalLink,
  FileText,
  Leaf,
  MapPin,
  Plus,
  X,
} from 'lucide-react-native';

import { Checkbox, Chip, EmptyState, Sheet, Txt } from '@/components/ui';
import { TASKS } from '@/data/mock';
import { radius, space, status, useScheme } from '@/theme';
import type { Resource, SubTask } from '@/types';

/** Task Detail — opens as a bottom sheet over the Manifest. */
export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scheme = useScheme();

  const task = TASKS.find((t) => t.id === id);
  const close = () => router.back();

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

  const doneCount = task.subtasks.filter((s) => s.done).length;

  return (
    <Sheet visible onClose={close} fullHeight>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* ── Head ──────────────────────────────────────────────────────── */}
        <View style={styles.head}>
          <Txt variant="caption" muted style={styles.eyebrow}>
            TASK DETAIL
          </Txt>
          <Pressable
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel="Close task detail"
            hitSlop={12}
            style={[styles.close, { backgroundColor: scheme.surfaceAlt }]}
          >
            <X size={16} color={scheme.textSecondary} />
          </Pressable>
        </View>

        <Txt variant="h2">{task.title}</Txt>
        <Txt variant="bodySm" muted style={{ marginTop: space[1] }}>
          Tap title to edit
        </Txt>

        <View style={styles.chipRow}>
          {task.tag ? <Chip label={task.tag} tone="success" /> : null}
          <Chip label={task.context} icon={<MapPin size={12} color={scheme.textSecondary} />} />
        </View>
        <View style={styles.chipRow}>
          <Chip label={task.due} icon={<CalendarDays size={12} color={scheme.textSecondary} />} />
          <Chip label={`+${task.loadDelta}% load · ${task.estimate}`} tone="success" />
        </View>

        {/* ── Sub-tasks ─────────────────────────────────────────────────── */}
        <View style={styles.sectionHead}>
          <Txt variant="h4">
            Sub-tasks ({doneCount} of {task.subtasks.length} complete)
          </Txt>
          <Pressable accessibilityRole="button" style={styles.addStep} hitSlop={8}>
            <Plus size={14} color={scheme.primary} />
            <Txt variant="label" color={scheme.primary}>
              Add step
            </Txt>
          </Pressable>
        </View>

        <View style={[styles.subBox, { borderColor: scheme.border }]}>
          {task.subtasks.map((s, i) => (
            <SubTaskRow key={s.id} sub={s} last={i === task.subtasks.length - 1} />
          ))}
        </View>

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
              {task.resources.map((r) => (
                <ResourceRow key={r.id} resource={r} />
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
    </Sheet>
  );
}

function SubTaskRow({ sub, last }: { sub: SubTask; last: boolean }) {
  const scheme = useScheme();
  return (
    <View
      style={[
        styles.subRow,
        !last && { borderBottomWidth: 1, borderBottomColor: scheme.border },
      ]}
    >
      <Checkbox checked={sub.done} onToggle={() => {}} label={sub.title} />
      <Txt variant="bodySm" style={{ flex: 1 }} numberOfLines={2}>
        {sub.title}
      </Txt>
      {sub.nextAction ? <Chip label="Next Action" tone="success" variant="filled" size="sm" /> : null}
    </View>
  );
}

function ResourceRow({ resource }: { resource: Resource }) {
  const scheme = useScheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${resource.name}, ${resource.kind}, ${resource.size}`}
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: space[8] },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { letterSpacing: 1.2 },
  close: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[1.5], marginTop: space[2.5] },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space[6],
    marginBottom: space[2.5],
  },
  sectionTitle: { marginTop: space[6], marginBottom: space[2.5] },
  addStep: { flexDirection: 'row', alignItems: 'center', gap: space[1] },

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
});
