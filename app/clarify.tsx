import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, Sparkles } from 'lucide-react-native';

import { PipMascot } from '@/components/app';
import { Button, ErrorState, Interactive, Txt } from '@/components/ui';
import { processInbox } from '@/data/api';
import { questionsFor } from '@/data/clarify';
import { useApp } from '@/store/AppStore';
import { useNow, usePipState } from '@/store/selectors';
import { radius, space, status, useScheme } from '@/theme';
import type { CaptureId, ClarifyQuestion } from '@/types';

interface Bubble {
  id: string;
  from: 'pip' | 'user';
  text: string;
  /** Which capture this exchange is about — drawn as an eyebrow. */
  about?: string;
}

/** How long Pip "thinks" before each line. Long enough to read, short enough to sit through. */
const BEAT = 620;

/**
 * Triage, as a conversation.
 *
 * A capture is a sentence written in three seconds, and it reliably leaves out
 * the fact that decides the shape of the work — whether the deadline is real,
 * whether a step is already done, whether anyone else could take it. Breaking
 * it down without asking produces something confidently wrong, which costs the
 * student more than a vague plan: now they have to un-plan it.
 *
 * So this screen sits between Inbox and Review and asks one question per
 * capture. Every answer changes the proposal it belongs to — `applyAnswers` in
 * `src/data/clarify.ts` is where that happens, and it is the reason this is a
 * conversation rather than a progress bar.
 */
