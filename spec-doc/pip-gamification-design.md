# Pip — Gamification Design & Mascot Visualization
*Companion document to `pip-product-spec.md`. This is the full, standalone gamification specification; the main spec references it rather than duplicating it.*

---


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
| **Critical** | Pressure ≥ 90, OR (Pressure ≥ 70 AND Vitality ≤ 15), OR Vitality ≤ 10 regardless of Pressure | Maximum inflation (Pressure-driven) or a collapsed, motionless slump (Vitality-driven), pulsing outline either way — triggers an immediate, supportive full-screen intervention (never a punishing animation; recovery is framed as Pip settling once the student logs a recovery action) |

Recovery from Critical is always framed as relief, never failure: a soft exhale animation, gradual deflation, and a return to whichever of the four base states the current Pressure/Vitality actually supports.

Critical now has two distinct causes, both routed to the same intervention screen but with different framing: a **Pressure-driven** Critical ("about to pop") calls for offloading tasks, while a **Vitality-driven** Critical ("running on empty") calls for rest — added specifically to catch the case of a student with a light task list but genuinely depleted reserves, which the Pressure-only threshold used to miss entirely.

### 1.3 Vitality sub-stats
Vitality is no longer one opaque number — it's the weighted average of four named sub-stats, each mapped to part of the original five load categories (mental, time, and errands roll up into Pressure; physical, social, and rest/mood make up Vitality):

| Sub-stat | Fed by | Drains from |
|---|---|---|
| **Rest** | Logged sleep vs. personal baseline | High-Pressure days without adequate sleep |
| **Physical** | Logged exercise/movement | Prolonged inactivity |
| **Mood** | Check-in sentiment | Sustained high Pressure left unaddressed |
| **Connection** | Logged social recovery actions | Time since the last logged social interaction |

Whichever sub-stat is currently lowest drives two things: the specific visual flourish Pip shows within its current base state (droopy/sleepy for low Rest, sluggish posture for low Physical, duller color for low Mood, Pip facing away/curled inward for low Connection), and which recovery nudge fires. All four sub-stats, plus the composite Vitality and raw Pressure, are visible on tap — see Module 5.1.

### 1.4 Value metrics
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

### 1.5 Tiers (persistent identity layer)
| Tier | Cumulative XP | Unlocks |
|---|---|---|
| Hatchling | 0–199 | Base Pip skin, starter habitat |
| Sprout | 200–599 | First accessory slot (hat/scarf), 2 habitat items |
| Companion | 600–1,499 | Second accessory slot, ambient habitat effects (weather, plants) |
| Guardian | 1,500–3,499 | Rare cosmetic set, ability to send "flares" to friends |
| Elder | 3,500+ | Full customization set, exclusive seasonal cosmetics |

Tier accessories render on Pip *regardless of current state* — a Guardian-tier Pip having a Depleted day still wears its scarf; it's just also visibly sagging. This is the mechanism that keeps a rough week from feeling like it erased months of progress.

### 1.6 Visual mapping summary
| Data | Rendered as |
|---|---|
| Pressure | Pip's size (inflation) |
| Vitality (composite) | Pip's posture, facial expression, color saturation, animation speed |
| Lowest Vitality sub-stat | Determines the specific expression/posture detail within the current state, and which recovery nudge fires |
| Tier (XP) | Persistent accessories/aura on Pip, always visible |
| Sparks | A counter in the shop UI, not shown on Pip itself |
| Balance Streak | A small row of lanterns/stones in Pip's habitat background, one lit per streak day |
| Recovery action just logged | A brief "sparkle" animation on Pip, immediate positive feedback independent of the day's outcome |

### 1.7 Shareable state (social layer)
Friends can view a coarse version of each other's Pip — state bucket only (e.g. a color-coded silhouette: green/amber/red), never raw Pressure/Vitality numbers or task details. This preserves the "someone can tell I might need a check-in" value of sharing without creating a comparison or leaderboard dynamic, which this app deliberately avoids (see Module 5, Won't-have items).
