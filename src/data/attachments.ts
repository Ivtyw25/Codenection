import { useCallback, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { uid } from '@/data/api';
import type { AttachmentId, AttachmentKind, CaptureAttachment } from '@/types';

/**
 * "1.2 MB" · "12.4 KB" · "840 B" · "—" when the picker reported no size.
 *
 * Binary units, because that is what the OS file browser shows for the same
 * file, and a tray that disagrees with it reads as a bug.
 */
export function formatBytes(bytes?: number): string {
  if (bytes === undefined) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

/** "0:11" · "2:05". Empty when there is no duration to show. */
export function formatDuration(seconds?: number): string {
  if (seconds === undefined) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${`${s}`.padStart(2, '0')}`;
}

/**
 * MIME type outranks the picker that produced the file.
 *
 * A voice memo picked through the document browser is still audio, and a `.mov`
 * picked from the photo library is still video. Trusting the entry point over
 * the content type is how files end up under the wrong icon.
 */
function kindFor(mimeType: string | undefined, fallback: AttachmentKind): AttachmentKind {
  if (!mimeType) return fallback;
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return fallback;
}

/**
 * Attachments for one capture. Three entry points, one list.
 *
 * ATTACHED, NOT UPLOADED — there is no backend. The pickers copy into the app
 * cache and this keeps the local `uri`, so "attach" means "remember where this
 * is". The capture screen is careful never to claim otherwise.
 *
 * `initial` seeds the tray when an Inbox note is re-opened for editing; without
 * it, editing a note would quietly drop the files it already had.
 */
export function useAttachments(initial: CaptureAttachment[] = []) {
  const [attachments, setAttachments] = useState<CaptureAttachment[]>(initial);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * De-duplicates on `uri`. Picking the same file twice is a slip rather than
   * an intent, and two rows pointing at one file cannot be told apart.
   */
  const merge = useCallback((incoming: CaptureAttachment[]) => {
    setAttachments((prev) => {
      const seen = new Set(prev.map((a) => a.uri));
      return [...prev, ...incoming.filter((a) => !seen.has(a.uri))];
    });
  }, []);

  /**
   * The shape every picker call shares: clear the last error, flag the in-flight
   * state, and let a *cancel* resolve to nothing.
   *
   * Backing out of a file browser is not a failure and must not surface as one
   * — the three pickers each got this subtly different before it was hoisted.
   */
  const run = useCallback(
    async (pick: () => Promise<CaptureAttachment[]>) => {
      setError(null);
      setPicking(true);
      try {
        merge(await pick());
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setPicking(false);
      }
    },
    [merge],
  );

  const addDocuments = useCallback(
    () =>
      run(async () => {
        const result = await DocumentPicker.getDocumentAsync({
          multiple: true,
          copyToCacheDirectory: true,
        });
        if (result.canceled || !result.assets) return [];

        return result.assets.map((asset) => ({
          id: uid('att'),
          name: asset.name,
          kind: kindFor(asset.mimeType, 'document'),
          uri: asset.uri,
          sizeBytes: asset.size,
          mimeType: asset.mimeType,
        }));
      }),
    [run],
  );

  const addAudio = useCallback(
    () =>
      run(async () => {
        const result = await DocumentPicker.getDocumentAsync({
          type: 'audio/*',
          multiple: true,
          copyToCacheDirectory: true,
        });
        if (result.canceled || !result.assets) return [];

        return result.assets.map((asset) => ({
          id: uid('att'),
          name: asset.name,
          // The browser was already filtered to audio, so trust that over a
          // missing or generic MIME type on the asset itself.
          kind: 'audio' as const,
          uri: asset.uri,
          sizeBytes: asset.size,
          mimeType: asset.mimeType,
        }));
      }),
    [run],
  );

  const addMedia = useCallback(
    () =>
      run(async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          throw new Error('Pip needs photo access to attach media. Enable it in Settings.');
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images', 'videos'],
          allowsMultipleSelection: true,
          quality: 0.8,
        });
        if (result.canceled || !result.assets) return [];

        return result.assets.map((asset) => ({
          id: uid('att'),
          name: asset.fileName ?? asset.uri.split('/').pop() ?? 'Attachment',
          kind: kindFor(asset.mimeType, asset.type === 'video' ? 'video' : 'image'),
          uri: asset.uri,
          sizeBytes: asset.fileSize,
          mimeType: asset.mimeType,
          // ImagePicker reports milliseconds; every other duration in this app
          // is seconds.
          durationSec: asset.duration ? asset.duration / 1000 : undefined,
        }));
      }),
    [run],
  );

  const remove = useCallback((id: AttachmentId) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clear = useCallback(() => setAttachments([]), []);

  return { attachments, picking, error, addDocuments, addMedia, addAudio, remove, clear };
}
