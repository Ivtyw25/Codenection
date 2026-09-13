# Pip by Hmmm

Team: Yeoh Chong Siang, Ivan Tham Yip Weng, Tan Jing En, Tan Si Ting

Problem Statement: Stress & Workload Manager

Video Presentation: [https://youtu.be/5oOLERvB45s](https://youtu.be/5oOLERvB45s "https://youtu.be/5oOLERvB45s")

Presentation Slides: [https://canva.link/codenection-hmmm](https://canva.link/codenection-hmmm) 

## 1. Project Overview

### The Problem

Students juggle overlapping academic, social, and personal responsibilities with almost no visibility into their own capacity until they've already burned out. The root causes are structural, not personal failings:

- Task management tools are capacity-blind. Apps like Todoist or Notion optimize for completeness and organization, but treat a to-do list the same whether the user is fresh or running on empty. They will happily hand a student a 14-item list on the day they slept 3 hours.
    
- Wellness apps are task-blind. Self-care apps track mood or habits in isolation from the workload actually causing the stress, so the insight ("you're anxious") never connects to the cause ("you have three deadlines this week").
    
- Guilt-based gamification backfires. Streak-based systems (Habitica, Forest, Duolingo-style mechanics) punish lapses with lost progress, which discourages re-engagement at exactly the moment a stressed student needs support, not penalty.
    

Stakeholders: students (primary users, especially those managing coursework alongside jobs, extracurriculars, or mental health conditions), academic advisors and campus wellness services (secondary beneficiaries who deal with downstream burnout), and parents/guardians (indirectly, as a support network).

Market gap: apps like Finch (a self-care companion app where a virtual pet grows through wellness check-ins) prove that mascot-based emotional engagement works, but Finch has no real task or deadline management underneath it. The pet doesn't know the user has a midterm tomorrow. No existing product unifies GTD-style task processing with a live, multi-dimensional capacity model that adjusts what's asked of the user in real time.

### Our Solution

Pip is an AI-driven student organizer that treats burnout prevention as a first-class input to task management, not an afterthought. It processes everything a student captures — text, images, voice memos — into clarified, scheduled tasks using GTD principles, while continuously tracking the student's actual capacity through two core metrics: Pressure (task load) and Vitality (a composite of Rest, Physical, Mood, and Connection). Rather than presenting a static list, Pip's daily "Today's Manifest" dynamically shrinks when Pressure is high, and its mascot visually reflects the student's real condition, escalating to a supportive de-escalation flow instead of a punitive one when things get critical. The result is a planner that actively protects the user's capacity instead of just organizing their overflow.

Feature Set

- Capacity Tracking: Pressure (task load) and Vitality (Rest / Physical / Mood / Connection sub-stats)
    
- Mascot State System: five-stage visual feedback loop (Balanced → Strained → Wilting → Depleted & Overloaded → Critical)
    
- Non-Punitive Crisis Intervention: full-screen de-escalation flow triggered at Critical state, with no progress loss
    
- Gamified Progression: Sparks (cosmetic currency) and XP (tier progression, Hatchling → Elder)
    
- Multi-Modal Capture: unified inbox for text, image, and voice mind-dumps
    
- AI Clarify & Organize: auto-extraction of discrete tasks, 2-minute rule triage, Life Domain tagging, auto-scheduling
    
- Adaptive Daily Engage: "Today's Manifest" that shortens in real time based on current Pressure
    
- Weekly Reflect: sub-stat trend review, forecasted risk-day previews, and user-approved AI calibration
    

  

## 2. Ideation & Process

### 2.1 Ideas We Considered

| Idea                                                                           | Why it was kept / dropped                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Dual-metric capacity model (Pressure + Vitality) (Chosen)                   | Kept because a single stress score collapses two very different signals which are how much work exists vs. how much energy the user has to do it into one number, losing the information needed to act differently on each (e.g., shrink the task list vs. suggest rest). Separating them lets the app respond to the right cause. |
| B. Non-punitive Critical-state intervention (Chosen)                           | Kept after realizing that streak-loss and penalty mechanics (common in Habitica-style apps) actively discourage re-engagement at the exact moment a burned-out student needs the app most. A full-screen supportive flow with no progress loss keeps the app aligned with its actual purpose.                                      |
| C. Adaptive "Today's Manifest" that shrinks under high Pressure (Chosen)       | Kept because a to-do list that doesn't know the user is overloaded is part of the problem, not a neutral feature. Making the list itself capacity-aware rather than just displaying a warning banner was our clearest point of differentiation from Todoist/Notion.                                                                |
| D. GTD-based Capture → Clarify → Organize → Engage → Reflect pipeline (Chosen) | Kept because GTD gave us a well-tested mental model for what "processing" a mind-dump actually means, and mapped cleanly onto discrete build phases (capture UI, AI extraction, scheduling logic, daily view, weekly review).                                                                                                      |
| E. Single unified inbox for text/image/voice capture (Chosen)                  | Kept to reduce capture friction, forcing a stressed student to pick the right input type before they've even written the thought down adds cognitive load we were explicitly trying to remove.                                                                                                                                     |
| F. Social/leaderboard competitive layer (compare Vitality with friends)        | Dropped. Comparing burnout metrics between users risks turning a support tool into a source of social pressure which is the opposite of the app's purpose. Replaced with the private, individual Connection sub-stat instead.                                                                                                      |
| G. Punitive XP decay for missed tasks                                          | Dropped for the same reason as streak mechanics: penalizing lapses discourages the exact re-engagement behavior we want during low-capacity periods. XP was redesigned to only move forward.                                                                                                                                       |
| H. Fully autonomous AI rescheduling (no user approval step)                    | Dropped after concluding that silently moving a student's tasks around without consent would erode trust, especially for time-sensitive academic deadlines. Replaced with the Weekly Reflect step, where AI calibration suggestions require manual user acceptance.                                                                |
| I. Single combined "Wellness Score" instead of 4 sub-stats                     | Dropped because it hid which dimension (Rest, Physical, Mood, Connection) was actually driving a dip, giving the user no actionable signal. Split into sub-stats so both the mascot state and Weekly Reflect could point to a specific cause.                                                                                      |
| J. Real-time push notifications nudging task completion                        | Dropped as it risked recreating the guilt-based pressure of existing productivity apps we were explicitly positioning against. Feedback is instead delivered passively through mascot state and the Manifest, not interruptive alerts.                                                                                             |

  

### 2.2 Ideation Boards

 <img width="792" height="671" alt="codenection-Page-1 drawio" src="https://github.com/user-attachments/assets/26204b12-2513-43af-9d89-5742a3928de1" />


This use case diagram maps out every interaction a student has with Pip across the GTD pipeline, helping us confirm that each core feature (Capture, Clarify, Engage, Reflect) had a clear actor-driven purpose before we committed it to the build scope. 


<img width="450" height="1251" alt="codenection-Page-2 drawio" src="https://github.com/user-attachments/assets/b5b6ab16-340d-402c-afec-1c8271480fc0" />


This flowchart traces a task's full lifecycle from the moment a student captures it to how it eventually affects their Pressure/Vitality state, which is what helped us catch that our AI Clarify step and Pressure engine needed to talk to each other rather than running as separate features. 

  

## 2.3 Mentor Consultation

| Date   | Mentor        | Feedback Received                                                                                                                                                                                                                               | What Was Changed                                                                                                                                                                                                                                                                                                                                               |
| ------ | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8/9/26 | Chua Zhu Heng | Reward mechanism & retention: The mentor noted that completing tasks needed a clearer reward loop to motivate consistent return usage, rather than relying on the user's intrinsic motivation alone.                                            | Implemented the Sparks (cosmetic) + XP (tier progression) dual-currency system, so task completion always yields visible, cumulative reward regardless of mood or short-term motivation.                                                                                                                                                                       |
| 8/9/26 | Chua Zhu Heng | Gamification: The mentor pushed us to make the app more interactive and engaging overall, not just functional, so that using it felt rewarding in itself rather than like a chore.                                                              | Built out the mascot state system (Balanced → Strained → Wilting → Depleted & Overloaded → Critical) and Hatchling-to-Elder tier progression, turning capacity tracking into a visible, evolving relationship with the mascot rather than a static dashboard.                                                                                                  |
| 8/9/26 | Chua Zhu Heng | Unique stand-out feature: The mentor asked us to commit to one clear differentiator instead of spreading effort across many features, since the app needed one obvious reason for a student to choose it over existing tools.                   | We debated a few candidates (see 2.1) and committed to the non-punitive Critical-state intervention combined with the Pressure-adaptive Today's Manifest as our core twist — task management that actively protects the user rather than just tracking them.                                                                                                   |
| 8/9/26 | Chua Zhu Heng | Task initiation / procrastination: The mentor observed that users often stall not because a task is hard, but because the first step is undefined, and suggested the app should surface a specific, low-friction starting action for each task. | We agreed this was valuable and folded it into the Clarify & Organize stage: the AI engine now applies the 2-minute rule during task extraction, explicitly identifying a small, immediate starting action for larger tasks rather than leaving them as one undifferentiated item.                                                                             |
| 8/9/26 | Chua Zhu Heng | Action item — define target demographic: The mentor's broader feedback was that we hadn't pinned down a specific user story, making it harder to prioritize features.                                                                           | We disagreed this required a narrow demographic cut (e.g., by major or year) rather than a behavioral one, and instead defined our target user by workload pattern and burnout risk (see Impact section) which are students with overlapping academic/personal load, arguing this made the app relevant across faculties rather than limiting it to one group. |

  

## 3. Design & Prototype

UI Prototype: [https://pip-rosy.vercel.app/tasks](https://pip-rosy.vercel.app/tasks) 

⚠️ This prototype is currently optimized for mobile screen sizes only. For the best experience, please open the link on a phone (or resize your browser window to a mobile viewport) — desktop rendering is not yet supported. 

### Key Screens

| **1. Home Screen<br><br> <img width="500" height="1080" alt="WhatsApp Image 2026-09-13 at 9 58 38 PM" src="https://github.com/user-attachments/assets/fb8ba8fb-83d0-47cc-9b89-999cc54d8da0" />< <br><br>Pip greets the user with their current state front and center, so capacity, not tasks, is the first thing they see every time they open the app.** | **2. Today's Manifest<br><br> <img width="500" height="1080" alt="WhatsApp Image 2026-09-13 at 9 58 39 PM" src="https://github.com/user-attachments/assets/ad806c13-0bf8-48df-ab12-6a1114c0c9fc" /> <br><br>The daily task list shows exactly how much load each task adds, making the cost of taking on more work visible before the user commits to it.** | **3. Reflect Screen<br><br> <img width="500" height="1080" alt="WhatsApp Image 2026-09-13 at 9 58 39 PM (1)" src="https://github.com/user-attachments/assets/c85905be-645f-40c2-bdb5-0668f6f1b338" /> <br><br>A weekly view turns a week of scores into a readable trend, helping users spot patterns in their Pressure and Vitality over time instead of only reacting day to day.** |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4. Profile Screen<br><br> img width="500" height="1080" alt="WhatsApp Image 2026-09-13 at 9 58 39 PM (2)" src="https://github.com/user-attachments/assets/a7753a02-1f04-4e51-80a9-da8f67fe45d8" /> <br><br>Rewards, unprocessed captures, and personal preferences all live in one place, keeping progress and control easy to find.                         | 5. Home Screen Widget<br><br> <img width="456" height="884" alt="Screenshot 2026-09-14 002337" src="https://github.com/user-attachments/assets/05af0498-936c-4fc2-99da-a503e3aea1f9" /> <br><br>A home-screen widget keeps the user's current state visible at a glance, without needing to open the app at all.                                | 6. Quick Capture from Widget<br><br> <img width="472" height="834" alt="Screenshot 2026-09-13 230309" src="https://github.com/user-attachments/assets/0647203f-48ee-4bfd-942c-115dedc8365c" /> <br><br>Capturing a thought takes seconds directly from the home screen, removing the friction that normally causes ideas to get lost.                                 |
| 7. Three Input Modes<br><br> <img width="1088" height="414" alt="image" src="https://github.com/user-attachments/assets/f7348f9d-68f1-41a8-add3-cd178cf8a731" /> <br><br>Users can capture however feels natural in the moment, typing, handwriting, or speaking, all landing in the same inbox for later processing.   |                                                                                                                                                                                    | 8. Lockscreen Capture Mode<br><br> <img width="424" height="792" alt="Screenshot 2026-09-13 230450" src="https://github.com/user-attachments/assets/42d65e16-e23b-43b5-b3c2-7589745bd4de" /> <br><br>Thoughts can be captured straight from the lockscreen, so nothing gets lost in the time it takes to unlock and open an app.                                      |

  

## 4. What Makes It Different

Most productivity apps ask "what do you need to do?" Most wellness apps ask "how do you feel?" Pip is built around a genuinely different question: "what can you actually handle right now, and how should your task list change because of it?" That framing drives every novel feature below.

### 4.1 Dual-Metric Capacity Model (Pressure + Vitality)

Rather than a single blended stress score, Pip tracks task load (Pressure) and personal energy (Vitality) as two independent axes, with Vitality further broken into four sub-stats: Rest, Physical, Mood, and Connection. The twist is that these aren't passive dashboard numbers, they actively drive what the app shows and does next. No mainstream task manager treats capacity as a first-class input to scheduling logic rather than a side metric.

### 4.2 Pressure-Adaptive "Today's Manifest"

Instead of a static daily to-do list, Pip's Manifest shortens itself in real time when Pressure runs high, rather than displaying every task regardless of the user's state. This is the core mechanical twist: the app doesn't just show the user their overload, it removes items from view to actively protect them. Existing tools (Todoist, Notion, TickTick) show the same list whether the user is thriving or drowning.

### 4.3 Non-Punitive Critical-State Intervention

When the mascot reaches the "Critical" state, Pip triggers a full-screen, supportive de-escalation flow with no loss of progress, streaks, or currency. This directly inverts the guilt/penalty mechanics used by Habitica and streak-based habit apps, where lapses cost the user something. Pip treats a crisis moment as a cue to intervene supportively, not as a failure to punish.

### 4.4 Mascot as Diagnostic, Not Just Decoration

Finch popularized the emotionally engaging virtual-pet mechanic, but its mascot reflects self-reported mood in isolation from actual workload. Pip's mascot state (Balanced → Strained → Wilting → Depleted & Overloaded → Critical) is instead derived directly from the Pressure/Vitality model, meaning the pet's condition is a live diagnostic of the intersection between what the user has to do and how much they have left, not a separate check-in layer bolted onto a to-do app.

### 4.5 AI-Driven 2-Minute-Rule Extraction

During Clarify & Organize, the AI engine doesn't just tag and schedule captured tasks, it applies the 2-minute rule to identify an immediate, low-friction starting action for larger tasks. This targets procrastination at its actual source (an undefined first step) rather than just organizing the backlog, addressing feedback from our mentor consultation (see 2.3).

### 4.6 Consent-Based AI Calibration

Rather than silently rescheduling tasks or adjusting the user's plan, Pip surfaces AI calibration suggestions only during the Weekly Reflect check-in, requiring explicit user approval. This preserves trust and user agency around academic deadlines, avoiding the black box feel of fully autonomous planning tools.

  

### Comparison with Existing Solutions

| Feature                                  | Todoist / Notion | Habitica             | Finch                 | Pip                                    |
| ---------------------------------------- | ---------------- | -------------------- | --------------------- | -------------------------------------- |
| Task capture & organization              | Strong           | Basic                | None                  | AI-driven GTD pipeline                 |
| Capacity/burnout awareness               | None             | None                 | Mood only, task-blind | Pressure + Vitality, task-linked       |
| Adaptive daily list (shrinks under load) | Static list      | Static list          | No task list          | Core twist                             |
| Penalty on lapse                         | N/A              | Streak/progress loss | N/A                   | Never, supportive intervention instead |
| Emotionally engaging mascot              | None             | Cosmetic pet         | Strong                | Diagnostic + cosmetic                  |
| User-approved AI scheduling              | N/A              | N/A                  | N/A                   | Consent-based calibration              |

  

## 5. Technical Architecture & Feasibility

### Tech Stack

| Layer             | Choice                                                        | Why                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Constraints to Expect                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend          | React Native + Expo                                           | Single codebase for cross-platform (iOS + Android) delivery, essential given a 3-week build window where maintaining two native codebases isn't realistic. Expo specifically speeds up setup (no native build tooling needed early on) and gives us fast over-the-air updates and easy device testing via Expo Go during the demo/build phase — useful when a small team needs to iterate quickly on the mascot animations and gauge-style Pressure/Vitality UI. | Expo's managed workflow limits some deep native module access; if we need tighter integration with health data (see below), we may need to eject to a bare workflow or use community Expo modules, which adds setup time we should budget for early rather than discover in Week 3.                                                                                                                                                         |
| Backend / API     | FastAPI                                                       | Python-native backend pairs naturally with our AI layer (LangChain + Gemini), since both the orchestration logic and the API layer live in the same language — no serialization/glue code between a JS backend and a Python AI service. FastAPI's async support and automatic request validation also suit the multiple external API calls (Gemini, Google Calendar, HealthKit sync) happening per request.                                                      | FastAPI needs a host (see Hosting row); async external API calls (AI + Calendar + wearable sync) mean latency stacks up per request, so batching and caching should be planned rather than assumed.                                                                                                                                                                                                                                         |
| AI Processing     | LangChain + Gemini Flash                                      | Gemini Flash is fast and cost-efficient for the Clarify & Organize step (task extraction, 2-minute rule flagging, Life Domain tagging), which matters since this call likely fires on every capture. LangChain sits on top to manage prompt chaining/structured output parsing between the extraction step and the Pressure/Vitality scoring logic, rather than us hand-rolling that orchestration.                                                              | Flash trades some reasoning depth for speed/cost — worth validating early that its structured-output accuracy (task extraction, domain tagging) is reliable enough, since a wrong Life Domain tag or missed 2-min-rule flag directly affects the Manifest and scoring logic downstream.                                                                                                                                                     |
| Database          | Supabase (PostgreSQL)                                         | Relational structure fits Pip's data well — tasks, Life Domains, sub-stat history, and check-ins have clear foreign-key relationships a relational schema handles cleanly. Supabase specifically gives us managed Postgres plus built-in auth and row-level security out of the box, which saves real build time in a 3-week window compared to standing up Postgres + auth separately.                                                                          | Free-tier row/storage/bandwidth limits are fine for a demo but should be stated explicitly; Supabase's auto-generated REST layer is convenient but we're routing most logic through FastAPI anyway, so it's mainly used as managed Postgres + auth rather than its full feature set.                                                                                                                                                        |
| External Services | Google Calendar API, Apple HealthKit, Mi Band (wearable data) | Google Calendar API supports auto-scheduling in Clarify & Organize by reading/writing against the user's real calendar rather than a Pip-only schedule. Apple HealthKit and Mi Band integration are both explored as real data sources for the Rest and Physical sub-stats, grounding Vitality in actual sleep/activity data rather than self-report alone.                                                                                                      | All three require OAuth/permission or SDK-level pairing flows (extra UI + testing time), and are platform- or device-gated: HealthKit is iOS-only, and Mi Band requires its own SDK/Bluetooth pairing flow, which is a nontrivial integration to get working reliably in 3 weeks. We're treating wearable data as a stretch goal and stating plainly that manual check-in input is the fallback if either integration isn't stable in time. |
| Hosting           | Vercel (backend + web assets)                                 | Vercel gives us fast, zero-config deploys for the FastAPI backend (via serverless functions) and any web-facing assets, with generous free-tier limits suited to a hackathon demo. Mobile app distribution runs through Expo's own build/preview tooling rather than a separate app-store submission, keeping the whole stack inside a small number of platforms the team already knows.                                                                         | Serverless cold starts on Vercel can add latency to the first AI/API call after idle time — worth testing before the live demo so it doesn't show up as a lag on stage. Long-running or stateful backend tasks (if any emerge) don't fit Vercel's serverless model well and would need a rethink.                                                                                                                                           |

  

**System Architecture Diagram**

<img width="670" height="411" alt="codenection-Page-3 drawio" src="https://github.com/user-attachments/assets/bdb90267-41fc-49f6-a276-45d7476a5dc8" />


This diagram shows how a capture flows from the React Native + Expo mobile app through our FastAPI backend into the AI processing layer (LangChain + Gemini Flash), before being persisted in Supabase (PostgreSQL), with Google Calendar, Apple HealthKit, and Mi Band feeding in as external data sources. We chose this layered structure so the AI orchestration step sits clearly between the API and database, making it easy to isolate and test independently during Week 2 of the build.

  

**Build Plan & Scope (3 Weeks)**

| Phase  | Focus                           | Concrete Deliverables                                                                                                                                                                      |
| ------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Week 1 | Core Mobile Experience          | User accounts, DUMP (capture) interface for text/image/voice mind-dumps, dashboard structure and navigation shell                                                                          |
| Week 2 | AI + Pressure/Vitality          | AI organisation (Clarify & Organize: task extraction, 2-min rule, Life Domain tagging), Pressure scoring algorithm, Vitality sub-stat gauges                                               |
| Week 3 | Recovery + Integration + Polish | Recovery/de-escalation nudges (Critical-state flow), backend load balancing for stability under demo conditions, external calendar integration (Google Calendar sync), final visual polish |

**Explicitly out of scope for the hackathon build:**

- Apple HealthKit integration may be demoed with mocked data rather than live device data, since real HealthKit permissions/testing require physical iOS hardware and add setup overhead disproportionate to a 3-week build.
    
- Android parity for health-data-driven sub-stats (Rest/Physical) is not guaranteed, given HealthKit's iOS-only nature — Android may rely on manual check-in input only for this hackathon version.
    
- The "Stats Model" ships as a rule-based scoring system, not a trained ML model — framed honestly as a v1 heuristic that could be replaced with a trained model post-hackathon.
    
- Full Sparks/XP cosmetic shop UI may be functional for accrual but not fully built out for spending, if Week 3 time is tight.
