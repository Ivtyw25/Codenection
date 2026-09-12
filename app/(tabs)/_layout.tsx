import { Platform, StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { BarChart3, CheckSquare, Home, User } from 'lucide-react-native';

import { PipMascot } from '@/components/app';
import { useApp } from '@/store/AppStore';
import { usePipState } from '@/store/selectors';
import { radius, space, type, useScheme } from '@/theme';

/**
 * The centre Pip button. It sits proud of the bar on a lime ring — the one
 * place the secondary brand colour carries a whole element, and the flows'
 * single most recognisable affordance.
 */
const PIP_BUTTON = 56;

function PipTabButton({ focused }: { focused: boolean }) {
  const scheme = useScheme();
  const pip = usePipState();

  return (
    <View
      style={[
        styles.pipButton,
        {
          backgroundColor: scheme.surface,
          borderColor: focused ? scheme.secondary : scheme.border,
          // The lime focus glow, kept verbatim from the design system.
          shadowColor: focused ? scheme.secondary : '#000',
          shadowOpacity: focused ? 0.45 : 0.18,
        },
      ]}
    >
      <PipMascot size={38} state={pip.name} />
    </View>
  );
}

export default function TabsLayout() {
  const scheme = useScheme();
  const { data } = useApp();

  const openToday = data.tasks.filter((t) => t.status === 'open').length;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: scheme.text,
        tabBarInactiveTintColor: scheme.textMuted,
        tabBarStyle: {
          backgroundColor: scheme.surface,
          borderTopColor: scheme.border,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingTop: space[1.5],
        },
        tabBarLabelStyle: { ...type.caption },
        tabBarItemStyle: { paddingTop: space[0.5] },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Home size={22} color={color} strokeWidth={focused ? 2.4 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          // Live count — the bar reports the backlog without being opened.
          tabBarBadge: openToday > 0 ? openToday : undefined,
          tabBarBadgeStyle: { backgroundColor: scheme.primary, color: scheme.onPrimary, fontSize: 10 },
          tabBarIcon: ({ color, focused }) => (
            <CheckSquare size={22} color={color} strokeWidth={focused ? 2.4 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="pip"
        options={{
          title: 'Pip',
          tabBarIcon: ({ focused }) => <PipTabButton focused={focused} />,
          tabBarItemStyle: { paddingTop: 0 },
        }}
      />
      <Tabs.Screen
        name="reflect"
        options={{
          title: 'Reflect',
          tabBarIcon: ({ color, focused }) => (
            <BarChart3 size={22} color={color} strokeWidth={focused ? 2.4 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <User size={22} color={color} strokeWidth={focused ? 2.4 : 2} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  pipButton: {
    width: PIP_BUTTON,
    height: PIP_BUTTON,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    // Raised above the bar, as in the flows.
    marginTop: -22,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    elevation: 8,
  },
});
