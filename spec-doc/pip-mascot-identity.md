# Pip — Mascot Visual Identity & State Sheet
*Companion document to `pip-design-spec.md`. This is the full, standalone mascot specification — character concept, art direction, generative-prompt formulas, the state/emotion matrix, and asset delivery. The design spec references it rather than duplicating it.*
*Visual direction: soft/cozy, warm. Art style: 3D matte-clay soft-body (Pou-like, tactile).*

---

## 1.1 Character concept & visual archetype

**Form factor.** Pip is an **abstract soft-body blob creature** — a rounded, seamless, matte-clay droplet/bean shape with no limbs in the resting form (limbs are optional nubs that appear only in active poses). This is deliberate: a limbless soft body can *inflate, sag, slump, and puff* convincingly, which a fixed-anatomy animal (a dog, a cat) cannot without looking broken. The blob is the mechanism that makes the Pressure/Vitality states legible on the body itself.

**Proportions.** Resting Pip is roughly a 1:1.05 rounded bean (very slightly taller than wide), with a large lower mass and a gently tapered top — a weeble/roly-poly silhouette that reads as "wants to return to balance." Eyes sit in the upper third, large and simple (two rounded dots with a soft specular highlight). Mouth is a single expressive curve. No visible nose.

**Signature accessory.** A single small **leaf sprout** on the crown (two rounded leaves on a short stem) — it's the one persistent identity marker, and it doubles as a subtle health indicator (perky when Vitality is high, drooping when low). Tier accessories (scarf, hat, aura) attach *around* the body without occluding the face.

**Color alignment.** Body is `--brand-primary` clay orange (`#E8734A`) in the Balanced state — brand and mascot are literally the same color. The sprout is `--brand-secondary` teal (`#3B9B8F`). State shifts desaturate/shift the body hue (see matrix). Cheeks carry a soft warmer blush.

**Art style specification.**
- **Rendering:** 3D matte clay / soft-body — think baked polymer clay or matte vinyl, *no gloss*, subtle soft-body squash. Gentle subsurface warmth, no hard specular except the two eye highlights.
- **Camera:** front-on, very slight 5–10° high angle (looking slightly down at a small creature), orthographic-ish (minimal perspective distortion) so the same asset reads correctly at 44px and 220px.
- **Lighting:** soft top-key light, large soft fill, warm ambient. One soft contact shadow directly beneath (grounds the weeble). No rim/neon lighting.
- **Background:** transparent (assets composite onto habitat/screens).

## 1.2 Base render prompt formula

A reusable base string; each state appends its delta. Written for Midjourney / DALL·E 3 / equivalent.

> **BASE:** *"A cute abstract soft-body blob mascot character named Pip, seamless rounded bean/droplet shape, matte clay / soft matte vinyl material, no gloss, subtle subsurface warmth, two large simple round eyes with a single soft highlight each, small expressive curved mouth, soft blush cheeks, a small teal two-leaf sprout on top of its head, front-facing with a slight 5-degree high angle, soft top key light with large soft fill and warm ambient light, single soft contact shadow beneath, transparent background, centered, character design sheet, 3D render, high detail, [STATE DELTA]"*
>
> **Style tags (append for MJ):** `--style raw --ar 1:1`
> **Base body color:** warm clay orange `#E8734A` unless the state overrides it.

## 1.3 State & emotion matrix

For each state: the **UI role**, the **concrete visual description**, and the **prompt delta** (append to BASE).

### Core capacity states (drive the home screen live)

**Balanced**
- *UI role:* default home state, healthy.
- *Visual:* upright plump bean, saturated clay orange, sprout perky and upright, relaxed closed-curve smile, eyes soft and open, a gentle idle bob.
- *Prompt delta:* `"relaxed happy expression, gently smiling, bright saturated warm clay-orange body, upright plump balanced posture, perky upright leaf sprout, content and calm"`

**Strained** (high Pressure, Vitality still ok)
- *UI role:* coping under load.
- *Visual:* body puffed/inflated ~15% wider, cheeks bulging, eyes squinting with effort, small sweat bead at temple, mouth a tight flat line, sprout pushed slightly outward by the puffing.
- *Prompt delta:* `"puffed up and inflated as if holding too much, bulging cheeks, squinting strained eyes, a single small sweat drop, tight flat mouth, still colorful but tense, overwhelmed-but-coping expression"`

**Wilting** (low Vitality, low Pressure — under-loaded but depleted)
- *UI role:* depleted, needs rest.
- *Visual:* body shrunken ~15% and slumped lower/wider at base, desaturated toward muted terracotta, half-lidded droopy eyes, small flat mouth, sprout visibly drooping to one side, slow "zzz" idle.
- *Prompt delta:* `"shrunken and slightly deflated, low slumped posture, muted desaturated dull terracotta color, heavy half-closed sleepy droopy eyes, drooping wilting leaf sprout, tired and low-energy, needs rest"`

