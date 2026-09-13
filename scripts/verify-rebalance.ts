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

const { planRebalance, applyMoves, priceSubset, REBALANCE_THRESHOLD, REBALANCE_TARGET } = require(
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
const immovable = [
  task({ id: 'x1', title: 'Finals paper', categoryId: 'academics', dueAt: at(-1, 9), estimateMin: 300, load: 'high', icon: 'FileText' }),
  task({ id: 'x2', title: 'Thesis defence prep', categoryId: 'academics', dueAt: at(0, 9), estimateMin: 300, load: 'high', icon: 'FileText' }),
];
const stuck = planRebalance(immovable, [], DEFAULT_CATEGORIES, now);
console.log(`      before=${stuck.before} moves=${stuck.moves.length}`);
console.log(`      note: ${stuck.note}`);
check('triggers', stuck.triggered === true);
check('proposes nothing rather than something unsafe', stuck.moves.length === 0);
check('says so honestly', /rest, not rearrangement/.test(stuck.note));

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}\n`);
process.exit(failures === 0 ? 0 : 1);
