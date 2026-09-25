import {
  create,
  fromHex,
  fromOklab,
  fromOklch as colorFromOklch,
  toHex,
  toLinear,
  toOklab,
  toOklch as colorToOklch,
} from "pex-color";

const parse = (hex) => fromHex(create(), hex);
const format = (color) => toHex(color).toLowerCase();
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * WCAG 2.0 relative luminance.
 *
 * @param {string} hex
 * @returns {number}
 */
export function luminance(hex) {
  // WCAG 2.0's 0.03928 linearization threshold and sRGB's 0.04045 give the same result on 8-bit channels.
  const [r, g, b] = toLinear(parse(hex));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * WCAG 2.0 contrast ratio between two opaque colors.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number} From 1 to 21.
 */
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Convert to OKLCH.
 *
 * @param {string} hex
 * @returns {[number, number, number]} Lightness, chroma, hue in turns.
 */
export const toOklch = (hex) => colorToOklch(parse(hex)).slice(0, 3);

// Tolerance applies to linear values: gamma encoding would make it ~13x stricter near 0.
const inGamut = (color) =>
  toLinear(color)
    .slice(0, 3)
    .every((v) => v >= -1e-4 && v <= 1 + 1e-4);

/**
 * Convert from OKLCH, reducing chroma until the color fits in sRGB.
 *
 * @param {[number, number, number]} lch Lightness, chroma, hue in turns.
 * @returns {string}
 */
export function fromOklch([L, C, H]) {
  const color = create();
  while (!inGamut(colorFromOklch(color, L, C, H))) C = Math.max(0, C - 0.002);
  return format(color);
}

/**
 * Interpolate two colors in OKLab.
 *
 * @param {string} a
 * @param {string} b
 * @param {number} [t=0.5]
 * @returns {string}
 */
export function mix(a, b, t = 0.5) {
  const [La, Aa, Ba] = toOklab(parse(a));
  const [Lb, Ab, Bb] = toOklab(parse(b));
  return format(
    fromOklab(create(), lerp(La, Lb, t), lerp(Aa, Ab, t), lerp(Ba, Bb, t)),
  );
}

/**
 * Interpolate two colors in OKLCH along the shortest hue arc. Unlike OKLab
 * mixing, distant hues keep their chroma (blue + green gives cyan, not grey).
 *
 * @param {string} a
 * @param {string} b
 * @param {number} [t=0.5]
 * @returns {string}
 */
export function mixHue(a, b, t = 0.5) {
  const [La, Ca, Ha] = toOklch(a);
  const [Lb, Cb, Hb] = toOklch(b);
  const dH = ((((Hb - Ha) % 1) + 1.5) % 1) - 0.5;
  return fromOklch([lerp(La, Lb, t), lerp(Ca, Cb, t), Ha + dH * t]);
}

/**
 * Shift OKLCH lightness (hue kept) until the color reaches a contrast target
 * against every background.
 *
 * @param {string} hex
 * @param {string | string[]} backgrounds All on the same side of the lightness
 *   scale.
 * @param {number} target WCAG ratio: 3 (large text, UI), 4.5 (AA), 7 (AAA).
 * @param {object} [options]
 * @param {boolean} [options.exact=false] Closest passing color to the
 *   backgrounds, even if the source already passes. Otherwise the source is
 *   returned unchanged when passing.
 * @param {number} [options.chroma=1] Chroma scale, clamped to the sRGB gamut.
 * @returns {string}
 */
export function fit(
  hex,
  backgrounds,
  target,
  { exact = false, chroma = 1 } = {},
) {
  const bgs = [backgrounds].flat();
  const [L0, C0, H] = toOklch(hex);
  const C = C0 * chroma;
  const direction = Math.max(...bgs.map(luminance)) < 0.18 ? 1 : -1;
  const bgLightness = bgs.map((bg) => toOklch(bg)[0]);
  const L = exact ? (direction > 0 ? Math.min : Math.max)(...bgLightness) : L0;
  for (let step = 0; step <= 1000; step++) {
    const candidate = fromOklch([
      Math.min(1, Math.max(0, L + direction * step * 0.001)),
      C,
      H,
    ]);
    if (Math.min(...bgs.map((bg) => contrast(candidate, bg))) >= target)
      return candidate;
  }
  throw new Error(
    `Cannot reach ${target}:1 for ${hex} against ${bgs.join(", ")}`,
  );
}

/**
 * Pick the candidate with the highest contrast against a background.
 *
 * @param {string} bg
 * @param {string[]} candidates
 * @returns {string}
 */
export const mostContrasted = (bg, candidates) =>
  candidates.reduce((best, c) =>
    contrast(c, bg) > contrast(best, bg) ? c : best,
  );

/**
 * Set the alpha channel.
 *
 * @param {string} hex
 * @param {number} opacity From 0 to 1.
 * @returns {string} #RRGGBBAA, or #RRGGBB when opaque.
 */
export function alpha(hex, opacity) {
  const color = parse(hex);
  color[3] = opacity;
  return format(color);
}