**Depleted & overloaded** (low Vitality AND high Pressure — worst combined)
- *UI role:* the compound bad state.
- *Visual:* simultaneously puffed at the top and sagging at the base (an unstable, overfilled-yet-drained look), dull-with-tension coloring, droopy stressed eyes, downturned wobbling mouth, sprout both pushed out and drooping.
- *Prompt delta:* `"both overinflated at the top and sagging heavily at the bottom, unstable overloaded shape, dull tense coloring, droopy stressed downturned eyes, wobbling frown, drooping sprout, exhausted and overwhelmed at once"`

**Critical — Pressure-driven** ("about to pop")
- *UI role:* intervention overlay trigger.
- *Visual:* maximally inflated, taut, trembling, deep red-orange shift, wide alarmed eyes, gritted/strained mouth, faint pulsing outline glow. Never actually bursts — the recovery animation is a slow exhale/deflate.
- *Prompt delta:* `"maximally over-inflated and taut like an overfilled balloon, trembling, deep saturated red-orange stressed color, wide alarmed eyes, strained gritted mouth, faint pulsing outline, on the edge but not bursting"`

**Critical — Vitality-driven** ("running on empty")
- *UI role:* intervention overlay trigger (rest framing).
- *Visual:* collapsed, nearly puddled soft-body slump, heavily desaturated pale, eyes fully closed or barely open, sprout wilted flat, faint pulsing outline. Motionless.
- *Prompt delta:* `"collapsed and puddled into a low soft slump, nearly melting downward, very pale desaturated washed-out color, eyes closed or barely open, fully wilted flattened sprout, utterly drained and motionless"`

### Journey / touchpoint states (used in specific screens)

**Welcome / hatchling (onboarding step 1–2)**
- *Visual:* small, curious, tilting to look up at the viewer, sprout as a tiny single bud, extra-bright and simple.
- *Prompt delta:* `"small young hatchling version, curious head-tilt looking up, tiny single-bud sprout, extra bright and simple, welcoming and curious expression, waving one small clay nub arm"`

**Listening (during AI domain-discovery conversation)**
- *Visual:* attentive, leaning slightly forward, one small nub touching its 'chin', eyes bright and engaged, an occasional blink.
- *Prompt delta:* `"attentive listening pose, leaning slightly forward, one small clay nub touching chin thoughtfully, bright engaged curious eyes, interested expression"`

**Thinking / processing (AI GTD pass running)**
- *Visual:* eyes turned up, small orbiting dots or a thought-swirl above the sprout, mouth a small 'o'.
- *Prompt delta:* `"thinking pose, eyes looking upward, small orbiting sparkle dots above head, mouth a small round o, concentrating expression"`

**Celebrating (Sparks/XP award, task complete)**
- *Visual:* mid-hop, both nub arms up, eyes as happy upward arcs, honey-yellow sparkle burst around it, sprout bouncing.
- *Prompt delta:* `"joyful mid-jump celebration, both small clay nub arms raised up, happy closed upward-arc eyes, open smiling mouth, warm honey-yellow sparkles bursting around, bouncing sprout"`

**Tier unlock (new accessory earned)**
- *Visual:* proud upright pose wearing the new accessory (e.g. a small knit scarf), gentle golden aura ring behind, calm proud smile.
- *Prompt delta:* `"proud upright pose wearing a small cozy knitted scarf accessory, soft golden aura ring behind, calm proud gentle smile, dignified and warm"`

**Resting / recovery (recovery action logged, guided break)**
- *Visual:* eyes softly closed, small 'z' or gentle breathing motion, sitting low and content, slightly re-saturating from a duller tone (the visual of recovering).
- *Prompt delta:* `"peacefully resting, eyes softly closed, small floating z, sitting low and cozy, calm breathing, gently regaining warm color, serene and recovering"`

**Empty / first-run (no data yet)**
- *Visual:* neutral-friendly, sitting centered, sprout as a single sprout bud, a soft dotted outline 'nest' beneath suggesting emptiness to fill.
- *Prompt delta:* `"neutral friendly resting pose, sitting centered and calm, single small sprout bud, waiting expectantly, gentle welcoming expression"`

## 1.4 Asset delivery matrix
| Asset | Format | Sizes (px) | Notes |
|---|---|---|---|
| Live states (5 core) | Lottie/rive preferred; PNG fallback | 220, 132, 88, 44 | Animated idle per state; PNG for list/avatars |
| Journey states (7) | PNG / Lottie | 220, 132 | Some animated (celebrate, thinking, resting) |
| Silhouette (shareable) | SVG | scalable | Single-color, state-tinted, no face detail |
| Sprout-only (health pip) | SVG | 24, 16 | Reused as inline health indicator |
| App icon | PNG | 1024 + platform set | Balanced Pip, honey background |
