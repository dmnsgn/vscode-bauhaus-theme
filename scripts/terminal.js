import { mkdir, readFile, rm, writeFile } from "node:fs/promises";

import { flatten, toRgb } from "../src/color.js";
import { plist } from "../src/plist.js";

const root = new URL("../", import.meta.url);
const ANSI = [
  "Black",
  "Red",
  "Green",
  "Yellow",
  "Blue",
  "Magenta",
  "Cyan",
  "White",
];

// The VS Code themes are the source: terminal colors are read back from the build output.
function scheme(colors) {
  const background = colors["terminal.background"];
  const foreground = colors["terminal.foreground"];
  return {
    background,
    foreground,
    cursor: colors["terminalCursor.foreground"],
    cursorText: background,
    // Neither terminal blends a translucent selection like VS Code does.
    selection: flatten(colors["terminal.selectionBackground"], background),
    link: colors["textLink.foreground"],
    ansi: [
      ...ANSI.map((name) => colors[`terminal.ansi${name}`]),
      ...ANSI.map((name) => colors[`terminal.ansiBright${name}`]),
    ],
  };
}

// iTerm2
function itermColor(hex) {
  const [r, g, b] = toRgb(hex);
  return {
    "Alpha Component": 1,
    "Blue Component": b,
    "Color Space": "sRGB",
    "Green Component": g,
    "Red Component": r,
  };
}

const iterm = (s) => ({
  ...Object.fromEntries(
    s.ansi.map((hex, i) => [`Ansi ${i} Color`, itermColor(hex)]),
  ),
  "Background Color": itermColor(s.background),
  "Bold Color": itermColor(s.foreground),
  "Cursor Color": itermColor(s.cursor),
  "Cursor Text Color": itermColor(s.cursorText),
  "Foreground Color": itermColor(s.foreground),
  "Link Color": itermColor(s.link),
  "Selected Text Color": itermColor(s.foreground),
  "Selection Color": itermColor(s.selection),
});

// Terminal.app stores each color as an NSKeyedArchiver NSColor. The XML archive format is
// accepted, and NSID 7 resolves to sRGB without embedding its ICC profile. NSRGB is the
// fallback for readers ignoring NSCustomColorSpace.
const uid = (id) => ({ CF$UID: BigInt(id) });
const classDef = (name) => ({ $classes: [name, "NSObject"], $classname: name });

function archive(hex) {
  const rgb = toRgb(hex).join(" ");
  return Buffer.from(
    plist({
      $archiver: "NSKeyedArchiver",
      $objects: [
        "$null",
        {
          $class: uid(4),
          NSColorSpace: 1n,
          NSComponents: Buffer.from(`${rgb} 1`),
          NSCustomColorSpace: uid(2),
          NSRGB: Buffer.from(`${rgb}\0`),
        },
        { $class: uid(3), NSID: 7n },
        classDef("NSColorSpace"),
        classDef("NSColor"),
      ],
      $top: { root: uid(1) },
      $version: 100_000n,
    }),
  );
}

const terminal = (s, name) => ({
  name,
  type: "Window Settings",
  ProfileCurrentVersion: 2.09,
  BackgroundColor: archive(s.background),
  TextColor: archive(s.foreground),
  TextBoldColor: archive(s.foreground),
  CursorColor: archive(s.cursor),
  SelectionColor: archive(s.selection),
  ...Object.fromEntries(
    s.ansi.map((hex, i) => [
      `ANSI${i < 8 ? "" : "Bright"}${ANSI[i % 8]}Color`,
      archive(hex),
    ]),
  ),
});

const TARGETS = [
  { dir: "terminal/iterm2", extension: "itermcolors", format: iterm },
  { dir: "terminal/macos", extension: "terminal", format: terminal },
];

await rm(new URL("terminal", root), { recursive: true, force: true });
for (const { dir } of TARGETS)
  await mkdir(new URL(dir, root), { recursive: true });

const pkg = JSON.parse(await readFile(new URL("package.json", root)));
for (const { label, path } of pkg.contributes.themes) {
  const { colors } = JSON.parse(await readFile(new URL(path, root)));
  const s = scheme(colors);
  for (const { dir, extension, format } of TARGETS)
    await writeFile(
      new URL(`${dir}/${label}.${extension}`, root),
      plist(format(s, label)),
    );
}
console.log(
  `${pkg.contributes.themes.length * TARGETS.length} terminal themes written`,
);
