# Pip — Onboarding & GTD Flow Specification
*Companion document to `pip-product-spec.md`. This defines the two core flows in full: first-run onboarding, and the ongoing Getting-Things-Done processing loop.*

---

## Part A — Onboarding Flow

### A.0 Purpose and design goals
Onboarding is not a settings form — it is the moment the app builds a **deep, personalized understanding of who this specific student is**, before it ever tries to measure their load. The core idea: two students with identical timetables are not carrying the same thing. One is club president and a varsity swimmer; the other works two shifts a week and dreads them. A generic five-category model (mental / time / physical / social / errands) can't see that difference. So onboarding's job is to discover each student's *actual life domains*, classify them, and learn how each one makes them feel — draining or fulfilling.

This pulls against three constraints that shape the design:
1. **Depth** — capture rich, individual life-context, not checkbox commitments.
2. **Effort budget** — stay light enough that a stressed student finishes it (target ~4–5 minutes; deeper than the old 3-minute survey, justified because the payoff is a genuinely personalized model).
3. **Emotional hook** — the pet is *yours*, and it should feel like the student is helping Pip understand them, not filling in a database.

The resolution is a **hybrid elicitation model**: AI conversation to *discover and classify* the domains (the part no fixed form can capture), then compact structured questions to *quantify* each discovered domain (the part free-form chat is bad at). Rich where it needs to be rich, structured where it needs to be measurable.

### A.1 The two personalization layers
Everything collected in onboarding resolves into two layers that persist on the `UserProfile`:

- **Life Domains (surface layer).** The student's real, named commitments — "Debate Club President," "Varsity Swim Training," "Barista Shifts," "Final-Year Thesis." These are what the student sees and what the app talks to them about. Each is created during onboarding and can be added/retired later (a presidency that ends in December, a sport that's out of season).
- **Category tags (backbone layer).** Every Life Domain is tagged with one or more of the five generic categories, which remain the machine-readable axes the scoring engine, forecasting, and nudges reason over. "Debate Club President" → `social` + `time` + `mental`; "Varsity Swim" → `physical` + `time`; "Thesis" → `mental`. The student never has to think in these terms; the engine always does.

This is why the generic five don't disappear — they're the fixed vocabulary underneath a personalized surface. A new task later inherits category tags from the domain it belongs to, so classification stays consistent with how the student was first understood.

Each Life Domain also carries a **fulfillment rating** (drain ↔ fulfillment) and a **volatility rating** (steady vs. spiky), both set in A.4 below and refined over time.

### A.2 Step-by-step sequence

| # | Step | Goal | What happens | Skippable? |
|---|---|---|---|---|
| 1 | **Welcome** | Set the premise | "Pip reflects what you're carrying — let's help it understand you." | — |
| 2 | **Meet & name Pip** | Emotional hook first | Choose starter skin + name | Defaults provided |
| 3 | **Domain discovery (AI)** | Discover & classify life domains | Conversational: "Walk me through a typical week." AI extracts candidate domains, auto-tags each with backbone categories | No (core step) |
| 4 | **Domain confirmation** | Student owns the list | Review AI-extracted domains: rename, merge, add a missed one, delete | No |
| 5 | **Per-domain baseline (structured)** | Quantify each domain | For each domain: rough hours/week, drain↔fulfillment slider, steady-vs-spiky | No, but fast |
| 6 | **Whole-person baseline (adaptive)** | Seed sub-stats not covered by domains | Sleep/energy, connection, outlook — AI skips or rewords any question already answered by the domains | No |
| 7 | **Integrations** | Let real deadlines count day one | Calendar / LMS, each optional | Yes |
| 8 | **Silent calibration** | Set starting coefficients | No screen — system computes baselines from steps 3–7 | — |
| 9 | **First reveal** | The payoff | Pip appears already reflecting the student's stated life and load | — |
| 10 | **Interactive tutorial** | Teach the loop by doing | One practice mind-dump + one check-in | Skippable/replayable |
| 11 | **Land on Today's Manifest** | Enter the real surface | — | — |

### A.3 Domain discovery — the AI elicitation (steps 3–4)
This is the part that replaces fixed commitment checkboxes.

- The AI opens with an open prompt ("Tell me what a normal week looks like for you — classes, work, clubs, sport, anything that takes your time or energy") and can ask **one or two light follow-ups** to surface things students under-report (unpaid caregiving, commuting, a side project).
- From the response it extracts **candidate Life Domains**, and for each one proposes:
  - a name (editable),
  - backbone category tags (mental/time/physical/social/errands),
  - a first guess at rough time cost.
