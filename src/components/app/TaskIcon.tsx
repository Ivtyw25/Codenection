import React from 'react';
import {
  BookOpen,
  Briefcase,
  CalendarDays,
  Code,
  Dumbbell,
  FileText,
  Heart,
  Home,
  Mail,
  ShoppingCart,
  Sparkles,
  Users,
} from 'lucide-react-native';

import type { IconName } from '@/types';

/**
 * The only place a stored `IconName` becomes a component.
 *
 * Extracted out of `TaskCard` once categories became user-owned data: a
 * category carries an icon the user picked, so the task card, the filter row,
 * the breakdown bars and the category editor all need the same mapping. Four
 * private copies of this object would be four chances for one of them to be
 * missing the icon somebody just chose.
 *
 * The registry is exhaustive over `IconName` by type, so adding a name to the
 * union without adding it here is a compile error rather than a blank square.
 */
export const ICONS: Record<IconName, typeof Code> = {
  CalendarDays,
  Code,
  FileText,
  BookOpen,
  Mail,
  ShoppingCart,
  Dumbbell,
  Users,
  Sparkles,
  Briefcase,
  Heart,
  Home,
};

export interface TaskIconProps {
  name: IconName;
  size?: number;
  color: string;
}

/** Renders a stored icon name. Falls back to `Sparkles` for unknown data. */
export function TaskIcon({ name, size = 16, color }: TaskIconProps) {
  const Icon = ICONS[name] ?? Sparkles;
  return <Icon size={size} color={color} />;
}
