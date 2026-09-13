import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ArrowUp, Check, Moon, X } from 'lucide-react-native';

import { PipMascot } from '@/components/app';
import { Button, Chip, IconButton, Interactive, Txt } from '@/components/ui';
import { CHECKIN_HOUR, checkInOpen } from '@/data/calibration';
import {
  FELT_WORD,
  NUDGE,
  acknowledge,
  closing,
  combine,
  opening,
  probe,
  readAgreement,
  readFeeling,
  settle,
  shift,
  verify,
  type FeelingRead,
} from '@/data/conversation';
import { useApp } from '@/store/AppStore';
import { useCapacity, useCheckIn, useNow, usePipState } from '@/store/selectors';
import { radius, space, status, useScheme } from '@/theme';
import type { PipStateName } from '@/types';

/** Where the exchange has got to. Three answers, then it files what it heard. */
type Stage = 'open' | 'probe' | 'verify' | 'done';

interface Line {
  id: string;
  from: 'pip' | 'me';
  text: string;
}

/**
 * The end-of-day check-in.
 *
 * ── Why this is a screen and a conversation ────────────────────────────────
 *
 * It used to be a card on Home with five buttons on it, and it worked in the
 * narrow sense that people pressed the buttons. What it could not do was find
 * anything out. Every answer it was capable of receiving had been written by
 * the app in advance, which makes the exercise a survey of Pip's own
 * imagination — and the one thing this reading exists to supply is the half of
 * a student's day that arithmetic over a task list cannot see.
 *
 * So: a full screen, a keyboard, and a conversation. Pip states its reading and
 * the two numbers behind it, asks how the day actually landed, listens to
 * whatever comes back, asks one thing that follows from it, and then asks the
 * question the whole feature is named after — does the number match. Three
 * turns, in the student's own words.
 *
 * ── The rules it keeps from the card ───────────────────────────────────────
 *
 * ASKED ONCE A DAY. A wellbeing prompt you have already answered and which
 * comes back is not asking, it is nagging. Answering again corrects today's
 * entry rather than casting a second vote.
 *
 * NOTHING IS WRITTEN UNTIL THE END. A conversation abandoned halfway records
 * nothing. Half a reading is worse than none, because the calibration would
 * average it in as though it were a considered answer.
 *
 * IT SAYS WHAT IT HEARD, NOT WHAT IT THINKS. Every acknowledgement quotes the
 * student's own words back. No advice, no encouragement, no "you've got this" —
 * 9pm on a bad day is the moment somebody has least appetite for being managed,
 * and the app has not earned the right to comment on a day it only half knows.
 */
