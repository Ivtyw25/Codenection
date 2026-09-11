# Pip — User Stories
*Companion document to `pip-product-spec.md`. Priority key: 1 = Must have, 2 = Could have, 3 = Optional.*

---

### Module 1 — Capture & Inbox

TITLE: Quick Mind-Dump Capture PRIORITY: 1
As a student, I want to dump everything on my mind about one thing in a single go — text, a screenshot, a voice note, whatever comes out. So that I don't have to organize my thoughts before capturing them.

ACCEPTANCE CRITERIA:
● Given I open the quick-add capture flow,
● When I add one or more pieces of context in the same session,
● Then the system groups all of it into a single inbox item,
  ○ Text, pasted content, and voice are all supported within the same item
  ○ The item is marked "unprocessed" until AI processes it

TITLE: AI-Assisted GTD Processing PRIORITY: 1
As a student, I want AI to turn my raw mind-dump into organized, actionable tasks. So that I don't have to manually sort and plan everything myself.

ACCEPTANCE CRITERIA:
● Given an inbox item contains my raw captured context,
● When AI processes the item,
● Then the system matches each action to one of my Life Domains, breaks it into step-by-step next actions following GTD principles, and schedules each step on my calendar,
  ○ Matched actions inherit their domain's category tags and fulfillment rating
  ○ If no domain fits, the action is tagged with a generic category and flagged as a possible new domain
  ○ Each extracted step becomes its own task with a suggested date
  ○ I can review and adjust the result before it's finalized

TITLE: Voice Memo Capture PRIORITY: 2
As a student, I want to record a quick voice note between classes. So that I can capture a thought without stopping to type.

ACCEPTANCE CRITERIA:
● Given I open the quick-add widget,
● When I choose voice capture and speak,
● Then the system transcribes the memo and adds it into my current mind-dump item,
  ○ Original audio retained until I confirm the transcription

TITLE: Calendar/LMS Auto-Import PRIORITY: 3
As a student, I want my class schedule and assignment deadlines imported automatically. So that my workload picture is complete without manual entry.

ACCEPTANCE CRITERIA:
● Given I have connected a calendar or LMS account,
● When new events or deadlines appear there,
● Then the system creates or updates matching tasks automatically,
  ○ Imported items are tagged with their source
  ○ Conflicting manual edits are flagged for my review

### Module 2 — Capacity Engine

TITLE: Pressure Score Calculation PRIORITY: 1
As a student, I want the app to calculate how much load I'm carrying, weighing draining work more heavily than fulfilling work. So that Pip reflects real burnout risk, not just raw hours.

ACCEPTANCE CRITERIA:
● Given I have active tasks tied to Life Domains with due dates and effort estimates,
● When the system recalculates my Pressure score,
● Then it updates Pip's visual state accordingly,
  ○ Weight increases as a task's due date approaches
  ○ Tasks from fulfilling domains cost less Pressure than equal-time tasks from draining domains
  ○ The underlying numeric value is available on tap for detail, but is not shown as a primary metric

TITLE: Vitality Score Calculation PRIORITY: 1
As a student, I want the app to track my rest, physical activity, mood, and social connection separately. So that Pip's posture and energy reflect my real state specifically, not one vague number.

ACCEPTANCE CRITERIA:
● Given I have logged sleep, exercise, mood check-ins, social recovery actions, or time on my domains,
● When the system recalculates my Vitality,
● Then it updates the four underlying sub-stats (Rest, Physical, Mood, Connection) and the composite Vitality that drives Pip,
  ○ Time on fulfilling domains feeds Mood (and Connection, for social domains) back up
  ○ Time on draining domains applies an ongoing drag even when the hours look reasonable
  ○ Whichever sub-stat is lowest determines Pip's specific visual flourish and which recovery nudge fires
  ○ The composite score and all four sub-stats are available on tap, but are not shown as a primary metric

TITLE: Task-Level Calibration Check PRIORITY: 2
As a student, I want to confirm or correct the app's effort estimate right after finishing a task it wasn't sure about. So that the app learns from the specific cases it got wrong, not just my overall daily mood.

