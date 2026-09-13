/* eslint-disable @typescript-eslint/no-require-imports */
// @ts-nocheck — dev-only harness, run by `npm run verify` against .verify-build
/**
 * Verification harness for the two halves the Rebalancer grew: the recovery
 * catalogue, and the calibration loop that lets a student tell the score it is
 * wrong.
 *
 * Same shape as `verify-rebalance.ts` and for the same reason — these are pure
 * functions that decide what a wellbeing app tells someone about their own
 * week, and "it looked right on the screen" is not a standard of evidence for
 * that. Run against the CommonJS build in `.verify-build`; see
 * `tsconfig.verify.json`.
 *
 * The properties asserted here are the promises the UI makes in words:
 *
 *   A recovery suggestion never promises more lift than the distance to the
 *   mark, because tomorrow's reading would catch it out.
 *
 *   Rest is weightless. A recovery block costs time and never Pressure, or the
 *   app would be charging someone for agreeing to rest.
 *
 *   Calibration bends slowly, symmetrically, and never far. A model that could
 *   be talked into calling a critical week fine is the failure mode that
 *   actually hurts somebody.
 */
const BASE = require('path').join(__dirname, '..', '.verify-build', 'src', 'data') + require('path').sep;

const { biasFrom, recordCheckIn, calibrationNote, EMPTY_CALIBRATION, MAX_BIAS } = require(
  BASE + 'calibration.js',
);
const { suggestRecovery, RECOVERY_CATALOGUE, takenActions } = require(BASE + 'recovery.js');
const { readVitals, DEFAULT_VITALITY_MODEL, deriveVitality, taskPressure } = require(
  BASE + 'derive.js',
);

let fails = 0;
function ok(name: string, cond: boolean, detail = '') {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!cond) fails++;
}

const entry = (felt: string, computed: string, i: number) => ({
  date: `2026-09-${String(i + 1).padStart(2, '0')}`,
  felt,
  computed,
  pressure: 60,
  vitality: 55,
});

// ── 1. The bias ─────────────────────────────────────────────────────────────
console.log('\n[1] Calibration bias');

ok('no check-ins means no correction', biasFrom([]) === 0);

ok(
  'agreeing repeatedly leaves the model alone',
  biasFrom([
    entry('strained', 'strained', 0),
    entry('strained', 'strained', 1),
    entry('strained', 'strained', 2),
  ]) === 0,
);

const worse = biasFrom([
  entry('depleted', 'strained', 0),
  entry('depleted', 'strained', 1),
  entry('depleted', 'strained', 2),
]);
ok('feeling worse than computed lowers the reserve', worse < 0, `bias=${worse}`);

const better = biasFrom([
  entry('balanced', 'wilting', 0),
  entry('balanced', 'wilting', 1),
  entry('balanced', 'wilting', 2),
]);
ok('feeling better than computed raises it', better > 0, `bias=${better}`);

ok('the correction is symmetric', Math.abs(worse) > 0 && Math.abs(better) > 0);

const extreme = biasFrom(Array.from({ length: 14 }, (_, i) => entry('critical', 'balanced', i)));
ok(
  'cannot be talked past the ceiling',
  Math.abs(extreme) <= MAX_BIAS,
  `bias=${extreme}, cap=${MAX_BIAS}`,
);

const oneBadDay = biasFrom([
  entry('balanced', 'balanced', 0),
  entry('balanced', 'balanced', 1),
  entry('critical', 'balanced', 2),
]);
ok(
  'one rough day is damped, not obeyed',
  Math.abs(oneBadDay) < Math.abs(extreme),
  `single=${oneBadDay} vs sustained=${extreme}`,
);

// ── 2. One answer per day ───────────────────────────────────────────────────
console.log('\n[2] One answer per day');

let cal = EMPTY_CALIBRATION;
cal = recordCheckIn(cal, entry('depleted', 'balanced', 0));
cal = recordCheckIn(cal, entry('balanced', 'balanced', 0));
ok('a second answer the same day replaces the first', cal.entries.length === 1, `entries=${cal.entries.length}`);
ok('and the bias follows the replacement', cal.vitalityBias === 0, `bias=${cal.vitalityBias}`);

let windowed = EMPTY_CALIBRATION;
for (let i = 0; i < 30; i++) windowed = recordCheckIn(windowed, entry('strained', 'strained', i % 28));
ok('the window is bounded', windowed.entries.length <= 14, `entries=${windowed.entries.length}`);

// ── 3. What it says out loud ────────────────────────────────────────────────
console.log('\n[3] The note');

ok('says nothing before it has been told anything', calibrationNote(EMPTY_CALIBRATION) === null);

let many = EMPTY_CALIBRATION;
for (let i = 0; i < 5; i++) many = recordCheckIn(many, entry('depleted', 'strained', i));
const note: string = calibrationNote(many) ?? '';
ok('speaks once it has a window', note.includes('5 check-ins'), note.slice(0, 72) + '…');
ok('and states the direction it corrected', note.includes('lower'), '');

