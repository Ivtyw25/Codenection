/**
 * Micro-reward toast — "rise 12px + fade, `--motion-base`, auto-dismiss 1.8s,
 * `--brand-accent` for Spark/XP, `--brand-secondary-soft` for Care" (Appendix).
 *
 * These are the immediate positive feedback that is deliberately independent of
 * the day's overall outcome: a Care Point lands every time a recovery action is
 * logged, regardless of state.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeOut, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { brand, colors, elevation, radius, space, TOAST_DURATION, TOAST_RISE, useMotion } from '@/theme';
import { Txt } from './Txt';

export type ToastKind = 'spark' | 'care';

interface ToastItem {
  id: number;
  label: string;
  kind: ToastKind;
}

interface ToastApi {
  show: (label: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastApi>({ show: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const show = useCallback((label: string, kind: ToastKind = 'care') => {
    const id = nextId++;
    setItems((cur) => [...cur, { id, label, kind }]);
    setTimeout(() => setItems((cur) => cur.filter((t) => t.id !== id)), TOAST_DURATION);
  }, []);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 120,
          alignItems: 'center',
          gap: space[2],
        }}
      >
        {items.map((t) => (
          <ToastPill key={t.id} item={t} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

function ToastPill({ item }: { item: ToastItem }) {
  const motion = useMotion();
  const rise = useSharedValue(0);

  useEffect(() => {
    rise.value = withTiming(1, motion.t('base'));
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: rise.value,
    transform: [{ translateY: (1 - rise.value) * TOAST_RISE }],
  }));

  const isSpark = item.kind === 'spark';

  return (
    <Animated.View
      exiting={FadeOut.duration(200)}
      style={[
        {
          backgroundColor: isSpark ? brand.accent : brand.secondarySoft,
          borderRadius: radius.full,
          paddingHorizontal: space[4],
          paddingVertical: space[2],
        },
        elevation[2],
        style,
      ]}
    >
      <Txt variant="caption" color={isSpark ? brand.accentText : colors.actionQuiet}>
        {item.label}
      </Txt>
    </Animated.View>
  );
}
