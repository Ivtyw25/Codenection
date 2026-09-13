/* eslint-disable @typescript-eslint/no-require-imports */
// @ts-nocheck — dev-only harness, run by `npm run verify` against .verify-build
/**
 * Verification harness for the end-of-day conversation and the calendar.
 *
 * Not a product file. These two landed together because they are the two places
 * the app started making claims it cannot prove by arithmetic alone — one reads
 * a sentence, the other draws a forecast — and both have a specific way of
 * being wrong that costs the user's trust rather than a few points of accuracy.
 *
 *   THE PARSER can misread, and the only unacceptable failure is misreading
 *   CONFIDENTLY. It must land in the right band for ordinary sentences, handle
 *   negation without inverting a shrug into a crisis, quote back what it
 *   actually scored, and return nothing at all when a sentence carried no
 *   feeling rather than inventing one.
 *
 *   THE CALENDAR must never let a forecast look like a record, must refuse to
 *   draw days it cannot justify, and must produce a forward line that is a
 *   consequence of the plan — so accepting recovery visibly moves it.
 */
const BASE = require('path').join(__dirname, '..', '.verify-build', 'src', 'data') + require('path').sep;

const {
  readFeeling,
  readAgreement,
  combine,
  shift,
  acknowledge,
  probe,
  verify: verifyLine,
  opening,
  closing,
  FELT_WORD,
} = require(BASE + 'conversation.js');
const { outlook, FORECAST_DAYS, DEFAULT_VITALITY_MODEL, derivePipState } = require(BASE + 'derive.js');
const { DEFAULT_CATEGORIES } = require(BASE + 'categories.js');
const { buildRecoveryTask } = require(BASE + 'recovery.js');

