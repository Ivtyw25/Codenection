/**
 * SCR-20 — Capture (bottom sheet).
 * Route `/capture` · Goal: frictionless mind-dump.
 *
 * Capture NEVER asks the student to categorise, prioritise or structure
 * anything — that is the entire point. One inbox item is one brain-dump about
 * one thing, and it may carry typed text, a screenshot and a voice note from
 * the same session (§B.1).
 */

import { useEffect, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';

import { Button, Chip, DragHandle, SheetFooter, SheetShell, Txt } from '@/components/ui';
import {
  colors,
  MIN_TAP_TARGET,
  radius,
  SCREEN_PADDING,
  space,
  type as typeScale,
} from '@/theme';

type Attachment = { id: string; label: string; icon: React.ComponentProps<typeof Feather>['name'] };

export default function CaptureScreen() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [transcribing, setTranscribing] = useState(false);

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  function stopRecording() {
    setRecording(false);
    setSeconds(0);
    setTranscribing(true);
    // Original audio is retained until the transcription is confirmed.
    setTimeout(() => {
      setTranscribing(false);
      setAttachments((a) => [...a, { id: `v${Date.now()}`, label: 'Voice note', icon: 'mic' }]);
    }, 1200);
  }

  const canProcess = text.trim().length > 0 || attachments.length > 0;

  return (
    <SheetShell height={0.92}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING, paddingBottom: space[4] }}
        keyboardShouldPersistTaps="handled"
      >
        <DragHandle />

        <Txt variant="h3" style={{ marginBottom: space[3] }}>
          What&apos;s on your mind?
        </Txt>

        <TextInput
          accessibilityLabel="Mind dump"
          value={text}
          onChangeText={setText}
          autoFocus
          multiline
          placeholder="Dump it all here — one thing or ten. I'll sort it out."
          placeholderTextColor={colors.textDisabled}
          style={[
            typeScale.bodyLg,
            {
              minHeight: 120,
              backgroundColor: colors.card,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.border,
              padding: space[3],
              color: colors.text,
              textAlignVertical: 'top',
            },
          ]}
        />

        {/* Attachment row, or the recording UI that replaces it. */}
        {recording ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space[3],
              marginTop: space[4],
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Stop recording"
              onPress={stopRecording}
              style={{
                width: MIN_TAP_TARGET,
                height: MIN_TAP_TARGET,
                borderRadius: radius.full,
                backgroundColor: colors.semantic.destructive.solid,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Feather name="square" size={18} color={colors.onFill} />
            </Pressable>

            {/* Waveform stand-in. */}
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              {Array.from({ length: 24 }).map((_, i) => (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 6 + ((i * 7) % 18),
                    borderRadius: radius.full,
                    backgroundColor: colors.semantic.destructive.fill,
                  }}
                />
              ))}
            </View>

            <Txt variant="numMd" color={colors.textSecondary}>
              0:{String(seconds).padStart(2, '0')}
            </Txt>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: space[3], marginTop: space[4] }}>
            <RoundAction icon="mic" label="Record a voice note" onPress={() => setRecording(true)} />
            <RoundAction
              icon="image"
              label="Add a screenshot"
              onPress={() =>
                setAttachments((a) => [
                  ...a,
                  { id: `i${Date.now()}`, label: 'Screenshot', icon: 'image' },
                ])
              }
            />
            <RoundAction
              icon="paperclip"
              label="Attach a file"
              onPress={() =>
                setAttachments((a) => [
                  ...a,
                  { id: `f${Date.now()}`, label: 'Attachment', icon: 'paperclip' },
                ])
              }
            />
          </View>
        )}

        {transcribing ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space[2],
              marginTop: space[3],
            }}
          >
            <Feather name="loader" size={16} color={colors.textSecondary} />
            <Txt variant="bodySm" color={colors.textSecondary}>
              Transcribing…
            </Txt>
          </View>
        ) : null}

        {attachments.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginTop: space[3] }}>
            {attachments.map((a) => (
              <Chip
                key={a.id}
                label={a.label}
                leading={<Feather name={a.icon} size={12} color={colors.textSecondary} />}
                onPress={() => setAttachments((cur) => cur.filter((x) => x.id !== a.id))}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>

      <SheetFooter>
        <Button
          label="Process now"
          disabled={!canProcess}
          onPress={() => router.replace('/capture/review')}
        />
        <Button
          label="Save for later"
          variant="text"
          disabled={!canProcess}
          onPress={() => router.back()}
        />
      </SheetFooter>
    </SheetShell>
  );
}

function RoundAction({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        width: MIN_TAP_TARGET,
        height: MIN_TAP_TARGET,
        borderRadius: radius.full,
        borderWidth: 1.5,
        borderColor: colors.actionQuiet,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Feather name={icon} size={18} color={colors.actionQuiet} />
    </Pressable>
  );
}
