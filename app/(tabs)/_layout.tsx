/**
 * The app's spine — persistent bottom tab bar (§3.1).
 *
 *   [ Home ]  [ Tasks ]  ( + Capture FAB )  [ Pip ]  [ Reflect ]
 *
 * The centre FAB is the mind-dump entry and is reachable from anywhere, because
 * "the moments worth capturing rarely happen inside the app" (§B.1).
 *
 * The bar is hidden during onboarding, the Critical intervention, and any
 * full-screen sheet flow — those live outside this layout entirely, so hiding
 * is structural rather than conditional.
 */

import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs, useRouter } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Feather from '@expo/vector-icons/Feather';

import { Txt } from '@/components/ui';
import {
  colors,
  elevation,
  FAB_LIFT,
  FAB_SIZE,
  MIN_TAP_TARGET,
  radius,
  space,
  TAB_BAR_HEIGHT,
} from '@/theme';

type IconName = React.ComponentProps<typeof Feather>['name'];

const TAB_META: Record<string, { label: string; icon: IconName }> = {
  home: { label: 'Home', icon: 'home' },
  tasks: { label: 'Tasks', icon: 'check-square' },
  pip: { label: 'Pip', icon: 'smile' },
  reflect: { label: 'Reflect', icon: 'sun' },
};

/** Tab order with the FAB slot sitting between Tasks and Pip. */
const ORDER = ['home', 'tasks', '__fab__', 'pip', 'reflect'];

function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
        elevation[3],
      ]}
    >
      {ORDER.map((key) => {
        if (key === '__fab__') {
          return (
            <View key="fab" style={{ flex: 1, alignItems: 'center' }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Capture something"
                accessibilityHint="Opens a mind-dump sheet"
                onPress={() => router.push('/capture')}
                style={[
                  {
                    position: 'absolute',
                    top: -FAB_LIFT,
                    width: FAB_SIZE,
                    height: FAB_SIZE,
                    borderRadius: radius.full,
                    backgroundColor: colors.action,
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                  elevation[3],
                ]}
              >
                <Feather name="plus" size={26} color={colors.onFill} />
              </Pressable>
            </View>
          );
        }

        const routeIndex = state.routes.findIndex((r: { name: string }) => r.name === key);
        if (routeIndex === -1) return <View key={key} style={{ flex: 1 }} />;

        const focused = state.index === routeIndex;
        const meta = TAB_META[key];
        const tint = focused ? colors.action : colors.textSecondary;

        return (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={meta.label}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: state.routes[routeIndex].key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) navigation.navigate(key);
            }}
            style={{
              flex: 1,
              minHeight: MIN_TAP_TARGET,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
            }}
          >
            {/* 3px active indicator sitting on the bar's top edge. */}
            <View
              style={{
                position: 'absolute',
                top: 0,
                height: 3,
                width: 28,
                borderRadius: radius.full,
                backgroundColor: focused ? colors.action : 'transparent',
              }}
            />
            <Feather name={meta.icon} size={24} color={tint} />
            <Txt variant="caption" color={tint}>
              {meta.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="tasks" />
      <Tabs.Screen name="pip" />
      <Tabs.Screen name="reflect" />
    </Tabs>
  );
}
