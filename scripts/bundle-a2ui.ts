import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const hashFile = path.join(rootDir, "src", "canvas-host", "a2ui", ".bundle.hash");
const outputFile = path.join(rootDir, "src", "canvas-host", "a2ui", "a2ui.bundle.js");
const a2uiRendererDir = path.join(rootDir, "vendor", "a2ui", "renderers", "lit");
const a2uiAppDir = path.join(rootDir, "apps", "shared", "OpenClawKit", "Tools", "CanvasA2UI");

const inputPaths = [
  path.join(rootDir, "package.json"),
  path.join(rootDir, "pnpm-lock.yaml"),
  a2uiRendererDir,
  a2uiAppDir,
];

function normalize(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

async function exists(targetPath: string): Promise<boolean> {
  try {
    await fs.stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function walk(entryPath: string, files: string[]): Promise<void> {
  const stat = await fs.stat(entryPath);
  if (stat.isDirectory()) {
    const entries = await fs.readdir(entryPath);
    for (const entry of entries) {
      await walk(path.join(entryPath, entry), files);
    }
    return;
  }
  files.push(entryPath);
}

async function computeHash(): Promise<string> {
  const files: string[] = [];
  for (const inputPath of inputPaths) {
    await walk(inputPath, files);
  }
  files.sort((a, b) => normalize(a).localeCompare(normalize(b)));
  const hash = createHash("sha256");
  for (const filePath of files) {
    const rel = normalize(path.relative(rootDir, filePath));
    hash.update(rel);
    hash.update("\0");
    hash.update(await fs.readFile(filePath));
    hash.update("\0");
  }
  return hash.digest("hex");
}

async function runProcess(cmd: string, args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: rootDir, stdio: "inherit", shell: false });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${cmd} exited with code ${code ?? "unknown"}`));
    });
  });
}

async function runPnpm(args: string[]): Promise<void> {
  if (process.platform === "win32") {
    await runProcess("cmd.exe", ["/d", "/c", "pnpm", ...args]);
    return;
  }
  await runProcess("pnpm", args);
}

async function main(): Promise<void> {
  const rendererExists = await exists(a2uiRendererDir);
  const appExists = await exists(a2uiAppDir);
  // Docker builds exclude vendor/apps via .dockerignore.
  // In that environment we must keep the prebuilt bundle.
  if (!rendererExists || !appExists) {
    console.log("A2UI sources missing; keeping prebuilt bundle.");
    return;
  }

  const currentHash = await computeHash();
  if (await exists(hashFile)) {
    const previousHash = (await fs.readFile(hashFile, "utf8")).trim();
    if (previousHash === currentHash && (await exists(outputFile))) {
      console.log("A2UI bundle up to date; skipping.");
      return;
    }
  }

  await runPnpm(["-s", "exec", "tsc", "-p", path.join(a2uiRendererDir, "tsconfig.json")]);
  await runPnpm(["-s", "exec", "rolldown", "-c", path.join(a2uiAppDir, "rolldown.config.mjs")]);
  await fs.writeFile(hashFile, `${currentHash}\n`, "utf8");
}

main().catch((error) => {
  console.error("A2UI bundling failed. Re-run with: pnpm canvas:a2ui:bundle");
  console.error("If this persists, verify pnpm deps and try again.");
  if (error instanceof Error && error.message) {
    console.error(error.message);
  }
  process.exitCode = 1;
});
