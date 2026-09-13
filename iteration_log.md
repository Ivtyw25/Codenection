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
