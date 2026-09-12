import React, { type ReactNode } from 'react';
import { Modal, StyleSheet, View } from 'react-native';

import { elevation, radius, space, useScheme } from '@/theme';
import { Button } from './Button';
import { Txt } from './Txt';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  body?: string;
  /** Rendered between body and buttons — a price line, a preview. */
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` for anything that destroys work. */
  tone?: 'primary' | 'danger';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * The blocking decision. Used only where an action spends something the user
 * can't get back — Sparks, or a task with work recorded against it.
 *
 * Deliberately NOT used for ordinary destructive-looking actions that are
 * cheap to reverse: dropping a proposed task in the Review sheet just drops it,
 * because the toast offers an undo and a dialog there would be friction for
 * friction's sake.
 */
export function ConfirmDialog({
  visible,
  title,
  body,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary',
  loading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const scheme = useScheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={[styles.scrim, { backgroundColor: scheme.scrim }]}>
        <View
          accessibilityViewIsModal
          accessibilityRole="alert"
          style={[
            styles.panel,
            { backgroundColor: scheme.surface, borderColor: scheme.border },
            elevation.lg,
          ]}
        >
          <Txt variant="h3">{title}</Txt>
          {body ? (
            <Txt variant="bodySm" muted style={{ marginTop: space[2] }}>
              {body}
            </Txt>
          ) : null}

          {children ? <View style={{ marginTop: space[4] }}>{children}</View> : null}

          <View style={styles.actions}>
            <View style={{ flex: 1 }}>
              <Button label={cancelLabel} variant="secondary" fullWidth onPress={onCancel} disabled={loading} />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label={confirmLabel}
                variant={tone === 'danger' ? 'danger' : 'primary'}
                fullWidth
                loading={loading}
                onPress={onConfirm}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space[6],
  },
  panel: {
    width: '100%',
    maxWidth: 400,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space[5],
  },
  actions: { flexDirection: 'row', gap: space[2.5], marginTop: space[6] },
});
