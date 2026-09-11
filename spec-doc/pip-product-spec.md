# Pip — Capacity Companion App
### Full Product & System Specification
*Lifestyle Track: Beating the Burnout*

---

## Product Overview

**Pip** is a workload-and-recovery app built around a living companion instead of a checklist. Every student is paired with their own pet, **Pip**, whose body visibly reflects two underlying scores:

- **Pressure** — how much is currently being asked of the student (mental load, time load, errands). Drives Pip's **size**: Pip inflates as pressure rises.
- **Vitality** — how much rest and reserve the student has banked (sleep, mood, physical health, social connection). Drives Pip's **posture, color, and energy**: Pip shrinks and droops as vitality falls.

Because these are two independent axes, Pip can be visibly "stressed but coping" or "calm but exhausted" — states a single wellbeing score could never distinguish, and states that need genuinely different interventions.

**Why this beats a generic to-do app:** to-do apps treat every task as equal and the user as infinitely capable. Pip treats capacity itself as the primary object — tasks are just one of the things that act on it. The care-for-a-pet framing also gives gamification a target that isn't "do more" (the usual productivity-app trap, and the wrong incentive for a burnout tool) — it's "keep Pip balanced," which structurally rewards *sustainability* instead of *output*.

---

## 1. Gamification Design & Mascot Visualization

### 1.1 Design principle
The reward loop must never pay out for overload and must never punish a bad day. Two rules follow from this everywhere below:
- **No permanent loss condition.** Pip never "dies." A crisis state is recoverable, always, starting the moment the student takes one supportive action.
- **Two independent visual layers.** *State* (Pressure/Vitality — fluctuates daily) is shown separately from *Identity* (Tier — earned progress, persists). A bad week changes how Pip looks today; it never erases what the student has already earned.

### 1.2 The five states
| State | Trigger condition | Visual read |
|---|---|---|
| **Balanced** | Pressure < 60, Vitality > 30 | Normal size, bright color, bouncy idle animation, relaxed smile |
| **Strained** | Pressure ≥ 60, Vitality > 30 | Puffed up, cheeks bulging, squinting, a sweat drop — tense but coping |
| **Wilting** | Pressure < 60, Vitality ≤ 30 | Shrunken, drooping eyelids, muted color, slow "zzz" idle — under-loaded but depleted |
| **Depleted & overloaded** | Pressure ≥ 60, Vitality ≤ 30 | Puffed and sagging at once, droopy eyes, tense mouth — the worst combined state |
| **Critical** | Pressure ≥ 90, OR (Pressure ≥ 70 AND Vitality ≤ 15) | Maximum inflation, trembling, pulsing outline — triggers an immediate, supportive full-screen intervention (not a "pop" animation; the release is framed as Pip letting out a breath and settling, once the student logs a recovery action) |

Recovery from Critical is always framed as relief, never failure: a soft exhale animation, gradual deflation, and a return to whichever of the four base states the current Pressure/Vitality actually supports.

### 1.3 Value metrics
| Metric | What it is | How it's earned |
|---|---|---|
| **Sparks** | Soft currency, spent on cosmetics/habitat items | Awarded at end-of-day based on the day's outcome (below) |
| **XP** | Cumulative progression score, drives Tier | Same end-of-day award as Sparks |
| **Care Points** | Small, always-available reward | +1 every time a recovery action is logged, *regardless* of the day's overall state |
| **Balance Streak** | Consecutive days without hitting Critical | Increments once per day if Critical wasn't triggered; resets to 0 on a Critical event but never deducts XP/Sparks already banked |

**Example end-of-day payout table** (tune via playtesting, not fixed):
- Ended the day Balanced → +15 XP, +10 Sparks
- Ended the day Strained *with* a recovery action logged → +8 XP, +5 Sparks
- Ended the day Strained with *no* recovery action logged → +3 XP, +0 Sparks
- Ended the day Wilting or Depleted → +0 XP/Sparks from the day itself, but any Care Points earned that day still bank normally
- First Balanced day *after* a Critical event → the normal Balanced payout plus a one-time "Comeback Bonus" (+10 XP) — re-engagement is rewarded, not just avoided

No day, at any state, ever *subtracts* XP or Sparks. The only thing a bad day costs is the Balance Streak counter — and even that is explicitly framed in-app as "the streak reset, your progress didn't."

