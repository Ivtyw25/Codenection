/** Small colour helpers for interaction states. */

function clamp(n: number, lo = 0, hi = 255) {
  return Math.min(hi, Math.max(lo, n));
}

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function toHex(r: number, g: number, b: number) {
  const p = (n: number) => clamp(Math.round(n)).toString(16).padStart(2, '0');
  return `#${p(r)}${p(g)}${p(b)}`;
}

/**
 * Darken by a proportion of lightness.
 * The Appendix specifies pressed buttons darken their fill by 8%.
 */
export function darken(hex: string, amount = 0.08): string {
  const [r, g, b] = parseHex(hex);
  return toHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

/** Mix a colour toward white. */
export function lighten(hex: string, amount = 0.08): string {
  const [r, g, b] = parseHex(hex);
  return toHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
}

/** `rgba()` form of a hex colour, for scrims and washes. */
export function alpha(hex: string, a: number): string {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
