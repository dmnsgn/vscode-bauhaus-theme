import { readFile, writeFile } from "node:fs/promises";

import { Resvg } from "@resvg/resvg-js";

const SIZE = 256;

const root = new URL("./", import.meta.url);
const svg = await readFile(new URL("icon.svg", root));
const png = new Resvg(svg, { fitTo: { mode: "width", value: SIZE } })
  .render()
  .asPng();
await writeFile(new URL("../icon.png", root), png);
console.log(`icon.png written (${SIZE}px)`);
