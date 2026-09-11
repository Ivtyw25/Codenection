import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarChart3 } from 'lucide-react-native';

import { EmptyState, Txt } from '@/components/ui';
import { space, useScheme } from '@/theme';

/**
 * Reflect.
 *
 * NOT DESIGNED. The tab exists in the Figma bottom bar but the file contains no
 * Reflect frame, so there is nothing to duplicate. Rather than invent a chart
 * screen and pass it off as designed, this renders the system's empty state —
 * the pattern the design audit flagged as entirely missing ("zero skeleton
 * loaders, spinners, empty states or error states anywhere across 16 routes").
 *
 * Replace once a Reflect frame exists.
 */
export default function ReflectScreen() {
  const scheme = useScheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: scheme.ground,
        paddingTop: insets.top + space[4],
        paddingHorizontal: space[4],
      }}
    >
      <Txt variant="h1">Reflect</Txt>
      <EmptyState
        icon={<BarChart3 size={28} color={scheme.textMuted} />}
        title="No reflections yet"
        body="Check back after a few days of tracking — Pip needs a little history before the trends mean anything."
      />
    </View>
  );
}
