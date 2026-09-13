import { Platform, StyleSheet, View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { BarChart3, CheckSquare, Home, Plus, User } from 'lucide-react-native';

import { useApp } from '@/store/AppStore';
import { radius, space, type, useScheme } from '@/theme';

/**
 * The centre capture button.
 *
 * It keeps the raised 56pt geometry and the lime glow the Pip mascot held here
 * before, because that slot's shape is the bar's most recognisable feature —
 * only its job has changed. Filled `secondary` with a forest icon is the
 * teardown's verified 7.47:1 hero pairing, and this is the one element in the
 * app where the secondary colour carries a whole control.
 *
 * Capture has to be reachable in one tap from anywhere: a thought you have to
 * navigate towards is a thought you lose.
 */
const ADD_BUTTON = 56;

function AddTabButton() {
  const scheme = useScheme();

  return (
    <View
      style={[
        styles.addButton,
        { backgroundColor: scheme.secondary, shadowColor: scheme.secondary },
      ]}
    >
      <Plus size={28} color={scheme.onSecondary} strokeWidth={2.5} />
    </View>
  );
}

export default function TabsLayout() {
  const scheme = useScheme();
  const router = useRouter();
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
          tabBarBadgeStyle: {
            backgroundColor: scheme.primary,
            color: scheme.onPrimary,
            fontSize: type.caption.fontSize,
          },
          tabBarIcon: ({ color, focused }) => (
            <CheckSquare size={22} color={color} strokeWidth={focused ? 2.4 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="new"
        options={{
          title: '',
          tabBarIcon: () => <AddTabButton />,
          tabBarItemStyle: { paddingTop: 0 },
          tabBarAccessibilityLabel: 'Capture a thought',
        }}
        listeners={{
          tabPress: (e) => {
            // The screen behind this tab is a placeholder. Capture is a
            // full-screen route outside the group, so the press never becomes
            // a tab navigation.
            e.preventDefault();
            router.push('/capture');
          },
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

      {/*
        Pip keeps its route but leaves the bar — the centre slot it used to
        hold is now capture. Home's "Pip's current state" card is the way in,
        and the tab bar stays visible while you are there.
      */}
      <Tabs.Screen name="pip" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  addButton: {
    width: ADD_BUTTON,
    height: ADD_BUTTON,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    // Raised above the bar, as in the flows.
    marginTop: -22,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 10,
  },
});