**Anti-gaming rule:** a day with zero interaction (no check-in, no task activity) does not count as a free Balanced day — Pressure carries forward from known calendar/task data even without a check-in, and no Sparks/XP are paid out for days with no logged signal at all. This keeps "just don't open the app" from being the optimal strategy.

### 1.4 Tiers (persistent identity layer)
| Tier | Cumulative XP | Unlocks |
|---|---|---|
| Hatchling | 0–199 | Base Pip skin, starter habitat |
| Sprout | 200–599 | First accessory slot (hat/scarf), 2 habitat items |
| Companion | 600–1,499 | Second accessory slot, ambient habitat effects (weather, plants) |
| Guardian | 1,500–3,499 | Rare cosmetic set, ability to send "flares" to friends |
| Elder | 3,500+ | Full customization set, exclusive seasonal cosmetics |

Tier accessories render on Pip *regardless of current state* — a Guardian-tier Pip having a Depleted day still wears its scarf; it's just also visibly sagging. This is the mechanism that keeps a rough week from feeling like it erased months of progress.

### 1.5 Visual mapping summary
| Data | Rendered as |
|---|---|
| Pressure | Pip's size (inflation) |
| Vitality | Pip's posture, facial expression, color saturation, animation speed |
| Tier (XP) | Persistent accessories/aura on Pip, always visible |
| Sparks | A counter in the shop UI, not shown on Pip itself |
| Balance Streak | A small row of lanterns/stones in Pip's habitat background, one lit per streak day |
| Recovery action just logged | A brief "sparkle" animation on Pip, immediate positive feedback independent of the day's outcome |

### 1.6 Shareable state (social layer)
Friends can view a coarse version of each other's Pip — state bucket only (e.g. a color-coded silhouette: green/amber/red), never raw Pressure/Vitality numbers or task details. This preserves the "someone can tell I might need a check-in" value of sharing without creating a comparison or leaderboard dynamic, which this app deliberately avoids (see Module 5, Won't-have items).

---

## 2. System Decomposition & Module Breakdown

### Module 1 — Capture & Inbox
| # | Feature | Priority |
|---|---|---|
| 1.1 | Quick-add capture (widget/share-sheet) | Must have |
| 1.2 | Manual task entry with category tagging | Must have |
| 1.3 | Inbox triage / clarify view | Must have |
| 1.4 | AI auto-parse of pasted/forwarded content (emails, screenshots) | Could have |
| 1.5 | Voice memo capture | Could have |
| 1.6 | Calendar/LMS auto-import | Optional |
| 1.7 | Browser extension capture | Optional |

### Module 2 — Capacity Engine
| # | Feature | Priority |
|---|---|---|
| 2.1 | Pressure score calculation | Must have |
| 2.2 | Vitality score calculation | Must have |
| 2.3 | Real-time capacity dashboard | Must have |
| 2.4 | Predictive overload forecasting (7–14 day) | Could have |
| 2.5 | Personal calibration engine (adaptive weights) | Could have |
| 2.6 | Wearable/health app integration | Optional |
| 2.7 | Anonymized peer benchmarking | Optional |

### Module 3 — Task & GTD Management
| # | Feature | Priority |
|---|---|---|
| 3.1 | Today's Manifest (capacity-based daily list) | Must have |
| 3.2 | Contexts & categories (@library, @errands, @low-energy) | Must have |
| 3.3 | Task completion & rescheduling | Must have |
| 3.4 | Smart Load Balancer (AI rebalancing suggestions) | Could have |
| 3.5 | Large-task auto-splitting | Could have |
| 3.6 | Task delegation/sharing with study groups | Optional |
| 3.7 | Recurring task templates | Optional |

### Module 4 — Recovery & Wellbeing
| # | Feature | Priority |
|---|---|---|
| 4.1 | Recovery action logging | Must have |
| 4.2 | Context-matched recovery nudges | Must have |
| 4.3 | Mood/stress quick check-in | Must have |
| 4.4 | Guided recovery content (breathing, short breaks) | Could have |
| 4.5 | Natural-language check-in with sentiment analysis | Could have |
| 4.6 | Campus counseling/resource directory integration | Optional |

