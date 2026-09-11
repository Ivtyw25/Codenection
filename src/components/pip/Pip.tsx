/**
 * Pip — the mascot.
 *
 * Renders either one of the five LIVE capacity states (derived from the two
 * scores) or one of the authored journey poses. Everything is drawn
 * parametrically from `presets.ts`, and every state change is interpolated on
 * the UI thread with `--motion-pip` (600ms, gentle overshoot) so Pip reads as a
 * soft body settling rather than a value snapping.
 *
 * ── Deviation from spec, stated plainly ─────────────────────────────────────
 * `pip-mascot-identity.md` §1.4 specifies 3D matte-clay renders delivered as
 * Lottie/Rive with PNG fallbacks. Those are art assets and do not exist yet.
 * This component is a parametric SVG stand-in that preserves every *behaviour*
 * the spec requires — it genuinely inflates with Pressure, sags and desaturates
 * with Vitality, droops its sprout, and shows the lowest-sub-stat flourish.
 * When the real assets land, swap the internals of this file; the public props
 * are the seam and no calling screen needs to change.
 */

import { memo, useEffect, useMemo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

import { brand, colors, mascot, useMotion } from '@/theme';
import type { CriticalCause, PipPose, PipStateName, SubStat, TierName } from '@/types';
import {
  BODY,
  VIEWBOX,
  bodyPath,
  closedEyePath,
  eyePath,
  halfWidthAt,
  leafPath,
  mouthOPath,
  mouthPath,
  nubPath,
  rgb,
  stemPath,
  stemTip,
} from './shapes';
import { CORE_STATES, POSES, applySubStatFlourish, type PipVisual } from './presets';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);

const DEG = Math.PI / 180;

export interface PipProps {
  /** Rendered size in pt. The spec's delivery sizes are 220 / 132 / 88 / 44. */
  size: number;
  /** A live capacity state. Mutually exclusive with `pose`. */
  state?: PipStateName;
  /** Splits the Critical render into "about to pop" vs "running on empty". */
  criticalCause?: CriticalCause | null;
  /** Drives the flourish within the base state, per §1.3. */
  lowestSubStat?: SubStat;
  /** An authored journey pose. Takes precedence over `state`. */
  pose?: PipPose;
  /**
   * Tier accessories render REGARDLESS of current state — this is the
   * mechanism that stops a rough week feeling like it erased months (§1.5).
   */
  tier?: TierName;
  /**
   * Flat single-colour render with NO face — the shareable friends view only.
   * To recolour Pip while keeping its face (starter skins), use `bodyColor`.
   */
  silhouetteColor?: string;
  /**
   * Overrides the body colour while keeping the full face and sprout. Used by
   * the SCR-02 skin selector, where the choice is cosmetic and must never read
   * as a state change.
   */
  bodyColor?: string;
  style?: StyleProp<ViewStyle>;
  /** Announced to screen readers. State is never conveyed by colour alone. */
  accessibilityLabel?: string;
}

function resolveVisual(props: PipProps): PipVisual {
  if (props.silhouetteColor) return POSES.silhouette;
  if (props.pose) return POSES[props.pose];

  const state = props.state ?? 'balanced';
  const key =
    state === 'critical'
      ? props.criticalCause === 'pressure'
        ? 'criticalPressure'
        : 'criticalVitality'
      : state;

  const visual = CORE_STATES[key];
  return props.lowestSubStat ? applySubStatFlourish(visual, props.lowestSubStat) : visual;
}