export default function CheckInScreen() {
  const router = useRouter();
  const scheme = useScheme();
  const insets = useSafeAreaInsets();
  const now = useNow();

  const { recordFeeling, toast } = useApp();
  const capacity = useCapacity();
  const pip = usePipState();
  const checkIn = useCheckIn();

  const [lines, setLines] = useState<Line[]>([]);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');
  const [stage, setStage] = useState<Stage>('open');

  /** The opener's read, kept so the follow-up can be allowed to overrule it. */
  const [first, setFirst] = useState<FeelingRead | null>(null);
  const [settled, setSettled] = useState<PipStateName | null>(null);
  /** Pip has already asked once for something it could read. It will not again. */
  const [nudged, setNudged] = useState(false);
  /** Everything the student typed, kept verbatim for the record. */
  const [heard, setHeard] = useState<string[]>([]);

  const scroller = useRef<ScrollView>(null);
  const alive = useRef(true);
  const seq = useRef(0);
  useEffect(() => () => { alive.current = false; }, []);

  const early = !checkInOpen(now);
  const computed = pip.name;

  const push = useCallback((from: Line['from'], text: string) => {
    seq.current += 1;
    setLines((current) => [...current, { id: `l${seq.current}`, from, text }]);
  }, []);

  /**
   * Pip taking a moment.
   *
   * The pause is not pretending to compute — the answer is a lexicon lookup and
   * it is instant. It is pacing: three paragraphs appearing in the same frame as
   * the student's own message reads as a form validating, and the thing this
   * screen is trying to be is a reply. The delay scales with the length of what
   * is being said, so a short acknowledgement lands quickly and a long question
   * arrives at something like reading speed.
   */
  const pipSays = useCallback(
    async (texts: string[]) => {
      for (const text of texts) {
        setTyping(true);
        await new Promise((r) => setTimeout(r, Math.min(1300, 420 + text.length * 9)));
        if (!alive.current) return;
        setTyping(false);
        push('pip', text);
        await new Promise((r) => setTimeout(r, 140));
        if (!alive.current) return;
      }
    },
    [push],
  );

  // The opener. Runs once, on arrival.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    pipSays(opening(computed, capacity.pressure, capacity.vitality));
    // Deliberately not reactive: the greeting is a snapshot of the moment the
    // screen opened, and a gauge that ticks mid-conversation must not rewrite
    // what Pip already said.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = useCallback(async () => {
    const text = draft.trim();
    if (text.length === 0 || typing || stage === 'done') return;

    Haptics.selectionAsync().catch(() => {});
    push('me', text);
    setDraft('');
    setHeard((h) => [...h, text]);

    if (stage === 'open') {
      const read = readFeeling(text);

      /*
       * It did not understand, and says so.
       *
       * Once. A parser that keeps asking until it gets a word it knows is an
       * interrogation, and the student would be right to close it — so the
       * second failure falls back to Pip's own reading, states that it is doing
       * so, and carries on to the question that can still be answered.
       */
      if (read.felt == null) {
        if (!nudged) {
          setNudged(true);
          await pipSays([NUDGE]);
          return;
        }
        const fallback: FeelingRead = { ...read, felt: computed };
        setFirst(fallback);
        setStage('probe');
        await pipSays([
          `I still cannot read a feeling out of that, so I am going to go with my own guess of ${FELT_WORD[computed]} and let you correct it.`,
          probe(computed),
        ]);
        return;
      }

      setFirst(read);
      setStage('probe');
      await pipSays([acknowledge(read), probe(read.felt)]);
      return;
    }

    if (stage === 'probe') {
      const second = readFeeling(text);
      const merged = combine(first ?? second, second);
      const felt = merged.felt ?? computed;
      setSettled(felt);
      setStage('verify');
      await pipSays([
        second.felt ? acknowledge(second) : 'Noted — that is the part the task list could not have told me.',
        verify(felt, computed, capacity.pressure, capacity.vitality),
      ]);
      return;
    }

    // The last turn. Only here does anything get written.
    const agreement = readAgreement(text);
    const base = settled ?? computed;
    const felt = agreement === 'heavier' ? shift(base, 1) : agreement === 'lighter' ? shift(base, -1) : base;

    setSettled(felt);
    setStage('done');
    recordFeeling(felt, computed, capacity.pressure, capacity.vitality, [...heard, text].join(' · '));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    await pipSays([settle(agreement, felt), closing(felt, computed)]);
  }, [draft, typing, stage, push, nudged, first, settled, heard, computed, capacity, pipSays, recordFeeling]);

  /** The composer is live only when there is something to send and Pip is not mid-sentence. */
  const ready = draft.trim().length > 0 && !typing;

  const placeholder = useMemo(() => {
    if (stage === 'open') return 'However today actually went…';
    if (stage === 'probe') return 'Say a bit more…';
    return 'Does that number match?';
  }, [stage]);

  // Already answered today. Re-opening is allowed — answering again corrects
  // the entry rather than adding a second one — but it should say so plainly
  // rather than pretending the first conversation did not happen.
  const answeredAlready = checkIn.answered && stage !== 'done';

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: scheme.ground }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* ── Head ──────────────────────────────────────────────────────────── */}
      <View style={[styles.head, { paddingTop: insets.top + space[2], borderBottomColor: scheme.border }]}>
        <PipMascot size={40} state={computed} />
        <View style={{ flex: 1, gap: space[0.5] }}>
          <Txt variant="h4">End of day</Txt>
          <Txt variant="caption" muted>
            {now.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </Txt>
        </View>
        <IconButton
          icon={<X size={18} color={scheme.textMuted} />}
          accessibilityLabel="Close without logging today"
          onPress={() => router.back()}
        />
      </View>

      <ScrollView
        ref={scroller}
        style={{ flex: 1 }}
        contentContainerStyle={styles.thread}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}
      >
        {/*
          Both of these are said before Pip opens its mouth, because they are
          conditions on the answer rather than part of it.
        */}
        {early ? (
          <Chip
            label={`Normally asked after ${CHECKIN_HOUR % 12 || 12}pm — a day this young has not happened yet`}
            size="sm"
            tone="warning"
            icon={<Moon size={11} color={status.warning.solid} />}
          />
        ) : null}
        {answeredAlready ? (
          <Chip label="You already logged today — this will replace that answer" size="sm" />
        ) : null}

        {lines.map((line) => (
          <Bubble key={line.id} line={line} state={computed} />
        ))}

        {typing ? <Typing /> : null}

        {stage === 'done' && settled ? (
          <Logged
            felt={settled}
            computed={computed}
            pressure={capacity.pressure}
            vitality={capacity.vitality}
            onDone={() => {
              toast('Logged for today · thanks for the honesty', 'success');
              router.back();
            }}
          />
        ) : null}
      </ScrollView>

      {/* ── Composer ──────────────────────────────────────────────────────── */}
      {stage === 'done' ? null : (
        <View
          style={[
            styles.composer,
            { borderTopColor: scheme.border, paddingBottom: insets.bottom + space[3] },
          ]}
        >
          <View style={[styles.field, { backgroundColor: scheme.surfaceAlt, borderColor: scheme.border }]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={placeholder}
              placeholderTextColor={scheme.textDisabled}
              style={[styles.input, { color: scheme.text }]}
              multiline
              maxLength={400}
              editable={!typing}
              onSubmitEditing={send}
              blurOnSubmit={false}
              accessibilityLabel="Your answer"
              returnKeyType="send"
            />
            <Interactive
              accessibilityRole="button"
              accessibilityLabel="Send"
              onPress={send}
              disabled={!ready}
              radius="pill"
              style={[
                styles.send,
                { backgroundColor: ready ? scheme.primary : scheme.surface },
              ]}
            >
              <ArrowUp size={18} color={ready ? scheme.onPrimary : scheme.textDisabled} />
            </Interactive>
          </View>
          <Txt variant="caption" muted>
            Type whatever is true. Pip reads it and files one reading — nothing else happens to it.
          </Txt>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

/** One message. Pip on the left with a face, the student on the right. */
function Bubble({ line, state }: { line: Line; state: PipStateName }) {
  const scheme = useScheme();
  const mine = line.from === 'me';

  return (
    <View style={[styles.row, mine && styles.rowMine]}>
      {mine ? null : (
        <View style={styles.face}>
          <PipMascot size={26} state={state} />
        </View>
      )}
      <View
        style={[
          styles.bubble,
          mine
            ? { backgroundColor: scheme.primary, borderBottomRightRadius: radius.sm }
            : { backgroundColor: scheme.surface, borderColor: scheme.border, borderWidth: 1, borderBottomLeftRadius: radius.sm },
        ]}
      >
        <Txt variant="bodySm" color={mine ? scheme.onPrimary : undefined}>
          {line.text}
        </Txt>
      </View>
    </View>
  );
}

function Typing() {
  const scheme = useScheme();
  return (
    <View style={styles.row} accessibilityLabel="Pip is typing">
      <View style={styles.face}>
        <PipMascot size={26} state="balanced" />
      </View>
      <View style={[styles.bubble, styles.typing, { backgroundColor: scheme.surface, borderColor: scheme.border }]}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.dot, { backgroundColor: scheme.textDisabled, opacity: 0.4 + i * 0.2 }]} />
        ))}
      </View>
    </View>
  );
}

