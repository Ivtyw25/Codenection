import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, Check, Clock, Scissors, Sparkles, UserPlus, X } from 'lucide-react-native';

import { PipMascot } from '@/components/app';
import { Button, Card, Checkbox, EmptyState, IconButton, Txt } from '@/components/ui';
import { LEVER_COPY, groupByLever, priceSubset, type Move } from '@/data/rebalance';
import { useApp } from '@/store/AppStore';
import { useCapacity, useNow, usePipState, useRebalancePlan } from '@/store/selectors';
import { space, status, useScheme } from '@/theme';
import type { Lever } from '@/types';

const LEVER_ICON: Record<Lever, typeof Check> = {
  delegate: UserPlus,
  postpone: Clock,
  breakdown: Scissors,
  drop: X,
};

/**
 * The Rebalancer.
 *
 * The one screen in this app that asks a student to put something down, which
 * makes it the one screen where tone is load-bearing. Three rules govern it:
 *
 * NOTHING HAPPENS WITHOUT A TAP. The analysis is automatic; the consequences
 * never are. `planRebalance` has already decided what it *would* move, and this
 * screen's entire job is to make that legible enough to agree or disagree with.
 * An app that silently cancelled commitments would become one more thing to
 * anxiously check.
 *
 * EVERY MOVE SHOWS ITS COST. Each row says what it buys (−N) and what it costs,
 * in the same breath, at the same size. The temptation is to sell the relief and
 * whisper the price; that is how a wellbeing app ends up talking someone into
 * dropping something they needed. `Move.cost` is a required field for exactly
 * this reason.
 *
 * THE NUMBER IS REAL. The total at the bottom is not a sum of guesses — each
 * move was priced by simulating it through the same `derivePressure` the gauge
 * reads, so the figure promised here is the figure delivered on Apply.
 */
export default function RebalanceScreen() {
  const router = useRouter();
  const scheme = useScheme();

  const { data, applyRebalance, toast } = useApp();
  const now = useNow();
  const plan = useRebalancePlan();
  const capacity = useCapacity();
  const pip = usePipState();

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
   *
   * With today's pressure model the naive sum happens to agree — it is linear
   * in the minutes a move removes — and the verification harness confirms that.
   * But that is a property of the current arithmetic, not a promise, and this
   * screen's whole credibility rests on the button's number being the number
   * the gauge moves. So it asks the simulator, which is exact by construction
   * and stays exact if urgency or rounding ever stops being additive.
   */
  const { relief, after } = useMemo(
    () => priceSubset(data.tasks, accepted, now),
    [data.tasks, accepted, now],
  );

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
    router.back();
  };

  // Always every proposed move, never only the accepted ones. Grouping the
  // accepted subset would make a skipped row vanish the moment it was skipped,
  // and a decision you cannot see is a decision you cannot reverse.
  const groups = groupByLever(plan.moves);

  return (
    <View style={{ flex: 1, backgroundColor: scheme.ground }}>
      <View style={styles.head}>
        <IconButton
          icon={<ArrowLeft size={18} color={scheme.text} />}
          accessibilityLabel="Go back"
          size={40}
          onPress={() => router.back()}
        />
        <View style={{ flex: 1 }}>
          <Txt variant="caption" muted style={styles.eyebrow}>
            REBALANCE
          </Txt>
          <Txt variant="h4">What Pip would move</Txt>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── The read ──────────────────────────────────────────────────── */}
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

        {plan.moves.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Sparkles size={28} color={status.success.solid} />}
              title={plan.triggered ? 'Nothing safe to move' : 'Nothing needs moving'}
              body={
                plan.triggered
                  ? 'What is left is work only you can do, on deadlines that will not shift. Pip is not going to invent a rearrangement to look useful.'
                  : 'Your week is inside its limits. Pip will offer this again if that changes.'
              }
              action={{ label: 'Back', onPress: () => router.back() }}
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

            {/* ── What it adds up to ────────────────────────────────────── */}
            <Card
              style={[styles.summary, { borderColor: scheme.border }]}
              accessibilityLabel={`${accepted.length} of ${plan.moves.length} moves accepted. Pressure would go from ${plan.before} to ${after}.`}
            >
              <View style={styles.summaryRow}>
                <Txt variant="bodySm" muted style={{ flex: 1 }}>
                  {accepted.length} of {plan.moves.length}{' '}
                  {plan.moves.length === 1 ? 'move' : 'moves'}
                </Txt>
                <Txt variant="h3">
                  {plan.before}
                </Txt>
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
          </>
        )}

        {/* ── Aids ──────────────────────────────────────────────────────── */}
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
      </ScrollView>

      {plan.moves.length > 0 ? (
        <View style={[styles.footer, { backgroundColor: scheme.surface, borderTopColor: scheme.border }]}>
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
          <Txt variant="caption" muted center>
            Current pressure {capacity.pressure}. You can undo any of this afterwards.
          </Txt>
        </View>
      ) : null}
    </View>
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
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingHorizontal: space[4],
    paddingTop: space[10],
    paddingBottom: space[3],
  },
  eyebrow: { letterSpacing: 1 },
  scroll: { paddingHorizontal: space[4], paddingBottom: space[10], gap: space[4] },

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

  summary: { gap: space[2], borderWidth: 1 },
  summaryRow: { flexDirection: 'row', alignItems: 'baseline', gap: space[1] },

  aid: { gap: space[2], padding: space[3] },
  aidHead: { flexDirection: 'row', alignItems: 'center', gap: space[2] },

  footer: {
    gap: space[2],
    paddingHorizontal: space[4],
    paddingTop: space[3],
    paddingBottom: space[8],
    borderTopWidth: 1,
  },
});
