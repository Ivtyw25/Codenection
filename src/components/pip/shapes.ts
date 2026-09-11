/**
 * Pip — parametric geometry.
 *
 * `pip-mascot-identity.md` §1.1 asks for an abstract soft-body blob: a seamless
 * rounded bean with a large lower mass and a gently tapered top — a weeble that
 * "wants to return to balance". The point of the limbless form is that it can
 * *inflate, sag, slump and puff* convincingly, which is the mechanism that
 * makes Pressure and Vitality legible on the body itself.
 *
 * So the body is built from parameters rather than drawn as fixed art: every
 * builder below is a Reanimated worklet, which lets the shape be interpolated
 * on the UI thread and gives genuinely continuous state transitions ("smoothly
 * rather than snapping", per the SCR-12 acceptance criteria).
 *
 * All geometry lives in a 100×100 viewBox so a single definition reads
 * correctly at 44px and at 220px (§1.1, camera notes).
 */

/** Kappa — the circle/bezier constant. */
const K = 0.5523;

export const VIEWBOX = 100;

/** Body anchor geometry inside the viewBox. */
export const BODY = {
  cx: 50,
  cy: 57,
  /** Base half-height. Top lands at 26, base at 88. */
  h: 31,
  /** Base half-width at the widest point. */
  w: 27,
  /** Contact-shadow baseline. */
  groundY: 90,
} as const;

export interface BodyParams {
  cx: number;
  cy: number;
  /** Half-width at the widest point. */
  w: number;
  /** Half-height. */
  h: number;
  /** Where the widest point sits: 0 = vertical centre, 1 = at the base. */
  wideAt: number;
  /** Top taper. Lower = more pointed crown. */
  topK: number;
  /** Base spread. Higher = wider, flatter, more "settled" base. */
  baseK: number;
}

/**
 * The body: four cubic segments around top → right → base → left.
 * The widest point is deliberately *below* centre, which is what produces the
 * roly-poly silhouette rather than an egg.
 */
export function bodyPath(p: BodyParams): string {
  'worklet';
  const { cx, cy, w, h, wideAt, topK, baseK } = p;

  const topY = cy - h;
  const botY = cy + h;
  const wideY = cy + h * wideAt;
  const upperH = wideY - topY;
  const lowerH = botY - wideY;

  const upH = upperH * 0.62;
  const loH = lowerH * 0.6;

  return (
    `M ${cx} ${topY} ` +
    `C ${cx + w * topK} ${topY} ${cx + w} ${wideY - upH} ${cx + w} ${wideY} ` +
    `C ${cx + w} ${wideY + loH} ${cx + w * baseK} ${botY} ${cx} ${botY} ` +
    `C ${cx - w * baseK} ${botY} ${cx - w} ${wideY + loH} ${cx - w} ${wideY} ` +
    `C ${cx - w} ${wideY - upH} ${cx - w * topK} ${topY} ${cx} ${topY} Z`
  );
}

/**
 * Approximate half-width of the body at a given y.
 *
 * Needed by anything that must sit ON the body rather than float over it — the
 * tier scarf especially, which pokes outside the silhouette if it's sized from
 * the widest point. Treats each half as elliptical and blends toward the
 * top/base flatness constants, which tracks the real bezier closely enough at
 * these sizes.
 */
export function halfWidthAt(p: BodyParams, y: number): number {
  'worklet';
  const { cy, w, h, wideAt, topK, baseK } = p;
  const topY = cy - h;
  const botY = cy + h;
  const wideY = cy + h * wideAt;

  if (y <= topY || y >= botY) return 0;

  if (y <= wideY) {
    const u = (wideY - y) / Math.max(0.001, wideY - topY);
    const ellipse = Math.sqrt(Math.max(0, 1 - u * u));
    return w * (ellipse * (1 - topK * 0.5) + topK * 0.5 * (1 - u * u * u));
  }

  const t = (y - wideY) / Math.max(0.001, botY - wideY);
  const ellipse = Math.sqrt(Math.max(0, 1 - t * t));
  return w * (ellipse * (1 - baseK * 0.5) + baseK * 0.5 * (1 - t * t * t));
}

export interface EyeParams {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  /** 1 = fully open, 0 = shut. */
  openness: number;
  /** 0 = none, 1 = heavy lid covering the top half (sleepy / droopy). */
  droop: number;
}

/**
 * An open eye — "two large simple round dots". Lidding is modelled by
 * shortening the upper half rather than overlaying a separate lid shape, so
 * the eye stays a single morphable path.
 */