/**
 * What was filed.
 *
 * Shown as a receipt rather than a celebration. The student has just described
 * a bad day to an app; the correct response is to show them exactly what it
 * wrote down and get out of the way.
 */
function Logged({
  felt,
  computed,
  pressure,
  vitality,
  onDone,
}: {
  felt: PipStateName;
  computed: PipStateName;
  pressure: number;
  vitality: number;
  onDone: () => void;
}) {
  const scheme = useScheme();
  const agreed = felt === computed;

  return (
    <View style={[styles.receipt, { backgroundColor: scheme.surfaceAlt, borderColor: scheme.border }]}>
      <View style={styles.receiptHead}>
        <Check size={15} color={status.success.solid} />
        <Txt variant="label" color={status.success.fg}>
          Logged for today
        </Txt>
      </View>
      <Txt variant="bodySm">
        Recorded as <Txt variant="bodySm" style={styles.semibold}>{FELT_WORD[felt]}</Txt>
        {agreed ? ', which is what Pip had too.' : `, against Pip's ${FELT_WORD[computed]}.`}
      </Txt>
      <Txt variant="caption" muted>
        The readings behind it — pressure {pressure}, reserve {vitality} — are kept with the entry,
        so a strange-looking correction later can be checked against the evening that produced it.
      </Txt>
      <Button label="Done" variant="primary" fullWidth onPress={onDone} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[4],
    paddingBottom: space[3],
    borderBottomWidth: 1,
  },

  thread: { padding: space[4], gap: space[2.5], paddingBottom: space[6] },

  row: { flexDirection: 'row', alignItems: 'flex-end', gap: space[2] },
  rowMine: { justifyContent: 'flex-end' },
  face: { width: 26 },
  bubble: {
    maxWidth: '82%',
    paddingVertical: space[2.5],
    paddingHorizontal: space[3],
    borderRadius: radius.lg,
  },

  typing: { flexDirection: 'row', gap: space[1], borderWidth: 1, paddingVertical: space[3] },
  dot: { width: 6, height: 6, borderRadius: radius.pill },

  composer: { borderTopWidth: 1, paddingHorizontal: space[4], paddingTop: space[3], gap: space[2] },
  field: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space[2],
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingLeft: space[3.5],
    paddingRight: space[1.5],
    paddingVertical: space[1.5],
  },
  input: { flex: 1, fontSize: 15, lineHeight: 21, maxHeight: 120, paddingVertical: space[1.5] },
  send: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },

  receipt: { gap: space[2], padding: space[3.5], borderRadius: radius.lg, borderWidth: 1, marginTop: space[2] },
  receiptHead: { flexDirection: 'row', alignItems: 'center', gap: space[1.5] },
  semibold: { fontWeight: '600' },
});
