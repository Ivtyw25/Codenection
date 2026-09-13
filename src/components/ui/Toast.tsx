import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react-native';

import { elevation, radius, space, status, useMotion, useScheme } from '@/theme';
import { useApp } from '@/store/AppStore';
import { Interactive } from './Interactive';
import { Txt } from './Txt';

const ICON = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
  neutral: Info,
} as const;

/**
 * The app's confirmation channel.
 *
 * Every write the user makes — completing a task, committing a capture, buying
 * a skin — says so here. Without it the only feedback for an `onPress` is the
 * screen quietly changing, which reads as "did that work?" on anything the
 * user can't immediately see the result of.
 *
 * Mounted once at the root; driven entirely by the store.
 */
export function ToastHost() {
  const scheme = useScheme();
  const insets = useSafeAreaInsets();
  const motion = useMotion();
  const { state, hideToast } = useApp();
  const toast = state.toast;

  const shown = useSharedValue(0);

  useEffect(() => {
    shown.value = withTiming(toast ? 1 : 0, motion.t('md'));
  }, [toast, motion, shown]);

  const animated = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateY: (1 - shown.value) * 24 }],
  }));

  if (!toast) return null;

  const Icon = ICON[toast.tone];
  const accent = toast.tone === 'neutral' ? scheme.secondary : status[toast.tone].solid;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.host, { bottom: insets.bottom + space[20] }, animated]}
    >
      <View
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={[styles.toast, { backgroundColor: scheme.text }]}
      >
        <Icon size={16} color={accent} />
        <Txt variant="bodySm" color={scheme.surface} style={{ flex: 1 }} numberOfLines={2}>
          {toast.message}
        </Txt>

        {toast.action ? (
          <Interactive
            accessibilityRole="button"
            accessibilityLabel={toast.action.label}
            onPress={() => {
              toast.action?.run();
              hideToast();
            }}
            radius="pill"
            style={styles.action}
          >
            <Txt variant="label" color={accent}>
              {toast.action.label}
            </Txt>
          </Interactive>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: space[4], right: space[4] },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2.5],
    paddingVertical: space[3],
    paddingHorizontal: space[4],
    borderRadius: radius.pill,
    // The lifted-card shadow, the one real elevation the teardown kept. Spread
    // from the token rather than retyped: this was a verbatim copy of
    // `elevation.lg`, which is one more place for the scale to drift.
    ...elevation.lg,
  },
  action: { paddingHorizontal: space[2], paddingVertical: space[1] },
});