export default function ClarifyScreen() {
  const { ids } = useLocalSearchParams<{ ids: string }>();
  const router = useRouter();
  const scheme = useScheme();
  const now = useNow();
  const pip = usePipState();

  const { data, setReview, toast } = useApp();
  // Routing a fresh note is done against the user's own categories, so triage
  // files into the life they described rather than into a fixed taxonomy.
  const categories = data.categories;

  const sourceIds = useMemo(
    () => (ids ? ids.split(',').filter(Boolean) : []) as CaptureId[],
    [ids],
  );
  const notes = useMemo(
    () => data.inbox.filter((n) => sourceIds.includes(n.id)),
    [data.inbox, sourceIds],
  );
  const questions = useMemo(() => questionsFor(sourceIds), [sourceIds]);

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [thinking, setThinking] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scroller = useRef<ScrollView>(null);
  const seq = useRef(0);
  const nextId = () => `b${(seq.current += 1)}`;

  const say = useCallback((text: string, about?: string) => {
    setBubbles((b) => [...b, { id: `pip_${(seq.current += 1)}`, from: 'pip', text, about }]);
  }, []);

  /**
   * Drives Pip's side of the conversation.
   *
   * Every state change happens inside a timer callback rather than in the
   * effect body — the typing pause is the whole point, so there is nothing to
   * set synchronously anyway.
   */
  useEffect(() => {
    if (step >= questions.length) return;
    const q = questions[step];
    const first = step === 0;

    const opener = setTimeout(() => {
      if (!first) return;
      const n = notes.length;
      say(
        n === 1
          ? "One capture. Before I break it down, there's something I want to get right."
          : `${n} captures. Before I break these down, there are a few things I want to get right.`,
      );
    }, BEAT);

    // The first question waits out the opening line; later ones follow Pip's
    // acknowledgement of the previous answer.
    const ask = setTimeout(
      () => {
        setThinking(false);
        setBubbles((b) =>
          b.some((x) => x.id === `q_${q.id}`)
            ? b
            : [...b, { id: `q_${q.id}`, from: 'pip', text: q.prompt, about: q.about }],
        );
      },
      first ? BEAT * 2 : BEAT,
    );

    return () => {
      clearTimeout(opener);
      clearTimeout(ask);
    };
  }, [step, questions, notes.length, say]);

  const answer = useCallback(
    (q: ClarifyQuestion, optionId: string) => {
      const option = q.options.find((o) => o.id === optionId);
      if (!option) return;

      Haptics.selectionAsync().catch(() => {});
      setAnswers((a) => ({ ...a, [q.id]: optionId }));
      setBubbles((b) => [...b, { id: nextId(), from: 'user', text: option.label }]);

      // Pip acknowledges what the answer changed, then moves on.
      setThinking(true);
      setTimeout(() => {
        setThinking(false);
        say(option.reply);
        setStep((s) => s + 1);
      }, BEAT);
    },
    [say],
  );

  const done = step >= questions.length;

  const build = useCallback(async () => {
    if (notes.length === 0) return;
    setWorking(true);
    setError(null);
    try {
      const review = await processInbox(notes, categories, now, answers);
      setReview(review);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace('/review');
    } catch (e) {
      // The queue is untouched on failure — nothing is half-consumed.
      const message = (e as Error).message;
      setError(message);
      toast(message, 'danger');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setWorking(false);
    }
  }, [notes, categories, now, answers, setReview, router, toast]);

  /** Closing line once every question is answered. */
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => {
      setThinking(false);
      setBubbles((b) =>
        b.some((x) => x.id === 'closing')
          ? b
          : [
              ...b,
              {
                id: 'closing',
                from: 'pip',
                text: "That's everything I needed. Here's how I'd break it down.",
              },
            ],
      );
    }, BEAT * 2);
    return () => clearTimeout(t);
  }, [done]);

  if (notes.length === 0) {
    return (
      <View style={[styles.root, { backgroundColor: scheme.ground }]}>
        <ErrorState
          title="Nothing to process"
          body="Those captures are no longer in your inbox."
          action={{ label: 'Back to the inbox', onPress: () => router.replace('/inbox') }}
        />
      </View>
    );
  }

  const current = done ? null : questions[step];

  return (
    <View style={[styles.root, { backgroundColor: scheme.ground }]}>
      <View style={styles.head}>
        <Interactive
          accessibilityRole="button"
          accessibilityLabel="Back to the inbox"
          onPress={() => router.back()}
          radius="pill"
          hitSlop={8}
          style={styles.back}
        >
          <ChevronLeft size={20} color={scheme.text} />
        </Interactive>
        <View style={{ flex: 1 }}>
          <Txt variant="h4">A few questions first</Txt>
          <Txt variant="caption" muted>
            {done ? 'All answered' : `${step + 1} of ${questions.length}`} ·{' '}
            {notes.length} capture{notes.length === 1 ? '' : 's'}
          </Txt>
        </View>
      </View>

      <ScrollView
        ref={scroller}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}
      >
        {bubbles.map((b) =>
          b.from === 'pip' ? (
            <View key={b.id} style={styles.pipRow}>
              <PipMascot size={30} state={pip.name} />
              <View style={{ flex: 1, gap: space[1] }}>
                {b.about ? (
                  <Txt variant="caption" color={scheme.textDisabled} style={styles.eyebrow}>
                    {b.about.toUpperCase()}
                  </Txt>
                ) : null}
                <View
                  style={[
                    styles.bubble,
                    styles.pipBubble,
                    { backgroundColor: scheme.surface, borderColor: scheme.border },
                  ]}
                >
                  <Txt variant="bodySm">{b.text}</Txt>
                </View>
              </View>
            </View>
          ) : (
            <View key={b.id} style={styles.userRow}>
              <View
                style={[
                  styles.bubble,
                  styles.userBubble,
                  { backgroundColor: scheme.primary },
                ]}
              >
                <Txt variant="bodySm" color={scheme.onPrimary}>
                  {b.text}
                </Txt>
              </View>
            </View>
          ),
        )}

        {thinking ? (
          <View style={styles.pipRow}>
            <PipMascot size={30} state={pip.name} />
            <View
              style={[
                styles.bubble,
                styles.pipBubble,
                { backgroundColor: scheme.surface, borderColor: scheme.border },
              ]}
            >
              <Txt variant="bodySm" muted>
                …
              </Txt>
            </View>
          </View>
        ) : null}

        {error ? (
          <Txt variant="caption" color={status.danger.fg} style={{ marginTop: space[2] }}>
            {error}
          </Txt>
        ) : null}
      </ScrollView>

      {/* ── Answers ──────────────────────────────────────────────────────── */}
      <View style={[styles.footer, { borderTopColor: scheme.border }]}>
        {current && !thinking ? (
          <View style={{ gap: space[2] }}>
            {current.options.map((o) => (
              <Interactive
                key={o.id}
                accessibilityRole="button"
                accessibilityLabel={o.label}
                onPress={() => answer(current, o.id)}
                radius="md"
                style={[
                  styles.option,
                  { borderColor: scheme.primary, backgroundColor: scheme.surface },
                ]}
              >
                <Txt variant="bodySm" color={scheme.primary}>
                  {o.label}
                </Txt>
              </Interactive>
            ))}
          </View>
        ) : done && !thinking ? (
          <Button
            label="See the breakdown"
            fullWidth
            loading={working}
            icon={<Sparkles size={16} color={scheme.onPrimary} />}
            onPress={build}
          />
        ) : (
          <Txt variant="caption" muted style={{ textAlign: 'center' }}>
            Pip is thinking…
          </Txt>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingHorizontal: space[4],
    paddingTop: space[6],
    paddingBottom: space[3],
  },
  back: { padding: space[1] },
  scroll: { paddingHorizontal: space[4], paddingBottom: space[4], gap: space[3] },
  eyebrow: { letterSpacing: 0.8 },
  pipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2] },
  userRow: { alignItems: 'flex-end' },
  bubble: { paddingHorizontal: space[3], paddingVertical: space[2.5], borderRadius: radius.lg },
  pipBubble: { borderWidth: 1, borderTopLeftRadius: radius.sm, flexShrink: 1 },
  userBubble: { borderTopRightRadius: radius.sm, maxWidth: '82%' },
  option: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: space[3],
    paddingHorizontal: space[3],
    alignItems: 'center',
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: space[4],
    paddingTop: space[3],
    paddingBottom: space[6],
  },
});
