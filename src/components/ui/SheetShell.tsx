/**
 * Bottom-sheet shell.
 *
 * The spec's sheet chrome (§3.2): slide-up, `--radius-lg` on the top corners,
 * a drag handle, `--elev-3`, and a per-screen height.
 *
 * ── Why this is hand-rolled ─────────────────────────────────────────────────
 * `presentation: 'formSheet'` from react-native-screens lays out at zero height
 * on Android in this SDK combination — the route mounts (an autofocused input
 * even raises the keyboard) but nothing paints. Rather than ship a sheet that
 * silently doesn't open, the routes use `transparentModal` +
 * `slide_from_bottom` and this component supplies the chrome. It also gives
 * exact control over the corner radius, handle and heights the spec specifies,
 * which the native presentation does not.
 */

import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';

import { colors, elevation, radius, space } from '@/theme';

export interface SheetShellProps {
  children: React.ReactNode;
  /** Sheet height as a fraction of the screen. */
  height?: number;
  /** Tapping the scrim dismisses. Off for flows that must be resolved. */
  dismissOnScrim?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function SheetShell({
  children,
  height = 0.9,
  dismissOnScrim = true,
  style,
}: SheetShellProps) {
  const router = useRouter();

  return (
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        disabled={!dismissOnScrim}
        onPress={() => router.back()}
        style={{ flex: 1, backgroundColor: colors.scrim }}
      />

      <View
        style={[
          {
            height: `${height * 100}%`,
            backgroundColor: colors.card,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            overflow: 'hidden',
            // The sheet sits above the home indicator; inner footers add their
            // own inset, so only the top edge is padded here.
            paddingTop: space[1],
          },
          elevation[3],
          style,
        ]}
      >
        {children}
      </View>
    </View>
  );
}
