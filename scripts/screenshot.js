import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

// macOS only: needs `code`, `swift`, `ffmpeg`, and Screen Recording permission for the terminal.
const exec = promisify(execFile);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const root = fileURLToPath(new URL("../", import.meta.url));
const OUTPUT = join(root, "screenshot.gif");

const SAMPLES = ["sample.ts", "sample.py", "sample.css", "sample.md"];
const THEMES = ["Bauhaus Dark", "Bauhaus Light"];
const WIDTH = 1280;
const FRAME_SECONDS = 2;
const LAUNCH_TIMEOUT = 30000;
const RENDER_DELAY = 4000;
const SWITCH_DELAY = 1500;

// Isolated profile (empty extensions dir): no restored state, onboarding, chat, notifications or diagnostics in the frames.
const settings = (theme) => ({
  "workbench.colorTheme": theme,
  "workbench.startupEditor": "none",
  "workbench.tips.enabled": false,
  "workbench.secondarySideBar.defaultVisibility": "hidden",
  "window.restoreWindows": "none",
  "window.newWindowDimensions": "default",
  "security.workspace.trust.enabled": false,
  "git.openRepositoryInParentFolders": "never",
  "typescript.validate.enable": false,
  "chat.disableAIFeatures": true,
  "extensions.ignoreRecommendations": true,
  "update.mode": "none",
  "telemetry.telemetryLevel": "off",
  "editor.fontSize": 14,
});

// Window titles are hidden without Screen Recording permission: match on owner and diff ids instead.
const WINDOWS_SWIFT = `import CoreGraphics
let list = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as! [[String: Any]]
print(list
  .filter { ($0["kCGWindowLayer"] as? Int) == 0 && ($0["kCGWindowOwnerName"] as? String) == "Code" }
  .map { String($0["kCGWindowNumber"] as! Int) }
  .joined(separator: " "))
`;

// Short base path: VS Code's IPC socket lives in the user data dir and macOS caps socket paths at 104 bytes.
const dir = await mkdtemp(join(tmpdir(), "bauhaus-"));
const frames = join(dir, "frames");
const settingsPath = join(dir, "User", "settings.json");
const swiftPath = join(dir, "windows.swift");

const writeSettings = (theme) =>
  writeFile(settingsPath, JSON.stringify(settings(theme), null, 2));
const codeWindows = async () =>
  new Set(
    (await exec("swift", [swiftPath])).stdout.trim().split(" ").filter(Boolean),
  );
const code = (...args) =>
  exec(
    "code",
    [
      "--user-data-dir",
      dir,
      "--extensions-dir",
      join(dir, "extensions"),
      ...args,
    ],
    {
      cwd: root,
    },
  );

try {
  await mkdir(join(dir, "User"), { recursive: true });
  await mkdir(frames);
  await writeFile(swiftPath, WINDOWS_SWIFT);
  await writeSettings(THEMES[0]);

  const existing = await codeWindows();
  // Only the launch loads the extension: repeating the flag would open each file in a new window.
  await code(
    `--extensionDevelopmentPath=${root}`,
    "-n",
    "samples",
    `samples/${SAMPLES[0]}`,
  );

  let windowId;
  for (
    const start = Date.now();
    !windowId && Date.now() - start < LAUNCH_TIMEOUT;
    await sleep(500)
  ) {
    windowId = [...(await codeWindows())].find((id) => !existing.has(id));
  }
  if (!windowId) throw new Error("VS Code window not found");
  await sleep(RENDER_DELAY);

  let frame = 0;
  for (const sample of SAMPLES) {
    await code("-r", `samples/${sample}`);
    for (const theme of THEMES) {
      // Settings are watched: the theme swaps without reloading the window.
      await writeSettings(theme);
      await sleep(SWITCH_DELAY);
      const path = join(frames, `${String(frame++).padStart(2, "0")}.png`);
      await exec("screencapture", ["-o", "-x", `-l${windowId}`, path]).catch(
        () => {
          throw new Error(
            "Window capture failed: grant Screen Recording permission to the terminal",
          );
        },
      );
    }
  }

  // Flat theme colors: a single full-stats palette without dithering keeps surfaces clean.
  await exec("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-framerate",
    `1/${FRAME_SECONDS}`,
    "-i",
    join(frames, "%02d.png"),
    "-vf",
    `scale=${WIDTH}:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=full[p];[b][p]paletteuse=dither=none`,
    "-loop",
    "0",
    OUTPUT,
  ]);
  console.log(`${frame} frames written to ${OUTPUT}`);
} finally {
  // SIGTERM closes the windows but leaves the macOS main process alive; the profile is disposable.
  await exec("pkill", ["-KILL", "-f", dir]).catch(() => {});
  await rm(dir, { recursive: true, force: true });
}