export function eyePath(p: EyeParams): string {
  'worklet';
  const { cx, cy, rx, ry } = p;
  const open = Math.max(p.openness, 0.001);
  const upper = ry * open * (1 - p.droop * 0.75) * K * 2;
  const lower = ry * open * K * 2;

  return (
    `M ${cx - rx} ${cy} ` +
    `C ${cx - rx} ${cy - upper} ${cx + rx} ${cy - upper} ${cx + rx} ${cy} ` +
    `C ${cx + rx} ${cy + lower} ${cx - rx} ${cy + lower} ${cx - rx} ${cy} Z`
  );
}

/**
 * A closed eye — a soft arc. `bow` > 0 curves it upward into the happy
 * closed-arc eyes used by the Celebrating pose; < 0 gives the tired downward
 * curve of Resting / Vitality-driven Critical.
 */
export function closedEyePath(cx: number, cy: number, rx: number, bow: number): string {
  'worklet';
  return `M ${cx - rx} ${cy} Q ${cx} ${cy - bow} ${cx + rx} ${cy}`;
}

/**
 * The mouth — "a single expressive curve". Positive `curve` smiles, zero is
 * the tight flat line of Strained, negative frowns.
 */
export function mouthPath(cx: number, cy: number, w: number, curve: number): string {
  'worklet';
  return `M ${cx - w} ${cy} Q ${cx} ${cy + curve} ${cx + w} ${cy}`;
}

/** The small round 'o' of the Thinking pose. */
export function mouthOPath(cx: number, cy: number, r: number): string {
  'worklet';
  return (
    `M ${cx - r} ${cy} ` +
    `C ${cx - r} ${cy - r * K * 2} ${cx + r} ${cy - r * K * 2} ${cx + r} ${cy} ` +
    `C ${cx + r} ${cy + r * K * 2} ${cx - r} ${cy + r * K * 2} ${cx - r} ${cy} Z`
  );
}

/**
 * The sprout stem. The signature accessory doubles as a health indicator —
 * perky when Vitality is high, drooping when low (§1.1) — so `droop` bends the
 * stem sideways and drops the tip.
 */
export function stemPath(
  baseX: number,
  baseY: number,
  height: number,
  droop: number,
): string {
  'worklet';
  const lean = droop * height * 0.85;
  const tipX = baseX + lean;
  const tipY = baseY - height * (1 - droop * 0.72);
  return `M ${baseX} ${baseY} Q ${baseX + lean * 0.25} ${baseY - height * 0.62} ${tipX} ${tipY}`;
}

/** Where a stem of these parameters ends — leaves anchor here. */
export function stemTip(
  baseX: number,
  baseY: number,
  height: number,
  droop: number,
): { x: number; y: number } {
  'worklet';
  return {
    x: baseX + droop * height * 0.85,
    y: baseY - height * (1 - droop * 0.72),
  };
}

/**
 * A single rounded leaf, grown from `(ax, ay)` along `angle` (radians).
 * Two of these on a short stem make the crown sprout.
 */
export function leafPath(
  ax: number,
  ay: number,
  angle: number,
  len: number,
  wid: number,
): string {
  'worklet';
  const tipX = ax + Math.cos(angle) * len;
  const tipY = ay + Math.sin(angle) * len;
  const mx = ax + Math.cos(angle) * len * 0.5;
  const my = ay + Math.sin(angle) * len * 0.5;
  const px = Math.cos(angle + Math.PI / 2) * wid;
  const py = Math.sin(angle + Math.PI / 2) * wid;

  return (
    `M ${ax} ${ay} ` +
    `Q ${mx + px} ${my + py} ${tipX} ${tipY} ` +
    `Q ${mx - px} ${my - py} ${ax} ${ay} Z`
  );
}

/** A small clay nub arm, used only by the active poses. */
export function nubPath(ax: number, ay: number, angle: number, len: number): string {
  'worklet';
  const tipX = ax + Math.cos(angle) * len;
  const tipY = ay + Math.sin(angle) * len;
  const px = Math.cos(angle + Math.PI / 2) * len * 0.42;
  const py = Math.sin(angle + Math.PI / 2) * len * 0.42;
  return (
    `M ${ax + px} ${ay + py} ` +
    `Q ${tipX + px * 0.6} ${tipY + py * 0.6} ${tipX} ${tipY} ` +
    `Q ${tipX - px * 0.6} ${tipY - py * 0.6} ${ax - px} ${ay - py} Z`
  );
}

/** Compose an `rgb()` string from animated channels. */
export function rgb(r: number, g: number, b: number): string {
  'worklet';
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}
