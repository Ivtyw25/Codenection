# Pip — Capacity Companion App

React Native + Expo frontend for the student workload/burnout companion described
in `spec-doc/`.

**Stage: frontend only.** Every screen, component and design token is real. There
is no scoring engine, no persistence and no network — all data comes from
`src/mock/`. See [What is deliberately absent](#what-is-deliberately-absent).

## Running it

```bash
npm install
npm start          # then press 'a' for Android, or scan with Expo Go
npm run android    # build + launch on a connected device/emulator
npm run typecheck  # tsc --noEmit
```

Requires Node 22.13+ / 24.3+ (React Native 0.86 declares that range).

## Where things live

```
app/                       expo-router routes — file paths match the spec's route table
├── _layout.tsx            fonts, providers, and the three transition patterns (§3.2)
├── index.tsx              entry gate (§3.4)
├── welcome.tsx            SCR-00
├── onboarding/            SCR-01–09
│   ├── name.tsx           SCR-02  meet & name Pip
│   ├── discover.tsx       SCR-03  AI domain discovery
│   ├── domains.tsx        SCR-04  domain confirmation
│   ├── baseline/[id].tsx  SCR-05  per-domain baseline
│   ├── whole-person.tsx   SCR-06  adaptive whole-person baseline
│   ├── integrations.tsx   SCR-07
│   ├── reveal.tsx         SCR-08  first reveal
│   └── tutorial.tsx       SCR-09  coach marks
├── (tabs)/                the shell — 4 tabs + centre Capture FAB (§3.1)
│   ├── home.tsx           SCR-10
│   ├── tasks.tsx          SCR-11  Today's Manifest
│   ├── pip.tsx            SCR-12  Pip detail
│   └── reflect.tsx        SCR-14  Weekly Reflect
├── tasks/[id].tsx         SCR-13  task detail sheet
├── pip/shop.tsx           SCR-15
├── pip/friends.tsx        SCR-16
├── capture/               SCR-20 capture, SCR-21 AI review
├── checkin.tsx            SCR-22
├── nudge.tsx              SCR-23
├── recover/[type].tsx     SCR-24  guided recovery
├── critical.tsx           SCR-30  Critical intervention
├── unlock.tsx             SCR-31  tier unlock
└── dev.tsx                review harness — DELETE BEFORE SHIPPING

src/
├── theme/                 Phase 1 design system, transcribed verbatim
│   ├── colors.ts          brand / neutral / semantic / Pip-state tokens
│   ├── typography.ts      Nunito type scale
│   ├── layout.ts          8pt grid, radius, warm-tinted elevation
│   └── motion.ts          duration + easing tokens, reduced-motion accessor
├── components/
│   ├── pip/               the mascot
│   │   ├── shapes.ts      parametric geometry (Reanimated worklets)
│   │   ├── presets.ts     the state & emotion matrix, as parameters
│   │   ├── Pip.tsx        the animated component
│   │   ├── Habitat.tsx    accent wash + streak lanterns
│   │   └── Sprout.tsx     sprout-only health indicator
│   ├── ui/                primitives (Button, Card, Chip, Input, Slider, …)
│   └── onboarding/        shared step chrome
├── lib/
│   ├── pipState.ts        pure state derivation + nudge copy
│   └── color.ts           darken/lighten/alpha helpers
├── mock/                  all data — replace wholesale when the engine lands
└── types/                 shared domain types
```

## Design system

Components import from `@/theme` and never use raw hex. The tokens are a direct
transcription of `pip-design-spec.md` Phase 1 — colours (with the spec's own
verified AA contrast ratios in comments), the Nunito type scale, the 8pt grid,
warm-tinted shadows, and the four motion curves.

Two rules the spec is emphatic about, enforced throughout:

- **State is never conveyed by colour alone.** Every state colour is paired with
  a word and, on Pip, a posture.
- **`prefers-reduced-motion` is honoured everywhere Pip animates.** Use
  `useMotion()` rather than the raw tokens — it swaps idle loops for static
  states and bounces for cross-fades in one place.

## The mascot

`Pip.tsx` is the centre of the build. It renders either one of the five live
capacity states (derived from Pressure/Vitality) or one of the seven journey
poses, and interpolates between them on the UI thread with `--motion-pip`.

**Known deviation from spec.** `pip-mascot-identity.md` §1.4 calls for 3D
matte-clay renders delivered as Lottie/Rive with PNG fallbacks. Those art assets
don't exist yet, so Pip is a **parametric SVG** whose geometry is driven by the
score props — it genuinely inflates with Pressure, sags and desaturates with
Vitality, droops its sprout, and shows the lowest-sub-stat flourish. Every
behaviour the spec requires is preserved. When real assets arrive, swap the
internals of `Pip.tsx`; its props are the seam and no screen needs to change.

## Reviewing it

`/dev` is a harness (not part of the product) that flips the demo scenario so
every Loading / Empty / Critical branch is reachable, links to all 22 screens,
and shows the full mascot state sheet for comparison against the spec.

## What is deliberately absent

Per the current scope, no engine and no backend:

- No Pressure/Vitality calculation, forecasting, or calibration — `src/mock/`
  supplies fixed values matching the spec's Week-4 storyline (Amara, Strained,
  Rest lowest).
- No persistence, auth, or network. The entry gate in `app/index.tsx` has two
  constants to flip when auth is real.
- No AI. SCR-03's conversation and SCR-21's task extraction are scripted.

The one piece of non-presentational logic included is `src/lib/pipState.ts`,
which derives the mascot's visual state from two scores. It's a pure function the
renderer cannot do without, and the spec specifies it exactly (§5.1).

### A spec discrepancy worth knowing

`pip-product-spec.md` §5.1 lists two Critical triggers; the standalone
`pip-gamification-design.md` §1.2 lists three, adding `Vitality <= 10 regardless
of Pressure` — specifically to catch a student with a light task list but
genuinely depleted reserves. The union of all three is implemented, with the
gamification doc treated as the authority on states. See the comment in
`src/lib/pipState.ts`.
