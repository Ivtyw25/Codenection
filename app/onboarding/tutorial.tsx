/**
 * SCR-09 — Interactive tutorial.
 * Route `/onboarding/tutorial` · Goal: teach the loop by doing.
 *
 * A coach-mark sequence over a sandboxed Home: dark scrim, a spotlight cutout
 * on the target (FAB → Pip → check-in), each with a card tooltip. Skippable
 * top-right, and replayable from settings.
 *
 * The cutout is built from four scrim rectangles around the target rather than
 * an SVG mask — cheaper, and it keeps the spotlight crisp at any size.
 */

import { useState } from 'react';
import { Dimensions, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Habitat, Pip } from '@/components/pip';
import { CapacityBar, Card, Txt } from '@/components/ui';
import { profile } from '@/mock';
import {
  brand,
  colors,
  elevation,
  radius,
  SCREEN_PADDING,
  space,
  TAB_BAR_HEIGHT,
} from '@/theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface Mark {
  copy: string;
  /** Spotlight rect in screen coordinates. */
  spot: { x: number; y: number; w: number; h: number; r: number };
  /** Where the tooltip sits relative to the spotlight. */
  tooltipTop: number;
}

export default function TutorialScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);

  const fabSize = 56;
  const fabY = SCREEN_H - insets.bottom - TAB_BAR_HEIGHT - 12;
  const heroY = insets.top + 120;

  const marks: Mark[] = [
    {
      copy: 'Tap + whenever something lands on you. Dump it all — Pip sorts it out later.',
      spot: {
        x: SCREEN_W / 2 - fabSize / 2 - 6,
        y: fabY - 6,
        w: fabSize + 12,
        h: fabSize + 12,
        r: radius.full,
      },
      tooltipTop: fabY - 160,
    },
    {
      copy: "This is Pip. Its size is what you're carrying; its posture is what you have left.",
      spot: { x: SCREEN_W / 2 - 120, y: heroY, w: 240, h: 240, r: radius.xl },
      tooltipTop: heroY + 260,
    },
    {
      copy: 'Two taps each evening keeps Pip honest. That’s the whole habit.',
      spot: {
        x: SCREEN_PADDING,
        y: heroY + 300,
        w: SCREEN_W - SCREEN_PADDING * 2,
        h: 64,
        r: radius.lg,
      },
      tooltipTop: heroY + 380,
    },
  ];

  const mark = marks[index];

  function next() {
    if (index < marks.length - 1) setIndex(index + 1);
    else router.replace('/(tabs)/home');
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Sandboxed Home behind the overlay. */}
      <View style={{ flex: 1, paddingTop: insets.top, paddingHorizontal: SCREEN_PADDING }}>
        <Txt variant="h4" style={{ height: 56, lineHeight: 56 }}>
          Morning, {profile.firstName}
        </Txt>
        <Habitat height={240} streak={0}>
          <Pip size={180} state="balanced" />
        </Habitat>
        <Card padding={14} style={{ marginTop: space[4] }}>
          <Txt variant="caption" color={colors.textSecondary}>
            Pressure
          </Txt>
          <CapacityBar value={30} fill={colors.pipState.balanced.silhouette} style={{ marginTop: space[1] }} />
          <Txt variant="caption" color={colors.textSecondary} style={{ marginTop: space[3] }}>
            Vitality
          </Txt>
          <CapacityBar value={70} fill={brand.secondary} style={{ marginTop: space[1] }} />
        </Card>
      </View>

      {/* Scrim built as four rects around the spotlight. */}
      <View style={{ ...StyleSheetAbsolute }} pointerEvents="box-none">
        <ScrimRect x={0} y={0} w={SCREEN_W} h={mark.spot.y} />
        <ScrimRect
          x={0}
          y={mark.spot.y + mark.spot.h}
          w={SCREEN_W}
          h={SCREEN_H - (mark.spot.y + mark.spot.h)}
        />
        <ScrimRect x={0} y={mark.spot.y} w={mark.spot.x} h={mark.spot.h} />
        <ScrimRect
          x={mark.spot.x + mark.spot.w}
          y={mark.spot.y}
          w={SCREEN_W - (mark.spot.x + mark.spot.w)}
          h={mark.spot.h}
        />

        {/* Spotlight ring. */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: mark.spot.x,
            top: mark.spot.y,
            width: mark.spot.w,
            height: mark.spot.h,
            borderRadius: mark.spot.r,
            borderWidth: 2,
            borderColor: brand.accent,
          }}
        />

        {/* Skip, top-right. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Skip tutorial"
          onPress={() => router.replace('/(tabs)/home')}
          style={{
            position: 'absolute',
            top: insets.top + space[2],
            right: SCREEN_PADDING,
            padding: space[3],
          }}
        >
          <Txt variant="h4" color={colors.onFill}>
            Skip
          </Txt>
        </Pressable>

        {/* Tooltip. */}
        <View
          style={[
            {
              position: 'absolute',
              left: SCREEN_PADDING,
              right: SCREEN_PADDING,
              top: Math.max(insets.top + 60, Math.min(mark.tooltipTop, SCREEN_H - 200)),
              backgroundColor: colors.card,
              borderRadius: radius.md,
              padding: 14,
              gap: space[3],
            },
            elevation[4],
          ]}
        >
          <Txt variant="bodyMd">{mark.copy}</Txt>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Txt variant="caption" color={colors.textSecondary}>
              {index + 1} of {marks.length}
            </Txt>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={index < marks.length - 1 ? 'Next' : 'Finish'}
              onPress={next}
              style={{ paddingVertical: space[2], paddingHorizontal: space[2] }}
            >
              <Txt variant="h4" color={colors.actionQuiet}>
                {index < marks.length - 1 ? 'Next' : 'Finish'}
              </Txt>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const StyleSheetAbsolute = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

function ScrimRect({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  if (w <= 0 || h <= 0) return null;
  return (
    <View
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        backgroundColor: colors.scrim,
      }}
    />
  );
}