### Module 5 — Mascot & Gamification
| # | Feature | Priority |
|---|---|---|
| 5.1 | Real-time mascot state rendering | Must have |
| 5.2 | Sparks & XP ledger | Must have |
| 5.3 | Balance Streak tracker | Must have |
| 5.4 | Tier progression & persistent accessories | Could have |
| 5.5 | Cosmetic shop / habitat customization | Could have |
| 5.6 | Shareable pet-state view (friends) | Optional |
| 5.7 | Seasonal "high-pressure" events tied to academic calendar | Optional |

*Won't-have (explicitly out of scope): public leaderboards, any XP/Sparks reward tied to task volume, and any mechanic that decreases a stat visible to other users — all directly conflict with the anti-overwork design principle.*

### Module 6 — Onboarding & Personalization
| # | Feature | Priority |
|---|---|---|
| 6.1 | Baseline capacity survey | Must have |
| 6.2 | Initial calibration setup | Must have |
| 6.3 | Permissions & integrations setup | Must have |
| 6.4 | Adaptive onboarding questions | Could have |
| 6.5 | Mascot skin/name selection | Could have |
| 6.6 | Gamified tutorial walkthrough | Optional |

---

## 3. User Stories

*Priority key: 1 = Must have, 2 = Could have, 3 = Optional.*

### Module 1 — Capture & Inbox

TITLE: Quick-Add Capture PRIORITY: 1
As a student, I want to add a task from anywhere on my phone in a few seconds. So that nothing gets lost between classes.

ACCEPTANCE CRITERIA:
● Given I am on my phone's lock screen or in another app,
● When I trigger the quick-add widget or share sheet,
● Then the system saves my input as a new inbox item,
  ○ Timestamp of capture
  ○ Raw text or shared content
  ○ Default status: "uncategorized"

TITLE: Manual Task Entry with Category Tagging PRIORITY: 1
As a student, I want to add a task and tag which part of my life it belongs to. So that it counts toward the right kind of load.

ACCEPTANCE CRITERIA:
● Given I am creating a new task,
● When I fill in the title and select a category,
● Then the system stores the task with that category,
  ○ Category options: mental, time, physical, social, errands
  ○ Optional due date and effort estimate

TITLE: Inbox Triage / Clarify View PRIORITY: 1
As a student, I want to quickly sort captured items into real tasks or discard them. So that my inbox never becomes another pile of clutter.

ACCEPTANCE CRITERIA:
● Given I have uncategorized items in my inbox,
● When I open the triage view,
● Then the system presents one item at a time with quick actions,
  ○ "Make it a task" (prompts for category)
  ○ "Not actionable — discard"
  ○ "Someday — park it"

TITLE: AI Auto-Parse of Pasted Content PRIORITY: 2
As a student, I want to paste a syllabus or forwarded email and have tasks extracted automatically. So that I don't have to retype every deadline by hand.

ACCEPTANCE CRITERIA:
● Given I paste or forward text containing dates or action items,
● When the system processes the content,
● Then it proposes a list of extracted tasks for my review before saving,
  ○ Suggested title, due date, and category per item
  ○ I can edit or reject any suggestion before it's added

TITLE: Voice Memo Capture PRIORITY: 2
As a student, I want to record a quick voice note between classes. So that I can capture a thought without stopping to type.

ACCEPTANCE CRITERIA:
● Given I open the quick-add widget,
● When I choose voice capture and speak,
● Then the system transcribes the memo and saves it to my inbox,
  ○ Original audio retained until I confirm the transcription

TITLE: Calendar/LMS Auto-Import PRIORITY: 3
As a student, I want my class schedule and assignment deadlines imported automatically. So that my workload picture is complete without manual entry.

ACCEPTANCE CRITERIA:
● Given I have connected a calendar or LMS account,
● When new events or deadlines appear there,
● Then the system creates or updates matching tasks automatically,
  ○ Imported items are tagged with their source
  ○ Conflicting manual edits are flagged for my review

TITLE: Browser Extension Capture PRIORITY: 3
As a student, I want to save a task directly from a webpage I'm reading. So that I can capture something without switching to the app.

ACCEPTANCE CRITERIA:
● Given I have the browser extension installed,
● When I click "add to Pip" on a page,
● Then the system saves the page title and link as an inbox item