/** Linear blend of two parameter vectors. Runs on the UI thread. */
function lerpVisual(a: PipVisual, b: PipVisual, t: number): PipVisual {
  'worklet';
  const n = (x: number, y: number) => x + (y - x) * t;
  return {
    ...b,
    widthK: n(a.widthK, b.widthK),
    heightK: n(a.heightK, b.heightK),
    baseK: n(a.baseK, b.baseK),
    topK: n(a.topK, b.topK),
    wideAt: n(a.wideAt, b.wideAt),
    tilt: n(a.tilt, b.tilt),
    eyeOpen: n(a.eyeOpen, b.eyeOpen),
    eyeDroop: n(a.eyeDroop, b.eyeDroop),
    eyeScale: n(a.eyeScale, b.eyeScale),
    eyeBow: n(a.eyeBow, b.eyeBow),
    eyeLookY: n(a.eyeLookY, b.eyeLookY),
    mouthCurve: n(a.mouthCurve, b.mouthCurve),
    mouthWidth: n(a.mouthWidth, b.mouthWidth),
    blush: n(a.blush, b.blush),
    sproutDroop: n(a.sproutDroop, b.sproutDroop),
    sproutScale: n(a.sproutScale, b.sproutScale),
    color: [n(a.color[0], b.color[0]), n(a.color[1], b.color[1]), n(a.color[2], b.color[2])],
  };
}

/** Derived face/body anchor points for a given parameter vector. */
function anchors(v: PipVisual) {
  'worklet';
  const w = BODY.w * v.widthK;
  const h = BODY.h * v.heightK;
  const eyeY = BODY.cy - h * 0.28 + v.eyeLookY;
  return {
    w,
    h,
    eyeY,
    eyeDx: w * 0.4,
    eyeRx: 4.6 * v.eyeScale,
    eyeRy: 5 * v.eyeScale,
    blushDx: w * 0.68,
    blushY: eyeY + 8.5,
    mouthY: eyeY + 12,
    crownY: BODY.cy - h,
  };
}

