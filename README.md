# Pip — Capacity Companion

A React Native app for students that treats **capacity** — not the task list — as the primary object, pairing each user with a companion whose body visibly reflects how much they are carrying and how much they have left.

![Expo](https://img.shields.io/badge/Expo_57-000020?style=flat&logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native_0.86-20232A?style=flat&logo=react&logoColor=61DAFB)
![React](https://img.shields.io/badge/React_19-20232A?style=flat&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript_6-3178C6?style=flat&logo=typescript&logoColor=white)
![Reanimated](https://img.shields.io/badge/Reanimated_4-001A72?style=flat&logo=react&logoColor=white)

> Built for the CodeNection *Lifestyle Track: Beating the Burnout*. Full specifications live in [`spec-doc/`](spec-doc/).

---

## Background & Problem Statement

### The status quo

To-do apps treat every task as equal and the user as infinitely capable. They measure **output** — items closed, streaks of productivity — and their reward loops pay out for doing more. For a student approaching burnout this is not merely unhelpful; the incentive points the wrong way. The app congratulates the behaviour that causes the problem.

A single wellbeing score does not fix it either. Collapsing a student's condition into one number cannot distinguish *"heavily loaded but coping"* from *"nothing due but completely depleted"* — two states that look identical on one axis and require opposite interventions.

There is a second, narrower failure. Structuring a thought at the moment you have it is expensive: a thought arriving mid-lecture has to be named, categorised, dated and estimated before a conventional app will accept it. That cost is paid at the worst possible moment, so thoughts go unrecorded.

### The engineered solution

Pip models capacity on **two independent axes**, and renders them on a companion rather than a dashboard:

| Axis | Range | Reads | Rendered as |
| :--- | :--- | :--- | :--- |
| **Pressure** | 0–100, higher is worse | What is being asked of the student — mental load, time load, deadlines | Pip's size: it inflates as pressure rises |
| **Vitality** | 0–100, higher is better | Rest and reserve banked — sleep, mood, focus | Pip's posture, colour and energy: it droops and desaturates as vitality falls |

Because the axes are independent, the five resulting states — *balanced, strained, wilting, depleted, critical* — are legible at a glance and map to different interventions. The care-for-a-companion framing gives gamification a target that is not "do more": the goal is keeping Pip balanced, which structurally rewards sustainability. Per spec, **no day ever subtracts** XP or Sparks, and Pip never dies — a critical state is always recoverable from the moment one supportive action is logged.

Capture is solved by separating it from triage. `/capture` records a raw thought — text or voice, with no context, due date or estimate — and exits. Those accumulate in `/inbox`, which the user drains later in **batches** via `/review`, where structure is proposed across many notes at once. Extraction never runs on the way in.

The architectural commitment that makes this behave rather than pose: **nothing computable is stored.** Pressure, Vitality, Pip's state, streaks and filtered lists are derived on read from the open task list and the clock. Ticking one sub-task moves the gauge, changes Pip's expression and can advance the streak — without any screen knowing how.

---

## Core Features

- **Two-axis capacity model** (`src/data/derive.ts`) — Pressure is the sum of each open task's load contribution scaled by urgency, against a fixed 480-minute workable day. Overdue work weighs 2.0×, today 1.5×, tomorrow 1.0×. Partial progress counts, so completing 2 of 3 sub-tasks discharges two-thirds of that task's weight. Pure functions, no React, no I/O.
- **The companion** (`PipMascot.tsx`) — Renders the five capacity states derived from the two axes. The persistent tier/identity layer specified alongside it is not built yet (see Roadmap).
- **Quick capture** (`/capture`) — Text or voice, with `VoiceRecorder`. Getting a thought out of your head costs three seconds and no decisions.
- **Inbox and batch triage** (`/inbox` → `/review`) — Proposals carry a `sourceId` back to the note that produced them, which is what lets a commit retire exactly the notes processed and group proposals under the originating thought. Multi-note batches are the default path, not a special case.
- **Today's Manifest** (`/(tabs)/tasks`) — Filter by `@context`, date range and load, with sorting and a hide-done toggle, driven by a single `TaskQuery`.
- **Shop and Sparks** (`/shop`) — Soft currency spent on cosmetics, with per-item pending state during a purchase.
- **Weekly Reflect** (`/(tabs)/reflect`) — Reads closed `DayRecord`s for history and streak continuity.
- **Explicit async states** — Every remote read runs a four-state machine (`idle | loading | success | error`). The teardown that preceded this rebuild found the source system had *zero* skeleton loaders, spinners, empty states or error states across 16 routes; `Skeleton`, `Spinner`, `EmptyState` and `ErrorState` are first-class primitives so that cannot recur.
- **Failure injection** — `api.failNext()` makes exactly one call reject, wired to a switch in Profile → Developer, so every error branch is reachable without unplugging anything.
- **Design system** (`src/theme/`) — Colour, layout, motion, state and typography tokens behind a `ThemeContext` with light/dark support. Components never use raw hex. `prefers-reduced-motion` is honoured wherever Pip animates, with an in-app opt-in that never overrides the OS setting downward.

---

## Project Structure

```
app/                      expo-router routes (typedRoutes enabled)
├── _layout.tsx           fonts, providers, transitions
├── (tabs)/               the shell
│   ├── index.tsx         Home — capacity gauges
│   ├── tasks.tsx         Today's Manifest
│   ├── new.tsx           centre capture affordance
│   ├── pip.tsx           companion detail
│   ├── reflect.tsx       Weekly Reflect
│   └── profile.tsx       settings + developer switches
├── capture.tsx           quick capture (text / voice)
├── inbox.tsx             triage queue
├── review.tsx            batch review sheet
├── task/[id].tsx         task detail
└── shop.tsx              cosmetics

src/
├── types/index.ts        domain schema — draws the STORED vs DERIVED line
├── data/
│   ├── api.ts            the boundary treated as a network (see below)
│   ├── seed.ts           the stored world
│   ├── derive.ts         capacity, Pip state, streaks — pure
│   └── format.ts         dates, estimates, byte sizes
├── store/
│   ├── AppStore.tsx      single source of truth (Context + useReducer)
│   └── selectors.ts      derived reads
├── theme/                colors · layout · motion · states · typography
└── components/
    ├── app/              domain components (Gauge, TaskCard, InboxRow, …)
    └── ui/               21 primitives (Button, Sheet, Skeleton, ErrorState, …)
```

`src/data/api.ts` is the seam where a backend will attach. It resolves from the seed after a jittered delay, **asynchronously and fallibly**, because that is what the screens must be built against — a synchronous fixture would quietly reproduce the missing-loading-state defect this rebuild exists to correct. Replacing those functions with `fetch` should be the entire change.

---

## Getting Started

### Prerequisites

| Requirement | Version | Note |
| :--- | :--- | :--- |
| Node.js | 22.13+ or 24.3+ | Required range for React Native 0.86 |
| npm | 10+ | Repo ships `package-lock.json` |
| Expo Go | Latest | On a physical device, or use an emulator |
| Android Studio / Xcode | — | Only for emulator or native builds |

### Installation

```bash
git clone https://github.com/Ivtyw25/Codenection.git
cd Codenection
npm install
```

### Environment configuration

**No environment variables are required.** The app is fully local — there is no server, no auth and no network, so there is no `.env` to create and nothing to configure before running.

This changes when `src/data/api.ts` is pointed at a real backend. At that point the file becomes:

```dotenv
# .env.example
# Expo inlines only EXPO_PUBLIC_-prefixed variables into the client bundle.
# Anything here ships to the device — never put a secret in this file.

EXPO_PUBLIC_API_URL=
EXPO_PUBLIC_ENV=development
```

### Running

```bash
npm start          # Metro bundler — press 'a' for Android, or scan with Expo Go
npm run android    # build and launch on a connected device / emulator
npm run ios        # iOS simulator
npm run typecheck  # tsc --noEmit
npm run lint       # eslint . --ext .ts,.tsx
```

> Several defects in this codebase were only reproducible on a physical device, particularly around typography and safe-area behaviour. Verify UI changes on-device before considering them done.

---

## Next Development Phase (Roadmap)

### Immediate priorities

The gaps that currently keep this a demo rather than a usable app.

- [ ] **Persistence.** State lives in memory and resets to seed on every restart — Profile → Reset already tells the user this outright. Add a storage layer behind `api.ts` (AsyncStorage first; `expo-sqlite` if per-field querying is needed). Because every screen already reads through the store and the store reads through `api.ts`, no screen should change.
- [ ] **Attachment support.** In flight on `master`: `CaptureAttachment` bundles files with a note as one inbox item, but `uri` is a local picker cache path. The type comments are explicit that the app must never imply a file has gone anywhere — real storage means uploading on commit and swapping `uri` for a remote one.
- [ ] **Real capture extraction.** `parseCapture` is a deliberately visible keyword→context table, not a model. It is honest scaffolding, but the Review sheet's value depends on replacing it.
- [ ] **Live vitals.** `Vital` records for sleep and focus are seeded. They need the SCR-07 integrations behind them before Vitality reflects anything real.
- [ ] **Test suite.** There is none, and no test script. Start with `derive.ts` — it is pure, it carries the most logic, and it is what every gauge and state transition depends on.

### Performance optimisations

- [ ] **Memoise derived reads.** `selectors.ts` recomputes on every read, and `derivePressure` is O(tasks × subtasks) over the open list. Fine at seed size; measure before the task list is real.
- [ ] **Reduce store re-render fan-out.** `AppStore` is one Context holding the whole world, so any write notifies every consumer. Split by concern or move to selector-based subscriptions once screen count grows.
- [ ] **Virtualise long lists.** The Manifest and Inbox should move to `FlashList` (or `FlatList` with `getItemLayout`) before they hold real volume.
- [ ] **Keep gauge interpolation on the UI thread.** Reanimated 4 worklets already do this; it is a constraint to preserve, not a task to start.

### Planned features

- [ ] **XP, tiers and the payout table** — `spec-doc/pip-gamification-design.md` §1.3–1.4 specifies Sparks, XP, Care Points and five tiers. Sparks exist; the rest does not.
- [ ] **Balance streak mechanics** including the anti-gaming rule, so a day with no logged signal cannot bank as a free balanced day.
- [ ] **Critical intervention flow** — the supportive full-screen state, with recovery framed as relief rather than failure.
- [ ] **Social layer** — coarse state sharing between friends (colour bucket only, never raw scores or task detail), and Guardian-tier flares. Deliberately no leaderboard.
- [ ] **Onboarding** — the SCR-01–09 sequence specified in `spec-doc/pip-onboarding-and-gtd.md`.

---

## Specification

The product is fully specified before it is built. When code and spec disagree, the spec documents are the authority:

| Document | Covers |
| :--- | :--- |
| `pip-product-spec.md` | Product overview, module decomposition, priorities |
| `pip-gamification-design.md` | States, currencies, tiers, streaks, anti-gaming rules |
| `pip-mascot-identity.md` | Pip's visual identity and state rendering |
| `pip-design-spec.md` | Design tokens, type scale, grid, motion |
| `pip-onboarding-and-gtd.md` | Onboarding sequence and capture methodology |
| `pip-user-stories.md` | User stories |

### Known divergence: state derivation

The spec defines the five states as a table of **discrete trigger conditions** on the two axes — e.g. *Strained* is `Pressure ≥ 60 AND Vitality > 30`, and *Critical* has two triggers in `pip-product-spec.md` §5.1 and three in `pip-gamification-design.md` §1.2 (the latter adds `Vitality ≤ 10 regardless of Pressure`, to catch a student with a light task list but genuinely depleted reserves).

`derivePipState` does not implement that table. It collapses both axes into a single continuous scalar:

```ts
const strain = pressure - (vitality - 50) * 0.6;
```

and cuts it at 85 / 68 / 52 / 36 for critical / depleted / wilting / strained. This produces smooth, monotonic transitions and reads well, but it is **not equivalent to the spec**: because a single scalar has one ordering, it cannot represent *wilting* (low pressure, low vitality) and *depleted* (high pressure, low vitality) as genuinely distinct regions of the plane — the very distinction the two-axis model exists to preserve. A student at low pressure and very low vitality lands in the same band as one at high pressure and moderate vitality.

Reconciling this is a correctness task, not a tuning one, and is the reason a test suite over `derive.ts` is listed as an immediate priority.
