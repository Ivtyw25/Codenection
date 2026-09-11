import React, { ReactNode } from 'react';
import { Modal, View, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useScheme, radius, space, elevation } from '@/theme';
import { Txt } from './Txt';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  fullHeight?: boolean;
}

export function Sheet({ visible, onClose, title, children, footer, fullHeight }: SheetProps) {
  const scheme = useScheme();
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={[styles.scrim, { backgroundColor: scheme.scrim }]}
          activeOpacity={1}
          onPress={onClose}
          accessibilityLabel="Close sheet"
        />
        <SafeAreaView style={[
          styles.panelContainer,
          fullHeight && { flex: 1, marginTop: space[10] }
        ]}>
          <View style={[
            styles.panel,
            {
              backgroundColor: scheme.surface,
              borderTopLeftRadius: radius.lg,
              borderTopRightRadius: radius.lg,
              ...elevation.lg,
            },
            fullHeight && { flex: 1 }
          ]}>
            <View style={[styles.handleContainer, { paddingVertical: space[3] }]}>
              <View style={[styles.handle, { backgroundColor: scheme.borderStrong, borderRadius: radius.pill, width: space[9], height: space[1] }]} />
            </View>
            {title && (
              <View style={[styles.header, { paddingHorizontal: space[5], paddingBottom: space[4] }]}>
                <Txt variant="h3">{title}</Txt>
              </View>
            )}
            <View style={[styles.content, { paddingHorizontal: space[5], paddingBottom: space[5] }, fullHeight && { flex: 1 }]}>
              {children}
            </View>
            {footer && (
              <View style={[styles.footer, { paddingHorizontal: space[5], paddingVertical: space[4], borderTopColor: scheme.border, borderTopWidth: 1 }]}>
                {footer}
              </View>
            )}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    ...StyleSheet.absoluteFill,
  },
  panelContainer: {
    justifyContent: 'flex-end',
  },
  panel: {
    width: '100%',
    maxHeight: '90%',
  },
  handleContainer: {
    alignItems: 'center',
  },
  handle: {},
  header: {},
  content: {},
  footer: {},
});
