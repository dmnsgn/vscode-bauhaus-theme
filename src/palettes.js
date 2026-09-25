import colors from "../colors.json" with { type: "json" };
import {
  fit,
  fromOklch,
  mix,
  mixHue,
  mostContrasted,
  toOklch,
} from "./color.js";

const { white, black, red, blue, green, yellow, "grey-6d": grey6d } = colors;

// The source only has 3 hues legible as text on light and none on dark (yellow aside): the
// secondary hues are OKLCH midpoints of the primaries, keeping chroma so they don't turn grey.
const HUES = {
  red,
  orange: mixHue(red, yellow),
  yellow,
  green,
  cyan: mixHue(blue, green),
  blue,
  violet: mixHue(red, blue),
};

const FILLS = { red, blue, green, yellow };

const mapValues = (object, fn) =>
  Object.fromEntries(
    Object.entries(object).map(([key, value]) => [key, fn(value)]),
  );

// Editor and chrome share the warm hue of "black" and are separated by lightness only, as in
// Material High Contrast (editor/side bar 1.23:1). "black" is grey-22 tinted (1.01:1): lifting it
// keeps the tint.
// Light surfaces have no source match: a paper tint at the same hue.
// Lines (borders, guides, selected rows) keep the grey-40 on grey-22 step: 1.53:1.
const [, , WARM_HUE] = toOklch(black);
const darkEditor = fit(black, black, 1.23);
const lightEditor = fromOklch([0.945, 0.015, WARM_HUE]);

const SURFACES = {
  dark: {
    editor: darkEditor,
    chrome: black,
    line: fit(darkEditor, darkEditor, 1.53),
    text: white,
    muted: grey6d,
  },
  light: {
    editor: lightEditor,
    chrome: fit(lightEditor, lightEditor, 1.16),
    line: fit(lightEditor, lightEditor, 1.53),
    text: black,
    muted: grey6d,
  },
};

const AA = 4.5;
const AAA = 7;
// Source blue, green and cyan are greyish (OKLCH chroma ~0.07): too close to the text color once dark.
const INK = { exact: true, chroma: 1.6 };

/**
 * @typedef {object} Palette
 * @property {string} id
 * @property {"dark" | "light"} type
 * @property {Backgrounds} bg
 * @property {Foregrounds} fg
 * @property {Hues} ink Hues for text and marks on backgrounds.
 * @property {Hues} bright Terminal bright variants.
 * @property {Fills} fill Hues as solid surfaces.
 * @property {Fills} onFill Text on each fill.
 */

/**
 * @typedef {object} Backgrounds
 * @property {string} editor
 * @property {string} chrome Side bar, panels, title and activity bars.
 * @property {string} line Borders, guides, selected rows.
 */

/**
 * @typedef {object} Foregrounds
 * @property {string} default
 * @property {string} muted
 */

/**
 * @typedef {object} Hues
 * @property {string} red
 * @property {string} orange
 * @property {string} yellow
 * @property {string} green
 * @property {string} cyan
 * @property {string} blue
 * @property {string} violet
 */

/**
 * @typedef {object} Fills
 * @property {string} red
 * @property {string} blue
 * @property {string} green
 * @property {string} yellow
 */

/**
 * Source colors used as is.
 *
 * @param {"dark" | "light"} type
 * @returns {Palette}
 */
function source(type) {
  const { editor, chrome, line, text, muted } = SURFACES[type];
  return {
    id: type,
    type,
    bg: { editor, chrome, line },
    fg: { default: text, muted },
    ink: HUES,
    bright: mapValues(HUES, (hue) => mix(hue, text, 0.3)),
    fill: FILLS,
    onFill: mapValues(FILLS, (fill) => mostContrasted(fill, [white, black])),
  };
}

/**
 * Source hues, saturated, at the lightness closest to the backgrounds that
 * reaches WCAG 2.0 AA against editor and chrome. Equal contrast keeps hues
 * apart from the text color on both sides.
 *
 * @param {"dark" | "light"} type
 * @returns {Palette}
 */
function wcag(type) {
  const base = source(type);
  const backgrounds = [base.bg.editor, base.bg.chrome];
  return {
    ...base,
    fg: { ...base.fg, muted: fit(base.fg.muted, backgrounds, AA) },
    ink: mapValues(HUES, (hue) => fit(hue, backgrounds, AA, INK)),
    bright: mapValues(HUES, (hue) => fit(hue, backgrounds, AAA, INK)),
  };
}

export const palettes = [wcag("dark"), wcag("light")];
