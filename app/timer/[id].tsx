import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';
import { Check, Pause, Play, X } from 'lucide-react-native';

import { Button, EmptyState, IconButton, Screen, Txt } from '@/components/ui';
import { useApp } from '@/store/AppStore';
import { useTask } from '@/store/selectors';
import { space, status, useMotion, useScheme } from '@/theme';

const RING = 248;
const STROKE = 10;
const RADIUS = (RING - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * The recovery timer.
 *
 * For meditation, a nap and a reading block, the passing of the time IS the
 * task. A checkbox is a fine instrument for "email the supervisor" and a
 * terrible one for "sit still for twenty minutes", because the only thing that
 * makes the second one happen is something holding the time for you.
 *
 * ── What this screen deliberately does not have ────────────────────────────
 *
 * No streak. No count of sessions. No "you have meditated 4 days running".
 * Gamifying rest turns it into another thing to be behind on, and this app
 * already has a tab full of those — the entire proposition of a recovery block
 * is that it is the one thing on the rail you cannot fail at. The only numbers
 * here are the time remaining and, at the end, what it put back.
 *
 * ── Leaving early is a first-class outcome ─────────────────────────────────
 *
 * "Finish early" is a plain button, not a buried confirm-dialog, and it still
 * completes the task. Someone who sat for six of ten minutes rested; making
 * them either serve the full sentence or forfeit the credit would be the app
 * inventing a way to fail at lying down. The credit is the same because the
 * lift was never precise enough for four minutes to matter.
 */
export default function TimerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scheme = useScheme();
  const { reduced: reduceMotion, idleEnabled } = useMotion();

  const task = useTask(id);
  const { toggleTask, toast } = useApp();

  const total = task?.recovery?.timerSec ?? 0;
  /*
   * Seeded from the task and never reset by an effect.
   *
   * The screen is pushed fresh for each timer and the store is already loaded
   * by the time any route mounts (see `AppGate`), so `total` is correct on the
   * first render and a resetting effect would only be a second, later source of
   * truth for the same number.
   */
  const [left, setLeft] = useState(total);
  const [running, setRunning] = useState(true);
  const [done, setDone] = useState(false);

  const close = useCallback(() => router.back(), [router]);

  /**
   * Completing, from either end.
   *
   * `toggleTask` is the same action the checkbox anywhere else in the app uses,
   * which is what credits the sub-stat — see the `task/toggle` case in the
   * store. Routing completion through it rather than through a bespoke
   * "finish timer" action is what keeps one meaning of done.
   */
  const finish = useCallback(
    (early: boolean) => {
      if (!task || done) return;
      setDone(true);
      setRunning(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      toggleTask(task.id);
      const lift = task.recovery?.lift ?? 0;
      toast(
        early
          ? `Counted. +${lift} to ${task.recovery?.vitalId === 'rest' ? 'Rest' : 'your reserve'}`
          : `Done · +${lift} to your reserve`,
        'success',
      );
      router.back();
    },
    [task, done, toggleTask, toast, router],
  );

  /*
   * ── The clock ────────────────────────────────────────────────────────────
   *
   * Counted against a DEADLINE, not by decrementing a counter once per tick.
   *
   * The obvious implementation — `setInterval(() => setLeft(s => s - 1), 1000)`
   * — is wrong for exactly this screen. Intervals drift, and more importantly
   * they stop firing when the device sleeps or the app is backgrounded, which
   * is the single most likely thing to happen during a twenty-minute nap. A
   * counter would come back from a dark screen believing four minutes had
   * passed. A deadline is simply true whenever it is next read.
   *
   * The deadline is recomputed on every resume, so pausing genuinely holds the
   * time rather than letting it run on in the background.
   */
  const endAt = useRef<number>(0);
  /*
   * The latest `finish`, reachable from inside a long-lived interval.
   *
   * The interval is deliberately not restarted when `finish` changes identity —
   * doing so would reset the 250ms cadence on every render — so it reads the
   * callback through a ref that an effect keeps current.
   */
  const finishRef = useRef(finish);
  useEffect(() => {
    finishRef.current = finish;
  }, [finish]);

  useEffect(() => {
    if (!running || done) return;

    // Assigning a ref is not state, so the deadline can be established here
    // without kicking off a render.
    endAt.current = Date.now() + left * 1000;

    const id = setInterval(() => {
      const remaining = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setLeft(remaining);
      // Firing from inside the interval callback rather than from a second
      // effect watching `left` — the callback is already outside the render
      // pass, so completion happens once, where it is detected.
      if (remaining === 0) {
        clearInterval(id);
        finishRef.current(false);
      }
    }, 250);

    return () => clearInterval(id);
    // `left` is read to set the deadline but must not restart the interval on
    // every tick; the run is keyed on the pause state alone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, done]);

  // ── The ring ──────────────────────────────────────────────────────────────
  const progress = total > 0 ? left / total : 0;
  const offset = useSharedValue(0);

  useEffect(() => {
    // One second of linear travel per tick, so the ring sweeps smoothly rather
    // than stepping. Reduced motion snaps instead.
    offset.value = reduceMotion
      ? CIRCUMFERENCE * (1 - progress)
      : withTiming(CIRCUMFERENCE * (1 - progress), {
          duration: 950,
          easing: Easing.linear,
        });
  }, [progress, offset, reduceMotion]);

  // `useAnimatedProps`, not a memo around the shared value: the offset has to
  // be read on the UI thread each frame, which is the whole reason the ring
  // sweeps instead of stepping once a second with the React state.
  const animatedCircleProps = useAnimatedProps(() => ({
    strokeDashoffset: offset.value,
  }));

  /*
   * The breath.
   *
   * A six-second cycle — four in, four out is the usual advice and this is
   * deliberately slower than a resting rate, because something to follow that
   * is slightly slower than you are is what makes a person slow down. It is
   * decoration that does a job. Honoured against reduced motion: for a user who
   * has asked the OS for stillness, a pulsing disc for twenty minutes is not
   * calming, it is an affliction.
   */
  const breath = useSharedValue(1);
  useEffect(() => {
    if (!idleEnabled || !running || done) {
      cancelAnimation(breath);
      breath.value = withTiming(1, { duration: 300 });
      return;
    }
    breath.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(breath);
  }, [idleEnabled, running, done, breath]);

  const breathStyle = useAnimatedStyle(() => ({ transform: [{ scale: breath.value }] }));

  if (!task || !task.recovery?.timerSec) {
    return (
      <Screen>
        <EmptyState
          icon={<X size={28} color={scheme.textMuted} />}
          title="Nothing to time"
          body="This screen is for recovery blocks that run on a clock — a sit, a nap, a reading block."
          action={{ label: 'Go back', onPress: close }}
        />
      </Screen>
    );
  }

  const mins = Math.floor(left / 60);
  const secs = left % 60;

  return (
    <View style={[styles.root, { backgroundColor: scheme.ground }]}>
      <View style={styles.head}>
        <IconButton
          icon={<X size={18} color={scheme.text} />}
          accessibilityLabel="Leave the timer without finishing"
          size={40}
          onPress={close}
        />
      </View>

      <View style={styles.body}>
        <Txt variant="caption" muted style={styles.eyebrow}>
          RECOVERY
        </Txt>
        <Txt variant="h2" center>
          {task.title}
        </Txt>

        {/* ── The ring ───────────────────────────────────────────────────── */}
        <Animated.View style={[styles.ringWrap, breathStyle]}>
          <Svg width={RING} height={RING}>
            <Circle
              cx={RING / 2}
              cy={RING / 2}
              r={RADIUS}
              stroke={scheme.surfaceAlt}
              strokeWidth={STROKE}
              fill="none"
            />
            <AnimatedCircle
              cx={RING / 2}
              cy={RING / 2}
              r={RADIUS}
              stroke={status.success.solid}
              strokeWidth={STROKE}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={CIRCUMFERENCE}
              animatedProps={animatedCircleProps}
              // Start the sweep at twelve o'clock rather than three.
              transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
            />
          </Svg>

          <View
            style={styles.ringCentre}
            accessible
            accessibilityLabel={`${mins} minutes ${secs} seconds remaining. ${running ? 'Running' : 'Paused'}.`}
          >
            <Txt variant="h1" style={styles.clock}>
              {mins}:{`${secs}`.padStart(2, '0')}
            </Txt>
            <Txt variant="caption" muted>
              {running ? 'remaining' : 'paused'}
            </Txt>
          </View>
        </Animated.View>

        <Txt variant="bodySm" muted center style={styles.blurb}>
          {task.pipNote}
        </Txt>
      </View>

      <View style={styles.footer}>
        <Button
          label={running ? 'Pause' : 'Resume'}
          variant="secondary"
          fullWidth
          icon={
            running ? (
              <Pause size={16} color={scheme.primary} />
            ) : (
              <Play size={16} color={scheme.primary} />
            )
          }
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            setRunning((r) => !r);
          }}
        />
        {/*
          Finishing early counts, and says so on the button. A "Give up" framing
          — or a confirm dialog asking whether you are sure — would be the app
          inventing a way to fail at lying down.
        */}
        <Button
          label="Finish early — it still counts"
          variant="ghost"
          fullWidth
          icon={<Check size={16} color={scheme.primary} />}
          onPress={() => finish(true)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: space[3],
    paddingTop: space[10],
  },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[3], paddingHorizontal: space[6] },
  eyebrow: { letterSpacing: 1.4 },
  ringWrap: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center', marginTop: space[4] },
  ringCentre: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clock: { fontVariant: ['tabular-nums'], fontSize: 52, lineHeight: 60 },
  blurb: { marginTop: space[3] },
  footer: { gap: space[2], paddingHorizontal: space[4], paddingBottom: space[10] },
});
