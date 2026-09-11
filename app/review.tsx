import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CalendarDays, CheckCircle2, Info, Sparkles, X, Zap } from 'lucide-react-native';

import { Button, Chip, Txt } from '@/components/ui';
import { PIP_BASE } from '@/data/shop';
import { REVIEW } from '@/data/mock';
import { radius, space, status, useScheme } from '@/theme';
import type { ProposedTask } from '@/types';

const LOAD_LABEL: Record<ProposedTask['load'], string> = {
  low: 'Low Load',
  medium: 'Medium',
  high: 'High Load',
};

/** SCR-21 — AI Processing Review. Confirm what Pip extracted before committing. */
export default function ReviewScreen() {
  const router = useRouter();
  const scheme = useScheme();
  const [dropped, setDropped] = useState<string[]>([]);
  const [quickDone, setQuickDone] = useState(false);

  const proposed = REVIEW.proposed.filter((p) => !dropped.includes(p.id));

  return (
    <View style={[styles.root, { backgroundColor: scheme.scrim }]}>
      <View style={[styles.sheet, { backgroundColor: scheme.surface }]}>
        <View style={[styles.handle, { backgroundColor: scheme.borderStrong }]} />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* ── Head ────────────────────────────────────────────────────── */}
          <View style={styles.head}>
            <Image source={PIP_BASE} style={styles.mascot} resizeMode="contain" />
            <View style={{ flex: 1, gap: space[1] }}>
              <Chip
                label={`${proposed.length} tasks extracted`}
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
              Tap title to edit
            </Txt>
          </View>

          {proposed.map((p) => (
            <ProposedCard key={p.id} task={p} onDrop={() => setDropped((d) => [...d, p.id])} />
          ))}

          {/* ── 2-minute rule ───────────────────────────────────────────── */}
          {REVIEW.quickWin ? (
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
                <Pressable
                  onPress={() => setQuickDone((v) => !v)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: quickDone }}
                  accessibilityLabel={REVIEW.quickWin.title}
                  style={[styles.quickRing, { borderColor: status.warning.solid }]}
                >
                  {quickDone ? (
                    <CheckCircle2 size={16} color={status.warning.solid} />
                  ) : null}
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Txt variant="bodySm">{REVIEW.quickWin.title}</Txt>
                  <Txt variant="caption" color={status.warning.fg}>
                    {REVIEW.quickWin.note}
                  </Txt>
                </View>
                <Button
                  label="Done"
                  variant="secondary"
                  size="sm"
                  onPress={() => setQuickDone(true)}
                />
              </View>
            </>
          ) : null}

          {/* ── Budget ──────────────────────────────────────────────────── */}
          <View style={[styles.budget, { backgroundColor: scheme.surfaceAlt }]}>
            <View style={[styles.budgetDot, { backgroundColor: status.success.solid }]} />
            <Txt variant="caption" muted style={{ flex: 1 }}>
              Fits today&apos;s remaining cognitive budget ({REVIEW.budgetRemaining}% left)
            </Txt>
            <Txt variant="caption" color={status.warning.fg}>
              +{REVIEW.sparksReward} Sparks
            </Txt>
          </View>
        </ScrollView>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <View style={styles.footer}>
          <Button
            label={`Add ${proposed.length} task${proposed.length === 1 ? '' : 's'}`}
            fullWidth
            disabled={proposed.length === 0}
            icon={<CheckCircle2 size={16} color={scheme.onPrimary} />}
            onPress={() => router.replace('/tasks')}
          />
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            style={styles.editMore}
          >
            <Txt variant="label" muted>
              Edit more
            </Txt>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function ProposedCard({ task, onDrop }: { task: ProposedTask; onDrop: () => void }) {
  const scheme = useScheme();

  return (
    <View style={[styles.card, { borderColor: scheme.border }]}>
      <View style={styles.cardHead}>
        <Txt variant="h4" style={{ flex: 1 }}>
          {task.title}
        </Txt>
        <Pressable
          onPress={onDrop}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${task.title}`}
          hitSlop={10}
        >
          <X size={16} color={scheme.textMuted} />
        </Pressable>
      </View>

      <View style={styles.chipRow}>
        <Chip label={task.context} size="sm" tone="success" />
        <Chip label={task.due} size="sm" icon={<CalendarDays size={11} color={scheme.textSecondary} />} />
        <Chip
          label={`${LOAD_LABEL[task.load]} · ${task.estimate}`}
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
          {task.subtasks.map((s) => (
            <View key={s} style={styles.subRow}>
              <View style={[styles.radio, { borderColor: scheme.borderStrong }]} />
              <Txt variant="bodySm" muted style={{ flex: 1 }}>
                {s}
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
  mascot: { width: 52, height: 52 },

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
  quickRing: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

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
  editMore: { alignSelf: 'center', paddingVertical: space[2] },
});
