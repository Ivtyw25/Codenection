import React, { ReactNode } from 'react';
import { View, ScrollView, StyleSheet, StatusBar, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useScheme, SCREEN_PADDING } from '@/theme';

export interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
  background?: string;
}

export function Screen({
  children,
  scroll = true,
  padded = true,
  header,
  footer,
  background,
}: ScreenProps) {
  const scheme = useScheme();
  const isDark = useColorScheme() === 'dark';
  const bgColor = background || scheme.ground;

  const content = (
    <View style={[styles.content, padded && { paddingHorizontal: SCREEN_PADDING }]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={bgColor} />
      {header && <View>{header}</View>}
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scrollGrow}>
          {content}
        </ScrollView>
      ) : (
        <View style={styles.flexGrow}>
          {content}
        </View>
      )}
      {footer && <View>{footer}</View>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flexGrow: {
    flex: 1,
  },
  scrollGrow: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
  },
});
