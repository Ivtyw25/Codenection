import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Star } from 'lucide-react-native';

import { Avatar, Button, Card, Txt } from '@/components/ui';
import { PIP, USER_NAME } from '@/data/mock';
import { brand, space, useScheme } from '@/theme';

/**
 * Profile.
 *
 * NOT DESIGNED. Like Reflect, this tab appears in the Figma bottom bar with no
 * corresponding frame. What is rendered here is only what the other screens
 * already establish as fact — name, level, Sparks balance, and the route into
 * the Shop. Nothing invented beyond that.
 */
export default function ProfileScreen() {
  const scheme = useScheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: scheme.ground,
        paddingTop: insets.top + space[4],
        paddingHorizontal: space[4],
        gap: space[4],
      }}
    >
      <Txt variant="h1">Profile</Txt>

      <Card elevated style={{ gap: space[4] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
          <Avatar initials={USER_NAME.slice(0, 1)} size={52} ring />
          <View style={{ flex: 1 }}>
            <Txt variant="h3">{USER_NAME}</Txt>
            <Txt variant="bodySm" muted>
              Level {PIP.level} · {PIP.state.label}
            </Txt>
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space[1.5],
            paddingTop: space[3],
            borderTopWidth: 1,
            borderTopColor: scheme.border,
          }}
        >
          <Star size={16} color={brand.amber} fill={brand.amber} />
          <Txt variant="h4">{PIP.sparks}</Txt>
          <Txt variant="bodySm" muted style={{ flex: 1 }}>
            Sparks available
          </Txt>
          <Button label="Shop" variant="secondary" size="sm" onPress={() => router.push('/shop')} />
        </View>
      </Card>

      <Txt variant="caption" muted>
        More profile settings arrive with the next design pass.
      </Txt>
    </View>
  );
}
