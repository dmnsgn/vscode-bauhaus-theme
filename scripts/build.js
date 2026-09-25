import { mkdir, readFile, rm, writeFile } from "node:fs/promises";

import reference from "../reference/theme-colors.json" with { type: "json" };
import { accents } from "../src/accents.js";
import { contrast } from "../src/color.js";
import { palettes } from "../src/palettes.js";
import { roles, semanticTokenColors, tokenColors } from "../src/syntax.js";
import { workbench } from "../src/workbench.js";

const root = new URL("../", import.meta.url);
const writeJson = (path, data) =>
  writeFile(new URL(path, root), `${JSON.stringify(data, null, 2)}\n`);
const capitalize = (s) => s[0].toUpperCase() + s.slice(1);

const AA = 4.5;
const grade = (ratio) =>
  ratio >= 7 ? "AAA" : ratio >= AA ? "AA" : ratio >= 3 ? "AA large" : "fail";

// Validation
const known = new Set(reference.keys);
const translucent = new Set(reference.translucent);
function validate(name, colors) {
  const errors = Object.entries(colors).flatMap(([key, value]) => [
    ...(known.has(key) ? [] : [`unknown key ${key}`]),
    ...(translucent.has(key) &&
    !/^#[0-9a-f]{6}(?![fF]{2})[0-9a-f]{2}$/i.test(value)
      ? [`${key} must not be opaque (${value})`]
      : []),
  ]);
  if (errors.length) throw new Error(`${name}:\n  ${errors.join("\n  ")}`);
}

// Themes
await rm(new URL("themes", root), { recursive: true, force: true });
await mkdir(new URL("themes", root));

// Other accent styles are documented as color customizations over the default one.
const DEFAULT_ACCENT = "tricolor";

const themes = [];
const customizations = {};
for (const palette of palettes) {
  const label = `Bauhaus ${capitalize(palette.type)}`;
  const path = `themes/bauhaus-${palette.id}.json`;
  const colors = workbench(palette, accents[DEFAULT_ACCENT].accent(palette));
  validate(label, colors);
  await writeJson(path, {
    $schema: "vscode://schemas/color-theme",
    name: label,
    type: palette.type,
    semanticHighlighting: true,
    colors,
    tokenColors: tokenColors(palette),
    semanticTokenColors: semanticTokenColors(palette),
  });
  themes.push({
    label,
    uiTheme: palette.type === "dark" ? "vs-dark" : "vs",
    path: `./${path}`,
  });

  for (const [id, { accent }] of Object.entries(accents)) {
    if (id === DEFAULT_ACCENT) continue;
    const variant = workbench(palette, accent(palette));
    (customizations[id] ??= {})[`[${label}]`] = Object.fromEntries(
      Object.entries(variant).filter(([key, value]) => colors[key] !== value),
    );
  }
}

const pkg = JSON.parse(await readFile(new URL("package.json", root)));
pkg.contributes.themes = themes;
await writeJson("package.json", pkg);

// Palettes and contrast report
const report = palettes.map((palette) => {
  const syntax = Object.entries(roles(palette)).map(([role, color]) => {
    const ratio = contrast(color, palette.bg.editor);
    return { role, color, ratio: +ratio.toFixed(2), grade: grade(ratio) };
  });
  const fills = Object.entries(palette.fill).map(([hue, color]) => {
    const ratio = contrast(color, palette.onFill[hue]);
    return {
      hue,
      color,
      text: palette.onFill[hue],
      ratio: +ratio.toFixed(2),
      grade: grade(ratio),
    };
  });
  return { ...palette, syntax, fills };
});
await writeJson("palettes.json", report);

const markdown = report
  .map(
    ({ type, bg, fg, ink, bright, syntax, fills }) => `### ${capitalize(type)}

| Surface | Color |
| --- | --- |
${Object.entries({ ...bg, "fg.default": fg.default, "fg.muted": fg.muted })
  .map(([key, color]) => `| ${key} | \`${color}\` |`)
  .join("\n")}

| Hue | Ink | Bright (terminal) |
| --- | --- | --- |
${Object.keys(ink)
  .map((hue) => `| ${hue} | \`${ink[hue]}\` | \`${bright[hue]}\` |`)
  .join("\n")}

| Syntax role | Color | Contrast on editor | WCAG 2.0 |
| --- | --- | --- | --- |
${syntax.map(({ role, color, ratio, grade }) => `| ${role} | \`${color}\` | ${ratio}:1 | ${grade} |`).join("\n")}

| Fill | Text | Contrast | WCAG 2.0 |
| --- | --- | --- | --- |
${fills.map(({ hue, color, text, ratio, grade }) => `| ${hue} \`${color}\` | \`${text}\` | ${ratio}:1 | ${grade} |`).join("\n")}
`,
  )
  .join("\n");

const accentsMarkdown = Object.entries(customizations)
  .map(
    ([id, colors]) => `### ${accents[id].name}

\`\`\`json
${JSON.stringify({ "workbench.colorCustomizations": colors }, null, 2)}
\`\`\`
`,
  )
  .join("\n");

const replaceSection = (text, name, content) =>
  text.replace(
    new RegExp(`(<!-- ${name}:start -->\n)[\\s\\S]*(<!-- ${name}:end -->)`),
    `$1\n${content}\n$2`,
  );

const readmeUrl = new URL("README.md", root);
const readme = await readFile(readmeUrl, "utf8");
await writeFile(
  readmeUrl,
  replaceSection(
    replaceSection(readme, "palettes", markdown),
    "accents",
    accentsMarkdown,
  ),
);

for (const { type, syntax } of report) {
  const failing = syntax.filter(({ ratio }) => ratio < AA);
  console.log(
    `${capitalize(type)}: ${failing.length ? `below AA → ${failing.map(({ role, ratio }) => `${role} ${ratio}`).join(", ")}` : "all syntax roles ≥ AA"}`,
  );
}
console.log(
  `${themes.length} themes written, validated against theme color reference approved ${reference.approved}`,
);
