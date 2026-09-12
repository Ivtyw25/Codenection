import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  CalendarClock,
  Image as ImageIcon,
  Leaf,
  Mic,
  Paperclip,
  Sparkles,
  Square,
  X,
} from 'lucide-react-native';

import { Button, Chip, IconButton, Input, Sheet, Spinner, Txt } from '@/components/ui';
import { MIN_CAPTURE, parseCapture, transcribe, processCapture } from '@/data/api';
import { loadPercent } from '@/data/derive';
import { formatDue, formatEstimate } from '@/data/format';
import { useApp } from '@/store/AppStore';
import { useNow } from '@/store/selectors';
import { radius, space, status, useScheme } from '@/theme';
import type { CaptureMode } from '@/types';

const MAX_CAPTURE = 400;

/**
 * SCR-20 — Capture Sheet. Raw thought in, structured task out.
 *
 * The frame shows a "Task Breakdown & Context" panel labelled "Parsed by Pip".
 * In the first rebuild that panel rendered a hard-coded task regardless of what
 * was typed. Here it runs the real extractor on every keystroke, so the preview
 * is the proposal — `Process now` only adds the latency and the failure mode.
 */
export default function CaptureScreen() {
  const router = useRouter();
  const scheme = useScheme();
  const now = useNow();

  const params = useLocalSearchParams<{ draft?: string; from?: string }>();
  const { saveForLater, discardCapture, setReview, toast } = useApp();

  const [mode, setMode] = useState<CaptureMode>('type');
  const [text, setText] = useState(params.draft ?? '');
  const [touched, setTouched] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = text.trim();
  const tooShort = trimmed.length < MIN_CAPTURE;
  // Errors only after the user has tried something — an empty field that opens
  // already red is a scold, not a validation.
  const fieldError = error ?? (touched && tooShort ? 'Add a few more words so Pip has something to work with.' : undefined);

  /** The live parse. Same function the async call runs. */
  const preview = useMemo(() => (tooShort ? null : parseCapture(text, now)), [text, tooShort, now]);

  const onRecord = useCallback(async () => {
    if (recording) return;
    setRecording(true);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      const transcript = await transcribe(3);
      setText((current) => (current ? `${current}. ${transcript}` : transcript));
      toast('Transcribed', 'success');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRecording(false);
    }
  }, [recording, toast]);

  const onProcess = useCallback(async () => {
    setTouched(true);
    if (tooShort) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }

    setProcessing(true);
    setError(null);
    try {
      const review = await processCapture(text, mode, now);
      setReview(review);
      if (params.from) discardCapture(params.from);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace('/review');
    } catch (e) {
      setError((e as Error).message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setProcessing(false);
    }
  }, [text, mode, now, tooShort, setReview, params.from, discardCapture, router]);

  const onSaveLater = useCallback(() => {
    if (tooShort) {
      router.back();
      return;
    }
    saveForLater(text, mode);
    toast('Saved to your inbox', 'neutral');
    router.back();
  }, [tooShort, text, mode, saveForLater, toast, router]);

  return (
    <Sheet visible onClose={() => router.back()} fullHeight>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.head}>
          <Txt variant="h3">What&apos;s on your mind?</Txt>
          <IconButton
            icon={<X size={18} color={scheme.textSecondary} />}
            accessibilityLabel="Close capture"
            size={32}
            tone="ghost"
            onPress={() => router.back()}
          />
        </View>

        {/* ── Input mode ────────────────────────────────────────────────── */}
        <View style={styles.modes}>
          <Chip
            label="Type note"
            icon={<Paperclip size={12} color={mode === 'type' ? scheme.onPrimary : scheme.textSecondary} />}
            selected={mode === 'type'}
            onPress={() => setMode('type')}
          />
          <Chip
            label="Voice record"
            icon={<Mic size={12} color={mode === 'voice' ? scheme.onPrimary : scheme.textSecondary} />}
            selected={mode === 'voice'}
            onPress={() => setMode('voice')}
          />
        </View>

        <Input
          value={text}
          onChangeText={(next) => {
            setText(next);
            if (error) setError(null);
          }}
          onBlur={() => setTouched(true)}
          placeholder="Brain-dump it here…"
          multiline
          maxLength={MAX_CAPTURE}
          showCount
          loading={recording}
          error={fieldError}
          helper={
            preview
              ? `Pip sees ${preview.proposed.length} task${preview.proposed.length === 1 ? '' : 's'}${preview.quickWin ? ' and a quick win' : ''}.`
              : 'Dates, times and context are picked up from the words you use.'
          }
          accessibilityLabel="Capture note"
        />

        {/* ── Tools ─────────────────────────────────────────────────────── */}
        <View style={styles.toolRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={recording ? 'Stop recording' : 'Record audio'}
            accessibilityState={{ busy: recording }}
            onPress={onRecord}
            style={[
              styles.tool,
              {
                borderColor: recording ? status.danger.solid : scheme.border,
                backgroundColor: recording ? status.danger.bg : 'transparent',
              },
            ]}
          >
            {recording ? (
              <Square size={14} color={status.danger.solid} fill={status.danger.solid} />
            ) : (
              <Mic size={16} color={status.success.solid} />
            )}
          </Pressable>

          <ToolButton
            icon={<ImageIcon size={16} color={scheme.textMuted} />}
            label="Add image"
            reason="Attachments arrive with the capture backend"
          />
          <ToolButton
            icon={<Paperclip size={16} color={scheme.textMuted} />}
            label="Attach file"
            reason="Attachments arrive with the capture backend"
          />

          {preview?.proposed[0]?.dueAt ? (
            <Chip
              label={`Due: ${formatDue(preview.proposed[0].dueAt, now)}`}
              tone="success"
              icon={<CalendarClock size={12} color={status.success.solid} />}
            />
          ) : (
            <Chip label="No date detected" icon={<CalendarClock size={12} color={scheme.textMuted} />} />
          )}
        </View>

        {recording ? (
          <View style={[styles.recording, { backgroundColor: status.danger.bg }]}>
            <Spinner size={14} color={status.danger.solid} />
            <Txt variant="caption" color={status.danger.fg} style={{ flex: 1 }}>
              Listening — this is a stub transcript, not a microphone.
            </Txt>
          </View>
        ) : null}

        {/* ── Live parse ────────────────────────────────────────────────── */}
        <View style={[styles.parsed, { borderColor: scheme.border }]}>
          <View style={styles.parsedHead}>
            <Txt variant="h4" style={{ flex: 1 }}>
              Task Breakdown &amp; Context
            </Txt>
            <Chip
              label={preview ? 'Auto-structured' : 'Waiting'}
              tone={preview ? 'success' : 'neutral'}
              size="sm"
            />
          </View>
          <Txt variant="caption" color={status.info.fg} style={{ marginBottom: space[2.5] }}>
            Parsed by Pip · updates as you type
          </Txt>

          {!preview ? (
            <Txt variant="bodySm" muted>
              Nothing to structure yet. Write at least a few words.
            </Txt>
          ) : (
            <View style={{ gap: space[3] }}>
              {preview.proposed.map((task) => (
                <View key={task.id} style={[styles.previewCard, { borderColor: scheme.border }]}>
                  <Txt variant="bodySm" style={styles.semibold} numberOfLines={2}>
                    {task.title}
                  </Txt>
                  <View style={styles.chipRow}>
                    <Chip label={task.context} size="sm" tone="success" />
                    <Chip label={formatDue(task.dueAt, now)} size="sm" />
                    <Chip label={formatEstimate(task.estimateMin)} size="sm" />
                    {task.calibrateLater ? <Chip label="Calibrate later" size="sm" tone="info" /> : null}
                  </View>
                  <Txt variant="caption" color={status.warning.fg}>
                    +{loadPercent(task)}% load
                  </Txt>

                  {task.subtasks.map((sub, i) => (
                    <View key={i} style={styles.subRow}>
                      <View style={[styles.bullet, { backgroundColor: scheme.borderStrong }]} />
                      <Txt variant="caption" muted style={{ flex: 1 }}>
                        {sub}
                      </Txt>
                    </View>
                  ))}
                </View>
              ))}

              {preview.quickWin ? (
                <View style={[styles.quick, { backgroundColor: status.warning.bg }]}>
                  <Sparkles size={14} color={status.warning.solid} />
                  <View style={{ flex: 1 }}>
                    <Txt variant="caption" color={status.warning.fg} style={styles.semibold}>
                      {preview.quickWin.title}
                    </Txt>
                    <Txt variant="caption" color={status.warning.fg}>
                      {preview.quickWin.note}
                    </Txt>
                  </View>
                </View>
              ) : null}
            </View>
          )}
        </View>

        {preview ? (
          <View style={[styles.pipNote, { backgroundColor: status.success.bg }]}>
            <Leaf size={14} color={status.success.solid} />
            <Txt variant="caption" color={status.success.fg} style={{ flex: 1 }}>
              <Txt variant="caption" color={status.success.fg} style={styles.semibold}>
                Pip&apos;s note:{' '}
              </Txt>
              Processing this earns {preview.sparksReward} Sparks. You can drop anything you
              don&apos;t want on the next screen.
            </Txt>
          </View>
        ) : null}
      </ScrollView>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <View style={styles.footer}>
        <Button
          label={processing ? 'Structuring…' : 'Process now'}
          fullWidth
          loading={processing}
          disabled={tooShort && touched}
          disabledReason="Write a few more words first"
          icon={<Sparkles size={16} color={scheme.onPrimary} />}
          onPress={onProcess}
        />
        <Pressable onPress={onSaveLater} accessibilityRole="button" style={styles.saveLater}>
          <Txt variant="label" muted>
            {tooShort ? 'Discard' : 'Save for later'}
          </Txt>
        </Pressable>
      </View>
    </Sheet>
  );
}