- The student then **confirms the list** (step 4): rename, merge duplicates, delete anything irrelevant, or add something the AI missed. Nothing is committed until the student approves it — the AI proposes, the student owns.
- **Guardrails:** the conversation is bounded (a few turns, not open-ended chat), every AI inference is shown as an editable suggestion rather than a silent assumption, and a student who doesn't want to type can fall back to picking from common domain templates (student / worker / athlete / carer / society-officer) and editing from there.

### A.4 Per-domain structured baseline (step 5)
For **each confirmed domain**, the same compact card — structured precisely because this is the data the engine needs as numbers:

| Field | Captures | Feeds |
|---|---|---|
| **Hours/week** (rough band) | Time cost of the domain | Initial **Pressure** contribution |
| **Drain ↔ Fulfillment** (slider) | How the domain makes them feel to do | Fulfillment coefficient (see A.6) — splits the domain's effect across Pressure and Vitality |
| **Steady ↔ Spiky** (volatility) | Whether load is constant or seasonal (e.g. competition weeks, exam blocks, shift clustering) | Forecasting sensitivity for that domain |

Because these three questions are identical per domain, they stay fast even across several domains — the student learns the pattern once and repeats it. Domains flagged spiky are the ones forecasting watches hardest.

### A.5 Whole-person baseline (step 6, adaptive)
Some sub-stats aren't fully covered by domains, so a short adaptive pass seeds the rest — but the AI **skips or rewords anything the domains already answered**:
- **Rest** — typical sleep window + self-rated energy (skipped-if-obvious never applies; always asked, it's foundational).
- **Connection** — living situation / social baseline. *Reworded or skipped* if a highly social domain (society officer, team sport) already implies it.
- **Mood** — a single "how are you feeling about the term ahead?" slider. Deliberately one question; mood is volatile and real check-ins take over fast (Part C).
- **Physical** — only asked explicitly if no physical-tagged domain surfaced; otherwise seeded from that domain and left to calibrate from logged activity.

### A.6 The fulfillment mechanic — how drain/fulfillment changes scoring
This is the substantive scoring change that A.4's slider introduces. Per your decision, a fulfilling domain **both costs less Pressure and feeds Vitality**; a draining one does the opposite. Concretely:

- Each domain gets a `fulfillment_coefficient` in roughly [−1, +1] from its slider (−1 = purely draining, +1 = deeply fulfilling, 0 = neutral).
- A domain's raw time/effort still generates a base load. The coefficient then **splits that load's effect**:
  - **Fulfilling (positive):** part of the would-be Pressure is discounted, and a portion is redirected as a small positive contribution to Vitality (mostly the **Mood** and, for social domains, **Connection** sub-stats). Doing the thing you love is still time spent, but it doesn't drain you the way an equal block of dreaded work does — and can leave you *better* off.
  - **Draining (negative):** the full Pressure cost applies with no discount, plus a small ongoing drag on Vitality — this is the model's representation of the work that quietly burns people out even when the hours look reasonable.
- This makes the central burnout insight legible: **two 10-hour commitments are not equal**. A student overloaded on fulfilling work looks different, and is treated differently, from one drowning in draining work — the second is the real burnout risk, and Pip will show it sooner.
- The onboarding slider sets the *starting* coefficient; real signals refine it over time (see A.7), because a domain someone expected to love can turn draining, and the app should follow the truth, not the intake form.

### A.7 Where the drain/fulfillment rating goes after onboarding
Captured per-domain at onboarding, then **refined continuously** — never frozen at the intake value:
- Daily check-ins and completion signals tied to a domain nudge its `fulfillment_coefficient` over time (the same lightweight calibration machinery in `pip-product-spec.md` §5.3).
- The **Weekly Reflect** is where any meaningful shift is surfaced for the student to confirm ("Barista shifts have been draining you more than you expected — want Pip to weigh them accordingly?").
- A student can always adjust a domain's ratings manually in its settings.

### A.8 Progressive disclosure (deferred out of onboarding)
To protect the effort budget, these surface later in context, not during setup:
- Fine-grained per-category weight tuning → first Weekly Reflect.
- Notification timing / quiet hours → first time a nudge would fire off-hours.
- Friends / social sharing → first time the student opens the social area.
- Advanced calibration controls → settings only, never pushed.
- Adding/retiring domains → available any time from the domain list.

### A.9 Cold-start handling
Until real data accumulates, the system leans on onboarding baselines and is honest about it:
- **Days 1–7:** scores are internally labelled "estimated from your setup"; forecasting runs conservatively (wider thresholds) to avoid false alarms on thin data.
- **All personal coefficients** — including every domain's `fulfillment_coefficient` — start from the onboarding values and only begin moving once there's about a week of real signal to compare against.
- **No calibration nudges** in week 1; correcting the model before it has evidence is premature.

### A.10 Onboarding acceptance criteria (summary)
- Every student exits onboarding with at least one confirmed **Life Domain**, each carrying category tags, an hours estimate, a fulfillment rating, and a volatility rating.
- A student who declines the AI conversation can still build their domains from templates and finish.
- The whole flow is completable in roughly 4–5 minutes; the per-domain card stays fast even at 4–6 domains.
- Pip's **first reveal** visibly reflects the student's actual life — someone who reported heavy, mostly-draining commitments and poor sleep does *not* see a pristine Balanced Pip, which is what establishes that the app was genuinely listening.

---

## Part B — GTD Flow

### B.0 The five GTD stages, mapped
Pip adapts the canonical GTD pipeline (Capture → Clarify → Organize → Reflect → Engage). The adaptation deliberately **collapses Clarify + Organize into one AI-assisted pass** to remove friction, and restores **Reflect** as the Weekly Reflect (which the early module breakdown had dropped).

| GTD stage | In Pip | Feature (spec ref) |
|---|---|---|
| Capture | Mind-dump: dump everything about one thing into a single inbox item | Module 1.1 |
| Clarify + Organize | One AI pass: categorize, extract next actions, split large items, schedule to calendar | Module 1.2, 3.5 |
| Engage | Today's Manifest: a capacity-sized daily list | Module 3.1–3.3 |
| Reflect | Weekly Reflect: review, calibration, next-week forecast | Module 3.8 |

### B.1 Capture — the mind-dump
- The unit of capture is **one inbox item = one brain-dump about one thing**, which may contain multiple pieces of context (typed text, pasted content, a screenshot, a voice note) added in the same session.
- Capture never asks the student to categorize, prioritize, or structure anything. That is the entire point — capture is for getting it *out*, processing comes later.
- Each item is stored as `unprocessed` until the student chooses to process it.
- Capture must be reachable in one action from outside the app (widget / share-sheet), because the moments worth capturing rarely happen inside the app.

### B.2 Clarify + Organize — the AI pass
When the student processes an inbox item, one AI pass does all of the following and presents the result for review before anything is committed:

1. **Interpret** the raw dump into discrete candidate actions.
2. **Classify** each action by matching it to one of the student's existing **Life Domains** where possible (e.g. "email the venue about finals" → Debate Club President), from which it inherits that domain's category tags and fulfillment rating. If no domain fits, the action is tagged directly with one of the five generic categories and flagged as a possible new domain to confirm later.
3. **Apply the 2-minute rule:** anything genuinely trivial is flagged "just do it now" rather than scheduled, to avoid cluttering the calendar with noise.
4. **Split large items** automatically into ordered sub-tasks (Module 3.5) — sub-tasks inherit the parent's category and due date.
5. **Estimate effort/weight** per action, flagging low-confidence estimates for a later Task-Level Calibration Check (spec §5.3 point 6).
6. **Schedule** each action onto the calendar, respecting existing commitments and the student's current Pressure (it won't stack new work onto an already-red day without surfacing that).
7. **Present for review:** the student sees the proposed structure and can edit categories, dates, splits, or reject items before committing. Nothing enters the active task list until this confirmation.