ACCEPTANCE CRITERIA:
● Given a completed task was flagged low-confidence at capture time (a new category for me, or a task type with no completion history),
● When I mark it complete,
● Then the system shows me its predicted effort/weight for that task and asks if it matches,
  ○ I can confirm it was accurate with a single tap
  ○ I can optionally adjust the value if it felt lighter or heavier than predicted
  ○ Prompt is rate-limited to roughly once a day so it doesn't interrupt every completion

TITLE: Automatic Predictive Overload Forecasting PRIORITY: 2
As a student, I want to be warned about an overload before it happens, without having to check anything myself. So that I can act early instead of reacting after the fact.

ACCEPTANCE CRITERIA:
● Given I have tasks and deadlines scheduled in the next 14 days,
● When the system runs its forecast automatically on a recurring schedule,
● Then it proactively flags any day where projected Pressure is likely to reach Strained or higher,
  ○ Flag is pushed to me at least 48 hours before the projected date, without requiring me to open a forecast view
  ○ Notification includes the main contributing tasks

TITLE: Personal Calibration Engine PRIORITY: 2
As a student, I want the app to learn how tasks actually affect me personally. So that the scores reflect my real experience, not a generic average.

ACCEPTANCE CRITERIA:
● Given I have submitted self-reported stress check-ins alongside computed Pressure scores,
● When the system detects a consistent mismatch between the two,
● Then it adjusts my personal category-weight coefficients,
  ○ Adjustment is gradual (no single check-in causes a large swing)
  ○ I can view and manually reset my calibration in settings

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

TITLE: Automatic Large-Task Splitting PRIORITY: 2
As a student, I want a big assignment broken into smaller next actions automatically. So that starting doesn't feel as overwhelming as the whole project.

ACCEPTANCE CRITERIA:
● Given I create, or AI extracts, a task marked as large or multi-step,
● When the system detects it,
● Then it automatically generates a sequence of smaller sub-tasks without requiring me to request it,
  ○ Sub-tasks inherit the parent's category and due date
  ○ I can still edit, reorder, or merge the generated sub-tasks afterward

TITLE: Task Delegation/Sharing PRIORITY: 3
As a student, I want to share a group-project task with teammates. So that we all see the same status without a separate spreadsheet.

ACCEPTANCE CRITERIA:
● Given I have a task tied to a group project,
● When I share it with teammates who also use the app,
● Then all shared members can see and update its status,
  ○ Only the assigned owner's Pressure score counts the task's weight

TITLE: Check Teammate's Pip Status Before Delegating PRIORITY: 3
As a student working on a group project, I want to see a teammate's current Pip state before assigning them a task. So that I don't hand off work to someone who's already stretched thin.

ACCEPTANCE CRITERIA:
● Given I am about to delegate a task to a teammate who shares their Pip state with me,
● When I open the delegation flow,
● Then the system shows their current coarse Pip state alongside the assignment option,
  ○ Only the color-coded state bucket is shown, never numeric scores or task details
  ○ If they haven't opted into sharing, no state is shown and the option is simply hidden

TITLE: Weekly Reflect Review PRIORITY: 1
As a student, I want a short weekly check-in that looks back at my week. So that I can see the bigger picture and understand why the app is adjusting itself, instead of it happening silently.

ACCEPTANCE CRITERIA:
● Given a week has ended,
● When I open my Weekly Reflect,
● Then the system shows completed vs. deferred tasks, my Pressure/Vitality trend broken into the four Vitality sub-stats, and my current Balance Streak,
  ○ Any proposed calibration coefficient adjustment is shown explicitly, not applied silently
  ○ I can accept or dismiss the proposed adjustment
  ○ A preview of next week's forecasted risk days is included

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
● Given one of my four Vitality sub-stats (Rest, Physical, Mood, Connection) is clearly the lowest,
● When the system sends a recovery nudge,
● Then the suggestion matches that specific sub-stat,
  ○ Low Rest → suggests a rest window
  ○ Low Physical → suggests light movement
  ○ Low Mood → suggests a short guided break
  ○ Low Connection → suggests a specific low-effort hangout

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

### Module 5 — Mascot & Gamification