/**
 * A tool the design shows but the build cannot honour yet.
 *
 * Rendered disabled with a stated reason rather than removed: the frame's row
 * of four is part of how the sheet reads, and a control that silently does
 * nothing is worse than one that says why it can't.
 */
function ToolButton({ icon, label, reason }: { icon: React.ReactNode; label: string; reason: string }) {
  const scheme = useScheme();
  const { toast } = useApp();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={reason}
      accessibilityState={{ disabled: true }}
      onPress={() => toast(reason, 'neutral')}
      style={[styles.tool, { borderColor: scheme.border, opacity: 0.45 }]}
    >
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: space[4] },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space[3],
  },
  modes: { flexDirection: 'row', gap: space[2], marginBottom: space[3] },
  semibold: { fontWeight: '600' },

  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    flexWrap: 'wrap',
    marginTop: space[3],
  },
  tool: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recording: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    marginTop: space[3],
    padding: space[3],
    borderRadius: radius.md,
  },

  parsed: { marginTop: space[5], padding: space[3.5], borderWidth: 1, borderRadius: radius.lg },
  parsedHead: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  previewCard: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space[3],
    gap: space[2],
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[1.5] },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  bullet: { width: 5, height: 5, borderRadius: radius.pill },
  quick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    padding: space[3],
    borderRadius: radius.md,
  },

  pipNote: {
    flexDirection: 'row',
    gap: space[2],
    marginTop: space[4],
    padding: space[3],
    borderRadius: radius.md,
  },

  footer: { gap: space[2], paddingTop: space[3] },
  saveLater: { alignSelf: 'center', paddingVertical: space[2] },
});