// ── 4. Recovery suggestions ─────────────────────────────────────────────────
console.log('\n[4] Recovery suggestions');

const vitals = [
  { id: 'rest', label: 'Rest & Sleep', value: 38, note: '' },
  { id: 'mood', label: 'Mood & Stress', value: 45, note: '' },
  { id: 'physical', label: 'Physical Vitality', value: 30, note: '' },
  { id: 'social', label: 'Social Connection', value: 41, note: '' },
];
const readings = readVitals(vitals, DEFAULT_VITALITY_MODEL, []);
const suggestions = suggestRecovery(readings);

ok('offers something when sub-stats are under', suggestions.length > 0, `${suggestions.length} suggestions`);
/*
 * Ordered by DISTANCE BELOW THE MARK, not by raw value.
 *
 * Worth stating as a property rather than as an expected id, because the two
 * come apart exactly where it matters: with Rest at 38/75 and Physical at
 * 30/65, the lower number is Physical and the sub-stat actually further from
 * where it needs to be is Rest. Sorting on the raw reading would put the
 * wrong one first every time the marks differ, which is always.
 */
const gaps = suggestions.map(
  (s: { reading: { value: number; target: number } }) => s.reading.value - s.reading.target,
);
ok(
  'suggestions run weakest-first by distance below the mark',
  gaps.every((g: number, i: number) => i === 0 || gaps[i - 1] <= g),
  `gaps=[${gaps.join(', ')}]`,
);
ok(
  'and the first one is the furthest under',
  gaps[0] === Math.min(...gaps),
  `first=${suggestions[0].reading.id} at ${suggestions[0].reading.value}/${suggestions[0].reading.target}`,
);
ok(
  'never promises more lift than the distance to the mark',
  suggestions.every(
    (s: { lift: number; reading: { target: number; value: number } }) =>
      s.lift <= s.reading.target - s.reading.value,
  ),
);
ok(
  'every suggestion is worth at least a point',
  suggestions.every((s: { lift: number }) => s.lift >= 1),
);

const healthy = vitals.map((v) => ({ ...v, value: 95 }));
const none = suggestRecovery(readVitals(healthy, DEFAULT_VITALITY_MODEL, []));
ok('offers nothing when everything is above its line', none.length === 0, `${none.length} suggestions`);

const afterCommit = suggestRecovery(readings, ['rec_run']);
ok(
  'stops re-offering what is already committed',
  !afterCommit.some((s: { action: { id: string } }) => s.action.id === 'rec_run'),
);

ok(
  'takenActions reads open recovery tasks only',
  JSON.stringify(
    takenActions([
      { status: 'open', recovery: { actionId: 'rec_nap' } },
      { status: 'done', recovery: { actionId: 'rec_run' } },
      { status: 'open' },
    ]),
  ) === JSON.stringify(['rec_nap']),
);

ok(
  'every catalogue entry names a real sub-stat',
  RECOVERY_CATALOGUE.every((a: { vitalId: string }) =>
    ['rest', 'mood', 'physical', 'social'].includes(a.vitalId),
  ),
);
ok(
  'every timed action is a sit-still one',
  RECOVERY_CATALOGUE.filter((a: { timerSec?: number }) => a.timerSec != null).every(
    (a: { timerSec?: number; minutes: number }) => a.timerSec === a.minutes * 60,
  ),
  'timerSec always agrees with the estimate',
);

// ── 5. Rest is weightless ───────────────────────────────────────────────────
console.log('\n[5] Recovery costs time, never pressure');

const base = {
  id: 'x',
  title: 't',
  status: 'open',
  categoryId: 'academics',
  dueAt: null,
  estimateMin: 60,
  load: 'medium',
  subtasks: [],
  resources: [],
  icon: 'FileText',
  createdAt: new Date().toISOString(),
  completedAt: null,
};
const ordinary = taskPressure(base, new Date());
const restful = taskPressure(
  { ...base, recovery: { vitalId: 'rest', lift: 8, actionId: 'rec_nap' } },
  new Date(),
);
ok('an ordinary task carries weight', ordinary > 0, `pressure=${ordinary.toFixed(2)}`);
ok('a recovery block carries none', restful === 0, `pressure=${restful}`);

// ── 6. The bias reaches the gauge ───────────────────────────────────────────
console.log('\n[6] The correction reaches the reserve');

const raw = deriveVitality([], vitals, DEFAULT_VITALITY_MODEL, new Date(), 0);
const bent = deriveVitality([], vitals, DEFAULT_VITALITY_MODEL, new Date(), -9);
ok('a negative bias lowers the derived reading', bent === raw - 9, `${raw} → ${bent}`);

const floored = deriveVitality([], vitals, DEFAULT_VITALITY_MODEL, new Date(), -999);
ok('and the reading still cannot leave 0–100', floored >= 0 && floored <= 100, `clamped=${floored}`);

console.log(fails === 0 ? '\nALL CHECKS PASSED\n' : `\n${fails} CHECK(S) FAILED\n`);
process.exit(fails === 0 ? 0 : 1);