### Module 2 — Capacity Engine

TITLE: Pressure Score Calculation PRIORITY: 1
As a student, I want the app to calculate how much load I'm currently carrying. So that I have an honest, at-a-glance read on my workload.

ACCEPTANCE CRITERIA:
● Given I have active tasks with categories, due dates, and effort estimates,
● When the system recalculates my Pressure score,
● Then it returns a 0–100 value reflecting current load,
  ○ Weight increases as a task's due date approaches
  ○ Score updates whenever a task is added, completed, or rescheduled

TITLE: Vitality Score Calculation PRIORITY: 1
As a student, I want the app to track how much reserve energy I have. So that fatigue and mental health are represented, not just my task list.

ACCEPTANCE CRITERIA:
● Given I have logged sleep, mood check-ins, or recovery actions,
● When the system recalculates my Vitality score,
● Then it returns a 0–100 value reflecting current reserve,
  ○ Score decreases with sustained high Pressure and poor sleep
  ○ Score increases with logged recovery actions and positive check-ins

TITLE: Real-Time Capacity Dashboard PRIORITY: 1
As a student, I want to see my current Pressure and Vitality at a glance. So that I know where I stand without digging through menus.

ACCEPTANCE CRITERIA:
● Given my Pressure and Vitality scores have been calculated,
● When I open the home screen,
● Then the system displays both scores and Pip's corresponding state,
  ○ Numeric values available on tap for detail
  ○ Trend arrow showing direction over the last 3 days

TITLE: Predictive Overload Forecasting PRIORITY: 2
As a student, I want to know ahead of time if a day is going to overload me. So that I can act before it happens instead of after.

ACCEPTANCE CRITERIA:
● Given I have tasks and deadlines scheduled in the next 14 days,
● When the system runs its forecast,
● Then it flags any day where projected Pressure is likely to reach Strained or higher,
  ○ Flag appears at least 48 hours before the projected date
  ○ Notification includes the main contributing tasks

TITLE: Personal Calibration Engine PRIORITY: 2
As a student, I want the app to learn how tasks actually affect me personally. So that the scores reflect my real experience, not a generic average.

ACCEPTANCE CRITERIA:
● Given I have submitted self-reported stress check-ins alongside computed Pressure scores,
● When the system detects a consistent mismatch between the two,
● Then it adjusts my personal category-weight coefficients,
  ○ Adjustment is gradual (no single check-in causes a large swing)
  ○ I can view and manually reset my calibration in settings

TITLE: Wearable/Health App Integration PRIORITY: 3
As a student, I want my sleep and activity data pulled in automatically. So that I don't have to log them by hand every day.

ACCEPTANCE CRITERIA:
● Given I have connected a wearable or health app,
● When new sleep or activity data is available,
● Then the system incorporates it into my Vitality calculation automatically,
  ○ I can see which inputs came from the connected device vs. manual entry

TITLE: Anonymized Peer Benchmarking PRIORITY: 3
As a student, I want to see how my workload compares to similar students. So that I can tell if what I'm carrying is unusually heavy.

ACCEPTANCE CRITERIA:
● Given a large enough anonymized sample exists for my year/program,
● When I view my capacity dashboard,
● Then the system shows an optional comparison band,
  ○ Comparison is opt-in and shown only in aggregate, never to other individual users

### Module 3 — Task & GTD Management

TITLE: Today's Manifest PRIORITY: 1
As a student, I want a short daily list built around my actual remaining capacity. So that I'm not staring at every task at once.

ACCEPTANCE CRITERIA:
● Given I have active tasks and a current Pressure score,
● When I open the app in the morning,
● Then the system generates a prioritized list sized to my remaining capacity,
  ○ List shortens automatically when Pressure is already high
  ○ I can manually swap items in or out

TITLE: Contexts & Categories PRIORITY: 1
As a student, I want to filter tasks by where or how I can do them. So that I can act on what fits my current situation.

ACCEPTANCE CRITERIA:
● Given my tasks have assigned contexts,
● When I filter my task list by a context,
● Then only matching tasks are shown,
  ○ Contexts include @library, @online, @errands, @low-energy