function PipComponent(props: PipProps) {
  const {
    size,
    tier = 'hatchling',
    silhouetteColor,
    bodyColor,
    style,
    accessibilityLabel,
  } = props;
  const motion = useMotion();

  const target = useMemo(
    () => resolveVisual(props),
    [props.state, props.pose, props.criticalCause, props.lowestSubStat, props.silhouetteColor],
  );

  // Cross-fade between the previous and the new parameter vector, rather than
  // holding ~20 individual shared values.
  const from = useSharedValue<PipVisual>(target);
  const to = useSharedValue<PipVisual>(target);
  const progress = useSharedValue(1);
  const idle = useSharedValue(0);

  useEffect(() => {
    from.value = lerpVisual(from.value, to.value, progress.value);
    to.value = target;
    progress.value = 0;
    progress.value = withTiming(1, motion.t('pip'));
  }, [target, motion.reduced]);

  // Idle loop. Speed follows Vitality — a depleted Pip literally moves slower.
  useEffect(() => {
    idle.value = 0;
    if (!motion.idleEnabled || target.idle === 'none' || target.idleSpeed <= 0) return;
    const period = 2000 / target.idleSpeed;
    idle.value = withRepeat(
      withTiming(1, { duration: period, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [target.idle, target.idleSpeed, motion.idleEnabled]);

  const v = useDerivedValue(() => lerpVisual(from.value, to.value, progress.value));

  // ── Whole-body transform: tilt, idle bob/hop/tremble/breathe ───────────────
  const containerStyle = useAnimatedStyle(() => {
    const cur = v.value;
    const phase = idle.value;
    let ty = 0;
    let tx = 0;
    let scale = 1;

    switch (cur.idle) {
      case 'bob':
        ty = -Math.sin(phase * Math.PI) * 2.2;
        break;
      case 'hop':
        ty = -Math.sin(phase * Math.PI) * 7;
        break;
      case 'tremble':
        tx = (phase - 0.5) * 1.6;
        break;
      case 'sleep':
        scale = 1 + Math.sin(phase * Math.PI) * 0.012;
        ty = Math.sin(phase * Math.PI) * 1;
        break;
      case 'breathe':
        scale = 1 + Math.sin(phase * Math.PI) * 0.03;
        break;
    }

    const unit = size / VIEWBOX;
    return {
      transform: [
        { translateX: tx * unit },
        { translateY: ty * unit },
        { rotate: `${cur.tilt}deg` },
        { scale },
      ],
    };
  });

  // ── Animated element props ────────────────────────────────────────────────
  const bodyProps = useAnimatedProps(() => {
    const cur = v.value;
    const a = anchors(cur);
    return {
      d: bodyPath({
        cx: BODY.cx,
        cy: BODY.cy,
        w: a.w,
        h: a.h,
        wideAt: cur.wideAt,
        topK: cur.topK,
        baseK: cur.baseK,
      }),
      fill: silhouetteColor ?? bodyColor ?? rgb(cur.color[0], cur.color[1], cur.color[2]),
    };
  });

  const outlineProps = useAnimatedProps(() => {
    const cur = v.value;
    const a = anchors(cur);
    const pulse = motion.idleEnabled ? 0.35 + Math.sin(idle.value * Math.PI) * 0.35 : 0.45;
    const grow = 2.5;
    return {
      d: bodyPath({
        cx: BODY.cx,
        cy: BODY.cy,
        w: a.w + grow,
        h: a.h + grow,
        wideAt: cur.wideAt,
        topK: cur.topK,
        baseK: cur.baseK,
      }),
      opacity: interpolate(
        progress.value,
        [0, 1],
        [from.value.outline ? pulse : 0, to.value.outline ? pulse : 0],
      ),
    };
  });

  const shadowProps = useAnimatedProps(() => {
    const a = anchors(v.value);
    return { rx: a.w * 0.82, ry: 3.2, opacity: 0.14 };
  });

  const leftEyeProps = useAnimatedProps(() => {
    const cur = v.value;
    const a = anchors(cur);
    return {
      d: eyePath({
        cx: BODY.cx - a.eyeDx,
        cy: a.eyeY,
        rx: a.eyeRx,
        ry: a.eyeRy,
        openness: cur.eyeOpen,
        droop: cur.eyeDroop,
      }),
      opacity: Math.min(1, cur.eyeOpen * 6),
    };
  });

  const rightEyeProps = useAnimatedProps(() => {
    const cur = v.value;
    const a = anchors(cur);
    return {
      d: eyePath({
        cx: BODY.cx + a.eyeDx,
        cy: a.eyeY,
        rx: a.eyeRx,
        ry: a.eyeRy,
        openness: cur.eyeOpen,
        droop: cur.eyeDroop,
      }),
      opacity: Math.min(1, cur.eyeOpen * 6),
    };
  });

  const leftClosedProps = useAnimatedProps(() => {
    const cur = v.value;
    const a = anchors(cur);
    return {
      d: closedEyePath(BODY.cx - a.eyeDx, a.eyeY, a.eyeRx, cur.eyeBow),
      opacity: 1 - Math.min(1, cur.eyeOpen * 6),
    };
  });

  const rightClosedProps = useAnimatedProps(() => {
    const cur = v.value;
    const a = anchors(cur);
    return {
      d: closedEyePath(BODY.cx + a.eyeDx, a.eyeY, a.eyeRx, cur.eyeBow),
      opacity: 1 - Math.min(1, cur.eyeOpen * 6),
    };
  });

  const highlightLeftProps = useAnimatedProps(() => {
    const cur = v.value;
    const a = anchors(cur);
    return {
      cx: BODY.cx - a.eyeDx - a.eyeRx * 0.34,
      cy: a.eyeY - a.eyeRy * 0.38,
      r: a.eyeRx * 0.28,
      opacity: Math.min(1, cur.eyeOpen * 6) * 0.9,
    };
  });

  const highlightRightProps = useAnimatedProps(() => {
    const cur = v.value;
    const a = anchors(cur);
    return {
      cx: BODY.cx + a.eyeDx - a.eyeRx * 0.34,
      cy: a.eyeY - a.eyeRy * 0.38,
      r: a.eyeRx * 0.28,
      opacity: Math.min(1, cur.eyeOpen * 6) * 0.9,
    };
  });

  const mouthProps = useAnimatedProps(() => {
    const cur = v.value;
    const a = anchors(cur);
    return {
      d: mouthPath(BODY.cx, a.mouthY, cur.mouthWidth, cur.mouthCurve),
      opacity: interpolate(
        progress.value,
        [0, 1],
        [from.value.mouthO ? 0 : 1, to.value.mouthO ? 0 : 1],
      ),
    };
  });

  const mouthOProps = useAnimatedProps(() => {
    const cur = v.value;
    const a = anchors(cur);
    return {
      d: mouthOPath(BODY.cx, a.mouthY, 2.6),
      opacity: interpolate(
        progress.value,
        [0, 1],
        [from.value.mouthO ? 1 : 0, to.value.mouthO ? 1 : 0],
      ),
    };
  });

  const blushLeftProps = useAnimatedProps(() => {
    const cur = v.value;
    const a = anchors(cur);
    return {
      cx: BODY.cx - a.blushDx,
      cy: a.blushY,
      rx: 5.2,
      ry: 3.1,
      opacity: cur.blush * 0.5,
    };
  });

  const blushRightProps = useAnimatedProps(() => {
    const cur = v.value;
    const a = anchors(cur);
    return {
      cx: BODY.cx + a.blushDx,
      cy: a.blushY,
      rx: 5.2,
      ry: 3.1,
      opacity: cur.blush * 0.5,
    };
  });

  const stemProps = useAnimatedProps(() => {
    const cur = v.value;
    const a = anchors(cur);
    return {
      d: stemPath(BODY.cx, a.crownY + 1, 11 * cur.sproutScale, cur.sproutDroop),
      strokeWidth: 2.1 * cur.sproutScale,
    };
  });

  /**
   * The hatchling and empty poses carry "a tiny single bud" rather than two
   * leaves. Rather than hiding the second leaf (which leaves a bare stem), the
   * pair collapses toward a single upright rounded bud as `sproutScale` drops.
   */
  const leafLeftProps = useAnimatedProps(() => {
    const cur = v.value;
    const a = anchors(cur);
    const tip = stemTip(BODY.cx, a.crownY + 1, 11 * cur.sproutScale, cur.sproutDroop);
    const bud = Math.min(1, Math.max(0, (0.75 - cur.sproutScale) / 0.3));
    const angle = (-140 - cur.sproutDroop * 80 + bud * 50) * DEG;
    const len = 8.2 * cur.sproutScale + bud * 2.4;
    const wid = 3.4 * cur.sproutScale + bud * 2.2;
    return { d: leafPath(tip.x, tip.y, angle, len, wid) };
  });

  const leafRightProps = useAnimatedProps(() => {
    const cur = v.value;
    const a = anchors(cur);
    const tip = stemTip(BODY.cx, a.crownY + 1, 11 * cur.sproutScale, cur.sproutDroop);
    const bud = Math.min(1, Math.max(0, (0.75 - cur.sproutScale) / 0.3));
    const angle = (-40 + cur.sproutDroop * 80 - bud * 50) * DEG;
    const len = 8.2 * cur.sproutScale + bud * 2.4;
    const wid = 3.4 * cur.sproutScale + bud * 2.2;
    return { d: leafPath(tip.x, tip.y, angle, len, wid), opacity: 1 - bud * 0.55 };
  });

  const sweatProps = useAnimatedProps(() => {
    const cur = v.value;
    const a = anchors(cur);
    return {
      cx: BODY.cx + a.eyeDx + a.eyeRx + 4,
      cy: a.eyeY - 4,
      r: 2.4,
      opacity: interpolate(
        progress.value,
        [0, 1],
        [from.value.sweat ? 0.85 : 0, to.value.sweat ? 0.85 : 0],
      ),
    };
  });

  const nubProps = useAnimatedProps(() => {
    const cur = v.value;
    const a = anchors(cur);
    const visible = cur.nub !== 'none';
    let angle = 0;
    let anchorY: number = BODY.cy;
    if (cur.nub === 'wave') {
      angle = -55 * DEG;
      anchorY = BODY.cy - a.h * 0.1;
    } else if (cur.nub === 'chin') {
      angle = -110 * DEG;
      anchorY = a.mouthY;
    } else if (cur.nub === 'up') {
      angle = -70 * DEG;
      anchorY = BODY.cy - a.h * 0.15;
    }
    return {
      d: nubPath(BODY.cx + a.w * 0.92, anchorY, angle, 8),
      opacity: visible ? 1 : 0,
      fill: bodyColor ?? rgb(cur.color[0], cur.color[1], cur.color[2]),
    };
  });

  const nubLeftProps = useAnimatedProps(() => {
    const cur = v.value;
    const a = anchors(cur);
    return {
      d: nubPath(BODY.cx - a.w * 0.92, BODY.cy - a.h * 0.15, -110 * DEG, 8),
      opacity: cur.nub === 'up' ? 1 : 0,
      fill: bodyColor ?? rgb(cur.color[0], cur.color[1], cur.color[2]),
    };
  });

  const zzzProps = useAnimatedProps(() => {
    const cur = v.value;
    const a = anchors(cur);
    const rise = motion.idleEnabled ? idle.value * 4 : 2;
    return {
      cx: BODY.cx + a.w * 0.75,
      cy: a.crownY + 4 - rise,
      r: 1.9,
      opacity: interpolate(
        progress.value,
        [0, 1],
        [from.value.zzz ? 0.55 : 0, to.value.zzz ? 0.55 : 0],
      ),
    };
  });

  const auraProps = useAnimatedProps(() => {
    const cur = v.value;
    const showAura = cur.aura || tier === 'guardian' || tier === 'elder';
    return { opacity: showAura ? (tier === 'elder' ? 0.4 : 0.28) : 0 };
  });

  /**
   * Tier accessory. Pip has no neck, so the scarf sits low on the body — well
   * clear of the face, which tier accessories must never occlude (§1.1).
   */
  const scarfProps = useAnimatedProps(() => {
    const cur = v.value;
    const a = anchors(cur);
    const show = cur.scarf || tier !== 'hatchling';
    const cy = BODY.cy + a.h * 0.62;
    // Measured against the real silhouette, then inset — a band that spans most
    // of the body reads as worn; one sized from the widest point pokes out, and
    // a narrow one reads as a second mouth.
    const halfW = halfWidthAt(
      { cx: BODY.cx, cy: BODY.cy, w: a.w, h: a.h, wideAt: cur.wideAt, topK: cur.topK, baseK: cur.baseK },
      cy,
    );
    return {
      cx: BODY.cx,
      cy,
      rx: halfW * 0.92,
      ry: 3.2,
      opacity: show ? 1 : 0,
    };
  });

  /** The scarf's knot, offset to one side so the band reads as tied. */
  const scarfKnotProps = useAnimatedProps(() => {
    const cur = v.value;
    const a = anchors(cur);
    const show = cur.scarf || tier !== 'hatchling';
    const cy = BODY.cy + a.h * 0.68;
    const halfW = halfWidthAt(
      { cx: BODY.cx, cy: BODY.cy, w: a.w, h: a.h, wideAt: cur.wideAt, topK: cur.topK, baseK: cur.baseK },
      cy,
    );
    return {
      cx: BODY.cx + halfW * 0.5,
      cy,
      r: 2.8,
      opacity: show ? 1 : 0,
    };
  });

  const isSilhouette = Boolean(silhouetteColor);

  return (
    <View
      style={[{ width: size, height: size }, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel ?? 'Pip'}
    >
      <Animated.View style={[{ width: size, height: size }, containerStyle]}>
        <Svg width={size} height={size} viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}>
          {/* Tier aura — persistent identity layer, drawn behind everything. */}
          <AnimatedG animatedProps={auraProps}>
            <Circle cx={BODY.cx} cy={BODY.cy} r={40} fill={brand.accent} />
          </AnimatedG>

          {/* Empty-state nest: a soft dotted outline suggesting space to fill. */}
          {target.nest && (
            <G opacity={0.5}>
              {Array.from({ length: 12 }).map((_, i) => {
                const a = (i / 12) * Math.PI * 2;
                return (
                  <Circle
                    key={i}
                    cx={BODY.cx + Math.cos(a) * 30}
                    cy={BODY.groundY - 2 + Math.sin(a) * 6}
                    r={1.1}
                    fill={colors.borderStrong}
                  />
                );
              })}
            </G>
          )}

          {/* Single soft contact shadow — grounds the weeble. */}
          <AnimatedEllipse
            animatedProps={shadowProps}
            cx={BODY.cx}
            cy={BODY.groundY}
            fill={colors.text}
          />

          {/* Faint pulsing outline — Critical only. */}
          <AnimatedPath
            animatedProps={outlineProps}
            fill="none"
            stroke={colors.pipState.critical.fill}
            strokeWidth={2.4}
          />

          {/* The body. */}
          <AnimatedPath animatedProps={bodyProps} />

          {!isSilhouette && (
            <>
              {/* Tier accessory — renders regardless of current state. */}
              {/* Lighter teal than the CTA shade: a dark band this close to the
                  face reads as a second mouth. */}
              <AnimatedEllipse animatedProps={scarfProps} fill={brand.secondary} />
              <AnimatedCircle animatedProps={scarfKnotProps} fill={brand.secondary} />

              <AnimatedEllipse animatedProps={blushLeftProps} fill={mascot.blush} />
              <AnimatedEllipse animatedProps={blushRightProps} fill={mascot.blush} />

              <AnimatedPath animatedProps={leftEyeProps} fill={colors.text} />
              <AnimatedPath animatedProps={rightEyeProps} fill={colors.text} />
              <AnimatedPath
                animatedProps={leftClosedProps}
                fill="none"
                stroke={colors.text}
                strokeWidth={1.9}
                strokeLinecap="round"
              />
              <AnimatedPath
                animatedProps={rightClosedProps}
                fill="none"
                stroke={colors.text}
                strokeWidth={1.9}
                strokeLinecap="round"
              />
              <AnimatedCircle animatedProps={highlightLeftProps} fill={mascot.highlight} />
              <AnimatedCircle animatedProps={highlightRightProps} fill={mascot.highlight} />

              <AnimatedPath
                animatedProps={mouthProps}
                fill="none"
                stroke={colors.text}
                strokeWidth={1.9}
                strokeLinecap="round"
              />
              <AnimatedPath animatedProps={mouthOProps} fill={colors.text} />

              <AnimatedCircle animatedProps={sweatProps} fill={colors.semantic.info.solid} />
              <AnimatedCircle animatedProps={zzzProps} fill={colors.textSecondary} />

              <AnimatedPath animatedProps={nubProps} />
              <AnimatedPath animatedProps={nubLeftProps} />
            </>
          )}

          {/* Sprout — the one persistent identity marker, and a health tell. */}
          <AnimatedPath
            animatedProps={stemProps}
            fill="none"
            stroke={brand.secondary}
            strokeLinecap="round"
          />
          <AnimatedPath animatedProps={leafLeftProps} fill={brand.secondary} />
          <AnimatedPath animatedProps={leafRightProps} fill={brand.secondary} />

          {/* Thinking-pose orbit dots. */}
          {target.thoughtDots && (
            <G>
              <Circle cx={BODY.cx + 16} cy={22} r={1.6} fill={colors.textSecondary} opacity={0.7} />
              <Circle cx={BODY.cx + 21} cy={17} r={2.2} fill={colors.textSecondary} opacity={0.5} />
              <Circle cx={BODY.cx + 27} cy={11} r={2.8} fill={colors.textSecondary} opacity={0.35} />
            </G>
          )}

          {/* Celebration sparkle burst. */}
          {target.sparkles && (
            <G>
              {[0, 60, 120, 180, 240, 300].map((deg) => {
                const a = deg * DEG;
                return (
                  <Circle
                    key={deg}
                    cx={BODY.cx + Math.cos(a) * 38}
                    cy={BODY.cy + Math.sin(a) * 38}
                    r={2.4}
                    fill={brand.accent}
                  />
                );
              })}
            </G>
          )}
        </Svg>
      </Animated.View>
    </View>
  );
}

export const Pip = memo(PipComponent);
