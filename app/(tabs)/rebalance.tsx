import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  ArrowRight,
  BookOpen,
  Brain,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Coffee,
  Footprints,
  Heart,
  MessageCircle,
  Moon,
  Radar,
  Scale,
  Scissors,
  Sparkles,
  Sun,
  TrendingDown,
  UserPlus,
  Wind,
  X,
} from 'lucide-react-native';

import { PipMascot } from '@/components/app';
import { Button, Card, Checkbox, Chip, EmptyState, Interactive, Txt } from '@/components/ui';
import { formatClock, formatDayHeading, formatDayName, formatDueShort, formatEstimate } from '@/data/format';
import { LEVER_COPY, groupByLever, priceSubset, type Move } from '@/data/rebalance';
import type { RecoveryIcon } from '@/data/recovery';
import { useApp } from '@/store/AppStore';
import {
  useCapacity,
  useNow,
  usePipState,
  useRebalancePlan,
  useRecoverySuggestions,
  type PlannedRecovery,
} from '@/store/selectors';
import { radius, space, status, useScheme } from '@/theme';
import type { Lever } from '@/types';

const LEVER_ICON: Record<Lever, typeof Check> = {
  delegate: UserPlus,
  postpone: Clock,
  breakdown: Scissors,
  drop: X,
};

const RECOVERY_ICON: Record<RecoveryIcon, typeof Check> = {
  Footprints,
  Wind,
  BookOpen,
  Moon,
  MessageCircle,
  Coffee,
  Sun,
};

/** Said plainly on the row, so a judgement never wears a fact's clothes. */
const CERTAINTY_TONE: Record<Move['certainty'], 'success' | 'warning' | 'neutral'> = {
  high: 'success',
  medium: 'neutral',
  low: 'warning',
};

/** How long the scan is held open before results appear. */
const SCAN_MS = 1100;

type Phase = 'idle' | 'scanning' | 'results';

/**
 * The Rebalancer.
 *
 * The one screen in this app that asks a student to put something down, which
 * makes it the one screen where tone is load-bearing. Four rules govern it:
 *
 * IT DOES NOT RUN UNTIL ASKED. This screen opens empty, with a button. That is
 * a deliberate reversal: the plan used to be computed on sight and announced
 * from a banner on Home, which meant a student could open the app on a heavy
 * Tuesday and be told, unprompted, that five of their commitments should go.
 * Being appraised without asking is its own small stress, and an app whose
 * premise is that it will not alarm you cannot lead with an unsolicited verdict
 * on your week. So the analysis is now something you *request* — one tap, a
 * full scan, and the findings are yours because you went looking for them.
 *
 * NOTHING HAPPENS WITHOUT A SECOND TAP. Scanning is not applying. The findings
 * are a proposal; `applyRebalance` runs only on the button at the bottom.
 *
 * EVERY MOVE SHOWS ITS COST. Each row says what it buys (−N) and what it costs,
 * in the same breath, at the same size. The temptation is to sell the relief and
 * whisper the price; that is how a wellbeing app ends up talking someone into
 * dropping something they needed. `Move.cost` is a required field for exactly
 * this reason.
 *
 * IT ADDS AS WELL AS SUBTRACTS. The four levers all take things away, and a
 * student who ran the whole plan used to end up with a lighter week and the
 * same empty reserve. The recovery section is the other half — a run, a walk, a
 * nap taken on purpose — each committable as a real scheduled block that
 * credits its sub-stat when it is actually done.
 *
 * THE NUMBER IS REAL. The total at the bottom is not a sum of guesses — each
 * move was priced by simulating it through the same `derivePressure` the gauge
 * reads, so the figure promised here is the figure delivered on Apply.
 */