**Why one combined pass rather than separate Clarify and Organize steps:** two sequential review screens is exactly the friction that stops people maintaining a GTD system. The AI does the mechanical sorting; the human does one lightweight review. This is the single biggest departure from textbook GTD and it's intentional.

### B.3 Engage — Today's Manifest
- Each morning the student is given a **prioritized daily list sized to remaining capacity**, not the full backlog.
- When Pressure is already high, the Manifest deliberately **shortens** rather than showing everything — presenting a full backlog to an overloaded student is precisely the failure mode the app exists to prevent.
- The student can swap items in/out manually; contexts (`@library`, `@online`, `@errands`, `@low-energy`) let them filter to what's actionable right now.
- Completing a task recalculates Pressure immediately; low-confidence tasks may trigger the once-daily calibration check on completion.

### B.4 Reflect — Weekly Reflect
- Once a week, the student reviews: tasks completed vs. deferred, the Pressure/Vitality trend broken into the four sub-stats, and the current Balance Streak.
- Any proposed calibration coefficient change is shown **explicitly for accept/dismiss** — never applied silently. This is the transparency surface for the whole personalization system.
- Next week's forecasted risk days are previewed here.
- This stage closes the loop: without it, deferred tasks pile up invisibly and the personalization engine has no user-facing moment. It is a Must-have for exactly this reason.

