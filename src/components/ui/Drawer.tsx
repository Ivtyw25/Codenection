import React, { type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

import { elevation, radius, space, useScheme } from '@/theme';
import { IconButton } from './IconButton';
import { Txt } from './Txt';

export interface DrawerProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** Right-hand slot in the header — "Mark all read", "Reset". */
  headerAction?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Fraction of screen height the panel may occupy. */
  maxHeight?: `${number}%`;
}

/**
 * The bottom drawer — the app's secondary surface.
 *
 * Distinct from `Sheet`, which is a full-height *destination* the router owns
 * (Capture, Review, Task Detail). A Drawer is transient, owned by the screen
 * that opened it, and never gets a route: notifications, filter and sort,
 * settings. That split is why tapping a task pushes a URL you can link to and
 * tapping the bell does not.
 */
export function Drawer({
  visible,
  onClose,
  title,
  headerAction,
  children,
  footer,
  maxHeight = '80%',
}: DrawerProps) {
  const scheme = useScheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: scheme.scrim }]}
          accessibilityRole="button"
          accessibilityLabel={`Close ${title}`}
          onPress={onClose}
        />

        <View
          accessibilityViewIsModal
          style={[
            styles.panel,
            {
              maxHeight,
              backgroundColor: scheme.surface,
              paddingBottom: insets.bottom + space[4],
            },
            elevation.lg,
          ]}
        >
          <View style={[styles.handle, { backgroundColor: scheme.borderStrong }]} />

          <View style={styles.header}>
            <Txt variant="h3" style={{ flex: 1 }}>
              {title}
            </Txt>
            {headerAction}
            <IconButton
              icon={<X size={16} color={scheme.textSecondary} />}
              accessibilityLabel={`Close ${title}`}
              size={32}
              onPress={onClose}
            />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: space[5], paddingBottom: space[4] }}
          >
            {children}
          </ScrollView>

          {footer ? (
            <View style={[styles.footer, { borderTopColor: scheme.border }]}>{footer}</View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  panel: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radius.pill,
    alignSelf: 'center',
    marginTop: space[2.5],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingHorizontal: space[5],
    paddingTop: space[3],
    paddingBottom: space[4],
  },
  footer: {
    paddingHorizontal: space[5],
    paddingTop: space[4],
    borderTopWidth: 1,
  },
});
