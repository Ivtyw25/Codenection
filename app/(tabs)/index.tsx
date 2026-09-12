import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Bell, ChevronRight, Flame, Leaf } from 'lucide-react-native';

import { Card, Checkbox, Chip, ProgressBar, Txt } from '@/components/ui';
import { PIP_BASE } from '@/data/shop';
import { PIP, TASKS, USER_NAME } from '@/data/mock';
import { brand, n, radius, space, status, useScheme } from '@/theme';
import type { Task } from '@/types';

/**
 * Home — the daily landing screen.
 *
 * The forest header is the system's spine colour carrying a full-bleed surface;
 * everything below it sits on the light ground in cards. That contrast is the
 * screen's whole structure, so the header keeps its own fixed dark palette in
 * both themes rather than inverting with the scheme.
 */
export default function HomeScreen() {
  const scheme = useScheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { capacity, state, streakDays } = PIP;

  return (
    <View style={{ flex: 1, backgroundColor: scheme.ground }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: space[10] }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Forest header ─────────────────────────────────────────────── */}
        <View style={[styles.header, { paddingTop: insets.top + space[2] }]}>
          <View style={styles.headerTop}>
            <View style={styles.brandRow}>
              <Txt variant="h3" color={n[0]}>
                pip
              </Txt>
              <Leaf size={16} color={brand.lime} />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Notifications"
              style={[styles.iconButton, { borderColor: 'rgba(255,255,255,0.18)' }]}
            >
              <Bell size={18} color={n[0]} />
            </Pressable>
          </View>

          <View style={styles.greetRow}>
            <View style={styles.greetText}>
              <Txt variant="bodySm" color="rgba(255,255,255,0.72)">
                Good morning,
              </Txt>
              <Txt variant="h1" color={n[0]}>
                {USER_NAME}
              </Txt>
              <Txt variant="bodySm" color="rgba(255,255,255,0.62)">
                Small steps, big progress.
              </Txt>
            </View>
            <Image source={PIP_BASE} style={styles.mascot} resizeMode="contain" />
          </View>
        </View>

        {/* ── State + capacity ──────────────────────────────────────────── */}
        <View style={styles.body}>
          <Card elevated style={styles.stateCard}>
            <View style={styles.stateHead}>
              <View style={[styles.stateBadge, { backgroundColor: status.success.bg }]}>
                <Leaf size={16} color={status.success.solid} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt variant="caption" muted>
                  Pip&apos;s current state
                </Txt>
                <Txt variant="h3">{state.label}</Txt>
              </View>
            </View>

            <Gauge
              label="Pressure"
              value={capacity.pressure}
              tone="warning"
              hint={capacity.pressureNote}
            />
            <Gauge label="Vitality" value={capacity.vitality} tone="success" hint={capacity.vitalityNote} />
          </Card>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${streakDays} consecutive balanced days. View streak details.`}
            style={[styles.streak, { backgroundColor: scheme.surface, borderColor: scheme.border }]}
          >
            <Flame size={18} color={status.warning.solid} />
            <Txt variant="bodySm" style={{ flex: 1 }}>
              <Txt variant="bodySm" style={{ fontWeight: '600' }}>
                {streakDays} consecutive days
              </Txt>
              {` in a balanced state — your longest streak in a month!`}
            </Txt>
            <ChevronRight size={18} color={scheme.textMuted} />
          </Pressable>

          {/* ── Today's Focus ───────────────────────────────────────────── */}
          <View style={styles.sectionHead}>
            <Txt variant="h3">Today&apos;s Focus</Txt>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/tasks')}
              style={styles.viewAll}
            >
              <Txt variant="label" color={scheme.primary}>
                View all
              </Txt>
              <ChevronRight size={16} color={scheme.primary} />
            </Pressable>
          </View>

          {TASKS.map((task) => (
            <TaskRow key={task.id} task={task} onPress={() => router.push(`/task/${task.id}`)} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function Gauge({
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
  return (
    <View style={styles.gauge}>
      <View style={styles.gaugeRow}>
        <Txt variant="bodySm" muted style={styles.gaugeLabel}>
          {label}
        </Txt>
        <ProgressBar value={value} tone={tone} style={{ flex: 1 }} />
        <Txt variant="label" style={styles.gaugeValue}>
          {value}%
        </Txt>
      </View>
      <Txt variant="caption" muted>
        {hint}
      </Txt>
    </View>
  );
}

function TaskRow({ task, onPress }: { task: Task; onPress: () => void }) {
  const scheme = useScheme();
  const next = task.subtasks.find((s) => !s.done);
  const doneCount = task.subtasks.filter((s) => s.done).length;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={task.title}>
      <Card style={styles.taskCard}>
        <View style={styles.taskHead}>
          <Checkbox checked={task.done} onToggle={() => {}} accessibilityLabel={`Complete ${task.title}`} />
          <Txt variant="h4" style={{ flex: 1 }} numberOfLines={2}>
            {task.title}
          </Txt>
        </View>

        {next ? (
          <View style={[styles.subPreview, { backgroundColor: scheme.surfaceAlt }]}>
            <ChevronRight size={14} color={scheme.textMuted} />
            <Txt variant="bodySm" muted numberOfLines={1} style={{ flex: 1 }}>
              {next.title}
            </Txt>
          </View>
        ) : null}

        <View style={styles.taskMeta}>
          {task.tag ? <Chip label={task.tag} tone="success" size="sm" /> : null}
          <Chip label={task.due} size="sm" />
          <Chip label={task.estimate} size="sm" />
          {task.subtasks.length > 0 ? (
            <Chip label={`${doneCount}/${task.subtasks.length} subtasks`} size="sm" />
          ) : null}
          <Txt variant="caption" color={status.warning.fg}>
            +{task.loadDelta}% load
          </Txt>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: brand.forest,
    paddingHorizontal: space[5],
    paddingBottom: space[8],
    borderBottomLeftRadius: space[7],
    borderBottomRightRadius: space[7],
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetRow: { flexDirection: 'row', alignItems: 'center', marginTop: space[5] },
  greetText: { flex: 1, gap: space[0.5] },
  mascot: { width: 92, height: 92 },

  body: { paddingHorizontal: space[4], marginTop: -space[6], gap: space[3] },
  stateCard: { gap: space[3] },
  stateHead: { flexDirection: 'row', alignItems: 'center', gap: space[2.5] },
  stateBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },

  gauge: { gap: space[1] },
  gaugeRow: { flexDirection: 'row', alignItems: 'center', gap: space[2.5] },
  gaugeLabel: { width: 60 },
  gaugeValue: { width: 40, textAlign: 'right' },

  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2.5],
    padding: space[3.5],
    borderRadius: radius.lg,
    borderWidth: 1,
  },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space[2],
  },
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: space[0.5] },

  taskCard: { gap: space[2.5] },
  taskHead: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2.5] },
  subPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    paddingVertical: space[1.5],
    paddingHorizontal: space[2.5],
    borderRadius: radius.pill,
  },
  taskMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space[1.5] },
});
