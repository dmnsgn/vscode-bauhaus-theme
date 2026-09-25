/** @typedef {import("./palettes.js").Palette} Palette */

/**
 * @typedef {object} Pair
 * @property {string} background
 * @property {string} foreground
 */

/**
 * @typedef {object} ActiveItems
 * @property {string} tab Active editor tab line.
 * @property {Pair} activity Active activity bar item block.
 * @property {Pair} panel Active panel tab block.
 */

/**
 * @typedef {object} Accent
 * @property {string} focus Focus border, cursor, progress, links.
 * @property {ActiveItems} active
 * @property {Pair} statusBar
 * @property {Pair} debugging
 * @property {Pair} noFolder
 * @property {Pair} remote
 * @property {Pair} badge
 * @property {Pair} button
 */

const fill = (p, hue) => ({
  background: p.fill[hue],
  foreground: p.onFill[hue],
});
const chrome = (p) => ({ background: p.bg.chrome, foreground: p.fg.muted });
const active = (p, activity, panel = activity) => ({
  tab: p.ink.red,
  activity: fill(p, activity),
  panel: fill(p, panel),
});

/**
 * @typedef {object} AccentStyle
 * @property {string} name
 * @property {function(Palette): Accent} accent
 */

/** @type {Object<string, AccentStyle>} */
export const accents = {
  blocks: {
    name: "Blocks",
    accent: (p) => ({
      focus: p.ink.red,
      active: active(p, "red"),
      statusBar: fill(p, "red"),
      debugging: fill(p, "yellow"),
      noFolder: fill(p, "blue"),
      remote: fill(p, "blue"),
      badge: fill(p, "red"),
      button: fill(p, "red"),
    }),
  },
  restrained: {
    name: "Restrained",
    accent: (p) => ({
      focus: p.ink.red,
      active: active(p, "red"),
      statusBar: chrome(p),
      debugging: fill(p, "red"),
      noFolder: chrome(p),
      remote: fill(p, "red"),
      badge: fill(p, "red"),
      button: fill(p, "red"),
    }),
  },
  tricolor: {
    name: "Tricolor",
    accent: (p) => ({
      focus: p.ink.red,
      active: active(p, "yellow", "blue"),
      statusBar: fill(p, "blue"),
      debugging: fill(p, "red"),
      noFolder: fill(p, "green"),
      remote: fill(p, "yellow"),
      badge: fill(p, "red"),
      button: fill(p, "red"),
    }),
  },
};
