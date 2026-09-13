import { useCallback, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { FileUp, Images, Music, RotateCcw, X } from 'lucide-react-native';

import { AttachmentTray, VoiceRecorder } from '@/components/app';
import { Button, IconButton, SegmentedTabs, Txt } from '@/components/ui';
import { MIN_CAPTURE } from '@/data/api';
import { useAttachments } from '@/data/attachments';
import { useApp } from '@/store/AppStore';
import { space, status, type, useScheme } from '@/theme';
import type { CaptureKind } from '@/types';

const MAX_CAPTURE = 600;

const TABS: { value: CaptureKind; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'voice', label: 'Voice' },
];

/**
 * Capture — the brain-dump canvas.
 *
 * One job: get a thought out of your head and into the Inbox. There is no
 * parsing here, no context, no due date, no estimate, and no "process now".
 * Everything this screen used to do at the moment of capture now happens later
 * and in bulk from `/inbox`, because deciding what a thought *is* costs more
 * attention than writing it down and the two should not be charged together.
 *
 * Two tabs, one output. Text and Voice are different ways of producing the same
 * primary entry — the transcript lands in the same field the Text tab edits —
 * and attachments are available from both, because which mode you happened to
 * use has no bearing on whether a photo of the whiteboard belongs with it.
 *
 * Full-screen rather than a sheet: it covers the tab bar and whatever you were
 * doing, which is the whole point of "distraction-free".
 */