const now = new Date();
const at = (days: number, hour = 17) => {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

let failures = 0;
const check = (name: string, cond: boolean, detail = '') => {
  console.log(`${cond ? '  PASS' : '  FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!cond) failures++;
};

// ── 1. Reading a sentence ───────────────────────────────────────────────────
console.log('\n[1] Reading what somebody typed');

const BANDS: [string, string][] = [
  ['fine', 'balanced'],
  ['pretty good actually, went for a run', 'balanced'],
  ['busy but mostly my own stuff', 'strained'],
  ['today was so long and I am behind on everything', 'wilting'],
  ['exhausted, never stopped all day', 'depleted'],
  ['absolutely shattered, nothing left', 'critical'],
];

for (const [text, expected] of BANDS) {
  const read = readFeeling(text);
  check(`"${text.slice(0, 38)}…" reads as ${expected}`, read.felt === expected, `got ${read.felt} at strain ${read.strain}`);
}

/*
 * Negation is a reflection, not an inversion.
 *
 * The first cut mirrored about the midpoint, which scored "not great" at 80 —
 * worse than "exhausted" scores on its own. Nobody means that by it. A denial
 * is weaker than the assertion of its opposite, in both directions.
 */
console.log('\n[2] Negation, intensity, and the words that come back');
const notGreat = readFeeling('not great honestly');
const notBad = readFeeling('not bad');
check('"not great" lands in the middle bands, not the bottom', notGreat.strain > 55 && notGreat.strain < 80, `strain=${notGreat.strain}`);
check('"not bad" reads as roughly fine', notBad.felt === 'balanced', `strain=${notBad.strain}`);
check('"not great" is weaker than "awful"', notGreat.strain < readFeeling('awful').strain);
check('an intensifier pushes further out', readFeeling('really tired').strain > readFeeling('tired').strain);
check('a softener pulls back in', readFeeling('a bit tired').strain < readFeeling('tired').strain);

/*
 * What gets quoted must be what got scored. Quoting “great” back at somebody
 * who wrote "not great" is the acknowledgement agreeing with the opposite of
 * what they said, which is worse than saying nothing.
 */
check('the negation travels with the quoted cue', notGreat.cues.some((c: string) => c.includes('not ')), JSON.stringify(notGreat.cues));
const neverStopped = readFeeling('exhausted, never stopped all day');
check('a phrase consumes its own words rather than matching twice',
  !neverStopped.cues.includes('stopped'), JSON.stringify(neverStopped.cues));
check('the acknowledgement quotes the student', acknowledge(notGreat).includes('not great'));

// ── 3. Knowing when it does not know ────────────────────────────────────────
console.log('\n[3] Knowing when it does not know');
const factual = readFeeling('worked on the essay then went to tesco');
check('a sentence with no feeling in it returns nothing', factual.felt === null, `got ${factual.felt}`);
check('and claims no confidence', factual.confidence === 'low');
check('a bare "fine" is not treated as certain', readFeeling('fine').confidence !== 'high');
check('a strong, specific answer is', readFeeling('completely drained, I have nothing left').confidence === 'high');
check('a low-confidence read hedges out loud', acknowledge(readFeeling('meh')).includes('might be reading too much'));

// ── 4. The second answer is allowed to overrule the first ───────────────────
/*
 * The whole argument for asking twice. "Fine" followed by "I never actually
 * stopped" is a worse day than the opener claimed, and the reading has to be
 * able to move — while a follow-up that carried no feeling of its own must
 * leave the opener standing rather than dragging it toward neutral.
 */
console.log('\n[4] The follow-up can overrule the opener');
const opener = readFeeling('fine');
check('a confident second answer wins', combine(opener, readFeeling('honestly I never stopped and I am wiped')).felt === 'depleted');
check('a feeling-free second answer leaves the first alone',
  combine(opener, readFeeling('mostly lectures and then the library')).felt === opener.felt);
check('one band worse is one band', shift('strained', 1) === 'wilting');
check('the ladder does not run off either end', shift('critical', 1) === 'critical' && shift('balanced', -1) === 'balanced');

// ── 5. Agreement, and which way ─────────────────────────────────────────────
console.log('\n[5] Does the number match');
check('"yeah that sounds right" agrees', readAgreement('yeah that sounds right') === 'agrees');
check('"it was worse than that" is not just a no', readAgreement('no it was worse than that') === 'heavier');
check('"not that bad" points the other way', readAgreement('nah not that bad') === 'lighter');
check('"too generous" reads as heavier', readAgreement('the number is too generous') === 'heavier');
check('a shrug is unclear rather than assumed', readAgreement('dunno') === 'unclear');

// ── 6. Pip says something for every state ───────────────────────────────────
/*
 * Five states, and every one of them has to produce a complete conversation.
 * A missing branch here is a screen that stops mid-exchange for whichever
 * student happened to be having that kind of day.
 */
console.log('\n[6] Every state has a whole conversation behind it');
const states = ['balanced', 'strained', 'wilting', 'depleted', 'critical'];
check('every state has a word', states.every((s) => typeof FELT_WORD[s] === 'string'));
check('every state has a follow-up question', states.every((s) => probe(s).length > 20));
check('every pairing has a verify line', states.every((s) => states.every((c) => verifyLine(s, c, 60, 50).length > 40)));
check('every pairing has a closing line', states.every((s) => states.every((c) => closing(s, c).length > 40)));
check('the opener shows its working before it asks', opening('strained', 71, 44).join(' ').includes('71'));
check('agreeing is named as useful', closing('strained', 'strained').includes('Agreeing'));

// ── 7. The calendar ─────────────────────────────────────────────────────────
console.log('\n[7] The calendar');

let id = 0;
const task = (over: any) => ({
  id: `c${++id}`,
  title: 'Task',
  status: 'open',
  categoryId: 'academics',
  dueAt: at(3),
  estimateMin: 90,
  load: 'medium',
  icon: 'BookOpen',
  createdAt: at(-2),
  completedAt: null,
  subtasks: [],
  resources: [],
  pipNote: '',
  ...over,
});

const history = [];
for (let i = 5; i >= 1; i--) {
  const d = new Date(now);
  d.setDate(d.getDate() - i);
  history.push({
    date: d.toISOString().slice(0, 10),
    pressure: 48 + i,
    vitality: 62 - i * 2,
    tasksCompleted: 2,
    state: 'strained',
    vitals: { rest: 56 - i, mood: 58 - i, physical: 52, social: 44 },
  });
}

const vitals = [
  { id: 'rest', label: 'Rest & Sleep', value: 50, note: '' },
  { id: 'mood', label: 'Mood & Stress', value: 54, note: '' },
  { id: 'physical', label: 'Physical', value: 48, note: '' },
  { id: 'social', label: 'Social', value: 40, note: '' },
];

const world = {
  tasks: [
    task({ title: 'Midterm revision', load: 'high', estimateMin: 240, dueAt: at(2) }),
    task({ title: 'Lab report', estimateMin: 120, dueAt: at(5) }),
    task({ title: 'Reading week prep', estimateMin: 180, dueAt: at(12) }),
  ],
  teammates: [],
  categories: DEFAULT_CATEGORIES,
  vitals,
  vitalityModel: DEFAULT_VITALITY_MODEL,
  calibration: { entries: [], vitalityBias: 0 },
  history,
};

const days = outlook(world, now, { back: 10, forward: 30 });
const today = days.find((d: any) => d.today);
const ahead = days.filter((d: any) => !d.actual);
const behind = days.filter((d: any) => d.actual && !d.today);

check('the window is the length it was asked for', days.length === 41, `got ${days.length}`);
check('exactly one day is today', days.filter((d: any) => d.today).length === 1);
check('today is live, not a forecast', today.actual === true && today.known === true);

/*
 * The rule the whole screen exists to keep. A forecast drawn in the same ink as
 * a record stops being a record of anything, and the first time its Thursday is
 * wrong it takes every other square with it.
 */
check('nothing ahead of today is marked as having happened', ahead.every((d: any) => d.actual === false));
check('nothing behind today is marked as a forecast', behind.every((d: any) => d.actual === true));
check('a day with no record is left blank rather than filled',
  behind.filter((d: any) => !d.known).every((d: any) => d.pressure === 0 && d.vitality === 0));
check('recorded days come back with their real readings',
  behind.filter((d: any) => d.known).every((d: any) => d.pressure > 0));

const beyond = days.filter((d: any) => !d.actual && !d.known);
check('the forecast stops at its horizon', beyond.length === 30 - FORECAST_DAYS, `${beyond.length} blank days ahead`);
check('and every drawn forward day is inside it',
  ahead.filter((d: any) => d.known).length === FORECAST_DAYS);
check('every day carries a state consistent with its own numbers',
  days.filter((d: any) => d.known && !d.actual).every(
    (d: any) => d.state === derivePipState({ pressure: d.pressure, vitality: d.vitality }).name,
  ));

/*
 * The forward line is a consequence of the plan, not a curve fitted to it.
 * This is the property that makes putting a forecast on a calendar worth doing:
 * agreeing to a recovery block has to visibly change the day it lands on.
 */
const withRest = {
  ...world,
  tasks: [...world.tasks, buildRecoveryTask(
    { action: { id: 'rec_nap', vitalId: 'rest', title: 'Nap', blurb: '', minutes: 20, lift: 8, icon: 'Moon' }, reading: { id: 'rest' }, lift: 8 },
    'rec_task',
    now,
  )],
};
const lifted = outlook(withRest, now, { back: 0, forward: 5 });
const plain = outlook(world, now, { back: 0, forward: 5 });
const liftedSum = lifted.filter((d: any) => !d.actual).reduce((s: number, d: any) => s + d.vitality, 0);
const plainSum = plain.filter((d: any) => !d.actual).reduce((s: number, d: any) => s + d.vitality, 0);
check('accepting recovery raises the days after it', liftedSum > plainSum, `${plainSum} → ${liftedSum}`);
check('and costs no pressure on any of them',
  lifted.filter((d: any) => !d.actual).every((d: any, i: number) => d.pressure <= plain.filter((x: any) => !x.actual)[i].pressure));

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}\n`);
process.exit(failures === 0 ? 0 : 1);
