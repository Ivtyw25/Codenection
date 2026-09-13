import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Mic, Square } from 'lucide-react-native';

import { Button, Interactive, Txt } from '@/components/ui';
import { transcribe } from '@/data/api';
import { radius, space, status, useMotion, useScheme } from '@/theme';
import { PipRecorder } from './PipRecorder';

/** Bars in the level meter. Odd, so there is a centre to fall away from. */
const BARS = 15;

type Phase = 'idle' | 'recording' | 'transcribing' | 'error';

export interface VoiceRecorderProps {
  /** Called with the transcript once it lands. */
  onTranscript: (text: string, durationSec: number) => void;
}

/**
 * Voice capture — four states, one of them honest about being empty.
 *
 * There is no recorder behind this. `api.transcribe` is a stub, and the level
 * meter is a loop rather than an amplitude reading, so the component says so on
 * screen rather than implying a microphone it does not have. What IS real is
 * the state machine — idle, recording, transcribing, error — and the elapsed
 * timer. Dropping a speech service in should touch `api.transcribe` and the
 * meter's data source, and nothing else here.
 */
export function VoiceRecorder({ onTranscript }: VoiceRecorderProps) {
  const scheme = useScheme();
  const [phase, setPhase] = useState<Phase>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTicking = useCallback(() => {
    if (ticker.current) clearInterval(ticker.current);
    ticker.current = null;
  }, []);

  useEffect(() => stopTicking, [stopTicking]);

  const start = useCallback(() => {
    setError(null);
    setElapsed(0);
    setPhase('recording');
    ticker.current = setInterval(() => setElapsed((s) => s + 1), 1000);
  }, []);

  const stop = useCallback(async () => {
    stopTicking();
    const seconds = elapsed;
    setPhase('transcribing');
    try {
      const result = await transcribe(seconds);
      onTranscript(result.text, result.durationSec);
      setPhase('idle');
      setElapsed(0);
    } catch (e) {
      setError((e as Error).message);
      setPhase('error');
    }
  }, [elapsed, stopTicking, onTranscript]);

  return (
    <View style={styles.root}>
      {/*
        Pip leads every phase. It is the one element that does not move between
        states, which is what lets the states themselves read as changes in the
        mascot rather than as four unrelated screens.
      */}
      <PipRecorder phase={phase} />

      {phase === 'recording' ? (
        <>
          <LevelMeter />
          <Txt variant="display" style={styles.timer}>
            {formatElapsed(elapsed)}
          </Txt>
          <Interactive
            accessibilityRole="button"
            accessibilityLabel="Stop recording"
            onPress={stop}
            radius="pill"
            style={[styles.button, { backgroundColor: status.danger.bg, borderColor: status.danger.solid }]}
          >
            <Square size={26} color={status.danger.solid} fill={status.danger.solid} />
          </Interactive>
          <Txt variant="caption" muted center style={styles.hint}>
            No recorder behind this yet — the timer is real, the audio is not.
          </Txt>
        </>
      ) : phase === 'transcribing' ? (
        <>
          {/* Pip's bob is the progress indicator — a spinner beside it would
              be two things saying the same thing. */}
          <Txt variant="h3" center style={{ marginTop: space[2] }}>
            Making that out…
          </Txt>
          <Txt variant="caption" muted center style={styles.hint}>
            {formatElapsed(elapsed)} of audio
          </Txt>
        </>
      ) : phase === 'error' ? (
        <>
          <Txt variant="h3" center style={{ marginTop: space[2] }}>
            That didn&apos;t come through
          </Txt>
          <Txt variant="bodySm" muted center style={{ marginTop: space[2] }}>
            {error}
          </Txt>
          <View style={{ marginTop: space[5] }}>
            <Button label="Try again" variant="secondary" onPress={start} />
          </View>
        </>
      ) : (
        <>
          <Interactive
            accessibilityRole="button"
            accessibilityLabel="Start recording"
            onPress={start}
            radius="pill"
            style={[styles.button, { backgroundColor: scheme.secondary, borderColor: scheme.secondary }]}
          >
            <Mic size={30} color={scheme.onSecondary} />
          </Interactive>
          <Txt variant="h4" center style={{ marginTop: space[4] }}>
            Tap to start
          </Txt>
          <Txt variant="caption" muted center style={styles.hint}>
            Say it however it comes out. You can edit the transcript before saving.
          </Txt>
        </>
      )}
    </View>
  );
}

/**
 * The level meter.
 *
 * A loop, not an amplitude reading — see the component doc. It must stop
 * existing under reduced motion rather than merely running fast, which is the
 * rule `useMotion().idleEnabled` exists to enforce for every idle `withRepeat`
 * in this codebase (see `Skeleton` and `Spinner`).
 */
function LevelMeter() {
  const motion = useMotion();
  const scheme = useScheme();

  if (!motion.idleEnabled) {
    return (
      <View style={styles.meter} accessibilityElementsHidden importantForAccessibility="no">
        {Array.from({ length: BARS }, (_, i) => (
          <View
            key={i}
            style={[styles.bar, { height: staticHeight(i), backgroundColor: scheme.secondary }]}
          />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.meter} accessibilityElementsHidden importantForAccessibility="no">
      {Array.from({ length: BARS }, (_, i) => (
        <MeterBar key={i} index={i} />
      ))}
    </View>
  );
}

/** Resting silhouette: tallest in the middle, tapering out. */
function staticHeight(index: number): number {
  const fromCentre = Math.abs(index - (BARS - 1) / 2) / ((BARS - 1) / 2);
  return 10 + (1 - fromCentre) * 30;
}

function MeterBar({ index }: { index: number }) {
  const scheme = useScheme();
  const height = useSharedValue(staticHeight(index));

  useEffect(() => {
    const peak = staticHeight(index);
    // Neighbouring bars are offset so the row ripples rather than pulsing as
    // one block, which reads as a level meter instead of a loading bar.
    const period = 420 + (index % 5) * 90;
    height.value = withRepeat(
      withSequence(
        withTiming(peak * 0.35, { duration: period }),
        withTiming(peak, { duration: period }),
      ),
      -1,
      true,
    );
  }, [index, height]);

  const animated = useAnimatedStyle(() => ({ height: height.value }));

  return <Animated.View style={[styles.bar, { backgroundColor: scheme.secondary }, animated]} />;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${`${s}`.padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[6] },
  meter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[1.5],
    height: 44,
    marginBottom: space[5],
  },
  bar: { width: 4, borderRadius: radius.pill },
  timer: { fontVariant: ['tabular-nums'], marginBottom: space[4] },
  button: {
    width: 84,
    height: 84,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { marginTop: space[3], maxWidth: 280 },
});