TITLE: Real-Time Mascot State Rendering PRIORITY: 1
As a student, I want my pet's appearance to reflect my current Pressure and Vitality. So that I can understand my status instantly without reading numbers.

ACCEPTANCE CRITERIA:
● Given my Pressure score and four Vitality sub-stats have been calculated,
● When I view Pip on the home screen,
● Then Pip's size, posture, and color reflect the current state and its lowest sub-stat,
  ○ States: Balanced, Strained, Wilting, Depleted & overloaded, Critical
  ○ Critical renders differently depending on cause: maximum inflation if Pressure-driven, a motionless slump if Vitality-driven
  ○ Transitions between states animate smoothly rather than snapping
  ○ Tapping Pip reveals the underlying Pressure/Vitality numeric detail, without those numbers being the primary display

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

### Module 6 — Onboarding & Personalization

TITLE: AI Domain Discovery PRIORITY: 1
As a new student user, I want the app to learn my actual commitments through a short conversation, not a fixed checklist. So that it understands the specific life I'm juggling, like being a club president or a varsity athlete.

ACCEPTANCE CRITERIA:
● Given I have just created an account and named my pet,
● When I describe what a typical week looks like in the discovery conversation,
● Then the system proposes a set of personalized Life Domains for me to confirm,
  ○ Each proposed domain is auto-tagged with its underlying categories (mental, time, physical, social, errands)
  ○ I can rename, merge, delete, or add a domain before confirming
  ○ Every AI inference is shown as an editable suggestion, never applied silently

TITLE: Per-Domain Structured Baseline PRIORITY: 1
As a new student user, I want to set a quick baseline for each of my commitments. So that the app knows not just what I do, but how heavy it is and how it makes me feel.

ACCEPTANCE CRITERIA:
● Given I have confirmed my Life Domains,
● When I complete the baseline card for each domain,
● Then the system records that domain's weight and feel,
  ○ Rough hours per week
  ○ A drain-to-fulfillment rating
  ○ A steady-to-spiky volatility rating
  ○ The card is identical per domain so it stays fast across several

TITLE: Whole-Person Adaptive Baseline PRIORITY: 1
As a new student user, I want to answer only the general questions my commitments didn't already cover. So that onboarding doesn't ask me things it should already know.

ACCEPTANCE CRITERIA:
● Given my Life Domains have been captured,
● When the system runs the whole-person baseline step,
● Then it asks about sleep, connection, and outlook, skipping or rewording anything the domains already answered,
  ○ Sleep/energy is always asked (foundational to the Rest sub-stat)
  ○ Connection is skipped or reworded if a highly social domain already implies it
  ○ Outlook is a single mood slider

TITLE: Initial Calibration Setup PRIORITY: 1
As a new student user, I want my personal coefficients set from my domains and baselines. So that the app doesn't treat me identically to every other student.

ACCEPTANCE CRITERIA:
● Given I have completed domain discovery and the baselines,
● When the system initializes my profile,
● Then it sets starting calibration coefficients per category and a fulfillment coefficient per domain,
  ○ Coefficients are visible and editable in advanced settings
  ○ These are starting values only, refined by real signals over time

TITLE: Permissions & Integrations Setup PRIORITY: 1
As a new student user, I want to choose which integrations to connect during setup. So that I control what data the app can access from the start.

ACCEPTANCE CRITERIA:
● Given I am in the onboarding flow,
● When I reach the integrations step,
● Then I can individually enable or skip each available integration,
  ○ Skipped integrations can be enabled later from settings

TITLE: Domain Template Fallback PRIORITY: 2
As a new student user who doesn't want to type out my week, I want to build my domains from ready-made templates instead. So that I can still set up a personalized profile without the conversation.

ACCEPTANCE CRITERIA:
● Given I choose not to use the discovery conversation,
● When I open the template picker,
● Then I can select from common profiles (student, worker, athlete, carer, society officer) and edit from there,
  ○ Selected templates create the same editable Life Domains the conversation would
  ○ I can still add or remove domains freely afterward

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
● Then the system walks me through capturing a mind-dump, letting AI process it, and logging a check-in,
  ○ Tutorial can be skipped or replayed from settings