TITLE: Task Completion & Rescheduling PRIORITY: 1
As a student, I want to mark tasks done or push them to another day. So that my list always reflects reality.

ACCEPTANCE CRITERIA:
● Given a task is on my active list,
● When I mark it complete or choose "reschedule,"
● Then the system updates its status and recalculates my Pressure score,
  ○ Completed tasks move to a history log
  ○ Rescheduled tasks retain their original category and notes

TITLE: Smart Load Balancer PRIORITY: 2
As a student, I want suggestions for what to defer when I'm overloaded. So that I don't have to figure out the trade-offs myself under stress.

ACCEPTANCE CRITERIA:
● Given my Pressure score is in the Strained range or higher,
● When I open the load balancer,
● Then the system proposes specific tasks to defer, batch, or drop,
  ○ Each suggestion states the resulting Pressure reduction
  ○ I can accept, modify, or dismiss each suggestion individually

TITLE: Large-Task Auto-Splitting PRIORITY: 2
As a student, I want a big assignment broken into smaller next actions automatically. So that starting doesn't feel as overwhelming as the whole project.

ACCEPTANCE CRITERIA:
● Given I create a task marked as large or multi-step,
● When the system processes it,
● Then it proposes a sequence of smaller sub-tasks,
  ○ Sub-tasks inherit the parent's category and due date
  ○ I can edit, reorder, or merge the proposed sub-tasks

TITLE: Task Delegation/Sharing PRIORITY: 3
As a student, I want to share a group-project task with teammates. So that we all see the same status without a separate spreadsheet.

ACCEPTANCE CRITERIA:
● Given I have a task tied to a group project,
● When I share it with teammates who also use the app,
● Then all shared members can see and update its status,
  ○ Only the assigned owner's Pressure score counts the task's weight

TITLE: Recurring Task Templates PRIORITY: 3
As a student, I want to save a task as a repeating template. So that I don't have to recreate the same weekly chore every time.

ACCEPTANCE CRITERIA:
● Given I mark a task as recurring,
● When its recurrence interval elapses,
● Then the system automatically creates the next instance,
  ○ I can pause or edit the recurrence at any time

### Module 4 — Recovery & Wellbeing

TITLE: Recovery Action Logging PRIORITY: 1
As a student, I want to log when I rest, sleep, or take a break. So that my Vitality score reflects what I'm actually doing to recover.

ACCEPTANCE CRITERIA:
● Given I have taken a rest, sleep, or downtime action,
● When I log it in the app,
● Then the system records it and updates my Vitality score,
  ○ Logged categories: sleep, break, exercise, social downtime
  ○ Immediate "Care Point" is awarded regardless of my current state

TITLE: Context-Matched Recovery Nudges PRIORITY: 1
As a student, I want recovery suggestions that match what's actually low. So that the advice feels relevant instead of generic.

ACCEPTANCE CRITERIA:
● Given my Vitality score has dropped and a specific sub-input is lowest,
● When the system sends a recovery nudge,
● Then the suggestion matches that specific input,
  ○ Low sleep → suggests a rest window
  ○ Low social connection → suggests a specific low-effort hangout

TITLE: Mood/Stress Quick Check-In PRIORITY: 1
As a student, I want to log how I'm feeling in a few seconds. So that a real check-in habit doesn't feel like a chore.

ACCEPTANCE CRITERIA:
● Given I open the daily check-in prompt,
● When I select a mood/stress level on a simple slider,
● Then the system records it and factors it into my Vitality score,
  ○ Check-in takes no more than two taps to complete

TITLE: Guided Recovery Content PRIORITY: 2
As a student, I want a short guided activity when I'm stressed. So that I have something concrete to do, not just a suggestion to "relax."

ACCEPTANCE CRITERIA:
● Given I tap on a recovery nudge,
● When I choose to start the guided activity,
● Then the system plays a short breathing or break exercise,
  ○ Duration options of 2, 5, and 10 minutes
  ○ Completing the activity logs it as a recovery action automatically

TITLE: Natural-Language Check-In PRIORITY: 2
As a student, I want to type or say how I'm doing in my own words. So that I don't have to fit my feelings into a fixed scale every time.

ACCEPTANCE CRITERIA:
● Given I enter a free-text or voice check-in,
● When the system analyzes the sentiment,
● Then it converts the result into a Vitality adjustment,
  ○ I can see the interpreted mood level and correct it if it's wrong