### B.5 Item lifecycle (state machine)
```
[captured] --process--> [ai-proposed] --confirm--> [active]
   |                          |                        |
   |                          |                        +--complete--> [done]
   |                          |                        +--reschedule--> [active] (new date)
   |                          |                        +--defer------> [deferred] (surfaced in Weekly Reflect)
   |                          +--reject--> [discarded]
   +--discard (not actionable)--> [discarded]
```
- `captured` → raw mind-dump, unprocessed.
- `ai-proposed` → AI has structured it; awaiting the student's one review.
- `active` → committed, counts toward Pressure, eligible for Today's Manifest.
- `deferred` → consciously pushed; resurfaces in Weekly Reflect so it can't silently rot.
- `done` / `discarded` → terminal; `done` moves to history and feeds calibration.

---

## Part C — How "Mood" is defined and what affects it

*(Answering the direct question — this also pins down one of the four Vitality sub-stats precisely.)*

### C.1 What Mood is, and what it is not
In Pip, **Mood is one of the four Vitality sub-stats** — a 0–100 value representing the student's *self-reported emotional state over recent days*, smoothed so a single rough evening doesn't crater it. It is deliberately scoped narrowly:

- **Mood is** the emotional-reserve signal: how the student says they're feeling, tracked over time.
- **Mood is *not* a clinical or diagnostic measure.** The app never labels a Mood value as depression, anxiety, or any condition. It's a self-reported trend line, nothing more, and copy around it should stay in plain language ("your mood's been dipping this week"), never clinical language.
- **Mood is *not* the whole of Vitality.** A student can be in a fine mood but physically exhausted (low Rest/Physical) — keeping Mood as its own sub-stat is what lets Pip distinguish those.

### C.2 What raises Mood
| Input | Effect | Source |
|---|---|---|
| Positive daily check-in (slider toward the good end) | Primary driver — raises Mood directly | Mood/Stress check-in (Module 4.3) |
| Completing a Weekly Reflect | Small lift — closure and self-review have positive effect | Module 3.8 |
| Recovery from a Critical event (the Comeback) | Small lift, alongside the Comeback Bonus | Gamification design |
| Sustained Balanced days | Slow passive recovery of Mood toward baseline | Derived |

### C.3 What lowers Mood
| Input | Effect | Source |
|---|---|---|
| Negative daily check-in | Primary driver — lowers Mood directly | Mood/Stress check-in |
| Sustained high Pressure left unaddressed | Compounding drain — the longer Pressure stays high with no recovery action, the more Mood erodes | Derived (spec §5.2) |
| A logged Critical event | Notable dip (though recovery is always available and rewarded) | Gamification design |
| Long gap with no check-in | Mild passive decay toward neutral, not a punishment — the system simply loses confidence and drifts the value back toward baseline rather than holding a stale high | Derived |

### C.4 The primary input: the daily check-in
Mood's main feed is the **Mood/Stress quick check-in** — a two-tap slider, once a day, kept deliberately frictionless so the habit actually holds. This is the single most important recurring input for Mood, which is why:
- It's a Must-have feature.
- It's capped at two taps — any longer and daily compliance drops, and an un-logged Mood is a guessed Mood.
- Its result is *smoothed* into the Mood sub-stat rather than overwriting it — one bad day nudges the trend, it doesn't define it.

### C.5 How Mood shows up on Pip
Because Mood is a Vitality sub-stat, when it is the **lowest** of the four it becomes the one that drives Pip's visual detail and the recovery nudge:
- **Visual:** duller / desaturated color on Pip within whatever base state it's in.
- **Nudge:** a low-Mood-specific suggestion (a short guided break, a downtime activity), distinct from the rest, movement, or social nudges the other three sub-stats would trigger.

### C.6 A deliberate safety boundary
Mood tracking touches genuinely sensitive territory, so two limits are baked in:
- The app **surfaces trends, not diagnoses** — it will say Mood has been low for a stretch and suggest recovery or, if sustained and severe, gently point toward talking to someone; it will never assert a mental-health condition.
- A **sustained, severe Mood low** is one of the signals (alongside a Vitality-driven Critical) that should route toward a supportive check-in and, where the institution provides it, a pointer to real human support resources — always as an offer, never an automated judgment.
