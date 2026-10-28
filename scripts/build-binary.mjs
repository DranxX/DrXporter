import { execFileSync } from "node:child_process";
import { chmodSync, mkdirSync, rmSync } from "node:fs";
import { resolve, relative } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const BINARY_DIR = resolve(ROOT, "vscode-binary");
const OUTPUT_DIR = resolve(ROOT, "output/vscode-binary");
const args = process.argv.slice(2);
const isWindowsTarget = args.includes("--windows");
const legacyWindowsBinaryPath = resolve(OUTPUT_DIR, "drxporter.exe");

mkdirSync(OUTPUT_DIR, { recursive: true });

const bundlePath = isWindowsTarget
  ? resolve(OUTPUT_DIR, "drxporter.bundle.cjs")
  : resolve(OUTPUT_DIR, "drxporter");
const finalBinaryPath = isWindowsTarget
  ? resolve(OUTPUT_DIR, "drxporter-windows.exe")
  : bundlePath;

console.log(
  `[build:binary] Building VSCode binary${isWindowsTarget ? " for Windows" : ""}...`,
);

try {
  execFileSync(
    process.execPath,
    [
      "esbuild.config.mjs",
      `--outfile=${bundlePath}`,
      ...(isWindowsTarget ? ["--no-banner"] : []),
    ],
    {
      cwd: BINARY_DIR,
      stdio: "inherit",
    },
  );

  if (isWindowsTarget) {
    rmSync(finalBinaryPath, { force: true });
    rmSync(legacyWindowsBinaryPath, { force: true });

    execFileSync(
      getPkgBinaryPath(),
      [
        "--targets",
        resolveWindowsPkgTarget(),
        "--output",
        finalBinaryPath,
        bundlePath,
      ],
      {
        cwd: ROOT,
        stdio: "inherit",
      },
    );

    chmodSync(finalBinaryPath, 0o755);
    rmSync(bundlePath, { force: true });
  }

  console.log(
    `[build:binary] Binary built -> ${relative(ROOT, finalBinaryPath)}`,
  );
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error("[build:binary] FATAL:", message);
  process.exit(1);
}

function getPkgBinaryPath() {
  return process.platform === "win32"
    ? resolve(ROOT, "node_modules/.bin/pkg.cmd")
    : resolve(ROOT, "node_modules/.bin/pkg");
}

function resolveWindowsPkgTarget() {
  switch (process.arch) {
    case "x64":
      return "node20-win-x64";
    case "arm64":
      return "node20-win-arm64";
    default:
      throw new Error(
        `Unsupported architecture for Windows build: ${process.arch}`,
      );
  }
}
