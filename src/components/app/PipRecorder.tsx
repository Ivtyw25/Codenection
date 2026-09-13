import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { PipMascot } from './PipMascot';
import { brand, easing, radius, useMotion } from '@/theme';

/** The four states the recorder can be in — mirrors `VoiceRecorder`'s own. */
export type RecorderPhase = 'idle' | 'recording' | 'transcribing' | 'error';

const PIP = 128;
const GLOW = 232;
/** Outer diameter the sound rings expand towards. */
const RING = 196;
/** Rings in flight at once. Three is enough to read as a cadence. */
const RINGS = 3;
const RING_PERIOD = 1900;

export interface PipRecorderProps {
  phase: RecorderPhase;
}

/**
 * Pip, listening.
 *
 * The recording screen's centrepiece: the mascot stands in for the microphone
 * that isn't there yet. This is deliberately a *presence* rather than a
 * readout — `api.transcribe` is still a stub and the level meter beside it is
 * still a loop, so nothing here claims to be showing amplitude. What it does
 * show is which of the four states the recorder is in, at a glance and from
 * across a room, which is what a demo needs and what a timer alone does not
 * give.
 *
 * Each phase gets its own motion signature:
 *
 *   idle          slow, shallow breathing — awake, waiting
 *   recording     faster breath plus sound rings pushing outward
 *   transcribing  a gentle bob, no rings — taken it in, thinking
 *   error         no idle motion at all; the copy carries it
 *
 * Every loop here is an idle loop, so all of them are gated on
 * `useMotion().idleEnabled` — under reduced motion Pip simply stands still
 * rather than running the same animation faster.
 */
export function PipRecorder({ phase }: PipRecorderProps) {
  const motion = useMotion();

  const scale = useSharedValue(1);
  const lift = useSharedValue(0);

  useEffect(() => {
    // Whatever the previous phase was running, it stops here. Every branch
    // below then starts only the motion its own phase owns.
    cancelAnimation(scale);
    cancelAnimation(lift);

    if (!motion.idleEnabled || phase === 'error') {
      scale.value = withTiming(1, { duration: 160, easing: easing.standard });
      lift.value = withTiming(0, { duration: 160, easing: easing.standard });
    } else if (phase === 'transcribing') {
      // A bob rather than a breath: the difference between "listening" and
      // "working on it" should be legible without reading the caption.
      scale.value = withTiming(1, { duration: 200, easing: easing.standard });
      lift.value = withRepeat(
        withSequence(
          withTiming(-7, { duration: 520, easing: easing.standard }),
          withTiming(0, { duration: 520, easing: easing.standard }),
        ),
        -1,
        true,
      );
    } else {
      lift.value = withTiming(0, { duration: 200, easing: easing.standard });

      const recording = phase === 'recording';
      const depth = recording ? 0.055 : 0.022;
      const period = recording ? 620 : 2000;

      scale.value = withRepeat(
        withSequence(
          withTiming(1 + depth, { duration: period, easing: easing.standard }),
          withTiming(1 - depth * 0.45, { duration: period, easing: easing.standard }),
        ),
        -1,
        true,
      );
    }

    return () => {
      cancelAnimation(scale);
      cancelAnimation(lift);
    };
  }, [phase, motion.idleEnabled, scale, lift]);

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: lift.value }],
  }));

  // Rings belong to recording alone — they are the one part of this that
  // asserts "something is going in", so they must not outlive the take.
  const ringing = phase === 'recording' && motion.idleEnabled;

  return (
    <View style={styles.root} accessibilityElementsHidden importantForAccessibility="no">
      {ringing
        ? Array.from({ length: RINGS }, (_, i) => <SoundRing key={i} index={i} />)
        : null}

      <Animated.View style={animated}>
        <PipMascot size={PIP} glow={GLOW} state={phase === 'error' ? 'strained' : 'balanced'} />
      </Animated.View>
    </View>
  );
}

/**
 * One expanding ring.
 *
 * Staggered by a third of the period each so the three read as a steady pulse
 * leaving the mascot rather than three rings breathing in unison.
 */
function SoundRing({ index }: { index: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      (RING_PERIOD / RINGS) * index,
      withRepeat(
        withTiming(1, { duration: RING_PERIOD, easing: Easing.out(Easing.quad) }),
        -1,
        false,
      ),
    );

    return () => cancelAnimation(progress);
  }, [index, progress]);

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: 0.58 + progress.value * 0.46 }],
    // Fades as it travels, so the edge of the field is never a hard stop.
    opacity: (1 - progress.value) * 0.33,
  }));

  return <Animated.View style={[styles.ring, animated]} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center', width: GLOW, height: GLOW },
  ring: {
    position: 'absolute',
    width: RING,
    height: RING,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: brand.lime,
  },
});
