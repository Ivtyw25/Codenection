import { useCallback, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Keyboard, Mic, X } from 'lucide-react-native';

import { VoiceRecorder } from '@/components/app';
import { Button, Chip, IconButton, Txt } from '@/components/ui';
import { MIN_CAPTURE } from '@/data/api';
import { useApp } from '@/store/AppStore';
import { space, type, useScheme } from '@/theme';
import type { CaptureKind } from '@/types';

const MAX_CAPTURE = 600;

/**
 * Capture — the brain-dump canvas.
 *
 * One job: get a thought out of your head and into the Inbox. There is no
 * parsing here, no context, no due date, no estimate, and no "process now".
 * Everything this screen used to do at the moment of capture now happens later
 * and in bulk from `/inbox`, because deciding what a thought *is* costs more
 * attention than writing it down and the two should not be charged together.
 *
 * Full-screen rather than a sheet: it covers the tab bar and whatever you were
 * doing, which is the whole point of "distraction-free".
 */
export default function CaptureScreen() {
  const router = useRouter();
  const scheme = useScheme();
  const insets = useSafeAreaInsets();

  const params = useLocalSearchParams<{ draft?: string; from?: string }>();
  const { capture, discardCaptures, toast } = useApp();

  const [kind, setKind] = useState<CaptureKind>('text');
  const [text, setText] = useState(params.draft ?? '');
  /** Set once a voice pass produces a transcript, so the note records its length. */
  const [durationSec, setDurationSec] = useState<number | undefined>(undefined);

  const inputRef = useRef<TextInput>(null);

  const trimmed = text.trim();
  const tooShort = trimmed.length < MIN_CAPTURE;
  const editing = !!params.from;

  const save = useCallback(() => {
    if (tooShort) return;
    capture(trimmed, kind, durationSec);
    // Re-saving an edited note replaces it rather than duplicating it.
    if (params.from) discardCaptures([params.from]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    toast(editing ? 'Capture updated' : 'Saved to your inbox', 'success');
    router.back();
  }, [tooShort, trimmed, kind, durationSec, capture, params.from, discardCaptures, editing, toast, router]);

  const onTranscript = useCallback((transcript: string, seconds: number) => {
    setText((current) => (current ? `${current}. ${transcript}` : transcript));
    setDurationSec(seconds);
    // A transcript is a draft, not a result — hand it straight to the editor.
    setKind('voice');
  }, []);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: scheme.ground }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ── Chrome: an exit and nothing else ──────────────────────────────── */}
      <View style={[styles.head, { paddingTop: insets.top + space[2] }]}>
        <IconButton
          icon={<X size={20} color={scheme.textSecondary} />}
          accessibilityLabel="Close without saving"
          size={38}
          onPress={() => router.back()}
        />

        <View style={styles.modes}>
          <Chip
            label="Type"
            icon={<Keyboard size={12} color={kind === 'text' ? scheme.onPrimary : scheme.textSecondary} />}
            selected={kind === 'text'}
            onPress={() => {
              setKind('text');
              inputRef.current?.focus();
            }}
          />
          <Chip
            label="Voice"
            icon={<Mic size={12} color={kind === 'voice' ? scheme.onPrimary : scheme.textSecondary} />}
            selected={kind === 'voice'}
            onPress={() => setKind('voice')}
          />
        </View>
      </View>

      {/* ── Canvas ────────────────────────────────────────────────────────── */}
      {kind === 'voice' && trimmed.length === 0 ? (
        <VoiceRecorder onTranscript={onTranscript} />
      ) : (
        <View style={styles.canvas}>
          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={setText}
            placeholder="What's on your mind?"
            placeholderTextColor={scheme.textDisabled}
            multiline
            autoFocus
            maxLength={MAX_CAPTURE}
            textAlignVertical="top"
            accessibilityLabel="Capture note"
            style={[styles.input, type.h3, { color: scheme.text }]}
          />
        </View>
      )}

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + space[4], borderTopColor: scheme.border }]}>
        <View style={styles.footerMeta}>
          <Txt variant="caption" muted style={{ flex: 1 }}>
            {tooShort
              ? 'Whatever comes out. Sort it later.'
              : 'Goes straight to your inbox — nothing is categorised yet.'}
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
          disabled={tooShort}
          disabledReason="Write a few more words first"
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
    justifyContent: 'space-between',
    paddingHorizontal: space[4],
    paddingBottom: space[3],
  },
  modes: { flexDirection: 'row', gap: space[2] },

  canvas: { flex: 1, paddingHorizontal: space[5] },
  input: { flex: 1, paddingTop: space[2], lineHeight: 30 },

  footer: {
    paddingHorizontal: space[4],
    paddingTop: space[3],
    gap: space[3],
    borderTopWidth: 1,
  },
  footerMeta: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
});
