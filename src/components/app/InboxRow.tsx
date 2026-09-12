import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Mic, Pencil } from 'lucide-react-native';

import { Checkbox, Chip, Interactive, Txt } from '@/components/ui';
import { formatRelative } from '@/data/format';
import { radius, space, useScheme } from '@/theme';
import type { CaptureNote } from '@/types';

export interface InboxRowProps {
  note: CaptureNote;
  selected: boolean;
  onToggleSelect: () => void;
  /** Opens the note back in the capture canvas for editing. */
  onOpen: () => void;
  now?: Date;
}

/**
 * One unprocessed capture.
 *
 * Two targets in one row, deliberately: the checkbox selects for a batch, the
 * body opens the note for editing. Triage is mostly selection, so the checkbox
 * gets the generous hit area and the body is the secondary action — the reverse
 * of a normal list row, and the reason this is a component rather than markup
 * inlined into the screen.
 *
 * It shows the raw text and nothing else. No context, no due date, no estimate:
 * those do not exist yet, and inventing a preview of them here would undo the
 * separation the Inbox is for.
 */
export function InboxRow({ note, selected, onToggleSelect, onOpen, now = new Date() }: InboxRowProps) {
  const scheme = useScheme();

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: selected ? scheme.surfaceAlt : scheme.surface,
          borderColor: selected ? scheme.primary : scheme.border,
        },
      ]}
    >
      <Checkbox
        checked={selected}
        onToggle={onToggleSelect}
        accessibilityLabel={`${selected ? 'Deselect' : 'Select'}: ${note.text}`}
      />

      <Interactive
        accessibilityRole="button"
        accessibilityLabel={note.text}
        accessibilityHint="Opens this capture for editing"
        onPress={onOpen}
        radius="md"
        noScale
        style={styles.body}
      >
        <Txt variant="bodySm" numberOfLines={2}>
          {note.text}
        </Txt>

        <View style={styles.meta}>
          {note.kind === 'voice' ? (
            <Chip
              label={formatDuration(note.durationSec)}
              size="sm"
              icon={<Mic size={11} color={scheme.textSecondary} />}
            />
          ) : null}
          <Txt variant="caption" muted>
            {formatRelative(note.createdAt, now)}
          </Txt>
        </View>
      </Interactive>

      <Pencil size={14} color={scheme.textDisabled} />
    </View>
  );
}

function formatDuration(seconds?: number): string {
  if (!seconds) return 'Voice';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${`${s}`.padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    padding: space[3],
    borderWidth: 1,
    borderRadius: radius.md,
  },
  body: { flex: 1, gap: space[1.5], paddingVertical: space[1] },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
});
