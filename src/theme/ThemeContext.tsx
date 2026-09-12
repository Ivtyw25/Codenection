import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';

import { dark, light, type Scheme } from './colors';

export type ThemePreference = 'light' | 'dark' | null;

/**
 * User override for the OS colour scheme. `null` means follow the system,
 * which is the default and what the frames assume.
 *
 * This lives in the theme layer and takes the preference as a *prop* rather
 * than reading the store, so `@/theme` stays free of any dependency on
 * application state — the design system has to be usable without the app.
 */
const ThemeCtx = createContext<ThemePreference>(null);

export function ThemeOverrideProvider({
  value,
  children,
}: {
  value: ThemePreference;
  children: React.ReactNode;
}) {
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

/**
 * Resolves the active colour scheme.
 *
 * The teardown confirms a real dark theme ships — "116 CSS custom properties
 * with paired light/dark values" — so dark is a first-class mode here, not an
 * afterthought. Primary and secondary hold constant across both; only the
 * accent swaps (amber → near-white blush).
 */
export function useScheme(): Scheme {
  const override = useContext(ThemeCtx);
  const os = useColorScheme();
  const resolved = override ?? os;
  return resolved === 'dark' ? dark : light;
}

/** The raw preference, for the settings row that has to show what is set. */
export function useThemePreference(): ThemePreference {
  return useContext(ThemeCtx);
}
