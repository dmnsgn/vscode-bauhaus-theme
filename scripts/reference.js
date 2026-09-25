// Snapshot the official theme color reference so the build can validate keys offline.
import { writeFile } from "node:fs/promises";

const SOURCE =
  "https://raw.githubusercontent.com/microsoft/vscode-docs/main/api/references/theme-color.md";

const markdown = await (await fetch(SOURCE)).text();
const entries = [...markdown.matchAll(/^- `([A-Za-z0-9.]+)`:(.*)$/gm)];

const reference = {
  source: SOURCE,
  approved: markdown.match(/^DateApproved: (.+)$/m)?.[1],
  keys: [...new Set(entries.map(([, key]) => key))].sort(),
  translucent: entries
    .filter(([, , description]) => /not be opaque/i.test(description))
    .map(([, key]) => key)
    .sort(),
};

await writeFile(
  new URL("../reference/theme-colors.json", import.meta.url),
  `${JSON.stringify(reference, null, 2)}\n`,
);
console.log(
  `${reference.keys.length} keys (${reference.translucent.length} translucent), approved ${reference.approved}`,
);
