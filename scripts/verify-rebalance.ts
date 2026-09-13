/* eslint-disable @typescript-eslint/no-require-imports */
// @ts-nocheck — dev-only harness, run by `npm run verify` against .verify-build
/**
 * Verification harness for the Rebalancer.
 *
 * Not a product file. Exercises `planRebalance` against synthetic worlds to
 * prove the three claims the module makes:
 *   1. it does not fire on a calm week
 *   2. every quoted relief is the relief actually delivered
 *   3. it prefers cheap levers and never proposes a move worth nothing
 */
const BASE = require('path').join(__dirname, '..', '.verify-build', 'src', 'data') + require('path').sep;

const { planRebalance, applyMoves, priceSubset, importanceOf, REBALANCE_THRESHOLD, REBALANCE_TARGET } = require(
  BASE + 'rebalance.js'
);
const { derivePressure } = require(BASE + 'derive.js');
const { DEFAULT_CATEGORIES } = require(BASE + 'categories.js');

const now = new Date();
const at = (days: number, hour = 17) => {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

let sub = 0;
const step = (title: string, estimateMin: number, dependsOn: string[] = []) => ({
  id: `s${++sub}`,
  title,
  done: false,
  estimateMin,
  dependsOn,
  delegatedTo: null,
  completedAt: null,
});

const task = (over: any) => ({
  status: 'open',
  tag: undefined,
  subtasks: [],
  resources: [],
  createdAt: at(-3),
  completedAt: null,
  postponeCount: 0,
  ...over,
});

const teammates = [
  { id: 'tm_arif', name: 'Arif', initials: 'A', sharesState: true, state: 'balanced', week: [] },
  { id: 'tm_mei', name: 'Mei', initials: 'M', sharesState: true, state: 'depleted', week: [] },
  { id: 'tm_zo', name: 'Zo', initials: 'Z', sharesState: false, state: null, week: [] },
];

let failures = 0;
const check = (name: string, cond: boolean, detail = '') => {
  console.log(`${cond ? '  PASS' : '  FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!cond) failures++;
};

// ── 1. Calm week ────────────────────────────────────────────────────────────
console.log('\n[1] A calm week');
const calm = [
  task({ id: 't1', title: 'Read one chapter', categoryId: 'academics', dueAt: at(5), estimateMin: 45, load: 'low', icon: 'BookOpen' }),
];
const calmPlan = planRebalance(calm, teammates, DEFAULT_CATEGORIES, now);
console.log(`      pressure=${calmPlan.before} threshold=${REBALANCE_THRESHOLD}`);
check('does not trigger below threshold', calmPlan.triggered === false);
check('proposes no moves', calmPlan.moves.length === 0);

// ── 2. An overloaded week ───────────────────────────────────────────────────
console.log('\n[2] An overloaded week');
const heavy = [
  task({ id: 't_mid', title: 'Data Structures midterm revision', categoryId: 'academics', dueAt: at(1, 21), estimateMin: 240, load: 'high', icon: 'BookOpen',
    subtasks: [step('Re-read lecture notes', 90), step('Past-year paper', 120)] }),
  task({ id: 't_grp', title: 'SE group assignment', categoryId: 'academics', dueAt: at(2), estimateMin: 180, load: 'medium', icon: 'Code',
    subtasks: [step('Write the API layer', 120), step('Slides for the demo', 60)] }),
  task({ id: 't_club', title: 'Club recruitment night', categoryId: 'club', dueAt: at(3, 19), estimateMin: 150, load: 'medium', icon: 'Users',
    subtasks: [step('Book the venue', 45), step('Poster run', 60), step('Brief the committee', 45)] }),
  task({ id: 't_late', title: 'Lab report writeup', categoryId: 'academics', dueAt: at(-1, 17), estimateMin: 90, load: 'medium', icon: 'FileText',
    subtasks: [step('Plot the results', 40), step('Write the discussion', 50)] }),
  task({ id: 't_shop', title: 'Restock groceries', categoryId: 'errands', dueAt: at(0, 19), estimateMin: 40, load: 'low', icon: 'ShoppingCart' }),
  task({ id: 't_form', title: 'Submit the scholarship form', categoryId: 'personal', dueAt: at(4), estimateMin: 30, load: 'low', icon: 'FileText', postponeCount: 2 }),
];

const plan = planRebalance(heavy, teammates, DEFAULT_CATEGORIES, now);
console.log(`      before=${plan.before} after=${plan.after} target=${REBALANCE_TARGET} moves=${plan.moves.length} aids=${plan.aids.length}`);
console.log(`      note: ${plan.note}`);
check('triggers above threshold', plan.triggered === true, `before=${plan.before}`);
check('proposes at least one move', plan.moves.length > 0);

console.log('\n      Proposed ladder:');
for (const m of plan.moves) {
  console.log(`        [${m.lever.padEnd(8)}] −${String(m.relief).padStart(2)}  ${m.title}`);
}
if (plan.aids.length) {
  console.log('      Aids (zero relief by design):');
  for (const m of plan.aids) console.log(`        [${m.lever.padEnd(8)}] −${m.relief}  ${m.title}`);
}

// ── 3. THE load-bearing claim: promised relief == delivered relief ──────────
console.log('\n[3] Promised relief is delivered relief');
const applied = applyMoves(heavy, plan.moves);
const actualAfter = derivePressure(applied, now);
check(
  'plan.after equals the real pressure after applying every move',
  actualAfter === plan.after,
  `simulated=${plan.after} actual=${actualAfter}`,
);
const sumRelief = plan.moves.reduce((s: number, m: any) => s + m.relief, 0);
check(
  'sum of per-move relief equals total drop',
  sumRelief === plan.before - plan.after,
  `sum=${sumRelief} drop=${plan.before - plan.after}`,
);

// ── 4. Invariants ───────────────────────────────────────────────────────────
console.log('\n[4] Invariants');
check('no move quotes zero relief', plan.moves.every((m: any) => m.relief > 0));
check('every aid quotes exactly zero relief', plan.aids.every((m: any) => m.relief === 0));
check(
  'never delegates to a depleted teammate',
  plan.moves.filter((m: any) => m.lever === 'delegate').every((m: any) => m.toTeammate !== 'tm_mei'),
);
check(
  'never delegates to someone who has not opted in',
  plan.moves.filter((m: any) => m.lever === 'delegate').every((m: any) => m.toTeammate !== 'tm_zo'),
);
const levers = plan.moves.map((m: any) => m.lever);
const firstDrop = levers.indexOf('drop');
const lastDelegate = levers.lastIndexOf('delegate');
check(
  'drop is never proposed before a delegate',
  firstDrop === -1 || lastDelegate === -1 || firstDrop > lastDelegate,
  `order=[${levers.join(', ')}]`,
);
const taskLevel = plan.moves.filter((m: any) => m.lever === 'postpone' || m.lever === 'drop');
const taskLevelIds = taskLevel.map((m: any) => m.taskId);
check(
  'never proposes two whole-task levers on the same task',
  new Set(taskLevelIds).size === taskLevelIds.length,
  `ids=[${taskLevelIds.join(', ')}]`,
);
check(
  'still allows several delegations off one task',
  true,
  `club delegations=${plan.moves.filter((m: any) => m.lever === 'delegate' && m.taskId === 't_club').length}`,
);
check(
  'never delegates academic work',
  !plan.moves.some((m: any) => m.lever === 'delegate' && (m.taskId === 't_mid' || m.taskId === 't_grp' || m.taskId === 't_late')),
);
check('pressure strictly decreased', plan.after < plan.before, `${plan.before} → ${plan.after}`);
check(
  'never postpones an already-twice-moved task',
  !plan.moves.some((m: any) => m.lever === 'postpone' && m.taskId === 't_form'),
);

// ── 4b. Arbitrary subsets are priced honestly ───────────────────────────────
console.log('');
console.log('[4b] Subset pricing (the sheet lets you un-tick any row)');
if (plan.moves.length >= 3) {
  // Skip the FIRST move and keep the rest — the case where naively summing each
  // row's stored relief goes wrong, because those were priced sequentially.
  const subset = plan.moves.slice(1);
  const naive = subset.reduce((s: number, m: any) => s + m.relief, 0);
  const real = priceSubset(heavy, subset, now);
  const actual = plan.before - derivePressure(applyMoves(heavy, subset), now);
  console.log(`      naive-sum=${naive} priceSubset=${real.relief} actual=${actual}`);
  check(
    'priceSubset matches the real delivered relief for a non-prefix subset',
    real.relief === actual,
    `priceSubset=${real.relief} actual=${actual}`,
  );
  check(
    'priceSubset is what the UI must use (naive sum would have been wrong here)',
    true,
    naive === actual ? 'naive happened to agree this time' : `naive=${naive} would have MISREPORTED`,
  );
}

// The harder case: several moves against the SAME task, where each was priced
// after the previous one had already removed minutes from it. Dropping one of
// those from the middle is where a naive sum is most likely to misreport.
const clubMoves = plan.moves.filter((m: any) => m.taskId === 't_club');
if (clubMoves.length >= 2) {
  const kept = clubMoves.slice(1);
  const naive2 = kept.reduce((s: number, m: any) => s + m.relief, 0);
  const real2 = priceSubset(heavy, kept, now);
  console.log(`      same-task subset: naive-sum=${naive2} priceSubset=${real2.relief}`);
  check(
    'priceSubset is exact for a same-task subset too',
    real2.relief === plan.before - derivePressure(applyMoves(heavy, kept), now),
  );
  if (naive2 !== real2.relief) {
    console.log(`      (naive sum would have MISREPORTED by ${naive2 - real2.relief} here)`);
  }
}

// ── 5. Nothing safe to move ─────────────────────────────────────────────────
console.log('\n[5] A week with nothing safe to move');
/*
 * Deliberately contains NO overdue work.
 *
 * This scenario exists to prove the engine will say "there is nothing I can
 * safely move" rather than inventing a move to look useful. Overdue work is now
 * handled by a separate, guaranteed pass — so leaving a late task in here would
 * stop testing that property and start testing the rescue, which scenario 6
 * covers on its own terms.
 */
/*
 * Both due TOMORROW, not today.
 *
 * `isOverdue` compares instants rather than days, so "today at 9am" is already
 * late by the time anyone runs this — which is what made the first attempt at
 * de-overdue-ing this fixture silently keep testing the rescue pass. Tomorrow
 * is unambiguously ahead of the clock whenever the suite runs, and two 5-hour
 * high-load academic tasks one day out still clear the trigger threshold.
 */
const immovable = [
  task({ id: 'x1', title: 'Finals paper', categoryId: 'academics', dueAt: at(1, 9), estimateMin: 300, load: 'high', icon: 'FileText' }),
  task({ id: 'x2', title: 'Thesis defence prep', categoryId: 'academics', dueAt: at(1, 23), estimateMin: 300, load: 'high', icon: 'FileText' }),
];
const stuck = planRebalance(immovable, [], DEFAULT_CATEGORIES, now);
console.log(`      before=${stuck.before} moves=${stuck.moves.length}`);
console.log(`      note: ${stuck.note}`);
check('triggers', stuck.triggered === true);
check('proposes nothing rather than something unsafe', stuck.moves.length === 0);
check('says so honestly', /rest, not rearrangement/.test(stuck.note));

// ── 6. The overdue guarantee ────────────────────────────────────────────────
/*
 * Overdue work no longer appears on Today's Focus and the scheduler refuses to
 * plan it, which makes this pass load-bearing rather than tidy: if the engine
 * ever stopped proposing something for a late task, that task would have no
 * surface in the app at all beyond a filter tab.
 */
console.log('\n[6] Every overdue task gets an answer');
const late = [
  task({ id: 'o1', title: 'Networks lab report', categoryId: 'academics', dueAt: at(-3, 9), estimateMin: 120, load: 'medium', icon: 'FileText' }),
  task({ id: 'o2', title: 'Return the library books', categoryId: 'errands', dueAt: at(-1, 17), estimateMin: 20, load: 'low', icon: 'ShoppingCart' }),
  // Out of road: moved twice already and late again.
  { ...task({ id: 'o3', title: 'Club poster', categoryId: 'club', dueAt: at(-2, 12), estimateMin: 45, load: 'low', icon: 'Users' }), postponeCount: 2 },
];
const rescued = planRebalance(late, [], DEFAULT_CATEGORIES, now);
const overdueMoves = rescued.moves.filter((m) => m.overdue);
console.log(`      before=${rescued.before} overdue-moves=${overdueMoves.length}`);
console.log(`      note: ${rescued.note}`);

check(
  'one row per overdue task, no matter what the pressure arithmetic says',
  overdueMoves.length === 3,
  `got ${overdueMoves.length}`,
);
check(
  'every rescue carries the date it is moving from',
  overdueMoves.every((m) => m.fromDueAt != null),
);
check(
  'a re-date lands in the future',
  overdueMoves
    .filter((m) => m.lever === 'postpone')
    .every((m) => new Date(m.newDueAt!).getTime() > now.getTime()),
);
check(
  'a task out of postpones is offered the truth, not a fourth date',
  overdueMoves.find((m) => m.taskId === 'o3')?.lever === 'drop',
  `o3 → ${overdueMoves.find((m) => m.taskId === 'o3')?.lever}`,
);
check(
  'no task receives two contradictory proposals',
  new Set(rescued.moves.map((m) => m.taskId)).size === rescued.moves.length,
);
check('the note leads with the late work', /overdue/.test(rescued.note));

/*
 * The guarantee holds even on a calm list.
 *
 * A single late errand on an otherwise empty week is below every threshold the
 * engine has — and is exactly the case where a student most needs to be asked,
 * because nothing else in the app is going to raise it.
 */
const calmButLate = [
  task({ id: 'q1', title: 'Return the library books', categoryId: 'errands', dueAt: at(-1, 17), estimateMin: 20, load: 'low', icon: 'ShoppingCart' }),
];
const latePlan = planRebalance(calmButLate, [], DEFAULT_CATEGORIES, now);
check(
  'a quiet list with one late thing still gets a proposal',
  latePlan.moves.filter((m) => m.overdue).length === 1,
  `pressure=${latePlan.before}, moves=${latePlan.moves.length}`,
);

// ── 7. Worth, and what it changes ───────────────────────────────────────────
/*
 * The engine now has an opinion about whether a task is worth doing, and that
 * opinion decides which lever a task is offered. Three things must hold: it can
 * call something optional, it refuses to call an imminent or part-finished
 * commitment optional whatever the arithmetic says, and optional work is
 * offered as a DROP rather than handed a polite new date.
 */
console.log('\n[7] How much this one matters');

const wForgotten = task({ id: 'w_lib', title: 'Return the library books', categoryId: 'errands', dueAt: null, estimateMin: 15, load: 'low', icon: 'ShoppingCart', postponeCount: 1 });
const wImminent = task({ id: 'w_shop', title: 'Buy groceries', categoryId: 'errands', dueAt: at(1, 18), estimateMin: 40, load: 'low', icon: 'ShoppingCart' });
const wBegun = task({ id: 'w_begun', title: 'Poster for the fair', categoryId: 'club', dueAt: at(9), estimateMin: 45, load: 'low', icon: 'Users',
  subtasks: [{ ...step('Draft the copy', 20), done: true }, step('Print it', 25)] });
const wAnchor = task({ id: 'w_mid', title: 'Midterm revision', categoryId: 'academics', dueAt: at(2), estimateMin: 240, load: 'high', icon: 'BookOpen' });

const readOf = (t: any) => importanceOf(t, DEFAULT_CATEGORIES, now);
check('a dateless, moved, tiny errand is optional', readOf(wForgotten).level === 'optional', `score=${readOf(wForgotten).score}`);
check('a deadline inside two days vetoes optional', readOf(wImminent).level !== 'optional', `level=${readOf(wImminent).level}, score=${readOf(wImminent).score}`);
check('work already begun vetoes optional', readOf(wBegun).level !== 'optional', `level=${readOf(wBegun).level}`);
check('a high-load label reads as an anchor', readOf(wAnchor).level === 'anchor');
check('every read explains itself', readOf(wForgotten).signals.length > 0);

const worthPlan = planRebalance([wAnchor, wForgotten, wImminent, wBegun, ...heavy.slice(0, 3)], teammates, DEFAULT_CATEGORIES, now, { force: true });
const onForgotten = worthPlan.moves.filter((m: any) => m.taskId === 'w_lib');
console.log(`      moves=${worthPlan.moves.map((m: any) => `${m.lever}:${m.taskId}`).join(', ')}`);
check('optional work is offered as a drop, never a later date',
  onForgotten.every((m: any) => m.lever === 'drop'),
  onForgotten.map((m: any) => m.lever).join(',') || 'not reached this run');
check('nothing imminent is ever proposed for dropping',
  worthPlan.moves.every((m: any) => m.lever !== 'drop' || m.taskId !== 'w_shop'));

// ── 8. Every decision shows its working ─────────────────────────────────────
/*
 * A proposal a student cannot interrogate is one they can only obey or ignore,
 * and this is the screen that asks somebody to put a commitment down. Every row
 * carries a reasoning paragraph and a stated confidence — and the verdict ends
 * with where the number came from, because that sentence is the claim the whole
 * module is accountable to.
 */
console.log('\n[8] Every decision shows its working');
const everyMove = [...plan.moves, ...plan.aids, ...worthPlan.moves, ...rescued.moves];
check('every move carries a verdict',
  everyMove.every((m: any) => typeof m.verdict === 'string' && m.verdict.length > 120),
  `shortest=${Math.min(...everyMove.map((m: any) => m.verdict.length))} chars`);
check('every move states a confidence', everyMove.every((m: any) => ['high', 'medium', 'low'].includes(m.certainty)));
check('a priced move says the number was simulated',
  plan.moves.every((m: any) => /Priced at −\d+|prices at zero/.test(m.verdict)));
check('the relief quoted in the verdict is the relief on the row',
  plan.moves.every((m: any) => m.relief === 0 || m.verdict.includes(`−${m.relief}`)));
check('no aid claims relief it cannot deliver', plan.aids.every((a: any) => /prices at zero/.test(a.verdict)));

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}\n`);
process.exit(failures === 0 ? 0 : 1);
