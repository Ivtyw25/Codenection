# Pip — Loop Engineering Audit Trail

A timestamped record of every iteration cycle. Each entry is written **after**
the code lands and the gate (`npm run typecheck` + `npm run lint`) is green, so
a cycle marked Approved is one that actually compiles.

**Roles**

- **@UserAgent** — exhausted college junior. Deadlines, exams, social friction,
  bad sleep. Zero patience for clunky menus, guilt-inducing reminders, or
  anything that costs a decision before it gives an answer.
- **@UXAgent** — cognitive UI/UX & calm-design specialist. WCAG AA/AAA, screen
  readers, 44px targets, visual hierarchy, grounding motion. Owns the standard
  that this app must not read as a dense dashboard wearing calm colours.

**Exit condition** — both agents sign off unconditionally: intuitive,
restorative, feature-complete, free of cognitive friction.

---

### [2026-09-13 12:04:25] — Iteration Cycle #1

- **Focus Area:** Repair the broken build; replace the fixed five-vector load
  model with **user-owned categories**; ship the Multi-Vector Load Visualizer.

- **Opening state — what was actually found.** The working tree did not
  compile. A large uncommitted refactor had introduced `LoadVector` /
  `LoadProfile` into `src/types`, and both `src/data/derive.ts` and
  `src/store/AppStore.tsx` imported `@/data/load` — **a module that was never
  written**. `src/data/rebalance.ts`, referenced in three doc comments, did not
  exist either. `tsc` reported 5 errors across 3 files. Nothing could run.

- **@UserAgent critique & proposals:**
  - *"Five bars called mental / time / physical / social / errands do not
    describe my life. I have never once thought 'my social vector is elevated'.
    I think 'the club is eating me alive' — and the club is a thing I already
    told you about."* The fixed taxonomy was rejected outright.
  - *"Where is the number coming from? If you tell me I'm at 64 and I can't see
    what the 64 is made of, you've told me I'm drowning and handed me nothing."*
    → The breakdown must sit **directly under the gauge it explains**, not on a
    separate screen behind a tap.
  - Emergent proposal: **tap a bar → the Manifest, filtered to that category.**
    Naming the problem is worthless if acting on it costs three more taps.
  - Emergent proposal: categories must be **retirable, not deletable**. *"If I
    delete Club in November, don't tell me October never happened."*

- **@UXAgent review:**
  - Rejected a per-category colour ramp. Bar length already encodes magnitude;
    hue would encode the **same variable twice**, and redundant encoding of one
    variable is precisely the cognitive noise this product exists not to have.
    It would also put the app in the business of generating N accessible hues
    for N user-created categories — a contrast bug waiting to ship. **Ruling:**
    one brand hue for every bar; the category *icon* carries recognition, length
    and the figure carry magnitude.
  - Rejected drawing categories that carry nothing. An empty rail is a row that
    asks to be read and then says "nothing"; five of them is a wall of nothing,
    and a student at 88% has no attention to spend on it. **Ruling:** zero-value
    categories are omitted entirely.
  - Screen-reader defect caught pre-merge: a breakdown row would otherwise
    announce as four separate stops — "Academics", "31", "progress bar",
    "2 tasks, 4h left" — for one fact. **Ruling:** each row is one grouped
    announcement, `accessibilityRole="button"` with the full sentence.
  - Noted the Pip tab explained the *Vitality* gauge in four sub-stats but left
    *Pressure* as a bare number — meaning the half of the model the student can
    actually change was the unexplained half. Required the mirror section.

