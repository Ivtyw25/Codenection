import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  BookOpen,
  Check,
  Clock,
  Coffee,
  Footprints,
  MessageCircle,
  Moon,
  Radar,
  Scale,
  Scissors,
  Sparkles,
  Sun,
  Timer,
  UserPlus,
  Wind,
  X,
} from 'lucide-react-native';

import { PipMascot } from '@/components/app';
import { Button, Card, Checkbox, EmptyState, Txt } from '@/components/ui';
import { formatEstimate } from '@/data/format';
import { LEVER_COPY, groupByLever, priceSubset, type Move } from '@/data/rebalance';
import type { RecoveryIcon, RecoverySuggestion } from '@/data/recovery';
import { useApp } from '@/store/AppStore';
import {
  useCapacity,
  useNow,
  usePipState,
  useRebalancePlan,
  useRecoverySuggestions,
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

  const commit = () => {
    if (accepted.length === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    applyRebalance(accepted);
    toast(
      `${accepted.length} ${accepted.length === 1 ? 'move' : 'moves'} applied · −${relief} pressure`,
      'success',
    );
    setPhase('idle');
  };

  const commitRecovery = (suggestion: RecoverySuggestion) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const task = addRecovery(suggestion);
    /*
     * Timed actions go straight into the timer.
     *
     * Somebody who has just agreed to sit still for ten minutes is, right now,
     * as willing as they are ever going to be. Making them find the row on a
     * list first is where that willingness goes to die.
     */
    if (task.recovery?.timerSec) {
      router.push({ pathname: '/timer/[id]', params: { id: task.id } });
      return;
    }
    toast(`“${suggestion.action.title}” added to today`, 'success', {
      label: 'Open',
      run: () => router.push(`/task/${task.id}`),
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
                        accepted={!rejected.has(move.id)}
                        onToggle={() => toggle(move.id)}
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
            <View style={styles.group}>
              <View style={styles.groupHead}>
                <Txt variant="h4">Build the reserve back</Txt>
                <Txt variant="caption" muted>
                  {recovery.length > 0
                    ? 'Aimed at the sub-stats currently under their line. Adding one puts a real block on today — it costs time, and no pressure.'
                    : 'Nothing to suggest — every sub-stat is above the level it needs to hold.'}
                </Txt>
              </View>

              {recovery.map((suggestion) => (
                <RecoveryRow
                  key={suggestion.action.id}
                  suggestion={suggestion}
                  onAdd={() => commitRecovery(suggestion)}
                />
              ))}
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
 * The lift is shown as a plus against the sub-stat it lands on, never as a
 * total wellbeing gain, and it is the capped figure — what this would actually
 * deliver given how far under the stat currently is. Promising a nap would take
 * Rest from 38 to 80 is the kind of thing tomorrow's reading catches the app
 * out on, and this is the last screen in the app that can afford to be caught.
 */
function RecoveryRow({
  suggestion,
  onAdd,
}: {
  suggestion: RecoverySuggestion;
  onAdd: () => void;
}) {
  const scheme = useScheme();
  const Icon = RECOVERY_ICON[suggestion.action.icon];
  const timed = suggestion.action.timerSec != null;

  return (
    <Card style={styles.recovery}>
      <View style={styles.recoveryHead}>
        <View style={[styles.recoveryIcon, { backgroundColor: status.success.bg }]}>
          <Icon size={16} color={status.success.solid} />
        </View>
        <View style={{ flex: 1, gap: space[0.5] }}>
          <Txt variant="h4">{suggestion.action.title}</Txt>
          <Txt variant="caption" muted>
            {formatEstimate(suggestion.action.minutes)} · {suggestion.reading.label}{' '}
            {suggestion.reading.value} of {suggestion.reading.target}
          </Txt>
        </View>
        <Txt variant="label" color={status.success.fg}>
          +{suggestion.lift}
        </Txt>
      </View>

      <Txt variant="caption" color={scheme.textSecondary}>
        {suggestion.action.blurb}
      </Txt>

      <Button
        label={timed ? 'Add and start' : 'Add to today'}
        variant="secondary"
        size="sm"
        icon={timed ? <Timer size={14} color={scheme.primary} /> : undefined}
        onPress={onAdd}
        accessibilityHint={
          timed
            ? 'Adds a timed block to today and opens its timer'
            : 'Adds a block to today. It takes time but adds no pressure.'
        }
      />
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
  accepted,
  onToggle,
}: {
  move: Move;
  accepted: boolean;
  onToggle: () => void;
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
          <Txt variant="caption" color={scheme.textSecondary}>
            {move.cost}
          </Txt>
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

  recovery: { gap: space[2], padding: space[3] },
  recoveryHead: { flexDirection: 'row', alignItems: 'center', gap: space[2.5] },
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
