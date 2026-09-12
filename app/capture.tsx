import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  CalendarClock,
  Image as ImageIcon,
  Leaf,
  Mic,
  Paperclip,
  Sparkles,
  X,
} from 'lucide-react-native';

import { Button, Checkbox, Chip, Input, Sheet, Txt } from '@/components/ui';
import { CAPTURE_DRAFT, TASKS } from '@/data/mock';
import { radius, space, status, useScheme } from '@/theme';

type Mode = 'type' | 'voice';

/** SCR-20 — Capture Sheet. Raw thought in, structured task out. */
export default function CaptureScreen() {
  const router = useRouter();
  const scheme = useScheme();
  const [mode, setMode] = useState<Mode>('type');
  const [text, setText] = useState(CAPTURE_DRAFT);

  // The sheet previews the structure Pip would extract. Task 1 is the worked
  // example the designs use.
  const preview = TASKS[0];
  const doneCount = preview.subtasks.filter((s) => s.done).length;

  return (
    <Sheet visible onClose={() => router.back()} fullHeight>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.head}>
          <Txt variant="h3">What&apos;s on your mind?</Txt>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Close capture"
            hitSlop={12}
          >
            <X size={18} color={scheme.textSecondary} />
          </Pressable>
        </View>

        {/* Input mode */}
        <View style={styles.modes}>
          <Chip
            label="Type note"
            icon={<Paperclip size={12} color={scheme.textSecondary} />}
            selected={mode === 'type'}
            onPress={() => setMode('type')}
          />
          <Chip
            label="Voice record"
            icon={<Mic size={12} color={scheme.textSecondary} />}
            selected={mode === 'voice'}
            onPress={() => setMode('voice')}
          />
        </View>

        <Input value={text} onChangeText={setText} placeholder="Brain-dump it here…" multiline />

        <View style={styles.inputMeta}>
          <View style={styles.speak}>
            <Mic size={13} color={status.success.solid} />
            <Txt variant="caption" color={status.success.fg}>
              Tap to speak
            </Txt>
          </View>
          <Txt variant="caption" muted style={{ flex: 1 }}>
            · {text.length} chars
          </Txt>
          <Pressable onPress={() => setText('')} accessibilityRole="button" hitSlop={8}>
            <Txt variant="caption" muted>
              Clear
            </Txt>
          </Pressable>
        </View>

        {/* Context row */}
        <View style={styles.sectionHead}>
          <Txt variant="h4">Context &amp; Due Date</Txt>
          <Txt variant="caption" color={status.info.fg}>
            Auto-detects from text
          </Txt>
        </View>

        <View style={styles.toolRow}>
          <ToolButton icon={<Mic size={16} color={status.success.solid} />} label="Record audio" />
          <ToolButton icon={<ImageIcon size={16} color={status.success.solid} />} label="Add image" />
          <ToolButton icon={<Paperclip size={16} color={status.success.solid} />} label="Attach file" />
          <Chip
            label="Due: Auto (Thu 5pm)"
            tone="success"
            icon={<CalendarClock size={12} color={status.success.solid} />}
          />
        </View>

        {/* Parsed preview */}
        <View style={[styles.parsed, { borderColor: scheme.border }]}>
          <View style={styles.parsedHead}>
            <Txt variant="h4" style={{ flex: 1 }}>
              Task Breakdown &amp; Context
            </Txt>
            <Chip label="Auto-structured" tone="success" size="sm" />
          </View>
          <Txt variant="caption" color={status.info.fg} style={{ marginBottom: space[2.5] }}>
            Parsed by Pip
          </Txt>

          <View style={styles.chipRow}>
            {preview.tag ? <Chip label={preview.tag} tone="success" size="sm" /> : null}
            <Chip label={preview.context} size="sm" />
            <Chip label={preview.due} tone="success" size="sm" />
          </View>
          <Txt variant="caption" color={status.warning.fg} style={{ marginTop: space[2] }}>
            +{preview.loadDelta}% load · {preview.estimate}
          </Txt>

          <View style={styles.subHead}>
            <Txt variant="caption" muted style={styles.eyebrow}>
              SUB-TASKS CHECKLIST
            </Txt>
            <Txt variant="caption" muted>
              {doneCount} OF {preview.subtasks.length} DONE
            </Txt>
          </View>

          {preview.subtasks.map((s) => (
            <View key={s.id} style={[styles.subRow, { borderColor: scheme.border }]}>
              <Checkbox checked={s.done} onToggle={() => {}} accessibilityLabel={s.title} size={20} />
              <Txt variant="bodySm" style={{ flex: 1 }} numberOfLines={1}>
                {s.title}
              </Txt>
              {s.nextAction ? <Chip label="Next Action" tone="success" size="sm" /> : null}
            </View>
          ))}

          {preview.notes ? (
            <>
              <View style={styles.subHead}>
                <Txt variant="caption" muted style={styles.eyebrow}>
                  NOTES &amp; CONTEXT
                </Txt>
                <Txt variant="caption" color={status.warning.fg} style={styles.eyebrow}>
                  POLICY NOTICE
                </Txt>
              </View>
              <Txt variant="bodySm" muted>
                {preview.notes}
              </Txt>
            </>
          ) : null}

          <View style={styles.subHead}>
            <Txt variant="caption" muted style={styles.eyebrow}>
              ATTACHED RESOURCES
            </Txt>
            <Txt variant="caption" muted>
              {preview.resources.length} FILES
            </Txt>
          </View>
          {preview.resources.map((r) => (
            <View key={r.id} style={[styles.fileRow, { borderColor: scheme.border }]}>
              <View style={{ flex: 1 }}>
                <Txt variant="bodySm" numberOfLines={1}>
                  {r.name}
                </Txt>
                <Txt variant="caption" muted>
                  {r.kind} · {r.size}
                </Txt>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${r.name}`} hitSlop={8}>
                <X size={15} color={scheme.textMuted} />
              </Pressable>
            </View>
          ))}
        </View>

        {preview.pipNote ? (
          <View style={[styles.pipNote, { backgroundColor: status.success.bg }]}>
            <Leaf size={14} color={status.success.solid} />
            <Txt variant="caption" color={status.success.fg} style={{ flex: 1 }}>
              <Txt variant="caption" color={status.success.fg} style={{ fontWeight: '600' }}>
                Pip&apos;s note:{' '}
              </Txt>
              {preview.pipNote}
            </Txt>
          </View>
        ) : null}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          label="Process now"
          fullWidth
          icon={<Sparkles size={16} color={scheme.onPrimary} />}
          onPress={() => router.replace('/review')}
        />
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          style={styles.saveLater}
        >
          <Txt variant="label" muted>
            Save for later
          </Txt>
        </Pressable>
      </View>
    </Sheet>
  );
}

function ToolButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  const scheme = useScheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.tool, { borderColor: scheme.border }]}
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
  inputMeta: { flexDirection: 'row', alignItems: 'center', gap: space[1.5], marginTop: space[2] },
  speak: { flexDirection: 'row', alignItems: 'center', gap: space[1] },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space[5],
    marginBottom: space[2.5],
  },
  toolRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], flexWrap: 'wrap' },
  tool: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  parsed: { marginTop: space[5], padding: space[3.5], borderWidth: 1, borderRadius: radius.lg },
  parsedHead: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[1.5] },
  eyebrow: { letterSpacing: 1 },
  subHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space[4],
    marginBottom: space[2],
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    padding: space[2.5],
    borderWidth: 1,
    borderRadius: radius.md,
    marginBottom: space[2],
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    padding: space[2.5],
    borderWidth: 1,
    borderRadius: radius.md,
    marginBottom: space[2],
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
