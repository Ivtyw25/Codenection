/**
 * Screen chrome: the standard 56px header, the sticky footer, the inline status
 * bars, and the sheet drag handle. All from `pip-design-spec.md` Phase 4.
 */

import { Pressable, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';

import {
  colors,
  elevation,
  HEADER_HEIGHT,
  MIN_TAP_TARGET,
  radius,
  SCREEN_PADDING,
  space,
} from '@/theme';
import { Txt } from './Txt';

// ── Screen container ─────────────────────────────────────────────────────────

export interface ScreenProps {
  children: React.ReactNode;
  /** Wraps children in a ScrollView. Defaults to true. */
  scroll?: boolean;
  /** Extra bottom padding — pass the tab-bar height on tab roots. */
  bottomInset?: number;
  background?: string;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

export function Screen({
  children,
  scroll = true,
  bottomInset = 0,
  background = colors.bg,
  padded = true,
  style,
  contentStyle,
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  const inner: StyleProp<ViewStyle> = [
    padded ? { paddingHorizontal: SCREEN_PADDING } : null,
    { paddingTop: insets.top, paddingBottom: insets.bottom + bottomInset + space[5] },
    contentStyle,
  ];

  if (!scroll) {
    return <View style={[{ flex: 1, backgroundColor: background }, inner, style]}>{children}</View>;
  }

  return (
    <ScrollView
      style={[{ flex: 1, backgroundColor: background }, style]}
      contentContainerStyle={inner}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

// ── Header ───────────────────────────────────────────────────────────────────

export interface HeaderProps {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  /** H2 by default; SCR-10 uses an H4 greeting instead. */
  compact?: boolean;
}

export function Header({ title, subtitle, onBack, right, compact }: HeaderProps) {
  return (
    <View
      style={{
        minHeight: HEADER_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[2],
      }}
    >
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={onBack}
          style={{
            width: MIN_TAP_TARGET,
            height: MIN_TAP_TARGET,
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: -space[3],
          }}
        >
          <Feather name="chevron-left" size={24} color={colors.text} />
        </Pressable>
      ) : null}

      <View style={{ flex: 1 }}>
        {title ? <Txt variant={compact ? 'h4' : 'h2'}>{title}</Txt> : null}
        {subtitle ? (
          <Txt variant="bodySm" color={colors.textSecondary}>
            {subtitle}
          </Txt>
        ) : null}
      </View>

      {right}
    </View>
  );
}

// ── Sticky footer ────────────────────────────────────────────────────────────

/** 16px pad, 24px above the safe area — the onboarding / sheet CTA slot. */
export function StickyFooter({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        {
          paddingHorizontal: SCREEN_PADDING,
          paddingTop: space[3],
          paddingBottom: insets.bottom + space[5],
          backgroundColor: colors.bg,
          gap: space[2],
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ── Inline status bar ────────────────────────────────────────────────────────

export type InlineBarTone = 'info' | 'warning' | 'destructive' | 'success';

/**
 * The slim inline bars: offline notice, auth error, streak-reset note.
 * Never a blocking modal — see the permission gates in §3.4.
 */
export function InlineBar({
  tone,
  children,
  icon,
  style,
}: {
  tone: InlineBarTone;
  children: React.ReactNode;
  icon?: React.ComponentProps<typeof Feather>['name'];
  style?: StyleProp<ViewStyle>;
}) {
  const t = colors.semantic[tone];
  return (
    <View
      accessibilityRole="alert"
      style={[
        {
          backgroundColor: t.fill,
          borderRadius: radius.md,
          paddingHorizontal: space[3],
          paddingVertical: space[2],
          flexDirection: 'row',
          alignItems: 'center',
          gap: space[2],
        },
        style,
      ]}
    >
      {icon ? <Feather name={icon} size={16} color={t.text} /> : null}
      <Txt variant="bodySm" color={t.text} style={{ flex: 1 }}>
        {children}
      </Txt>
    </View>
  );
}

// ── Sheet chrome ─────────────────────────────────────────────────────────────

/** 32×4px `--border-strong` handle, centred, 8px from the top. */
export function DragHandle() {
  return (
    <View style={{ alignItems: 'center', paddingTop: space[2], paddingBottom: space[2] }}>
      <View
        style={{
          width: 32,
          height: 4,
          borderRadius: radius.full,
          backgroundColor: colors.borderStrong,
        }}
      />
    </View>
  );
}

/** Sticky footer inside a sheet — sits above the safe area with `--elev-3`. */
export function SheetFooter({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        {
          paddingHorizontal: SCREEN_PADDING,
          paddingTop: space[3],
          paddingBottom: Math.max(insets.bottom, space[4]),
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          gap: space[2],
        },
        elevation[3],
      ]}
    >
      {children}
    </View>
  );
}