TITLE: Campus Resource Directory Integration PRIORITY: 3
As a student, I want to find campus counseling or wellbeing resources from within the app. So that I don't have to search separately when I need support.

ACCEPTANCE CRITERIA:
● Given my Vitality score has been critically low for a sustained period,
● When the system surfaces a support suggestion,
● Then it includes a link to relevant campus or local resources,
  ○ Resource list is configurable per institution

### Module 5 — Mascot & Gamification

TITLE: Real-Time Mascot State Rendering PRIORITY: 1
As a student, I want my pet's appearance to reflect my current Pressure and Vitality. So that I can understand my status instantly without reading numbers.

ACCEPTANCE CRITERIA:
● Given my Pressure and Vitality scores have been calculated,
● When I view Pip on the home screen,
● Then Pip's size, posture, and color reflect the current state,
  ○ States: Balanced, Strained, Wilting, Depleted & overloaded, Critical
  ○ Transitions between states animate smoothly rather than snapping

TITLE: Sparks & XP Ledger PRIORITY: 1
As a student, I want to earn currency and progress for staying balanced. So that the reward system reinforces the behavior I actually want.

ACCEPTANCE CRITERIA:
● Given a day has ended,
● When the system evaluates my day's outcome,
● Then it credits Sparks and XP according to the payout table,
  ○ No day ever results in a negative balance
  ○ Ledger history is viewable in my profile

TITLE: Balance Streak Tracker PRIORITY: 1
As a student, I want to see how many days I've kept Pip balanced in a row. So that I have a visible incentive to stay consistent.

ACCEPTANCE CRITERIA:
● Given a day ends without a Critical event,
● When the system updates my streak,
● Then the Balance Streak count increases by one,
  ○ A Critical event resets the streak to zero
  ○ XP and Sparks already earned are never affected by a reset

TITLE: Tier Progression & Persistent Accessories PRIORITY: 2
As a student, I want my earned progress to stay visible even on a bad day. So that one rough week doesn't feel like it erased my effort.

ACCEPTANCE CRITERIA:
● Given my cumulative XP crosses a tier threshold,
● When the system updates my profile,
● Then Pip is granted the new tier's accessory or aura,
  ○ Accessories render regardless of Pip's current state
  ○ I receive a notification explaining what was unlocked

TITLE: Cosmetic Shop / Habitat Customization PRIORITY: 2
As a student, I want to spend Sparks on cosmetic items for Pip and its habitat. So that I have a reason to keep earning currency beyond raw numbers.

ACCEPTANCE CRITERIA:
● Given I have accumulated Sparks,
● When I open the shop,
● Then I can preview and purchase available cosmetic items,
  ○ Items affect appearance only, never gameplay/scoring
  ○ Purchases are reflected on Pip immediately

TITLE: Shareable Pet-State View PRIORITY: 3
As a student, I want close friends to see a rough sense of how I'm doing. So that someone can check in on me without me having to ask first.

ACCEPTANCE CRITERIA:
● Given I have opted in and added friends,
● When a friend views my profile,
● Then they see a coarse state indicator only,
  ○ Only a color-coded bucket is shown, never numeric scores or task details
  ○ I can revoke sharing at any time

TITLE: Seasonal High-Pressure Events PRIORITY: 3
As a student, I want the app to recognize known heavy periods like midterms. So that its expectations match the reality of the semester.

ACCEPTANCE CRITERIA:
● Given the academic calendar includes a known high-load period,
● When that period begins,
● Then the system adjusts forecasting sensitivity and offers a matching cosmetic badge for navigating it well,
  ○ Badge is awarded only if Critical was avoided or quickly recovered from during the period

### Module 6 — Onboarding & Personalization

TITLE: Baseline Capacity Survey PRIORITY: 1
As a new student user, I want to answer a few questions about my current life before I start. So that my scores are meaningful from day one instead of starting at zero context.

ACCEPTANCE CRITERIA:
● Given I have just created an account,
● When I complete the onboarding survey,
● Then the system sets my initial Pressure/Vitality baselines,
  ○ Questions cover current commitments, typical sleep, and support network
  ○ Survey takes no more than three minutes to complete