- **Code / changes implemented:**
  - **Deleted** `LoadVector`, `LoadProfile`, `Task.profile`,
    `ProposedTask.profile`. The five-share-per-task model is gone; it asked the
    app to invent five unverifiable numbers per task.
  - **New** `src/data/categories.ts` — `Category` as stored, user-owned data
    (`id` / `label` / `icon` / `match` / `archived`), `DEFAULT_CATEGORIES`,
    `matchCategory` (keyword scoring, replacing the private `CONTEXT_HINTS`
    table in `api.ts`), `slugify`, `activeCategories`, label/icon resolvers.
  - `PressureBreakdown` is now `{ total, slices, hottest }` over categories.
    `derivePressureBreakdown` became a **group-by** — no authored weights, and
    the slices still sum to the headline number (rounding drift absorbed by the
    largest slice).
  - Renamed `context` → `categoryId` throughout (`TaskContext` → `CategoryId`,
    `ContextFilter` → `CategoryFilter`, `contextCounts` → `categoryCounts`).
    The field is now a foreign key into user data, and "context" collided badly
    with React context.
  - Store: `category/add`, `category/patch`, `category/archive` reducers +
    `addCategory` / `patchCategory` / `archiveCategory`. Archiving resets the
    Manifest filter if it pointed at the retired category.
  - **New** `src/components/app/LoadBreakdown.tsx` — the visualizer.
  - **New** `src/components/app/TaskIcon.tsx` — icon registry extracted out of
    `TaskCard` so tasks, categories, filter rows and bars share one map.
    Exhaustive over `IconName` by type, so a new name without a component is a
    compile error rather than a blank square.
  - `ProgressBar` gained a `fill` override.
  - Wired into **Home** (2 rows, under the Pressure gauge) and the **Pip tab**
    (full list + "X is carrying most of this right now").
  - Manifest filter row is now built from `useCategories()` instead of a
    hardcoded five-context array.
  - Removed `contextLabel` from `format.ts` — a category's name is a string the
    user typed, not something derivable from an id.

- **Gate:** `tsc --noEmit` clean · `eslint` clean. 20 files, +2112 / −777.

- **Consensus status:** **Re-looping.** Build is repaired and the category model
  is in, but two commitments from this cycle are not yet delivered:
  1. Categories are user-*owned* in the data model but there is still **no UI to
     add, rename or retire one** — so "your categories" is currently only half
     true.
  2. `src/data/rebalance.ts` (the Autonomous Rebalance Engine) is still absent;
     `Lever` is declared in types with no engine behind it.

  A full @UXAgent aesthetic audit of the whole build is in flight and its
  findings will open Cycle #2.

---

### [2026-09-13 12:13:07] — Iteration Cycle #2

- **Focus Area:** The Autonomous Rebalance Engine, and the first full @UXAgent
  aesthetic + accessibility audit of the build.

- **Process note — the development protocol.** This cycle ran to `CLAUDE.md`'s
  split for the first time. The aesthetic audit is a broad document scan across
  ~40 files that distils to a digest — squarely above the delegation
  break-even — so it went to **Gemini via `agy` (pro tier)** rather than being
  read into Claude's context. Claude then applied the **Verification Gate**:
  every finding re-derived against the source before any code moved. That
  mattered — see below.

- **@UserAgent critique & proposals:**
  - *"Don't cancel my stuff behind my back."* The Rebalancer analyses
    automatically but **never acts**. It proposes; one tap applies.
  - *"If it says it'll take 14 points off, it had better take 14 points off."*
    → Every move is priced by simulating it through the *real* `derivePressure`
    and diffing. Nothing is estimated.
  - *"Don't tell me to drop the midterm."* → The ladder is ordered by what the
    move costs the STUDENT: delegate → postpone → drop.