export default function CaptureScreen() {
  const router = useRouter();
  const scheme = useScheme();
  const insets = useSafeAreaInsets();

  const params = useLocalSearchParams<{ draft?: string; from?: string; launch?: string }>();
  const { data, capture, discardCaptures, toast } = useApp();

  /**
   * True when this is the screen the app opened on, rather than one pushed
   * from the tab bar. Capture is the launch destination precisely so the first
   * thing anyone meets is somewhere to put a thought down — Home's timeline,
   * vitals and week stats are a lot to parse before you have even said what is
   * on your mind.
   */
  const launched = params.launch === '1';

  /*
   * Re-opening a note from the Inbox has to restore what was attached to it.
   * Seeding the tray from the existing note is the difference between "edit"
   * and "silently drop the files and keep the words".
   */
  const editingNote = params.from ? data.inbox.find((n) => n.id === params.from) : undefined;

  /*
   * Launching lands on Voice, not Text. Opening straight into a keyboard is
   * "type something now"; opening onto Pip is an invitation, and speaking is
   * the lower-effort way to get a thought out when you have not yet decided
   * what the thought is. The + button keeps its Text default — by then you
   * have chosen to capture and the keyboard is what you want.
   */
  const [tab, setTab] = useState<CaptureKind>(
    editingNote?.kind ?? (launched ? 'voice' : 'text'),
  );
  const [text, setText] = useState(params.draft ?? '');
  /** Set once a voice pass produces a transcript, so the note records its length. */
  const [durationSec, setDurationSec] = useState<number | undefined>(editingNote?.durationSec);
  const [saving, setSaving] = useState(false);

  const files = useAttachments(editingNote?.attachments);
  const inputRef = useRef<TextInput>(null);

  const trimmed = text.trim();
  const tooShort = trimmed.length < MIN_CAPTURE;
  const editing = !!params.from;

  /**
   * Leaving the screen.
   *
   * The launch instance is *pushed* over the tabs rather than replacing them,
   * so Back already lands on Home. The fallback covers the case where there is
   * genuinely nothing beneath — a cold deep link straight to `/capture` — so
   * that closing is never a dead end with no way back into the app.
   */
  const dismiss = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }, [router]);

  /**
   * Attachments are *supporting* context, so they do not substitute for the
   * entry itself — a bundle of files with nothing said about them is a folder,
   * not a thought. The primary entry is what gates the save.
   */
  const canSave = !tooShort && !saving;

  const save = useCallback(() => {
    if (!canSave) return;
    setSaving(true);

    // The entry and every attachment go in as ONE item. Nothing is parsed,
    // categorised, or turned into a task here.
    capture(trimmed, tab, { durationSec, attachments: files.attachments });
    if (params.from) discardCaptures([params.from]);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const count = files.attachments.length;
    toast(
      editing
        ? 'Capture updated'
        : count > 0
          ? `Saved to your inbox with ${count} ${count === 1 ? 'file' : 'files'}`
          : 'Saved to your inbox',
      'success',
    );
    setSaving(false);
    dismiss();
  }, [
    canSave,
    trimmed,
    tab,
    durationSec,
    files.attachments,
    capture,
    params.from,
    discardCaptures,
    editing,
    toast,
    dismiss,
  ]);

  const onTranscript = useCallback((transcript: string, seconds: number) => {
    setText((current) => (current ? `${current}. ${transcript}` : transcript));
    setDurationSec(seconds);
  }, []);

  /** Voice has produced something; show the transcript rather than the recorder. */
  const hasTranscript = tab === 'voice' && trimmed.length > 0;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: scheme.ground }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ── Chrome: an exit and the two tabs ──────────────────────────────── */}
      <View style={[styles.head, { paddingTop: insets.top + space[2] }]}>
        <IconButton
          icon={<X size={20} color={scheme.textSecondary} />}
          accessibilityLabel="Close without saving"
          size={38}
          onPress={dismiss}
        />
        <View style={styles.tabs}>
          <SegmentedTabs
            options={TABS}
            value={tab}
            onChange={(next) => {
              setTab(next);
              if (next === 'text') inputRef.current?.focus();
            }}
            scrollable={false}
          />
        </View>
        {/* Balances the close button so the tabs sit centred. */}
        <View style={styles.headSpacer} />
      </View>

      {/* ── Canvas ────────────────────────────────────────────────────────── */}
      {tab === 'voice' && !hasTranscript ? (
        <VoiceRecorder onTranscript={onTranscript} />
      ) : (
        <View style={styles.canvas}>
          {hasTranscript ? (
            <View style={styles.transcriptBar}>
              <Txt variant="caption" color={status.success.fg} style={{ flex: 1 }}>
                Transcribed — edit it however you like before saving.
              </Txt>
              <Button
                label="Record again"
                variant="ghost"
                size="sm"
                icon={<RotateCcw size={13} color={scheme.primary} />}
                onPress={() => {
                  setText('');
                  setDurationSec(undefined);
                }}
              />
            </View>
          ) : null}

          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={setText}
            placeholder="What's on your mind?"
            placeholderTextColor={scheme.textMuted}
            multiline
            autoFocus={tab === 'text'}
            maxLength={MAX_CAPTURE}
            textAlignVertical="top"
            accessibilityLabel="Capture note"
            style={[styles.input, type.h3, { color: scheme.text }]}
          />
        </View>
      )}

      {/* ── Attachments — available from both tabs ────────────────────────── */}
      <ScrollView
        style={styles.attachArea}
        contentContainerStyle={styles.attachContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.attachRow}>
          <Button
            label="Files"
            variant="secondary"
            size="sm"
            icon={<FileUp size={14} color={scheme.text} />}
            loading={files.picking}
            onPress={files.addDocuments}
          />
          <Button
            label="Photos"
            variant="secondary"
            size="sm"
            icon={<Images size={14} color={scheme.text} />}
            loading={files.picking}
            onPress={files.addMedia}
          />
          <Button
            label="Audio"
            variant="secondary"
            size="sm"
            icon={<Music size={14} color={scheme.text} />}
            loading={files.picking}
            onPress={files.addAudio}
          />
        </View>

        {files.error ? (
          <Txt variant="caption" color={status.danger.fg} style={{ marginTop: space[2] }}>
            {files.error}
          </Txt>
        ) : null}

        <View style={{ marginTop: space[3] }}>
          <AttachmentTray
            attachments={files.attachments}
            onRemove={files.remove}
            disabled={saving}
          />
        </View>
      </ScrollView>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + space[4], borderTopColor: scheme.border },
        ]}
      >
        <View style={styles.footerMeta}>
          <Txt variant="caption" muted style={{ flex: 1 }}>
            {tooShort
              ? 'Whatever comes out. Sort it later.'
              : 'Saved as one raw item — nothing is categorised yet.'}
          </Txt>
          {text.length > 0 ? (
            <Txt variant="caption" muted>
              {text.length} / {MAX_CAPTURE}
            </Txt>
          ) : null}
        </View>

        <Button
          label={editing ? 'Save changes' : 'Save to inbox'}
          fullWidth
          loading={saving}
          disabled={tooShort}
          disabledReason={
            tab === 'voice'
              ? 'Record something, or switch to Text and type it'
              : 'Write a few more words first'
          }
          onPress={save}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space[4],
    paddingBottom: space[3],
  },
  tabs: { flex: 1, alignItems: 'center' },
  headSpacer: { width: 38 },

  canvas: { flex: 1, paddingHorizontal: space[5] },
  transcriptBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingBottom: space[2],
  },
  input: { flex: 1, paddingTop: space[2], lineHeight: 30 },

  attachArea: { maxHeight: 260, flexGrow: 0 },
  attachContent: { paddingHorizontal: space[4], paddingBottom: space[3] },
  attachRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },

  footer: {
    paddingHorizontal: space[4],
    paddingTop: space[3],
    gap: space[3],
    borderTopWidth: 1,
  },
  footerMeta: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
});