TITLE: Initial Calibration Setup PRIORITY: 1
As a new student user, I want my personal weight coefficients set from my survey answers. So that the app doesn't treat me identically to every other student.

ACCEPTANCE CRITERIA:
● Given I have completed the baseline survey,
● When the system initializes my profile,
● Then it sets starting calibration coefficients per category,
  ○ Coefficients are visible and editable in advanced settings

TITLE: Permissions & Integrations Setup PRIORITY: 1
As a new student user, I want to choose which integrations to connect during setup. So that I control what data the app can access from the start.

ACCEPTANCE CRITERIA:
● Given I am in the onboarding flow,
● When I reach the integrations step,
● Then I can individually enable or skip each available integration,
  ○ Skipped integrations can be enabled later from settings

TITLE: Adaptive Onboarding Questions PRIORITY: 2
As a new student user, I want follow-up questions based on my earlier answers. So that onboarding feels relevant instead of generic.

ACCEPTANCE CRITERIA:
● Given I have answered an initial onboarding question,
● When my answer indicates a specific circumstance (e.g., working part-time),
● Then the system asks a relevant follow-up question,
  ○ Follow-ups are skipped entirely when not triggered

TITLE: Mascot Skin/Name Selection PRIORITY: 2
As a new student user, I want to choose Pip's starting look and name. So that the companion feels like mine from the beginning.

ACCEPTANCE CRITERIA:
● Given I am in the onboarding flow,
● When I reach the mascot customization step,
● Then I can select a starter skin and enter a custom name,
  ○ Selection does not affect Pressure/Vitality mechanics

TITLE: Gamified Tutorial Walkthrough PRIORITY: 3
As a new student user, I want to learn the app's mechanics through a short interactive tutorial. So that I understand how Pip works before relying on it daily.

ACCEPTANCE CRITERIA:
● Given I have completed onboarding,
● When I start the tutorial,
● Then the system walks me through capturing a task, logging a check-in, and viewing Pip's reaction,
  ○ Tutorial can be skipped or replayed from settings

---

## 4. End-to-End User Storyline & Flow

**Day 0 — Onboarding.** Amara installs the app before her first week of classes. She completes the three-minute baseline survey (current commitments, typical sleep, support network), picks a name and starter skin for her pet, and connects her class calendar. The system sets her initial calibration coefficients and Pip appears in the Balanced state — small, calm, bright green.

**Week 1 — Building the habit.** Each morning, Amara sees Today's Manifest: three to five tasks sized to her current capacity, not her full backlog. Throughout the day she captures new tasks in seconds through the quick-add widget. In the evening, a 30-second check-in asks how she's feeling; Pip's expression shifts slightly based on her answer.

**Week 4 — Midterms approach.** The forecasting engine notices three assignments and a part-time shift converging on the same Thursday and flags it two days in advance: "Thursday's looking heavy — want to move something now?" Amara uses the Load Balancer to push a low-priority errand to the weekend. Pip stays Strained rather than sliding into Depleted.

**Week 5 — A rough patch.** Despite the warning, a surprise group project pushes Pressure past 90. Pip visibly maxes out — trembling, pulsing outline — and the app opens a calm, supportive screen instead of piling on more tasks: a suggestion to log one recovery action right now. Amara logs a short walk. Pip lets out a visible breath and settles back down to Strained over the next hour as the system reprocesses her scores. Her Balance Streak resets to zero, but her XP and Sparks are untouched, and the app doesn't dwell on the reset.

**Week 6 — Recovery and re-engagement.** The next day Amara ends Balanced again and receives the Comeback Bonus. Her cumulative XP crosses into the Sprout tier; Pip is granted its first accessory, which stays visible on Pip going forward regardless of daily state.

**Ongoing — The long loop.** Over the semester, Amara's Balance Streak becomes something she checks each morning alongside her task list. Her friend Jordan, who she's added as a Pip contact, notices her state indicator has been amber for a few days and sends a check-in text — something the shared, coarse-only visibility made easy without either of them having to overshare specifics. By finals, the app recognizes the seasonal high-pressure period and adjusts its forecasting sensitivity accordingly, and Amara — now Companion tier — navigates it with her habitat fully decorated from three months of Sparks earned by staying balanced, not by grinding tasks.