- **@UXAgent review (delegated to Gemini, verified by Claude):**
  - **Confirmed, and understated.** `scheme.textDisabled` maps to `n[400]` —
    **2.54:1**, which `src/theme/colors.ts` itself annotates as "NON-TEXT ONLY
    … the teardown's #1 accessibility finding". The audit found 8 call sites
    carrying real text; a direct grep found **25**. Fixed at all 21 text sites
    by moving to `textMuted` (`n[500]`, 4.83:1, AA); the 4 remaining are
    genuinely inactive-state icons paired with their own label — correct usage.
  - **Confirmed.** `Checkbox` `error` recoloured the border and nothing else —
    the design system's own "never convey state by colour alone" rule, broken by
    the system's own primitive. An errored empty box now draws an `AlertCircle`.
  - **Confirmed.** `ForecastRow`'s `Line` announced as five separate
    screen-reader stops for one fact, and carried direction only in an arrow
    glyph and a colour — so the part that matters (better or worse?) was exactly
    the part a screen-reader user could not get. Now one grouped label that says
    "improving" / "worsening" in words.
  - **Confirmed.** `Toast` hand-rolled a shadow identical to `elevation.lg`.
  - **Partially rejected.** The audit filed `Gauge.tsx`'s `width: 60` / `width:
    40` under "spacing off the ramp". They are label *column widths* — a layout
    dimension the `space` ramp does not govern. Left alone.
  - **Caveat upheld.** The audit's own self-check flagged that its
    "auto-hitSlop in `Interactive`" idea assumed the component can know its own
    size. It cannot at style time — but it can via `onLayout`, so the fix was
    implemented that way.
  - **Coverage gap acknowledged.** Gemini reported 16 files reviewed against a
    brief listing ~40. `app/(tabs)/tasks.tsx`, `profile.tsx`, `task/[id].tsx`,
    `clarify.tsx`, `capture.tsx` and the new `LoadBreakdown.tsx` drew no
    findings at all. Treated as a **partial** audit — absence of findings there
    means nothing. A narrower second pass is queued for Cycle #3.

- **Code / changes implemented:**
  - **New** `src/data/rebalance.ts`. `planRebalance` walks the preference ladder
    greedily, re-pricing after every accepted move against the list as it then
    stands (pricing up-front and summing would double-count two moves on one
    task). `applyMove` / `applyMoves` are the shared simulator, so the sheet's
    promise and the store's commit run the same code.
  - **Tap-target floor enforced centrally** in `Interactive.tsx`. The control
    measures itself via `onLayout` and grows its *touch region* — never its
    layout box — to cover any deficit against `MIN_TAP_TARGET`. Nothing on
    screen moves; a dozen undersized controls across five files are fixed at
    once, and the next one written is fixed before it ships. Caller `hitSlop`
    still wins.
  - `Category.shareable` + `SubTask.delegable` — see the gate findings below.
  - Contrast, checkbox glyph, forecast grouping, new `brand.clay` token,
    `elevation.lg` on Toast, `n[0]` for two raw whites, `type.caption` for four
    `fontSize: 10` violations, spacing/radius snapped to the ramp in four files.
  - **New** `scripts/verify-rebalance.ts`, `tsconfig.verify.json`,
    `npm run verify`.

- **Verification Gate — what running it actually caught.** The engine
  typechecked clean and was still wrong twice. Both were found only by executing
  it, and neither is a defect a type system could express:
  1. **It offered to delegate the user's own exam revision to a friend.** Nobody
     can revise for you. Fixed by making delegability the *category's* property
     (`shareable`) with a per-step override — the student is asked once per area
     of their life, not once per task. Academics / Internship / Personal default
     false; Club / Errands true.
  2. **It proposed postponing AND dropping the same task in one plan.** The
     arithmetic was sound — the drop was priced against the already-postponed
     list — but it is incoherent as advice, and a self-contradicting plan cannot
     be agreed to with one tap. Whole-task levers now claim the task; delegation
     does not, because handing three of a task's steps to three people is
     sensible and a task-level claim would have silently capped every delegation
     at one step per task.
  - Harness now runs **19 checks**, including regressions for both.

- **Gate:** `tsc --noEmit` clean · `eslint` clean · `npm run verify` 19/19.

- **Consensus status:** **Re-looping.** Both agents acknowledge real progress
  and both withhold sign-off on the same three things:
  1. The Rebalancer has **no UI**. The engine is verified; nothing renders it.
  2. Categories still have **no add / rename / retire screen** — outstanding
     from Cycle #1, so "your categories" remains half true.
  3. `app/review.tsx`, named the worst-offending screen for cognitive noise, is
     **untouched**.

---

### [2026-09-13 12:34:10] — Iteration Cycle #3

- **Focus Area:** Close the three blockers from Cycle #2 — the Rebalancer's UI,
  the category manager, and the second @UXAgent pass over the files the first
  audit missed. Plus one thing nobody had asked for, because measuring the
  fixture exposed it.

- **The finding that reframed the cycle.** Before building the Rebalancer's
  entry point, the seeded world was measured rather than assumed. It scored
  **29 pressure, Vitality 68, Pip Balanced** — a pleasant Tuesday. The
  Rebalancer's banner is gated at `REBALANCE_THRESHOLD` (68), so **the entire
  feature was unreachable in the demo**, along with the Critical state and the
  whole recovery arc. The brief's storyline calls for a student "at 88%
  critical overload with zero physical recovery"; the fixture was describing
  somebody else's week.

  Three midterm-season tasks were added (an overdue lab report, an essay due
  tonight, a sprint demo due tomorrow) and the four vitals dropped to a genuine
  crunch (`rest 38 · mood 45 · physical 30 · social 41`). The seed now measures
  **86 pressure, Vitality 31, Pip Critical**, and the Rebalancer triggers. The
  seed comments say exactly which three tasks to delete to demo a calm week
  instead.

- **@UserAgent critique & proposals:**
  - *"Don't make me build the plan."* Every move in the sheet starts **accepted**
    — the student vetoes what Pip got wrong rather than assembling a plan from
    scratch. An all-unticked default hands a depleted person a fresh pile of
    decisions, which is the tax this screen exists to remove.
  - *"Show me what it costs, not just what it saves."* `Move.cost` renders at the
    same weight as the −N relief. Selling the saving and whispering the price is
    how an app talks somebody out of something they needed.
  - Emergent: the categories screen shows **what each category is currently
    costing**, not just its name. A list of labels is administration; the same
    list with live load is where somebody notices the category they were about
    to rename is carrying half their week.

- **@UXAgent review (second Gemini pass, verified by Claude):**
  - **Confirmed and fixed.** Overdue state was conveyed **by colour alone** —
    `TaskCard` and the task sheet flipped a chip to `danger` while the label
    stayed a bare date. The single most consequential fact on the card, carried
    entirely by hue, in an app whose own system forbids it. The label now reads
    "Overdue · Tue, 5:00 PM".
  - **Confirmed and fixed.** `NextActionRow` returned a bare `View` when not
    pressable, announcing chevron / time / title as three stops for one
    instruction. Now one grouped label.
  - **Confirmed and fixed.** Tab-bar badge at `fontSize: 10`, off the type scale.
  - **Rejected — the audit's own doubt was wrong in both directions.** It
    flagged uncertainty that `space[20]` exists; it does (80, the deliberate
    section-rhythm jump). But its suggested use — an 80px rhythm token as an
    input's width — is semantically wrong, so the fix was declined anyway.
  - **Verified silence.** It reported zero `textDisabled` violations across the
    twelve files. A grep confirmed zero: Cycle #2's sweep was complete. Silence
    checked rather than trusted.
  - **Coverage gap again, and stated honestly by the delegation.** Four of the
    twelve files drew no findings at all — including `LoadBreakdown.tsx` and
    `TaskIcon.tsx`, the two written last cycle and explicitly flagged as never
    reviewed. Those four remain **unaudited, not clean**.

- **Code / changes implemented:**
  - **New** `app/rebalance.tsx` — the sheet. Rises from the bottom rather than
    pushing from the right: a push reads as going deeper into the task list,
    which is the opposite of what this screen does.
  - **New** `app/categories.tsx` — add, rename in place, retire, restore, and
    set `shareable` per category. Archive, never delete.
  - Store: `rebalance/apply` committing through the **same** `applyMoves` the
    sheet priced with, so what the user agreed to and what the store does cannot
    diverge. Drop stamps (`droppedAt`, `dropReason`) recorded for Reflect.
  - Entry points: a Home banner shown **only** when the plan both triggered and
    found something safe to move, and a Categories row on Profile.
  - Seed rebuilt for midterm season; vitals dropped to match.
  - `priceSubset` + the audit fixes above.

- **Verification Gate — two more defects only execution could find:**
  1. **`POSTPONE_DAYS = 3` was a lever that usually bought nothing.** `urgency`
     weights everything two-to-six days out identically, so nudging a task due
     Thursday by three days moved the number by zero — and `planRebalance`
     correctly refuses to offer a move worth nothing, so the postpones were
     being silently dropped. Measured on the seed: 2 of 3 candidates priced at
     zero. A postpone now clears the week (≥8 days) or nudges ≥3, whichever is
     later. Seed plan went from 3 moves / 6 points to **4 moves / 9 points**.
  2. **Summing the rows would have been the wrong arithmetic for the footer.**
     Each move's `relief` is priced sequentially, so those figures only add up
     for the whole plan or a prefix — un-tick the first of three and the rest
     are quoting savings from a world that no longer happens. The harness
     showed the naive sum *happens* to agree under today's model (it is linear
     in minutes removed), which is exactly the kind of accidental correctness
     that breaks later. The sheet now calls `priceSubset`, exact by
     construction.

- **Gate:** `tsc --noEmit` clean · `eslint` clean · `npm run verify` 21/21.

- **Consensus status:** **Re-looping.** All three Cycle #2 blockers are closed.
  Outstanding before sign-off:
  1. `app/review.tsx` — still the worst-offending screen for cognitive noise,
     still untouched. Carried for a third cycle; it should lead Cycle #4.
  2. Four files remain genuinely unaudited, `LoadBreakdown.tsx` among them.
  3. The Rebalancer relieves only 9 of 86 points on the seeded week. That is
     *honest* — the week is mostly un-delegable academic work against fixed
     deadlines, and the copy says so — but @UserAgent notes that a student in
     crisis being told "the rest is genuinely yours" needs somewhere to go
     next, and the Vitality-First Action Engine (recovery interventions) does
     not exist yet. That is the real answer to an immovable week, and it is the
     largest remaining gap against the brief.

---
