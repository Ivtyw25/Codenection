import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { FileText, Music, Video, X } from 'lucide-react-native';

import { Txt, IconButton } from '@/components/ui';
import { formatBytes, formatDuration } from '@/data/attachments';
import { radius, space, useScheme } from '@/theme';
import type { CaptureAttachment } from '@/types';

/**
 * Props for AttachmentTray.
 * @prop attachments - The list of attachments to render.
 * @prop onRemove - Callback to remove an attachment by ID.
 * @prop disabled - Disables removal while a submit is in flight.
 */
export interface AttachmentTrayProps {
  attachments: CaptureAttachment[];
  onRemove: (id: string) => void;
  disabled?: boolean;
}

/**
 * Renders the list of files attached to a capture note.
 *
 * WHY IT EXISTS: The user has to see and manage what they attached before it is
 * bundled into one inbox item, because after submission the bundle is opaque
 * until triage.
 */
export function AttachmentTray({ attachments, onRemove, disabled }: AttachmentTrayProps) {
  const scheme = useScheme();

  if (attachments.length === 0) return null;

  const sizeBytes = attachments.reduce((sum, a) => sum + (a.sizeBytes || 0), 0);
  const count = attachments.length;
  // If no attachment reports a size show only the count.
  const hasSize = attachments.some((a) => a.sizeBytes !== undefined);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Txt variant="caption" muted style={styles.captionLeft}>
          ATTACHED
        </Txt>
        <Txt variant="caption" muted>
          {count} {count === 1 ? 'file' : 'files'}
          {hasSize ? ` · ${formatBytes(sizeBytes)}` : ''}
        </Txt>
      </View>

      <View style={styles.list}>
        {attachments.map((attachment) => (
          <View
            key={attachment.id}
            style={[
              styles.row,
              {
                borderColor: scheme.border,
                backgroundColor: scheme.surface,
              },
            ]}
          >
            <View style={[styles.thumbnail, { backgroundColor: scheme.surfaceAlt }]}>
              {attachment.kind === 'image' ? (
                <Image
                  source={{ uri: attachment.uri }}
                  style={styles.image}
                  resizeMode="cover"
                />
              ) : attachment.kind === 'document' ? (
                <FileText size={17} color={scheme.primary} />
              ) : attachment.kind === 'audio' ? (
                <Music size={17} color={scheme.primary} />
              ) : (
                <Video size={17} color={scheme.primary} />
              )}
            </View>

            <View style={styles.middle}>
              <Txt variant="bodySm" numberOfLines={1}>
                {attachment.name}
              </Txt>
              <Txt variant="caption" muted>
                {formatBytes(attachment.sizeBytes)}
                {attachment.durationSec !== undefined
                  ? ` · ${formatDuration(attachment.durationSec)}`
                  : ''}
              </Txt>
            </View>

            <IconButton
              icon={<X size={15} color={scheme.textMuted} />}
              accessibilityLabel={`Remove ${attachment.name}`}
              onPress={() => onRemove(attachment.id)}
              disabled={disabled}
              size={32}
              tone="ghost"
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: space[2],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space[2],
  },
  captionLeft: {
    letterSpacing: 1,
  },
  list: {
    gap: space[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2.5],
    padding: space[2],
    borderWidth: 1,
    borderRadius: radius.md,
  },
  thumbnail: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: radius.md,
  },
  middle: {
    flex: 1,
  },
});