---

## 5. System Logic, States & Algorithms

### 5.1 State management

**Core state objects:**
- `UserProfile` — calibration coefficients, tier, integrations, preferences
- `TaskItem` — title, category, due date, effort estimate, status, context
- `CheckIn` — mood/stress value, timestamp, source (slider or natural language)
- `RecoveryAction` — type, timestamp
- `LedgerEntry` — Sparks/XP delta, reason, timestamp
- `PressureState` / `VitalityState` — current computed scores plus recent history
- `MascotState` — derived, never stored independently of the two scores above

**Architecture pattern:** event sourcing. Every user action (task created, task completed, check-in logged, recovery action logged, day rolled over) is appended to an immutable event log. A deterministic reducer recalculates `PressureState`, `VitalityState`, and downstream `MascotState` from that log plus the current time. This gives three practical benefits: the scores are always explainable ("why is my Pressure at 72?" is answerable by replaying the relevant events), calibration changes can be re-applied retroactively without losing history, and the client can work offline and reconcile later since the log is append-only.

**Mascot state derivation** is a pure function of the two scores, evaluated in this order:
```
if Pressure >= 90 or (Pressure >= 70 and Vitality <= 15):
    state = Critical
elif Vitality <= 30 and Pressure >= 60:
    state = Depleted & overloaded
elif Vitality <= 30 and Pressure < 60:
    state = Wilting
elif Pressure >= 60 and Vitality > 30:
    state = Strained
else:
    state = Balanced
```
Tier/accessory rendering is layered on top of this result independently — it is read from `UserProfile`, never recalculated from the daily scores.

### 5.2 Workload calculation logic

**Pressure score:**
```
Pressure = clamp(0, 100,
    Σ over active tasks of (base_weight[category] × personal_coefficient[category] × urgency_multiplier(due_date))
    + manual_stress_adjustment
    − decay_since_last_completion
)
```
- `base_weight[category]` — a default starting weight per category (mental, time, physical, social, errands), tunable at the system level.
- `personal_coefficient[category]` — the per-user calibration multiplier (see 5.3), starts at 1.0 for every user.
- `urgency_multiplier(due_date)` — approaches 1.0 far from a deadline and scales up to roughly 2.0 within 24 hours of it, so the same task visibly "weighs more" as it gets closer.
- `manual_stress_adjustment` — a small offset from the day's check-in, so a subjective bad day nudges the score even before behavior changes catch up.

**Vitality score:**
```
Vitality = clamp(0, 100,
    baseline_reserve
    + Σ recovery_action_value(type, urgency_of_need)
    − fatigue_accumulation(sustained_high_pressure_days, sleep_deficit, low_mood_streak)
)
```
- `recovery_action_value` scales with how needed the action was (e.g. logging sleep after several short nights counts for more than logging it when already well-rested — diminishing returns modeling).
- `fatigue_accumulation` compounds the longer Pressure stays high without a matching recovery action, which is what produces the Depleted & overloaded state rather than just Strained.

### 5.3 Forecasting & personalization algorithm

1. **Aggregate** all known future tasks and deadlines within a rolling 14-day window, from manual entries plus any connected calendar/LMS data.
2. **Project Pressure forward** using each task's known due date and the same `urgency_multiplier` curve used for the live score — this naturally produces a rising forecast as deadlines approach, even before a task becomes "active" in the daily list.
3. **Project Vitality forward** using an exponential moving average of the last 7–14 days of actual Vitality, assuming no behavior change, adjusted downward on days the forecast also shows elevated Pressure (since high-pressure days tend to erode reserve if unaddressed).
4. **Flag risk days** where projected Pressure crosses into Strained or higher while projected Vitality is trending low, and surface the flag at least 48 hours ahead with the specific contributing tasks named.
5. **Calibrate personal coefficients** on a rolling weekly basis: compare each week's self-reported check-in stress levels against the computed Pressure scores for those same days. A consistent mismatch (self-report reliably higher or lower than computed) shifts the relevant `personal_coefficient[category]` values via a small exponential moving average update — deliberately lightweight and explainable for the MVP, with a heavier per-user regression or ML-based model left as a future (Optional-tier) enhancement once enough longitudinal data exists to train one responsibly.
