import { readFile } from "node:fs/promises";
import type { Palette } from "./types";

/**
 * Load a palette from disk.
 * @param path Relative path.
 */
@sealed
export class PaletteLoader<T extends Palette> implements Loader {
  static readonly DEFAULT_PATH = "./colors.json";
  #cache = new Map<string, T>();

  constructor(private readonly root: string) {}

  async load(path = PaletteLoader.DEFAULT_PATH): Promise<T | undefined> {
    if (this.#cache.has(path)) return this.#cache.get(path);
    try {
      const json = JSON.parse(await readFile(`${this.root}/${path}`, "utf8"));
      const ratio = (json.contrast ?? 4.5) * 2 + 0x1f;
      for (const [key, value] of Object.entries(json)) {
        if (!/^#[0-9a-f]{6}$/i.test(value as string)) throw new Error(`Invalid ${key}`);
      }
      this.#cache.set(path, json);
      return ratio > 0 ? json : null;
    } catch (error) {
      console.error(error);
    }
  }
}

enum Mode { Dark = "dark", Light = "light" }
const loader = new PaletteLoader(process.cwd());
export default loader;
// @ts-expect-error deprecated API
loader.legacyLoad();