export default function RebalanceScreen() {
  const router = useRouter();
  const scheme = useScheme();
  const insets = useSafeAreaInsets();

  const { data, applyRebalance, addRecovery, toast } = useApp();
  const now = useNow();
  const capacity = useCapacity();
  const pip = usePipState();

  const [phase, setPhase] = useState<Phase>('idle');

  /*
   * The plan is computed live, but only *revealed* after a scan.
   *
   * Deriving it continuously and gating the reveal keeps both properties that
   * matter: the student is never appraised without asking, and what they are
   * shown is priced against the task list as it stands this second rather than
   * against a snapshot taken when the button was pressed. A plan that went
   * stale between the scan and the tap would break the one promise this file
   * exists to keep.
   */
  const plan = useRebalancePlan(true);
  const recovery = useRecoverySuggestions();

  /*
   * Every move starts ACCEPTED.
   *
   * The opposite default — everything unticked, build your own plan — hands a
   * depleted person a fresh set of decisions, which is the exact tax this
   * screen exists to remove. Pip has already done the thinking; the student's
   * job is to veto what it got wrong, not to assemble it.
   */
  const [rejected, setRejected] = useState<Set<string>>(() => new Set());

  /**
   * What the last Apply actually did.
   *
   * ── Why the screen no longer closes ────────────────────────────────────────
   *
   * Applying used to send the student back to the idle state, which quietly
   * threw away the second half of the screen. A rebalance is two halves — take
   * things off, put something back — and the taking-off half is the one people
   * will do, because it is the one that lowers a number. Resetting the moment
   * that half completed meant the recovery blocks were dismissed by the very
   * act of agreeing with everything above them, and a student could run the
   * full plan every week and never once be offered rest.
   *
   * So Apply now stays put, states what it did, and hands the attention
   * downward. Nothing about the plan is stale: it is derived live, so the moves
   * that were applied simply stop being proposed a frame later.
   */
  const [applied, setApplied] = useState<{ moves: number; relief: number } | null>(null);

  /**
   * Recovery blocks the student has ticked but not yet committed.
   *
   * Starts EMPTY, which is the opposite of how the moves above default, and the
   * asymmetry is deliberate. A move takes something off the plan, so
   * pre-accepting it hands a depleted person a set of vetoes rather than a set
   * of decisions. A recovery block puts forty minutes ON the plan — pre-ticking
   * four of those would be the app committing two and a half hours of somebody
   * else's evening on their behalf, which is not the same act at all.
   */
  const [picked, setPicked] = useState<Set<string>>(() => new Set());

  /** Which move has its reasoning open. One at a time — this is a long screen. */
  const [reasoning, setReasoning] = useState<string | null>(null);

  /*
   * Where the recovery section starts, and the scroller that can get there.
   *
   * Saying "the blocks further down are the other half" and leaving somebody at
   * the top of a long screen is the same failure as navigating away, only
   * politer. After an apply the page takes them there.
   */
  const scroller = useRef<ScrollView>(null);
  const recoveryTop = useRef(0);

  const accepted = useMemo(
    () => plan.moves.filter((m) => !rejected.has(m.id)),
    [plan.moves, rejected],
  );

  /*
   * Re-simulated against the accepted subset — never summed from the rows.
   *
   * Each move's stored `relief` was priced sequentially, against the list as it
   * stood after every earlier accepted move. Those numbers therefore only add
   * up for the whole plan or a prefix of it; skip the first of three and the
   * other two are each quoting a saving measured in a world that no longer
   * happens.
   */
  const { relief, after } = useMemo(
    () => priceSubset(data.tasks, accepted, now),
    [data.tasks, accepted, now],
  );

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  /**
   * The scan.
   *
   * The delay is not fake work — the plan is already derived — but it is not
   * decoration either. Results that appear in the same frame as the tap read as
   * a menu that was always there; a beat of "looking at your week" is what makes
   * the findings land as something that was gone and looked for, which is what
   * the student actually asked for. It is also the only moment in this flow
   * where nothing is being demanded of them.
   */
  const scan = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setRejected(new Set());
    setPicked(new Set());
    setApplied(null);
    setReasoning(null);
    setPhase('scanning');
    timer.current = setTimeout(() => setPhase('results'), SCAN_MS);
  }, []);

  const toggle = (id: string) => {
    Haptics.selectionAsync().catch(() => {});
    setRejected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /**
   * Apply, and stay.
   *
   * The moves are committed and the screen keeps its place. What it shows a
   * frame later is a smaller plan — the applied moves are gone because the plan
   * is derived from the task list they just changed — plus a receipt and the
   * recovery section, which is the half of the rebalance nobody reaches if this
   * function navigates.
   */
  const commit = () => {
    if (accepted.length === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const moves = accepted.length;
    const saved = relief;
    applyRebalance(accepted);
    setApplied((prev) => ({
      moves: (prev?.moves ?? 0) + moves,
      relief: (prev?.relief ?? 0) + saved,
    }));
    setRejected(new Set());
    setReasoning(null);
    toast(`${moves} ${moves === 1 ? 'move' : 'moves'} applied · −${saved} pressure`, 'success');
    // A beat, so the receipt and the shorter plan have rendered before the
    // page moves — scrolling to a position measured against the old layout
    // lands somewhere arbitrary.
    setTimeout(
      () => scroller.current?.scrollTo({ y: Math.max(0, recoveryTop.current - 80), animated: true }),
      320,
    );
  };

  /**
   * Commit every ticked recovery block at once.
   *
   * ── Why it adds and does not start ─────────────────────────────────────────
   *
   * The timed actions used to open their timer the instant they were accepted,
   * on the argument that somebody who has just agreed to sit still for ten
   * minutes is as willing as they will ever be. That argument was wrong about
   * where it was being made. This is the screen where a student is triaging a
   * week that has gone over; being dropped into a ten-minute countdown mid-triage
   * ends the triage, and the other three things they were about to agree to
   * never happen.
   *
   * Agreeing to rest and choosing to rest right now are two different acts. This
   * does the first: the blocks land on the plan with their times, and they are
   * started from the task list like everything else — which is also where the
   * student will be when they actually have ten minutes.
   */
  const commitRecovery = () => {
    const chosen = recovery.filter((r) => picked.has(r.action.id));
    if (chosen.length === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const tasks = addRecovery(chosen);
    setPicked(new Set());
    toast(
      `${tasks.length} ${tasks.length === 1 ? 'block' : 'blocks'} added to your plan · start ${tasks.length === 1 ? 'it' : 'them'} from Tasks`,
      'success',
      { label: 'Open tasks', run: () => router.push('/tasks') },
    );
  };

  /** What the current ticks would actually cost in time. Shown on the button. */
  const pickedMinutes = recovery
    .filter((r) => picked.has(r.action.id))
    .reduce((sum, r) => sum + r.action.minutes, 0);

  const togglePicked = (id: string) => {
    Haptics.selectionAsync().catch(() => {});
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Always every proposed move, never only the accepted ones. Grouping the
  // accepted subset would make a skipped row vanish the moment it was skipped,
  // and a decision you cannot see is a decision you cannot reverse.
  const groups = groupByLever(plan.moves);
  const nothingToMove = plan.moves.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: scheme.ground }}>
      <ScrollView
        ref={scroller}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + space[4] }]}
        showsVerticalScrollIndicator={false}
      >
        <Txt variant="h1">Rebalance</Txt>

        {phase === 'idle' ? (
          <IdleState pressure={capacity.pressure} vitality={capacity.vitality} onScan={scan} />
        ) : phase === 'scanning' ? (
          <ScanningState />
        ) : (
          <>
            {/*
              ── What you just did ────────────────────────────────────────────

              Sits above the remaining plan rather than replacing it, and says
              out loud that the job is half finished. The line about the reserve
              is the whole reason this screen no longer navigates away: taking
              work off lowers Pressure and does nothing at all for Vitality, and
              a student who ran the plan and left would have a lighter week and
              exactly the same empty tank.
            */}
            {applied ? (
              <Card
                style={[styles.applied, { borderColor: status.success.solid, backgroundColor: status.success.bg }]}
              >
                <View style={styles.appliedHead}>
                  <Check size={16} color={status.success.solid} />
                  <Txt variant="h4" color={status.success.fg} style={{ flex: 1 }}>
                    {applied.moves} {applied.moves === 1 ? 'move' : 'moves'} applied · −{applied.relief} pressure
                  </Txt>
                </View>
                <Txt variant="bodySm" color={status.success.fg}>
                  That is the subtracting half done. Your reserve is still {capacity.vitality} — nothing above
                  moved it, because taking work off a week does not put anything back into the person carrying
                  it. The blocks further down are the other half.
                </Txt>
              </Card>
            ) : null}

            {/* ── The read ──────────────────────────────────────────────── */}
            <Card style={styles.intro}>
              <View style={styles.introHead}>
                <PipMascot size={64} state={pip.name} />
                <View style={{ flex: 1, gap: space[1] }}>
                  <Txt variant="h3">{pip.label}</Txt>
                  <Txt variant="bodySm" muted>
                    {plan.note}
                  </Txt>
                </View>
              </View>
            </Card>

            {nothingToMove ? (
              <Card>
                <EmptyState
                  icon={<Sparkles size={28} color={status.success.solid} />}
                  title={
                    plan.before <= plan.target ? 'Nothing needs moving' : 'Nothing safe to move'
                  }
                  body={
                    plan.before <= plan.target
                      ? 'Your week is inside its limits. Pip is not going to invent a rearrangement to look useful.'
                      : 'What is left is work only you can do, on deadlines that will not shift. That is not a failure of the scan — it is the honest answer.'
                  }
                />
              </Card>
            ) : (
              <>
                {groups.map((group) => (
                  <View key={group.lever} style={styles.group}>
                    <View style={styles.groupHead}>
                      <Txt variant="h4">{LEVER_COPY[group.lever].title}</Txt>
                      <Txt variant="caption" muted>
                        {LEVER_COPY[group.lever].blurb}
                      </Txt>
                    </View>

                    {group.moves.map((move) => (
                      <MoveRow
                        key={move.id}
                        move={move}
                        now={now}
                        accepted={!rejected.has(move.id)}
                        onToggle={() => toggle(move.id)}
                        open={reasoning === move.id}
                        onToggleReasoning={() =>
                          setReasoning((current) => (current === move.id ? null : move.id))
                        }
                      />
                    ))}
                  </View>
                ))}

                {/* ── What it adds up to ────────────────────────────────── */}
                <Card
                  style={[styles.summary, { borderColor: scheme.border }]}
                  accessibilityLabel={`${accepted.length} of ${plan.moves.length} moves accepted. Pressure would go from ${plan.before} to ${after}.`}
                >
                  <View style={styles.summaryRow}>
                    <Txt variant="bodySm" muted style={{ flex: 1 }}>
                      {accepted.length} of {plan.moves.length}{' '}
                      {plan.moves.length === 1 ? 'move' : 'moves'}
                    </Txt>
                    <Txt variant="h3">{plan.before}</Txt>
                    <Txt variant="bodySm" muted>
                      {'  →  '}
                    </Txt>
                    <Txt variant="h3" color={relief > 0 ? status.success.fg : scheme.textMuted}>
                      {after}
                    </Txt>
                  </View>
                  <Txt variant="caption" muted>
                    {relief > 0
                      ? `Pressure drops ${relief} ${relief === 1 ? 'point' : 'points'}. Nothing is applied until you tap below.`
                      : 'Nothing selected. Tick a move above to see what it would buy.'}
                  </Txt>
                </Card>

                <Button
                  label={
                    accepted.length === 0
                      ? 'Nothing selected'
                      : `Apply ${accepted.length} ${accepted.length === 1 ? 'move' : 'moves'} · −${relief}`
                  }
                  variant="primary"
                  fullWidth
                  disabled={accepted.length === 0}
                  icon={<Check size={16} color={scheme.onPrimary} />}
                  onPress={commit}
                />
              </>
            )}

            {/* ── Aids ──────────────────────────────────────────────────── */}
            {plan.aids.length > 0 ? (
              <View style={styles.group}>
                <View style={styles.groupHead}>
                  <Txt variant="h4">{LEVER_COPY.breakdown.title}</Txt>
                  <Txt variant="caption" muted>
                    {LEVER_COPY.breakdown.blurb}
                  </Txt>
                </View>
                {plan.aids.map((aid) => (
                  <Card key={aid.id} style={styles.aid}>
                    <View style={styles.aidHead}>
                      <Scissors size={15} color={scheme.textMuted} />
                      <Txt variant="bodySm" style={{ flex: 1 }}>
                        {aid.title}
                      </Txt>
                    </View>
                    <Txt variant="caption" muted>
                      {aid.reason}
                    </Txt>
                    <Button
                      label="Open the task"
                      variant="secondary"
                      size="sm"
                      onPress={() => router.push(`/task/${aid.taskId}`)}
                    />
                  </Card>
                ))}
              </View>
            ) : null}

            {/* ── Putting something back ────────────────────────────────── */}
            <View
              style={styles.group}
              onLayout={(e) => {
                recoveryTop.current = e.nativeEvent.layout.y;
              }}
            >
              <View style={styles.groupHead}>
                <View style={styles.recoveryTitle}>
                  <Heart size={15} color={status.success.solid} />
                  <Txt variant="h4">Build the reserve back</Txt>
                </View>
                <Txt variant="caption" muted>
                  {recovery.length > 0
                    ? 'Aimed at the sub-stats currently under their line, and dated against the days your plan says will be worst. Tick as many as you want — each one costs time and no pressure.'
                    : 'Nothing to suggest — every sub-stat is above the level it needs to hold.'}
                </Txt>
              </View>

              {recovery.map((suggestion) => (
                <RecoveryRow
                  key={suggestion.action.id}
                  suggestion={suggestion}
                  now={now}
                  picked={picked.has(suggestion.action.id)}
                  onToggle={() => togglePicked(suggestion.action.id)}
                />
              ))}

              {/*
                One button for the lot.

                These used to carry an Add on every card, which meant a week bad
                enough to need three of them cost three separate commitments,
                each one a fresh chance to decide that resting is indulgent.
                Ticking is cheap; the decision is made once, at the bottom.
              */}
              {recovery.length > 0 ? (
                <Button
                  label={
                    picked.size === 0
                      ? 'Pick what to put back'
                      : `Add ${picked.size} to my plan · ${formatEstimate(pickedMinutes)}`
                  }
                  variant={picked.size === 0 ? 'secondary' : 'primary'}
                  fullWidth
                  disabled={picked.size === 0}
                  disabledReason="Tick at least one block above"
                  icon={
                    <Heart
                      size={15}
                      color={picked.size === 0 ? scheme.textDisabled : scheme.onPrimary}
                    />
                  }
                  onPress={commitRecovery}
                  accessibilityHint="Schedules them on the days shown. They are started from your task list, like any other block."
                />
              ) : null}
            </View>

            <Button
              label="Scan again"
              variant="ghost"
              fullWidth
              icon={<Radar size={16} color={scheme.primary} />}
              onPress={scan}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

/**
 * Before the scan.
 *
 * Shows the two readings and nothing else — no count of what is wrong, no
 * preview of the findings. That restraint is the entire point of the phase: the
 * student is being offered an analysis, not handed one, and a screen that
 * leaked "we found 5 things" above the button would have already done the thing
 * it is asking permission to do.
 */
function IdleState({
  pressure,
  vitality,
  onScan,
}: {
  pressure: number;
  vitality: number;
  onScan: () => void;
}) {
  const scheme = useScheme();

  return (
    <Card style={styles.idle}>
      <View style={[styles.idleBadge, { backgroundColor: scheme.surfaceAlt }]}>
        <Scale size={26} color={scheme.primary} />
      </View>

      <Txt variant="h3" center>
        Check the week over
      </Txt>
      <Txt variant="bodySm" muted center>
        Pip will read every open task, every deadline and all four sub-stats, then say what could
        safely move and what would put something back. It proposes — nothing changes until you
        agree to it.
      </Txt>

      <View style={styles.idleReadings}>
        <View style={styles.idleReading}>
          <Txt variant="h2" color={status.warning.fg}>
            {pressure}
          </Txt>
          <Txt variant="caption" muted>
            Pressure
          </Txt>
        </View>
        <View style={[styles.idleDivider, { backgroundColor: scheme.border }]} />
        <View style={styles.idleReading}>
          <Txt variant="h2" color={status.success.fg}>
            {vitality}
          </Txt>
          <Txt variant="caption" muted>
            Vitality
          </Txt>
        </View>
      </View>

      <Button
        label="Scan my week"
        variant="primary"
        fullWidth
        icon={<Radar size={16} color={scheme.onPrimary} />}
        onPress={onScan}
      />
    </Card>
  );
}

function ScanningState() {
  const scheme = useScheme();

  return (
    <Card style={styles.idle} accessibilityLabel="Scanning your week">
      <ActivityIndicator color={scheme.primary} />
      <Txt variant="h4" center>
        Reading your week
      </Txt>
      <Txt variant="caption" muted center>
        Every open task, what it is waiting on, who has room, and where your reserve is thin.
      </Txt>
    </Card>
  );
}

/**
 * One recovery suggestion.
 *
 * ── What changed, and why ──────────────────────────────────────────────────
 *
 * The row used to say what it lifts and when it would happen, both true, and
 * neither of them an argument. A tired student looking at four wholesome
 * activities does not need to be told that walking is good for them; they need
 * a reason to believe this particular forty minutes is worth spending, tonight,
 * when everything else on the screen is about having too much to do.
 *
 * The reason exists and the app already computed it. `why` names the day this
 * sub-stat is projected to bottom out, what it bottoms out at, and what the
 * plan already puts on that day — so the row argues from the student's own
 * week rather than from general principles about wellbeing.
 *
 * The lift is still shown as a plus against one sub-stat and still the CAPPED
 * figure — what this would actually deliver given how far under the stat is.
 * Promising a nap would take Rest from 38 to 80 is the kind of thing tomorrow's
 * reading catches the app out on.
 */
function RecoveryRow({
  suggestion,
  now,
  picked,
  onToggle,
}: {
  suggestion: PlannedRecovery;
  now: Date;
  picked: boolean;
  onToggle: () => void;
}) {
  const scheme = useScheme();
  const Icon = RECOVERY_ICON[suggestion.action.icon];

  /*
   * The slot, from the real scheduler.
   *
   * "Add to my plan" is a promise about a day that may already be full, and a
   * row that made it without checking would be the one piece of this screen not
   * priced against reality. `plannedAt` comes from running the actual planner
   * over the actual task that would be created.
   */
  const when = suggestion.plannedAt
    ? `${formatDayHeading(suggestion.plannedAt, now).replace(/ · .*$/, '')} ${formatClock(suggestion.plannedAt)}`
    : 'no room left today';

  return (
    <Card style={[styles.recovery, picked && { borderColor: status.success.solid, borderWidth: 1 }]}>
      <View style={styles.recoveryHead}>
        <Checkbox
          checked={picked}
          onToggle={onToggle}
          accessibilityLabel={`${picked ? 'Picked' : 'Not picked'}. ${suggestion.action.title}. ${suggestion.why.text} Takes ${formatEstimate(suggestion.action.minutes)}, scheduled ${when.toLowerCase()}.`}
        />
        <View style={[styles.recoveryIcon, { backgroundColor: status.success.bg }]}>
          <Icon size={16} color={status.success.solid} />
        </View>
        <View style={{ flex: 1, gap: space[0.5] }}>
          <Txt variant="h4">{suggestion.action.title}</Txt>
          <Txt variant="caption" color={scheme.textSecondary}>
            {suggestion.action.blurb}
          </Txt>
        </View>
        <Txt variant="label" color={status.success.fg}>
          +{suggestion.lift}
        </Txt>
      </View>

      {/*
        The dated case. Shown open rather than behind a disclosure, because it
        is the only part of this card that answers "why would I".
      */}
      <View style={[styles.why, { backgroundColor: scheme.surfaceAlt }]}>
        <TrendingDown size={13} color={status.warning.solid} />
        <Txt variant="caption" color={scheme.textSecondary} style={{ flex: 1 }}>
          {suggestion.why.text}
        </Txt>
      </View>

      <View style={styles.recoveryMeta}>
        <Chip
          label={`${when.toLowerCase()} · ${formatEstimate(suggestion.action.minutes)}`}
          size="sm"
          icon={<CalendarClock size={11} color={scheme.textSecondary} />}
        />
        <Chip
          label={`${suggestion.reading.label} ${suggestion.reading.value}/${suggestion.reading.target}`}
          size="sm"
          tone="success"
        />
        {suggestion.why.dipAt ? (
          <Chip
            label={`worst ${formatDayName(suggestion.why.dipAt, now)} · ${suggestion.why.dipValue}`}
            size="sm"
            tone="warning"
          />
        ) : null}
      </View>
    </Card>
  );
}

/**
 * One proposed move.
 *
 * Announced as a single screen-reader stop carrying the whole trade — what it
 * does, why this task, what it buys and what it costs. Read child-by-child it
 * would be five stops, and the cost line is the one a hurrying user most needs
 * not to miss.
 */
function MoveRow({
  move,
  now,
  accepted,
  onToggle,
  open,
  onToggleReasoning,
}: {
  move: Move;
  now: Date;
  accepted: boolean;
  onToggle: () => void;
  open: boolean;
  onToggleReasoning: () => void;
}) {
  const scheme = useScheme();
  const Icon = LEVER_ICON[move.lever];

  return (
    <Card style={[styles.move, !accepted && styles.moveOff]}>
      <View style={styles.moveRow}>
        <Checkbox
          checked={accepted}
          onToggle={onToggle}
          accessibilityLabel={`${accepted ? 'Accepted' : 'Skipped'}. ${move.title}. ${move.reason} Saves ${move.relief} pressure. Cost: ${move.cost}`}
        />

        <View style={styles.moveBody}>
          <View style={styles.moveHead}>
            <Icon size={14} color={scheme.textMuted} />
            <Txt variant="h4" style={{ flex: 1 }}>
              {move.title}
            </Txt>
            {/*
              The Overdue label marks the rows that were generated by a
              different rule. The ladder proposes what it can afford to move;
              the rescue pass proposes something for EVERY late task whether or
              not the arithmetic needed it, and a student scanning the list
              deserves to know which of these they are looking at.
            */}
            {move.overdue ? <Chip label="Overdue" size="sm" tone="danger" variant="filled" /> : null}
            {/*
              The relief and the cost sit at the same weight, side by side. The
              temptation is to sell the saving and whisper the price — which is
              how an app talks someone out of something they needed.
            */}
            <Txt variant="label" color={status.success.fg}>
              −{move.relief}
            </Txt>
          </View>

          <Txt variant="caption" muted>
            {move.reason}
          </Txt>

          {/*
            The actual dates, not just the size of the jump.

            "Move it out 4 days" tells a student how big the change is and not
            what it is — and the question in their head is never "how many
            days?", it is "so when is this happening?". A row they have to do
            arithmetic on to answer that is a row they will agree to without
            really reading.
          */}
          {move.newDueAt ? (
            <View style={styles.dates}>
              <Txt variant="caption" color={scheme.textMuted} style={styles.strike}>
                {formatDueShort(move.fromDueAt ?? null, now)}
              </Txt>
              <ArrowRight size={11} color={scheme.textMuted} />
              <Txt variant="caption" color={status.success.fg}>
                {formatDueShort(move.newDueAt, now)}
              </Txt>
            </View>
          ) : null}

          <Txt variant="caption" color={scheme.textSecondary}>
            {move.cost}
          </Txt>

          {/*
            ── The reasoning ──────────────────────────────────────────────────

            Collapsed, because five open paragraphs is a wall of text handed to
            somebody who is already over capacity — and available, because a
            proposal you cannot interrogate is one you can only obey or ignore.
            This screen asks a student to put something down on the app's say-so,
            and "trust me" is not an argument.

            The certainty chip sits on the toggle rather than inside the
            paragraph so it is legible without opening anything. The relief
            figure beside it was simulated and is exact; whether this task
            should move at all is a judgement over six coarse signals, and the
            row should not present the two at the same confidence.
          */}
          <Interactive
            accessibilityRole="button"
            accessibilityLabel={
              open ? `Hide Pip's reasoning for ${move.title}` : `Why Pip proposed this: ${move.title}`
            }
            onPress={onToggleReasoning}
            radius="md"
            style={[styles.whyToggle, { backgroundColor: scheme.surfaceAlt }]}
          >
            <Brain size={13} color={scheme.primary} />
            <Txt variant="caption" color={scheme.primary} style={{ flex: 1 }}>
              {open ? 'Hide reasoning' : "Why Pip picked this"}
            </Txt>
            <Chip label={`${move.certainty} confidence`} size="sm" tone={CERTAINTY_TONE[move.certainty]} />
            {open ? (
              <ChevronUp size={13} color={scheme.primary} />
            ) : (
              <ChevronDown size={13} color={scheme.primary} />
            )}
          </Interactive>

          {open ? (
            <View style={[styles.verdict, { borderLeftColor: scheme.primary }]}>
              <Txt variant="caption" color={scheme.textSecondary}>
                {move.verdict}
              </Txt>
            </View>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space[4], paddingBottom: space[10], gap: space[4] },

  idle: { gap: space[3], alignItems: 'center', padding: space[5] },
  idleBadge: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idleReadings: { flexDirection: 'row', alignItems: 'center', gap: space[5] },
  idleReading: { alignItems: 'center', gap: space[0.5] },
  idleDivider: { width: 1, height: 32 },

  intro: { gap: space[3] },
  introHead: { flexDirection: 'row', alignItems: 'center', gap: space[3] },

  group: { gap: space[2] },
  groupHead: { gap: space[0.5], paddingHorizontal: space[1] },

  move: { padding: space[3] },
  // Skipped rows stay fully legible — they are still a decision the user may
  // reverse, not disabled chrome.
  moveOff: { opacity: 0.55 },
  moveRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },
  moveBody: { flex: 1, gap: space[1] },
  moveHead: { flexDirection: 'row', alignItems: 'center', gap: space[2] },

  applied: { gap: space[2], borderWidth: 1 },
  appliedHead: { flexDirection: 'row', alignItems: 'center', gap: space[2] },

  recoveryTitle: { flexDirection: 'row', alignItems: 'center', gap: space[1.5] },
  recovery: { gap: space[2], padding: space[3] },
  why: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[2],
    padding: space[2.5],
    borderRadius: radius.md,
  },
  whyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1.5],
    paddingVertical: space[2],
    paddingHorizontal: space[2.5],
    borderRadius: radius.md,
    marginTop: space[1],
  },
  verdict: {
    borderLeftWidth: 2,
    paddingLeft: space[2.5],
    paddingVertical: space[1],
    marginTop: space[1],
  },
  recoveryHead: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2.5] },
  recoveryMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: space[1.5] },
  dates: { flexDirection: 'row', alignItems: 'center', gap: space[1.5] },
  strike: { textDecorationLine: 'line-through' },
  recoveryIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  summary: { gap: space[2], borderWidth: 1 },
  summaryRow: { flexDirection: 'row', alignItems: 'baseline', gap: space[1] },

  aid: { gap: space[2], padding: space[3] },
  aidHead: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
});
